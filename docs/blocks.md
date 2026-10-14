# Блоки (типы и JSON-схемы)

**Версия документа:** 1.0
**Дата:** 2026-10
**Статус:** актуально после рефакторинга

Каждый блок — это ES-модуль в `public/js/blocks/`, наследующий `BaseBlock`.
Регистрируется в `blocks/index.js` через `blockRegistry.register(type, Class)`.

Все блоки получают контекст `ctx` (см. `architecture.md`).

---

## Общие поля

Любой блок может иметь:

| Поле | Тип | Описание |
|---|---|---|
| `type` | string | Обязательно. Тип блока. |
| `x`, `y` | number | Позиция в `#render-area` (px). |
| `plain` | boolean | Убрать фон/рамку/тень/паддинг. |

---

## `only-title`

Простой заголовок (текстовый).

**Схема:**
```json
{
  "type": "only-title",
  "text": "РЕКУПЕРАТОР",
  "x": 20, "y": 20,
  "plain": true
}
```

**Поля:** `text` (поддерживает `\n`).

**Разметка:** `<span class="title">`.

---

## `only-number`

Одно число с префиксом/постфиксом. Read-only.

**Схема (вариант 1 — через format):**
```json
{
  "type": "only-number",
  "format": ["P = %2.2f кВт", 2],
  "x": 20, "y": 80
}
```

**Схема (вариант 2 — явные поля):**
```json
{
  "type": "only-number",
  "regAddress": 2,
  "regType": "f4",
  "prefix": "P = ",
  "postfix": " кВт",
  "x": 20, "y": 80
}
```

**Поля:**
- `format: [string, regSpec]` — предпочтительно. `regSpec` = `число` или `"20:b0"`.
- `regAddress`, `regType`, `prefix`, `postfix` — альтернатива.

**Разметка:** `<div class="value">` с `span.prefix`, `span.number`, `span.postfix`.

---

## `title-number`

Заголовок + одно число.

```json
{
  "type": "title-number",
  "text": "Температура на улице",
  "format": ["%5.2f С", 2],
  "x": 20, "y": 140
}
```

**Поля:** `text`, `format: [string, regSpec]` (обязательно).

---

## `title-group-number`

Заголовок + несколько строк значений.

```json
{
  "type": "title-group-number",
  "text": "ВХОД",
  "format": [
    ["Температура = %2.2f С", 0],
    ["Влажность = %4i %", 2]
  ],
  "x": 20, "y": 200
}
```

**Поля:** `text` (опционально), `format: [[string, regSpec], …]`.

Строки, кроме первой, выравниваются по правому краю.

---

## `toggle-button`

Кнопка-переключатель. Клик пишет бит (1/0) в регистр.

```json
{
  "type": "toggle-button",
  "regAddress": 20,
  "regType": "b0",
  "prefix": "Заслонка: ",
  "textOn": "Открыта",
  "textOff": "Закрыта",
  "x": 20, "y": 260
}
```

**Поля:**
- `regAddress` — обязательно.
- `regType` — `b0…b15` (по умолчанию `b0`).
- `prefix` — текст перед кнопкой.
- `textOn`, `textOff` — подписи состояний.
- `width`, `height` — опциональные размеры.

**Разметка:** `<button class="toggle off">` с `data-reg`, `data-type`, `data-text-on`, `data-text-off`.

**Состояния:** `.off` (по умолчанию), `.on`, `.waiting`.

---

## `page-button`

Кнопка навигации.

```json
{
  "type": "page-button",
  "text": "Настройки",
  "targetPage": "settings",
  "x": 193, "y": 10
}
```

**Поля:** `text`, `targetPage`.

При клике эмитит `window.dispatchEvent('page-change', { targetPage })`.

---

## `send-button`

Кнопка отправки группы регистров.

```json
{
  "type": "send-button",
  "regAddress": "16,18,20,21",
  "text": "Сохранить",
  "x": 400, "y": 430
}
```

**Поля:**
- `regAddress` — строка с номерами через запятую.
- `text` — подпись (по умолчанию «Сохранить»).

Отправляет только **dirty** регистры (из `caches.inputs`). После успеха — `updateOriginalValue`, сбрасывает dirty.

**Состояния:** `.sending`, `.success`, `.error`, `.partial`.

**Кнопка disabled**, если нет ни одного dirty-регистра.

---

## `image`

Картинка.

```json
{
  "type": "image",
  "src": "/images/fan.jpg",
  "width": 80, "height": 80,
  "alt": "Вентилятор",
  "objectFit": "contain",
  "spin": true,
  "spinSpeed": "fast",
  "toggleSpinOnClick": false,
  "x": 60, "y": 30
}
```

**Поля:**
- `src` — URL.
- `width`, `height` — размеры.
- `objectFit` — `contain` / `cover` / `fill`.
- `spin` — включить вращение.
- `spinSpeed` — `slow` / `normal` / `fast` / `pause` / `reverse`.
- `toggleSpinOnClick` — клик по картинке циклически переключает режимы.
- `border`, `borderRadius`, `opacity`, `backgroundColor`.

