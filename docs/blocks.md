# Блоки (типы и JSON-схемы)

**Версия документа:** 2.1
**Дата:** 2026-11
**Статус:** актуально после рефакторинга (добавлен button, обновлён node-card)

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

**Холст** — `1600×1200` (`CONFIG.CANVAS_W/H`). Блок с `x ≥ 1600` или `y ≥ 1200` не виден.

---

## `only-title`

Простой заголовок (текстовый).

{
  "type": "only-title",
  "text": "РЕКУПЕРАТОР",
  "x": 20, "y": 20,
  "plain": true
}

**Поля:** `text` (поддерживает `\n`).

---

## `only-number`

Одно число с префиксом/постфиксом. Read-only.

**Схема (вариант 1 — через format):**
{
  "type": "only-number",
  "format": ["P = %2.2f кВт", 2],
  "x": 20, "y": 80
}

**Схема (вариант 2 — явные поля):**
{
  "type": "only-number",
  "regAddress": 2,
  "regType": "f4",
  "prefix": "P = ",
  "postfix": " кВт",
  "x": 20, "y": 80
}

**Поля:** `format: [string, regSpec]` или `regAddress` + `regType` + `prefix` + `postfix`.

---

## `title-number`

Заголовок + одно число.

{
  "type": "title-number",
  "text": "Температура на улице",
  "format": ["%5.2f С", 2],
  "x": 20, "y": 140
}

**Поля:** `text`, `format: [string, regSpec]` (обязательно).

---

## `title-group-number`

Заголовок + несколько строк значений.

{
  "type": "title-group-number",
  "text": "ВХОД",
  "format": [
    ["Температура %2.2f С", 0],
    ["Влажность %4i %", 2]
  ],
  "x": 20, "y": 200,
  "plain": true
}

**Поля:** `text`, `format: [[string, regSpec], ...]`.

---

## `toggle-button`

Кнопка-переключатель. Шлёт 0/1 без подтверждения.

{
  "type": "toggle-button",
  "regAddress": 20,
  "regType": "b0",
  "textOn": "Открыта",
  "textOff": "Закрыта",
  "x": 20, "y": 260,
  "plain": true
}

**Поля:** `regAddress`, `regType`, `textOn`, `textOff`, `text`, `prefix`, `width`, `height`.

---

## `page-button`

Переход на другую страницу (ключ верхнего уровня в `blocksData.json`).

{ "type": "page-button", "x": 20, "y": 20, "text": "На главную", "targetPage": "main" }

**Поля:** `text`, `targetPage`.

---

## `send-button`

Кнопка массовой отправки. Шлёт только «грязные» поля (где `value ≠ originalValue`).

{
  "type": "send-button",
  "regAddress": [16, 18, 20, 21],
  "text": "Сохранить",
  "x": 400, "y": 430
}

**Поля:** `regAddress` (number | number[]), `text`.

---

## `image`

Картинка. Может вращаться (spin), переключать режим по клику.

{
  "type": "image",
  "src": "/images/damper.jpg",
  "width": 50, "height": 50,
  "objectFit": "contain",
  "x": 55, "y": 20,
  "plain": true
}

**Поля:** `src`, `width`, `height`, `objectFit`, `borderRadius`, `border`, `opacity`, `backgroundColor`, `alt`, `title`, `spin`, `spinSpeed`, `toggleSpinOnClick`.

---

## `svg`

Векторная иконка с правилами. Управляется через `rules` (см. ниже).

{
  "type": "svg",
  "src": "/icons/fan.svg",
  "width": 50, "height": 50,
  "x": 60, "y": 20,
  "plain": true,
  "rules": [
    { "reg": "20:b2", "if": "== 1", "then": { "spin": "normal", "color": "#2ecc71" } },
    { "reg": "20:b2", "if": "== 0", "then": { "spin": null, "color": "#7f8c8d" } }
  ]
}

