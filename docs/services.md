# Сервисы

**Версия документа:** 2.1
**Дата:** 2026-11
**Статус:** актуально после рефакторинга

Все сервисы — синглтоны, доступны блокам через ctx.

---

## apiClient — ctx.api

HTTP-клиент с таймаутом (по умолчанию 5000 мс).

**Методы:**
await api.loadConfig(fileName)       // GET /api/loadConfig?file=...
await api.loadStaticJSON(fileName)   // GET /<fileName>
await api.readModbus()               // GET /api/modbus → DataView
                                     // ОБНОВЛЯЕТ this.lastDataView
await api.writeRegister(regId, value, type)   // POST /api/registers/:id

**Свойства:**
api.lastDataView   // DataView | null
                   // Последний успешный снимок /api/modbus.
                   // Обновляется ЛЮБЫМ успешным readModbus().

**Типы регистров:** u2, s2, f4, b0…b15.

---

## modbusUpdater — ctx.updater

Ядро обмена. Управляет кэшами, читает буфер, форматирует значения.

**Кэши:** spans, inputs, toggles, nodeCards, svgs, buttons.

**Регистрация (шаг 2):**
updater.addSpan(regId, span, type, formatSpec, scale)    // число
updater.addInput(regId, input, type)                     // поле
updater.addToggle(regId, button, type)                   // toggle
updater.addNodeCardRules(regId, card, type, rules)       // карточка
updater.addSvgRule(regId, block, regKey, type)           // SVG
updater.addButton(regId, root, type, stateKey, onActual) // button-блок

**Обновление (шаг 3):**
await updater.update()                         // 1 GET, 6 циклов по кешам
await updater.updateButton(regId)              // точечно
await updater.updateToggle(regId)              // точечно
await updater.updateSingleInput(regId)         // точечно

> Точечные методы читают **свежий** буфер (не api.lastDataView). Нужно, чтобы после writeRegister увидеть новое значение.

**Состояние полей:**
updater.getInput(regId)                        // → { element, originalValue, registerType } | null
updater.isDirty(regId)
updater.updateOriginalValue(regId, value)
updater.markAsSending(regId)
updater.unmarkAsSending(regId)

**Чтение сырых данных:**
updater.readValue(dataView, offset, type)      // → number | undefined
updater.getBytesCount(type)                    // → 2 или 4

**Кэш:**
updater.clearCaches()

**Важно:** update() каждые 300 мс. Пропускает поля, которые пользователь редактирует или которые в процессе записи.

---

## validator — ctx.validator

validator.validate(value, { min, max, decimalPlaces, registerType, allowEmpty })
validator.validateWithCorrection(value, opts)
validator.formatNumber(value, decimalPlaces)
validator.getDecimalCount(value)

validateWithCorrection возвращает:
{
  valid: true,
  value: "исходное",
  normalized: "исправленное",
  corrected: true,
  wasRounded: true
}

---

## notification — ctx.notification

notification.success(message, { title, duration })
notification.error(message, opts)
notification.warning(message, opts)
notification.info(message, opts)
notification.show(message, { type, duration, closable, title, onClick })

По умолчанию duration: 3000 мс.

---

## numpadManager — ctx.numpad

numpad.show(initialValue, {
  min, max,
  decimalPlaces: 3,
  maxDecimalPlaces: 3,
  allowFloat: true,
  allowSign: true,
  allowedValues: null,           // [0, 1] для битовых
  onOk(value) { ... },
  onCancel() { ... }
})

numpad.hide()
numpad.isOpen                    // boolean (геттер)

**Поведение:**
- allowFloat: false — точка disabled.
- allowSign: false — +/- disabled.
- allowedValues: [0, 1] — цифры 2…9, ., +/- disabled.
- Физическая клавиатура: Enter, Escape, Backspace, цифры.

**Под капотом:** numpad.js → NumpadController.js → NumpadView.js → numpadMarkup.js.

---

## popupService — ctx.popup

Глобальный менеджер попапов. Один попап на приложение, один backdrop.

**API:**
popupService.show({
  type: 'trend' | 'menu' | 'settings' | ...,
  anchor: HTMLElement,
  data: { ... }
})

popupService.hide()
popupService.isOpen(type?)         // bool
popupService.register(type, render)

**Встроенные типы:**

### trend
Попап с графиком (заглушка — фейковые данные), 4 метрики: Мин / Сред / Макс / Сейчас.

### menu
Контекстное меню: «Открыть тренд», слайдер уставки, «Заблокировать» / «Отключить».

### settings ⏳
Заглушка, в разработке.

**Поведение:**
- Одновременно один попап.
- Backdrop затемняет экран, клик по фону — закрывает.
- Позиционирование: слева → справа → снизу.
- При открытии нового — старый закрывается.
- Слушатели снимаются через AbortController при закрытии (не копятся при повторном открытии).

**Расширение:** popupService.register('my-type', (popup, data, { close, signal }) => { ... }).

---

## confirmService — ctx.confirm

const ok = await confirmService.ask({
  title: 'Вы уверены?',
  text: 'Вы собираетесь <b>включить</b> <b>узел</b>.',
  confirmText: 'Да, включить',
  cancelText: 'Отмена',
  danger: false
});

- Esc → false, Enter → true.
- Клик по фону → false.
- Один диалог на приложение.
- Если уже открыт — старый закрывается как «отмена».
- danger: true — красная кнопка и иконка.

---

## Утилиты (utils/)

Не сервисы, но доступны блокам через импорт:

### utils/format.js
parseBlockFormat(formatString, regSpec, scale)   // → { regAddress, regType, formatPrefix, formatPostfix, formatSpec, scale }
applyFormat(formatSpec, value)                   // → string (printf-подобно)

### utils/condition.js
evalCondition(expr, value)   // → boolean (DSL для if: "== 1", "> 0", "range 1..5", "> 0 && < 100")

### utils/flash.js
flash(el, kind, ms)   // kind: 'success' | 'error'
                      // кратковременно подсвечивает фон+рамку, потом возвращает

### utils/regSpec.js
parseRegSpec(spec, defaultType)   // → { regId, regType }
                                  // spec: "9:u2", "20:b0", 16

### utils/parseInputConfig.js
parseInputConfig(data)   // → { prefix, postfix, regAddress, regType, text, size,
                         //     min, max, decimalPlaces, showSaveButton,
                         //     isFloatType, width }

---

## BaseBlock.esc()

Не сервис, но контрактный метод базового класса:

this.esc(str)   // → string с экранированными & < > " '
                // Использовать для ЛЮБОГО текста из JSON в innerHTML

Пример:
root.innerHTML = <span class="title">${this.esc(this.data.text)}</span>;