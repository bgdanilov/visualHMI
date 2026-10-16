# Целевая разметка блоков HMI

**Версия:** v1 (этап B рефакторинга)
**Статус:** в работе — часть блоков уже мигрирована, часть ещё на старой разметке
**Принцип:** один `.block` — один корень, без лишних обёрток; `data-*` — только на носителе значения; классы короткие и семантичные

---

## 📐 Общие правила

1. **Корень блока** — всегда `<div class="block <type>">` + опционально `.plain`.
2. **Позиция** — `style="left: Xpx; top: Ypx"` на корне.
3. **`data-*` только на носителе значения**: `span.number`, `button.toggle`, `input.input`. Никаких `data-reg` на обёртках.
4. **`data-type` (регистра)** — там же, где `data-reg`.
5. **Никаких `.content`** — вместо неё `.value` (строка значения) или ничего.
6. **Внутренний заголовок блока** — `span.title` прямо в корне (или в `.value` для многострочных).
7. **Дочерние блоки внутри контейнера** — класс `.node` (без `.block`).
8. **`innerHTML`** — единственный способ построения разметки (договорено, без хелпера `h()`).

---

## 🧩 Словарь селекторов

| Селектор | Назначение | Где живёт |
|---|---|---|
| `.block` | Корень любого блока | `<div class="block ...">` |
| `.block.plain` | Без фона/рамки/тени | модификатор корня |
| `.title` | Внутренний заголовок блока | `<span class="title">` |
| `.value` | Строка значения (замена `.content`) | `<div class="value">` |
| `.prefix` | Текст перед числом | `<span class="prefix">` |
| `.number` | Числовое значение (носитель `data-reg`) | `<span class="number" data-reg data-type>` |
| `.postfix` | Текст после числа | `<span class="postfix">` |
| `.toggle` | Кнопка-переключатель | `<button class="toggle off">` |
| `.toggle.on` / `.toggle.off` / `.toggle.waiting` | Состояния | классы на `<button>` |
| `.page-button` | Кнопка навигации по страницам | `<button class="page-button">` |
| `.send-button` | Кнопка отправки группы регистров | `<button class="send-button">` |
| `.input` | Поле ввода (носитель `data-reg`) | `<input class="input" data-reg data-type>` |
| `.input-reset` | Кнопка сброса поля | `<button class="input-reset">` |
| `.input-save` | Кнопка «💾» сохранения одного поля | `<button class="input-save">` |
| `.image` | Блок картинки | `<div class="block image">` или `<img class="image">` |
| `.node` | Дочерний блок внутри контейнера | `<div class="node ...">` |
| `.box-title` | Заголовок контейнера `empty-box` | `<span class="box-title">` |

---

## 🧱 Разметка по типам блоков

### `only-title`

Просто текстовый заголовок.

```html
<div class="block only-title plain" style="left:20px; top:20px;">
  <span class="title">РЕКУПЕРАТОР</span>
</div>
```

---

### `only-number`

Одно число с префиксом/постфиксом.

```html
<div class="block only-number plain" style="left:20px; top:80px;">
  <div class="value">
    <span class="prefix">P = </span>
    <span class="number" data-reg="2" data-type="f4">--</span>
    <span class="postfix"> кВт</span>
  </div>
</div>
```

---

### `title-number`

Заголовок + одно число.

```html
<div class="block title-number plain" style="left:20px; top:140px;">
  <span class="title">Температура на улице</span>
  <div class="value">
    <span class="prefix">=</span>
    <span class="number" data-reg="2" data-type="f4">--</span>
    <span class="postfix"> С</span>
  </div>
</div>
```

---

### `title-group-number`

Заголовок + несколько строк значений.

```html
<div class="block title-group-number plain" style="left:20px; top:200px;">
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

> Все `.value`, кроме первого, выравниваются по правому краю (CSS `.title-group-number > .value:not(:first-of-type)`).

---

### `toggle-button`

Кнопка-переключатель. `data-*` — на `<button>`.

```html
<div class="block toggle-button plain" style="left:20px; top:260px;">
  <div class="value">
    <span class="prefix btn">Заслонка: </span>
    <button
      class="toggle off"
      data-reg="20"
      data-type="b0"
      data-text-on="Открыта"
      data-text-off="Закрыта"
    >Закрыта</button>
  </div>
