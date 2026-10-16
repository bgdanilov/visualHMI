# Целевая разметка блоков

**Версия документа:** 1.0
**Дата:** 2026-10
**Статус:** актуально

Словарь селекторов, классов и `data-*` атрибутов, которые используются в новой разметке блоков.

---

## Правила

1. **Один `.block` — один корень.** Без лишних обёрток `.content`.
2. **`data-*` только на носителе значения** — `span.number`, `button.toggle`, `input.input`. Не на обёртках.
3. **Никаких `.content`** — вместо неё `.value` (строка значения).
4. **Заголовок блока** — `span.title` прямо в корне (не в `.value`).
5. **Дочерние блоки внутри контейнера** — класс `.node` (без `.block`).
6. **`innerHTML`** — единственный способ построения разметки.

---

## Словарь селекторов

| Селектор | Назначение | Где живёт |
|---|---|---|
| `.block` | Корень любого блока | `<div class="block ...">` |
| `.block.plain` | Без фона/рамки/тени | модификатор корня |
| `.title` | Внутренний заголовок | `<span class="title">` |
| `.value` | Строка значения | `<div class="value">` |
| `.prefix` | Текст перед числом | `<span class="prefix">` |
| `.number` | Число (носитель `data-reg`) | `<span class="number" data-reg data-type>` |
| `.postfix` | Текст после числа | `<span class="postfix">` |
| `.toggle` | Кнопка-переключатель | `<button class="toggle off">` |
| `.toggle.on/.off/.waiting` | Состояния | классы на `<button>` |
| `.page-button` | Кнопка навигации | `<button class="page-button">` |
| `.send-button` | Кнопка отправки группы | `<button class="send-button">` |
| `.input` | Поле ввода (носитель `data-reg`) | `<input class="input" data-reg data-type>` |
| `.input-reset` | Кнопка сброса поля | `<button class="input-reset">` |
| `.input-save` | Кнопка «💾» одного поля | `<button class="input-save">` |
| `.image` | Блок картинки | `<div class="block image">` + `<img>` |
| `.node` | Дочерний блок в контейнере | `<div class="node ...">` |
| `.box-title` | Заголовок `empty-box` | `<span class="box-title">` |
| `.node-card` | Корень `node-card` | `<div class="block node-card">` |
| `.elem-icon` | Иконка элемента | `<span class="elem-icon">` |
| `.state-dot` | Точка состояния | `<span class="state-dot">` |
| `.hint-icon` | Иконка-подсказка (стрелка) | `<span class="hint-icon">` |
| `.hold-indicator` | Полоса удержания | `<div class="hold-indicator">` |

---

## Разметка по типам блоков

### `only-title`
```html
<div class="block only-title plain">
  <span class="title">РЕКУПЕРАТОР</span>
</div>
```

### `only-number`
```html
<div class="block only-number plain">
  <div class="value">
    <span class="prefix">P = </span>
    <span class="number" data-reg="2" data-type="f4">--</span>
    <span class="postfix"> кВт</span>
  </div>
</div>
```

### `title-number`
```html
<div class="block title-number plain">
  <span class="title">Температура</span>
  <div class="value">
    <span class="prefix">=</span>
    <span class="number" data-reg="2" data-type="f4">--</span>
    <span class="postfix"> С</span>
  </div>
</div>
```

### `title-group-number`
```html
<div class="block title-group-number plain">
  <span class="title">ВХОД</span>
  <div class="value">
    <span class="prefix">Температура = </span>
    <span class="number" data-reg="0" data-type="u2">--</span>
    <span class="postfix"> С</span>
  </div>
  <div class="value">
    <span class="prefix">Влажность = </span>
    <span class="number" data-reg="2" data-type="u2">--</span>
    <span class="postfix"> %</span>
  </div>
</div>
```

### `toggle-button`
```html
<div class="block toggle-button plain">
  <div class="value">
    <span class="prefix btn">Заслонка: </span>
    <button class="toggle off" data-reg="20" data-type="b0"
            data-text-on="Открыта" data-text-off="Закрыта">Закрыта</button>
  </div>
</div>
```

### `page-button`
```html
<div class="block page-button">
  <div class="value">
    <button class="page-button" data-target="main">На главную</button>
  </div>
</div>
```

### `send-button`
```html
<div class="block send-button">
  <div class="value">
    <button class="send-button" data-reg="16,18,20,21">Сохранить</button>
  </div>
</div>
```

### `image`
```html
<div class="block image plain" style="width:80px; height:80px;">
  <img src="/images/fan.jpg" alt="Вентилятор">
</div>
```

### `title-input`
```html
<div class="block title-input plain">
  <span class="title">Ввод значения</span>
  <div class="value">
    <span class="prefix">Сумма</span>
    <input class="input" data-reg="16" data-type="s2"
           data-min="" data-max="" data-decimal-places="3">
    <button class="input-reset" title="Сбросить">×</button>
    <span class="postfix">А</span>
    <button class="input-save">💾</button>
  </div>
</div>
```

### `empty-box`
```html
<div class="block empty-box" style="width:235px; height:345px;">
  <span class="box-title">Заслонка входная</span>
  <img class="node image plain" src="/images/damper.jpg" style="left:60px; top:30px;">
  <div class="node title-group-number plain" style="left:0; top:130px;">
    <div class="value">
      <span class="prefix">Температура</span>
      <span class="number" data-reg="0" data-type="u2">--</span>
    </div>
  </div>
</div>
```

### `node-card`
```html
<div class="block node-card has-toggle off" data-reg="20" data-type="b2"
     style="width:210px; height:345px;">
  <span class="elem-icon"><svg>...</svg></span>
  <span class="hint-icon"><svg>...</svg></span>
  <span class="state-dot"></span>
  <div class="title">Приточка</div>
  <img class="node image plain" src="/images/in-fan.jpg" style="left:60px; top:30px;">
  <div class="node title-group-number plain" style="left:0; top:130px;">
    <div class="value">
      <span class="prefix">Скорость</span>
      <span class="number" data-reg="16" data-type="f4">--</span>
      <span class="postfix"> м/с</span>
    </div>
  </div>
  <div class="hold-indicator"></div>
</div>
```

---

## Соответствие «старое → новое»

| Старое | Новое | Комментарий |
|---|---|---|
| `.content` | `.value` | семантичнее |
| `.title-group-number .content:not(:first-child)` | `.title-group-number > .value:not(:first-of-type)` | чётче |
| `.toggle-button` (на `<button>`) | `.toggle` | короче |
| `data-reg` на `.content` | `data-reg` на носителе | единая точка |
| `.input-value-field` | `.input` | короче |
| `.input-reset-btn` | `.input-reset` | короче |
| `.input-save-btn` | `.input-save` | короче |
| `.empty-box-container` | — | удалено |
| `.empty-box-title` | `.box-title` | короче |
| `.block.X` внутри `empty-box` | `.node X` | дети контейнера |
| `.image-wrapper` + `.image-block` | `<img>` напрямую | убрано |