# Блоки (типы и JSON-схемы)

**Версия документа:** 2.0
**Дата:** 2026-11
**Статус:** актуально после рефакторинга (empty-box удалён, node-card переработан, svg добавлен)

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

```json
{
  "type": "only-title",
  "text": "РЕКУПЕРАТОР",
  "x": 20, "y": 20,
  "plain": true
}
```

**Поля:** `text` (поддерживает `\n`).

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

**Поля:** `format: [string, regSpec]` или `regAddress` + `regType` + `prefix` + `postfix`.

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

Заголовок + несколько