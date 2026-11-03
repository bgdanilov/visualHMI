# Сервисы

**Версия документа:** 2.0
**Дата:** 2026-11
**Статус:** актуально после рефакторинга

Все сервисы — синглтоны, доступны блокам через `ctx`.

---

## `apiClient` — `ctx.api`

HTTP-клиент с таймаутом (по умолчанию 5000 мс).

**Методы:**
```js
await api.loadConfig(fileName)       // GET /api/loadConfig?file=...
await api.loadStaticJSON(fileName)   // GET /<fileName>
await api.readModbus()               // GET /api/modbus → DataView
await api.writeRegister(regId, value, type)   // POST /api/registers/:id
```

**Типы регистров:** `u2`, `s2`, `f4`, `b0…b15`.

---

## `modbusUpdater` — `ctx.updater`

Ядро обмена данными. Управляет кэшами, читает буфер, форматирует значения.

**Кэши:**
- `caches.spans` — read-only числа.
- `caches.inputs` — редактируемые поля.
- `caches.toggles` — кнопки toggle.
- `caches.nodeCards` — карточки node-card.
- `caches.svgs` — SVG-правила.

**Методы:**
```js
updater.addSpan(regId, span, type, formatSpec)     // регистрация числа
updater.addInput(regId, input, type)               // регистрация поля
updater.addToggle(regId, button, type)             // регистрация toggle
updater.addNodeCard(regId, card, type)             // регистрация node-card
updater.addSvgRule(regId, block, regKey, type)     // регистрация SVG-правила

updater.getInput(regId)                            // → { element, originalValue, registerType } | null
await updater.update()                             // один цикл опроса
await updater.updateSingleInput(regId)             // точечное обновление

updater.isDirty(regId)                             // поле изменено?
updater.updateOriginalValue(regId, value)          // зафиксировать значение
updater.markAsSending(regId)                       // пометить как «отправляется»
updater.unmarkAsSending(regId)

updater.clearCaches()                              // очистить всё
```

**Важно:** `update()` вызывается `app.js` каждые 300 мс. Пропускает поля, которые пользователь редактирует или которые в процессе записи.

---

## `validator` — `ctx.validator`

Валидация и коррекция значений.

**Методы:**
```js
validator.validate(value, { min, max, decimalPlaces, registerType, allowEmpty })
validator.validateWithCorrection(value, opts)
validator.formatNumber(value, decimalPlaces)
validator.getDecimalCount(value)
```

`validateWithCorrection` возвращает:
```js
{
  valid: true,
  value: "исходное",
  normalized: "исправленное",
  corrected: true,      // было скорректировано
  wasRounded: true      // было округлено
}
```

---

## `notification` — `ctx.notification`

Тосты в правом верхнем углу.

**Методы:**
```js
notification.success(message, { title, duration })
notification.error(message, opts)
notification.warning(message, opts)
notification.info(message, opts)
notification.show(message, { type, duration, closable, title, onClick })
```

По умолчанию `duration: 3000` мс.

---

## `numpadManager` — `ctx.numpad`

Экранная клавиатура. Открывается кликом по `<input class="input">`.

**API:**
```js
numpad.show(initialValue, {
  min, max,
  decimalPlaces: 3,
  maxDecimalPlaces: 3,
  allowFloat: true,
  allowSign: true,               // показать/скрыть +/- (по умолчанию true)
  allowedValues: null,           // [0, 1] для битовых регистров
  onOk(value) { ... },
  onCancel() { ... }
})

numpad.hide()
numpad.isOpen                    // boolean (геттер)
```

**Поведение:**
- `allowFloat: false` — точка **disabled**, только целые.
- `allowSign: false` — `+/-` **disabled**.
- `allowedValues: [0, 1]` — цифры `2…9`, `.`, `+/-` **disabled** (но **не скрыты** — layout не прыгает). Физическая клавиатура: `2…9` игнорируются.
- Ввод с физической клавиатуры: `Enter` — OK, `Escape` — Cancel, `Backspace` — удалить символ, цифры — ввод.
- `numpad.isOpen` — геттер для проверки, открыт ли numpad.

**Под капотом:** `numpad.js` — тонкий фасад, вся логика в `numpad/NumpadController.js`, DOM — в `numpad/NumpadView.js`, разметка — в `numpad/numpadMarkup.js`.

---

## `popupService` — `ctx.popup`

Глобальный менеджер попапов. Один попап на приложение, один backdrop.

**API:**
```js
popupService.show({
  type: 'trend' | 'menu' | 'settings' | ...,
  anchor: HTMLElement,
  data: { ... }
})

popupService.hide()
popupService.isOpen(type?)         // bool
popupService.register(type, render)  // кастомный попап
```

**Встроенные типы:**

### `trend`
Попап с графиком (заглушка — фейковые данные), 4 метрики: Мин / Сред / Макс / Сейчас.

```js
popup.show({
  type: 'trend',
  anchor: cardElement,
  data: { title: 'Приточка', reg: 21 }
});
```

### `menu`
Попап с контекстным меню:
- Кнопка «Открыть тренд».
- Слайдер уставки.
- Кнопки «Заблокировать» / «Отключить».

```js
popup.show({
  type: 'menu',
  anchor: cardElement,
  data: { title: 'Приточка', reg: 21 }
});
```

### `settings` ⏳ (заглушка, в разработке)
Попап настроек узла. Регистрируется через `popupService.register('settings', ...)`.

```js
popup.show({
  type: 'settings',
  anchor: cardElement,
  data: { title: 'Электронагреватель', reg: 19 }
});
```

> ⚠️ Если `type` не зарегистрирован — в консоли `console.warn`, попап не откроется. Иконка на карточке всё равно будет видна.

**Поведение:**
- Одновременно открыт только один попап.
- Backdrop затемняет экран.
- Клик по фону — закрывает.
- Позиционирование: слева от якоря → справа → снизу (по месту).
- При открытии нового попапа — старый закрывается автоматически.

**Расширение:** добавить новый тип можно через `popupService.register('my-type', (popup, data, { close }) => { ... })`.

---

## `confirmService` — `ctx.confirm`

Глобальный диалог подтверждения. Возвращает `Promise<boolean>`.

**API:**
```js
const ok = await confirmService.ask({
  title: 'Вы уверены?',
  text: 'Вы собираетесь <b>включить</b> <b>узел</b>.',
  confirmText: 'Да, включить',
  cancelText: 'Отмена',
  danger: false
});

if (ok) { /* ... */ }
```

**Поведение:**
- Esc → `false`, Enter → `true`.
- Клик по фону → `false`.
- Один диалог на приложение.
- Если уже открыт — старый закрывается как «отмена».

**Стили:** `danger: true` — красная кнопка и иконка.