</div>
```

> Если `prefix` не задан — `<span class="prefix btn">` не создаётся.
> Состояние: `.off` (по умолчанию) → `.on` (включено) → `.waiting` (идёт запись).

---

### `page-button`

Кнопка навигации.

```html
<div class="block page-button" style="left:20px; top:20px;">
  <div class="value">
    <button class="page-button" data-target="main">На главную</button>
  </div>
</div>
```

---

### `send-button`

Кнопка отправки группы регистров. Пока не мигрирован.

```html
<div class="block send-button" style="left:400px; top:430px;">
  <div class="value">
    <button class="send-button" data-reg="16,18,20,21">Сохранить</button>
  </div>
</div>
```

> Состояния: `.sending`, `.success`, `.error`, `.partial` — классы на `<button>`.

---

### `image`

Картинка. Два варианта — с обёрткой и без.

**Простой вариант (без обёртки):**

```html
<img
  class="block image plain"
  src="/images/fan.jpg"
  alt="Вентилятор"
  style="left:60px; top:30px; width:80px; height:80px; object-fit:contain;"
>
```

**С обёрткой (для вращения, overflow, доп. стилей):**

```html
<div class="block image plain" style="left:60px; top:30px;">
  <img src="/images/fan.jpg" alt="Вентилятор" style="width:80px; height:80px; object-fit:contain;">
</div>
```

> Вращение: классы `.spinning`, `.spin-slow`, `.spin-fast`, `.spin-pause`, `.spin-reverse` — на `<img>`.

---

### `title-input`

Заголовок + редактируемое поле. `data-*` — на `<input>`.

```html
<div class="block title-input plain" style="left:400px; top:100px;">
  <span class="title">Ввод значения</span>
  <div class="value">
    <span class="prefix">Сумма</span>
    <input
      class="input"
      data-reg="16"
      data-type="s2"
      data-min=""
      data-max=""
      data-decimal-places="3"
      style="width: 70px;"
    >
    <button class="input-reset" title="Сбросить">×</button>
    <span class="postfix">А</span>
    <button class="input-save">💾</button>
  </div>
</div>
```

> Состояния: `.input-changed` — на `<input>`, если значение отличается от `originalValue`.
> `.input-save` создаётся только если `showSaveButton: true`.

---

### `empty-box`

Контейнер с заголовком и дочерними блоками.

```html
<div class="block empty-box" style="left:50px; top:535px; width:235px; height:345px;">
  <span class="box-title">Заслонка входная</span>

  <!-- дети — .node, БЕЗ .block -->
  <img
    class="node image plain"
    src="/images/damper.jpg"
    style="left:60px; top:30px; width:80px; height:80px;"
  >

  <div class="node title-group-number plain" style="left:0; top:130px;">
    <div class="value">
      <span class="prefix">Температура</span>
      <span class="number" data-reg="0" data-type="u2">--</span>
      <span class="postfix"> С</span>
    </div>
  </div>

  <div class="node toggle-button plain" style="left:50px; top:250px;">
    <div class="value">
      <button
        class="toggle off"
        data-reg="20"
        data-type="b0"
        data-text-on="Открыта"
        data-text-off="Закрыта"
      >Закрыта</button>
    </div>
  </div>
