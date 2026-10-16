# Сервисы

**Версия документа:** 1.0
**Дата:** 2026-10
**Статус:** актуально

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

**Методы:**
```js
updater.addSpan(regId, span, type, formatSpec)     // регистрация числа
updater.addInput(regId, input, type)               // регистрация поля
updater.addToggle(regId, button, type)             // регистрация toggle
updater.addNodeCard(regId, card, type)             // регистрация node-card

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
  onOk(value) { ... },
  onCancel() { ... }
})
```

При `allowFloat: false` — точка и `+/-` скрыты, разрешены только целые.

---

## `popupService` — `ctx.popup`

Глобальный менеджер попапов. Один попап на приложение, один backdrop.

**API:**
```js
popupService.show({
  type: 'trend' | 'menu' | ...,
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

**Поведение:**
- Одновременно открыт только один попап.
- Backdrop затемняет экран.
- Клик по фону — закрывает.
- Позиционирование: слева от якоря → справа → снизу (по месту).
- При открытии нового попапа — старый закрывается автоматически.

**Расширение:** добавить новый тип можно через `popupService.register('settings', (popup, data, { close }) => { ... })`.

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