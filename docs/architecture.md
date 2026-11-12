# Архитектура HMI

**Версия документа:** 2.1
**Дата:** 2026-11
**Статус:** актуально после рефакторинга (Этап 2 — баги; косметика — вынос утилит)

---

## Три шага (главное)

Вся модель — три шага. Если запомнил их — запомнил всё.

1. RENDER      JSON  →  DOM
   BlockRenderer.renderBlocks() → blockRegistry → block.render()

2. REGISTER    DOM   →  Map
   block.render() в конце зовёт ctx.updater.addXXX(regId, el, ...)
   updater.caches.{spans, inputs, toggles, nodeCards, svgs, buttons}.set(...)

3. UPDATE      Map   →  DOM
   app._startPolling() → setInterval(300ms) → updater.update()
   updater.update(): один GET /api/modbus, обход 6 кешей, запись в DOM

**Поверх трёх шагов** (не участвуют в цикле):
- popupService — модалка (тренд, меню). Открывается по long-press.
- confirmService — модалка «Вы уверены?». Открывается по клику с confirm: true.
- numpadManager — модалка ввода. Открывается по клику в title-input.
- notification — тосты.
- validator — проверка min/max/decimalPlaces.

Эти сервисы **живут сбоку** и вызываются из обработчиков. К трём шагам отношения не имеют.

---

## Общая схема