</div>
```

**Правила:**
- Дети имеют класс `.node` вместо `.block` (стили «голого» блока навешиваются через `.node`).
- Координаты детей — **относительно контейнера**, `position: absolute`.
- `.empty-box` имеет `position: relative` (вместо старого `.empty-box-container`).
- Заголовок — `.box-title`, абсолютно позиционирован по центру сверху.
- Дочерние `.node.toggle-button[data-reg][data-type]` регистрируются в `updater.addToggle` — состояние приходит из опроса.

---

## 🔄 Соответствие «старое → новое»

| Старое | Новое | Комментарий |
|---|---|---|
| `.block.X` + `.content` | `.block.X` без обёртки | `.content` убрана |
| `.content` (строка значения) | `.value` | семантичнее |
| `.title-group-number .content:not(:first-child)` | `.title-group-number > .value:not(:first-of-type)` | чётче |
| `span.number` | `span.number` | оставляем |
| `span.prefix` / `span.postfix` | `span.prefix` / `span.postfix` | оставляем |
| `span.title` (в `only-title`) | `span.title` в корне | без `.content` |
| `.toggle-button` (на `<button>`) | `.toggle` (на `<button>`) | короче |
| `.toggle-button.off` | `.toggle.off` | короче |
| `data-reg` на `.content` | `data-reg` на носителе (`span.number`, `button.toggle`, `input.input`) | единая точка |
| `data-type` на `.content` | `data-type` на носителе | единая точка |
| `.input-value-field` | `.input` | короче |
| `.input-reset-btn` | `.input-reset` | короче |
| `.input-save-btn` | `.input-save` | короче |
| `.empty-box-container` | — (удалён) | `position:relative` на `.empty-box` |
| `.empty-box-title` | `.box-title` | короче |
| `.block.X` внутри `empty-box` | `.node X` | дети контейнера |
| `.image-wrapper` + `.image-block` | `<img>` напрямую | убрано |

---

## 🎨 CSS: где что стилизуется

| Селектор | Файл | Статус |
|---|---|---|
| `.block` | `style.css` (старый) | ✅ уже есть |
| `.block.plain` | `style.css` (старый) | ✅ уже есть |
| `.title` (внутренний) | `style.css` (старый) + новый | ✅ |
| `.value` | новый блок CSS | ✅ добавлен |
| `.prefix` / `.number` / `.postfix` | `style.css` (старый) | ✅ |
| `.toggle` / `.toggle.on` / `.toggle.off` / `.toggle.waiting` | новый блок CSS (todo) | ⏳ |
| `.page-button` | новый блок CSS | ✅ добавлен |
| `.send-button` | старый `.send-button button` | ⏳ переписать |
| `.image` | `style.css` (старый) | ✅ |
| `.node` | новый блок CSS (todo) | ⏳ |
| `.box-title` | новый блок CSS (todo) | ⏳ |
| `.input` | старый `.title-input input[type="text"]` | ⏳ переписать |
| `.input-reset` | старый `.input-reset-btn` | ⏳ переписать |
| `.input-save` | старый `.input-save-btn` | ⏳ переписать |

---

## 📌 Правила, которые не обсуждаются

1. **`data-reg` — только на носителе значения.** Не на обёртке.
2. **`.value` — только для строк значения.** Заголовок — не в `.value`.
3. **`.node` внутри `empty-box` не имеет `.block`.** Это не вложенный блок, это ребёнок контейнера.
4. **`data-reg` + `data-type` — всегда рядом.** Нельзя `data-reg` без `data-type`, и наоборот.
5. **Один блок — один файл.** `blocks/<name>Block.js`, camelCase.
6. **`render()` возвращает корневой элемент.** `null` — если блок «пустой» и его не надо рендерить.
7. **`innerHTML` — единственный способ разметки.** Без хелперов типа `h()`.
8. **CSS-селекторы старые не удаляются до этапа D.** Добавляем новое, старое живёт параллельно.

---

## 🚦 Статус миграции

| Блок | Разметка | CSS |
|---|---|---|
| `only-title` | ✅ новая | ✅ |
| `only-number` | ✅ новая | ✅ |
| `title-number` | ✅ новая | ✅ |
| `title-group-number` | ✅ новая | ✅ |
| `toggle-button` | ✅ новая | ⏳ |
| `page-button` | ✅ новая | ✅ |
| `send-button` | ⏳ | ⏳ |
| `image` | ⏳ | ✅ (старый) |
| `title-input` | ⏳ | ⏳ |
| `empty-box` | ⏳ | ⏳ |

---

**Документ живой.** По мере миграции блоков — обновляем статусы и дописываем недостающие селекторы.