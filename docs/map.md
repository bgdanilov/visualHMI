# Карта для чтения кода

**Для кого:** тот, кто хочет «прочитать код без мусора» и вернуть карту в голове.
**Что здесь:** порядок чтения (5 файлов), что искать, что НЕ читать.
**Что НЕ здесь:** описание архитектуры (см. architecture.md), полей блоков (см. cubes-data.md).

---

## Три шага (запомнить)

1. RENDER      JSON  →  DOM
2. REGISTER    DOM   →  Map
3. UPDATE      Map   →  DOM (каждые 300 мс)

Всё остальное (popup, confirm, numpad, notification, validator) — **поверх** трёх шагов, в цикле не участвует.

---

## Порядок чтения (5 файлов, ~35 минут)

### 1. public/js/app.js — 5 минут

Читай сверху вниз, **не всё подряд**. Ищи:

- constructor → this.ctx = { ... } — **все сервисы**, которые получают блоки.
- _renderPage(pageKey) → clearCaches() + renderBlocks(blocks). Это **весь шаг 1**. Сначала чистка кэшей, потом рендер.
- _startPolling() → setInterval(300ms, this.updater.update). Это **весь шаг 3**.

Остальное (scaling, edit mode, error) — шаг 1, но не суть. Пробегись глазами.

**После:** знаешь, где живут **все сервисы** и **где начинается цикл**.

### 2. public/js/blocks/baseBlock.js — 2 минуты

Файл на 30 строк. Читай целиком. Это **контракт** всех блоков:

- render() — шаг 1 (вернуть HTMLElement).
- mounted() / unmounted() — опциональные хуки.
- makeRoot() — общая обёртка .block + позиция.
- esc() — экранирование для innerHTML.

**После:** знаешь, **что обязан** сделать любой блок.

### 3. public/js/blocks/titleNumberBlock.js — 2 минуты

Самый **простой** блок с числом. ~30 строк. Читай целиком:

- render() — создаёт <span class="number" data-reg="...">.
- В конце render() — ctx.updater.addSpan(...) — **шаг 2**.
- Больше ничего: обновление — забота updater'а (шаг 3).

**После:** видишь **полный цикл блока** на 30 строках. Это шаблон.

### 4. public/js/core/modbusUpdater.js — 15 минут

Читай **не подряд**, а **по секциям** (подписаны // ============ SPANS ============ и т.д.):

- **SPANS** (addSpan) — шаг 2.
- **INPUTS** (addInput, updateOriginalValue, isDirty, getInput) — шаг 2 для input'ов.
- **TOGGLES** (addToggle) — шаг 2 для кнопок.
- **NODE-CARD** (addNodeCardRules) — шаг 2 для карточек.
- **SVG** (addSvgRule) — шаг 2 для SVG.
- **UPDATE** (update()) — **главное**, шаг 3. 6 циклов for...of по кешам. Прочитай **один** (SPANS), пойми, потом пробеги остальные 5.
- **UPDATE HELPERS** (updateButton, updateToggle, updateSingleInput) — тот же шаг 3 для одного регистра. После writeRegister, чтобы не ждать 300 мс.
- **NODE-CARD RULES APPLICATION** (_applyNodeCardRules) — шаг 3 для rules. if совпал → classList.add('on').

**Что НЕ читать сейчас:** _formatValue, _getDecimalPlaces, readValue, getBytesCount — утилиты, не модель.

**После:** знаешь **все шесть кешей** и **как update() их обходит**. Это ядро.

### 5. public/js/blocks/nodeCardBlock.js — 10 минут

Самый **сложный** блок. Читай по методам:

- render() — шаг 1: корень + _renderChildren + _registerRules + _setupClick + _setupLongPress.
- _renderChildren() — создаёт дочерние блоки через blockRegistry. Дети **сами** регистрируются в updater'е. Карточка за них не отвечает.
- _registerRules() — шаг 2 **для карточки**: группирует rules по regId и зовёт addNodeCardRules.
- _setupClick() — **не шаг**, обработчик клика. api.lastDataView → api.writeRegister → updateButton.
- _setupLongPress() — **не шаг**, модалка. 800 мс → popup.show.
- _triggerLongPress() — открывает попап.

**После:** видишь **четыре независимые подписки** (card-rules + click + longPress + дети) в одном блоке, не зная друг о друге.

---

## Чек-лист (проверь себя после чтения)

1. **Где живут все сервисы?** → app.ctx (в app.js).
2. **Что должен вернуть render()?** → HTMLElement (или null).
3. **Как блок говорит updater'у «обновляй это»?** → ctx.updater.addSpan/addInput/addToggle/addNodeCardRules/addSvgRule/addButton в конце render().
4. **Сколько кешей в updater'е?** → 6, по типам обновления (span / input / toggle / nodeCard / svg / button).
5. **Что делает update()?** → 1 GET, 6 циклов, каждый пишет в DOM.
6. **Зачем updateButton / updateToggle?** → после writeRegister — обновить **одну** запись, не ждать 300 мс.

---

## Что НЕ читать сейчас

- numpad/*, confirmService, popupService (кроме _registerBuiltins поверхностно) — **модалки поверх** модели.
- InputController.js — title-input = шаг 1 + шаг 2 + **логика ввода** (валидация, numpad, dirty). Логика ввода — **не модель**.
- svgBlock._applyEffects / _applySpin / _applyPulse — детали анимации, не модель.
- validator.js, format.js, condition.js, flash.js, regSpec.js — **утилиты**.
- server/* — **транспорт**. К трём шагам клиента не относится.

---

## Если что-то сломалось — куда смотреть

| Симптом | Куда смотреть |
|---|---|
| Значение не обновляется | updater.addSpan в блоке + caches.spans |
| Кнопка мигает обратно | пауза setTimeout(50) после writeRegister |
| Кнопка не реагирует | _isProcessing не сбросился в finally |
| Ошибка «detached element» | document.body.contains(el) перед el.style... |
| Rules не применяются | addNodeCardRules + evalCondition |
| Popup не открывается | _renders.get(type) — зарегистрирован ли тип |
| Попап «дёргается» при повторном открытии | _abort / _liveTimer не сброшены в _closeCurrent |
| Смена страницы ломает DOM | clearCaches() до renderBlocks() в app._renderPage |

---

## После чтения

1. **Этап 3 (структурные):** разбить updater.update() на _update*, card.isBusy(), CONFIG.WRITE_SETTLE_MS.
2. **Серверные баги:** RMW-гонка, validateRegister + f4, ConfigService.cache.

Если карта восстановлена и хочется **остановиться** — нормально. Код в репозитории, багов нет, ничего не горит.