**Разметка:** `<div class="block image">` + `<img>` внутри.

---

## `title-input`

Редактируемое поле.

```json
{
  "type": "title-input",
  "text": "Ввод значения",
  "regAddress": 16,
  "regType": "s2",
  "prefix": "Сумма",
  "postfix": "А",
  "size": 5,
  "min": 0, "max": 1000,
  "decimalPlaces": 3,
  "showSaveButton": true,
  "x": 400, "y": 100
}
```

**Поля:**
- `regAddress`, `regType` — обязательно.
- `text` — заголовок.
- `prefix`, `postfix`.
- `size` — ширина поля в символах (по умолчанию 10).
- `min`, `max` — границы.
- `decimalPlaces` — знаков после запятой (только для `f4`).
- `showSaveButton` — показать кнопку «💾» для сохранения одного поля.
- `format: [string, regSpec]` — альтернатива `regAddress`.

**Интерактив:**
- Клик по `<input>` → открывается numpad.
- Валидация по `blur` / `Enter` / `Escape`.
- Класс `.input-changed` — если значение отличается от `originalValue`.
- Кнопка `.input-reset` (×) — сброс к `originalValue`.

---

## `empty-box`

Контейнер с заголовком и детьми.

```json
{
  "type": "empty-box",
  "x": 50, "y": 535,
  "width": 235, "height": 345,
  "borderColor": "#d3dbe3",
  "borderWidth": 3,
  "borderRadius": 10,
  "backgroundColor": "#ffffff",
  "title": "Заслонка входная",
  "toggle": false,
  "children": [
    { "type": "image", "src": "/images/damper.jpg", "x": 60, "y": 30, "width": 80, "height": 80, "plain": true },
    { "type": "title-group-number", "x": 0, "y": 130, "plain": true, "format": [["Температура%2.2f С", 0]] }
  ]
}
```

**Поля:**
- `x`, `y`, `width`, `height` — позиция и размеры.
- `title` — заголовок контейнера.
- `borderColor`, `borderWidth`, `borderStyle`, `borderRadius`, `backgroundColor` — стили.
- `toggle` — если `true` и есть `regAddress`, вся карточка кликабельна (toggle-бит).
- `regAddress`, `regType` — для toggle-режима.
- `children` — массив дочерних блоков, позиционируются абсолютно внутри контейнера.

**Дети** получают класс `.node` (вместо `.block`), координаты `x`/`y` относительно контейнера.

**Разметка:** `<div class="block empty-box">` + `<span class="box-title">` + `.node`.

---

## `node-card` ⭐ (новое)

Расширенный `empty-box` с иконкой, state-dot, поддержкой toggle и контекстных попапов.

```json
{
  "type": "node-card",
  "x": 310, "y": 535,
  "width": 210, "height": 345,

  "title": "Приточка",
  "icon": "fan",

  "toggle": true,
  "regAddress": 20, "regType": "b2",
  "requireConfirm": true,

  "longPress": "popup:menu",
  "popupData": { "reg": 16, "title": "Приточка" },

  "children": [
    { "type": "image", "src": "/images/in-fan.jpg", "x": 60, "y": 30, "width": 80, "height": 80, "plain": true },
    { "type": "title-group-number", "x": 0, "y": 130, "plain": true,
      "format": [["Скорость%2.2f м/с", 16], ["Загрузка%4i %", 18]] }
  ]
}
```

**Поля:**
- `x`, `y`, `width`, `height` — обязательно.
- `title` — заголовок.
- `icon` — ключ иконки: `damper`, `fan`, `filter`, `heater`, `reco`, `pump`, `humidifier`, `valve`, `default`.
- `toggle` — `true` — короткий тап пишет бит.
- `regAddress`, `regType` — при `toggle: true`.
- `requireConfirm` — `true` (по умолчанию) — показывать confirm перед записью.
- `longPress` — `"popup:menu"` / `"popup:trend"` / `"popup:settings"` / `"none"`.
- `popupData` — данные попапа (передаются в сервис).
- `children` — дочерние блоки (как у `empty-box`).

**Интерактив:**
- **Короткий тап** (< 500 мс):
  - `toggle: true` → confirm (если `requireConfirm`) → `api.writeRegister` → опрос.
  - `toggle: false` → ничего.
- **Долгий тап** (≥ 500 мс):
  - Если `longPress` задан → открывается соответствующий попап.
  - Полоса внизу карточки (`hold-indicator`) заполняется за 500 мс.

**Состояния:**
- `.on` / `.off` — переключение из опроса.
- `.holding` — идёт удержание.
- `.triggered` — сработало удержание.
- `.has-toggle` — модификатор, если `toggle: true`.

**Иконка-подсказка** (стрелка в правом верхнем углу) — показывается, если `longPress !== 'none'`. **Не кликабельна**, клик уходит на карточку.

**Регистрация в updater:** через `updater.addNodeCard()`, не `addToggle()`. Состояние приходит из опроса, но **содержимое карточки не перетирается**.