**Поля:** `src`, `width`, `height`, `rules`.

**Правило:** `reg` ("20:b2"), `if` (опционально), `then` (`spin`, `color`, `fill`, `opacity`, `visible`, `rotate`, `scale`).

---

## `title-input`

Поле ввода с заголовком. Открывает numpad по клику.

{
  "type": "title-input",
  "text": "Ввод значения",
  "format": ["Меркурий=%f W", 18],
  "min": 1, "max": 100,
  "size": 5,
  "x": 400, "y": 210
}

**Поля:** `text`, `format` или (`regAddress` + `regType`), `prefix`, `postfix`, `min`, `max`, `decimalPlaces`, `size`, `showSaveButton`.

---

## `node-card`

Карточка-контейнер. Может шлёпать toggle-сигналы по клику и открывать попапы по long-press. Внутри могут быть любые другие блоки (в поле `children`).

{
  "type": "node-card",
  "x": 395, "y": 180,
  "width": 160, "height": 345,
  "name": "Заслонка выходная",

  "click": {
    "reg": "256:b0",
    "toggle": true,
    "confirm": true
  },

  "rules": [
    { "reg": "256:b0", "if": "== 1", "then": { "class": "on"  } },
    { "reg": "256:b0", "if": "== 0", "then": { "class": "off" } }
  ],

  "longPress": "popup:trend",
  "popupData": { "reg": 17, "title": "Заслонка выходная" },

  "children": [
    { "type": "only-title", "x": 20, "y": 80, "text": "Заслонка выходная" },
    { "type": "image", "x": 55, "y": 20, "src": "/images/damper.jpg",
      "width": 50, "height": 50, "objectFit": "contain", "plain": true }
  ]
}

**Поля:**
- `width`, `height` — размеры карточки (по умолчанию 210×345).
- `name` — имя для confirm/popup.
- `click` — объект `{ reg, toggle, confirm }`. Если `toggle: true`, клик читает текущее значение регистра и пишет инвертированное (0→1, 1→0). `confirm: true` — спрашивать подтверждение.
- `rules` — массив правил для визуального состояния карточки (добавляет класс `on` / `off`).
- `longPress` — `"popup:trend"` или `"popup:menu"`.
- `popupData` — данные для попапа.
- `children` — дочерние блоки. Координаты `x`/`y` детей — **относительно карточки**.

---

## `button`

Обычная кнопка с фиксированными состояниями (states).
Может работать в режиме `maintained` (переключение по клику) или `momentary` (нажал-отпустил).

{
  "type": "button",
  "x": 20, "y": 330,
  "width": 100, "height": 70,
  "name": "Джог Вкл",
  "regAddress": 256,
  "regType": "b6",
  "mode": "momentary",
  "states": [
    { "value": 1, "text": "Вкл", "color": "#c8e6c9" },
    { "value": 0, "text": "Вкл", "color": "#ffffff" }
  ]
}

**Поля:**
- `width`, `height` — размеры кнопки.
- `regAddress`, `regType` — куда писать.
- `mode` — `"maintained"` (по умолчанию) или `"momentary"`.
- `states` — массив `{ value, text, color, class }`.
- `confirm` — спрашивать ли подтверждение (только для `maintained`).
- `inversion` — если `true`, `on/off` визуально переворачиваются.

---

## Формат числа (format)

Строка `format` использует printf-подобный синтаксис:
`%f`, `%.1f`, `%4.1f`, `%d`, `%i`, `%u`, `%c`, `%e`, `%g`.

Тип регистра определяется по спецификатору:
- `%f`, `%e`, `%g` → `f4`
- `%d`, `%i` → `s2`
- `%u` → `u2`
- `%c` → `b0`

Пример: `["%4.1f С", 0]` — читает регистр 0 как float, выводит `23.5 С`.
Пример: `["%4i %", "20:b0"]` — читает бит 0 в регистре 20 как int.