┌──────────────────── Node.js (порт 4000) ─────────────────────┐
│                                                              │
│  /dev/modbus_rtu ──(mmap, C++ addon)──► Buffer 8192 B        │
│                                    (или testBuffer)          │
│                                                              │
│  GET /api/modbus             → Buffer.from(source)           │
│                                 (атомарный снимок)           │
│  POST /api/registers/:id     → запись одного регистра        │
│  GET /api/loadConfig?file=…  → projectConfig.json (с кэшем)  │
│  GET /*                      → index.html (SPA fallback)     │
│  GET /blocksData.json, /images/*, /css/*, /js/* → static    │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTP
                            ▼
┌──────────────────── Браузер ─────────────────────────────────┐
│                                                              │
│  app.js (оркестратор)                                        │
│    ├─ _setupScaling() — canvas 1600×1200 → fit to viewport   │
│    ├─ load projectConfig.json (рабочий / редактирование)     │
│    ├─ load blocksData.json (страницы экранов)                │
│    ├─ создать ctx { renderArea, updater, api, numpad,        │
│    │                validator, notification, popup, confirm }│
│    ├─ new BlockRenderer(ctx)                                 │
│    ├─ _renderPage(pageKey) → renderer.renderBlocks(blocks)   │
│    ├─ _startPolling() → каждые 300 мс updater.update()       │
│    └─ switchPage() → слушает window 'page-change'            │
│                                                              │
│  BlockRenderer — тонкий. Работает только через blockRegistry.│
│    ├─ renderBlocks(blocks) → для каждого блока new Cls(...)  │
│    ├─ clear() → unmounted() у всех блоков + очистка area     │
│    └─ blocks: Map<HTMLElement, BaseBlock>                    │
│                                                              │
│  blockRegistry — Map<type, Class>                            │
│    └─ заполняется в blocks/index.js при импорте              │
│                                                              │
│  BaseBlock — контракт:                                       │
│    ├─ render() → HTMLElement                                 │
│    ├─ mounted() / unmounted()                                │
│    ├─ this.data — объект блока из blocksData.json            │
│    ├─ this.ctx — контекст сервисов                           │
│    ├─ this.el — корневой HTMLElement                         │
│    ├─ makeRoot(extraClasses) — div.block + позиция           │
│    └─ esc(s) — экранирование HTML для innerHTML              │
│                                                              │
│  modbusUpdater — ядро обмена данными                         │
│    ├─ caches: spans / inputs / toggles / nodeCards / svgs    │
│    │          / buttons                                      │
│    ├─ update() — один GET /api/modbus + разбор по кэшам      │
│    ├─ updateButton(regId) / updateToggle(regId) /            │
│    │  updateSingleInput(regId) — точечное обновление после   │
│    │  writeRegister (читает СВЕЖИЙ снимок)                  │
│    ├─ getInput(regId) — доступ к input из send-button        │
│    └─ readValue(dataView, offset, type) — низкоуровневое     │
│       чтение (для lastDataView в click-обработчиках)         │
│                                                              │
│  apiClient — HTTP + lastDataView                             │
│    ├─ readModbus() → DataView, ОБНОВЛЯЕТ this.lastDataView   │
│    ├─ lastDataView — последний успешный снимок /api/modbus   │
│    └─ writeRegister(regId, value, type) → POST               │
│                                                              │
│  utils:                                                      │
│    ├─ format.js — parseBlockFormat, applyFormat              │
│    ├─ condition.js — evalCondition (DSL для if)              │
│    ├─ flash.js — flash(el, 'success'|'error')                │
│    ├─ regSpec.js — parseRegSpec(spec, defaultType)           │
│    └─ parseInputConfig.js — разбор data title-input          │
└──────────────────────────────────────────────────────────────┘

---

## Структура каталогов

public/
├── index.html
├── blocksData.json              — декларативная схема всех экранов
├── projectConfig.json           — { isEditUIMode: bool }
├── css/
│   └── style.css
├── images/
└── js/
    ├── app.js                   — оркестратор
    ├── constants.js             — CONFIG (в т.ч. CANVAS_W/H), BLOCK_TYPES
    │
    ├── api/
    │   └── apiClient.js         — HTTP-клиент + lastDataView
    │
    ├── core/
    │   ├── modbusUpdater.js     — кэши, чтение/запись, форматирование
    │   ├── validator.js         — валидация/коррекция значений
    │   ├── notification.js      — тосты
    │   ├── numpad.js            — тонкий фасад numpadManager
    │   ├── numpad/
    │   │   ├── NumpadController.js  — логика ввода, config, callbacks
    │   │   ├── NumpadView.js        — только DOM
    │   │   └── numpadMarkup.js      — HTML-строка + NUMPAD_KEYS
    │   ├── popupService.js      — глобальные попапы (тренд, меню)
    │   ├── confirmService.js    — глобальный диалог подтверждения
    │   └── blockRegistry.js     — реестр типов блоков
    │
    ├── utils/
    │   ├── format.js            — parseBlockFormat, applyFormat
    │   ├── condition.js         — evalCondition (DSL для if)
    │   ├── flash.js             — flash(el, kind, ms)
    │   ├── regSpec.js           — parseRegSpec(spec, defaultType)
    │   └── parseInputConfig.js  — разбор data title-input
    │
    ├── renderer/
    │   └── blockRenderer.js     — тонкий рендерер (только через registry)
    │
    └── blocks/
        ├── baseBlock.js
        ├── index.js             — регистрация всех типов
        ├── onlyTitleBlock.js
        ├── onlyNumberBlock.js
        ├── titleNumberBlock.js
        ├── titleGroupNumberBlock.js
        ├── toggleButtonBlock.js
        ├── pageButtonBlock.js
        ├── imageBlock.js
        ├── sendButtonBlock.js
        ├── svgBlock.js
        ├── titleInputBlock.js   — тонкий, вся логика в titleInput/
        ├── titleInput/
        │   ├── InputController.js  — валидация, numpad, dirty, save
        │   └── inputMarkup.js      — HTML-строка
        └── nodeCardBlock.js

---

## Поток данных

┌──────────────┐
│  Server      │  GET /api/modbus  → Buffer.from(source) (8192 байта)
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ apiClient        │  readModbus() → DataView
│                  │  this.lastDataView = view
└──────┬───────────┘
       │
       ├──────────────────────────────────────────────┐
       │                                              │
       ▼                                              ▼
┌────────────────────────────┐          ┌─────────────────────────┐
│ modbusUpdater.update()     │          │ Click-обработчик        │
│ (каждые 300 мс)            │          │ (toggle по карточке)     │
│                            │          │                         │
│ for span     → textContent │          │ const v = api.lastDataView
│ for toggle   → classList   │          │ readValue(v, ...)        │
│ for nodeCard → rules       │          │ toggle → writeRegister   │
│ for input    → если не     │          │ → updateButton/updateToggle
│   dirty → value            │          │ → СВЕЖИЙ readModbus()    │
│ for svg      → updateByReg │          │                         │
└────────────────────────────┘          └─────────────────────────┘
       ▲                                              │
       │ POST /api/registers/:id                     │
       │                                              │
┌──────┴───────┐                                     │
│  Block       │  user click ─────────────────────────┘
│  (BaseBlock) │
└──────────────┘

**Ключевые детали:**
- Клиент не знает про реальные Modbus-адреса — работает с regId.
- offset = regId * 2 — единая формула на клиенте и сервере.
- Endianness — little-endian везде.
- Типы: u2, s2, f4, b0…b15.
- Один regId может быть представлен несколькими блоками.
- **Чтение без записи** (toggle) — api.lastDataView. Без лишнего HTTP.
- **Чтение после записи** — **свежий** readModbus(). Иначе кнопка мигнёт обратно.

---

## Контекст блока (ctx)

{
    renderArea: HTMLElement,     // #render-area
    updater: modbusUpdater,      // ядро обмена
    api: apiClient,              // HTTP-клиент + lastDataView
    numpad: numpadManager,       // экранная клавиатура
    validator: validator,        // валидатор значений
    notification: notification,  // тосты
    popup: popupService,         // глобальные попапы
    confirm: confirmService      // глобальный confirm
}

Блок **никогда** не импортирует сервисы напрямую — только через this.ctx.

---

## Режимы работы

**Рабочий** (isEditUIMode: false):
- Загружается blocksData.json.
- Рендерится первая страница.
- Запускается polling каждые 300 мс.

**Режим редактирования** (isEditUIMode: true):
- То же + setInterval каждые 500 мс перезагружает blocksData.json и перерисовывает текущую страницу.
- ConfigService на сервере кэширует файл. Для live-reload нужно сбрасывать кэш (сейчас не реализовано).

---

## Навигация между страницами

Страницы — ключи верхнего уровня в blocksData.json: main, settings, shit.

Переключение — через page-button:
1. Клик → window.dispatchEvent('page-change', { targetPage }).
2. app.js слушает, вызывает switchPage(pageKey).
3. switchPage → _renderPage → updater.clearCaches() + renderer.renderBlocks(blocks).

**Важно:** clearCaches() вызывается **до** рендера.

---

## Холст и масштабирование

- Логический размер — CONFIG.CANVAS_W × CONFIG.CANVAS_H в constants.js (сейчас 1600×1200).
- style.css **не задаёт** width/height у #render-area — размер ставится из app.js:_setupScaling().
- visibility: hidden до инициализации — чтобы не было 0×0 на время загрузки.
- scale = Math.min(innerWidth/CANVAS_W, innerHeight/CANVAS_H).
- Тач: координаты кликов пересчитываются браузером автоматически.

**Чтобы поменять размер холста:** правишь CONFIG.CANVAS_W/H. Но blocksData.json привязан к 1600×1200.

---

## Что удалено при рефакторинге

- public/js/blocks/emptyBoxBlock.js — используйте node-card.
- public/js/blockRenderer.js — заменён на renderer/blockRenderer.js.
- public/js/pageManager.js — не использовался.
- public/js/scalingManager.js — дублировал _setupScaling().
- CSS .block.empty-box, .block.node-card .elem-icon, .block.node-card > .title — удалены.
- Дублирующий CSS POPUP SERVICE (~200 строк) — удалён.
- new Function в svgBlock._evaluate — заменён на безопасный DSL.
- BlockRenderer._counter и setRenderArea — удалены.
- nodeCardBlock._pointerDown — удалён (мёртвое поле).
- modbusUpdater._applyFormat — удалён, импорт из utils/format.js.
- svgBlock._evaluate / _evalExpr / _splitTopLevel — удалены, импорт из utils/condition.js.
- nodeCardBlock.splitRegSpec — удалён, импорт из utils/regSpec.js.

---

## Известные ограничения

- **Тренды** в popupService — заглушка с фейковыми данными.
- **Серверные баги** (RMW-гонка, validateRegister + f4, ConfigService.cache) — известны, не исправлены.