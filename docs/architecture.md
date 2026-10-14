# Архитектура HMI

**Версия документа:** 1.0
**Дата:** 2026-10
**Статус:** актуально после рефакторинга (BaseBlock, блоки, node-card)

---

## Общая схема

```
┌──────────────────── Node.js (порт 4000) ─────────────────────┐
│                                                              │
│  /dev/modbus_rtu ──(mmap, C++ addon)──► Buffer 8192 B        │
│                                    (или testBuffer)          │
│                                                              │
│  GET /api/modbus             → весь буфер (octet-stream)     │
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
│    ├─ _setupScaling() — canvas 1600×1000 → fit to viewport   │
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
│    └─ blocks: Map<id, BaseBlock>                             │
│                                                              │
│  blockRegistry — Map<type, Class>                            │
│    └─ заполняется в blocks/index.js при импорте              │
│                                                              │
│  BaseBlock — контракт:                                       │
│    ├─ render() → HTMLElement                                 │
│    ├─ mounted() / unmounted()                                │
│    ├─ this.data — объект блока из blocksData.json            │
│    ├─ this.ctx — контекст сервисов                           │
│    └─ this.el — корневой HTMLElement                         │
│                                                              │
│  modbusUpdater — ядро обмена данными                         │
│    ├─ caches: spans / inputs / toggles / nodeCards           │
│    ├─ update() — один GET /api/modbus + разбор по кэшам      │
│    └─ writeRegister() через apiClient                        │
│                                                              │
│  Сервисы: numpad, validator, notification, popup, confirm    │
└──────────────────────────────────────────────────────────────┘
```

---

## Структура каталогов

```
public/
├── index.html
├── blocksData.json              — декларативная схема всех экранов
├── projectConfig.json           — { isEditUIMode: bool }
├── css/
│   └── style.css
├── images/
└── js/
    ├── app.js                   — оркестратор
    ├── constants.js             — CONFIG, BLOCK_TYPES
    │
    ├── api/
    │   └── apiClient.js         — HTTP-клиент
    │
    ├── core/
    │   ├── modbusUpdater.js     — кэши, чтение/запись, форматирование
    │   ├── validator.js         — валидация/коррекция значений
    │   ├── notification.js      — тосты
    │   ├── numpad.js            — экранная клавиатура
    │   ├── popupService.js      — глобальные попапы (тренд, меню)
    │   ├── confirmService.js    — глобальный диалог подтверждения
    │   └── blockRegistry.js     — реестр типов блоков
    │
    ├── utils/
    │   └── format.js            — parseBlockFormat, applyFormat
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
        ├── titleInputBlock.js
        ├── emptyBoxBlock.js
        └── nodeCardBlock.js
```

---

## Поток данных

```
┌──────────────┐
│  Server      │  GET /api/modbus  → Buffer (8192 байта)
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ apiClient        │  readModbus() → DataView
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ modbusUpdater.update()                       │
│                                              │
│  for span     → offset = regId*2 → format → │
│                 span.textContent             │
│  for toggle   → bit → classList on/off + text│
│  for nodeCard → bit → classList on/off       │
│  for input    → если не dirty → input.value  │
└──────────────────────────────────────────────┘
       ▲
       │ POST /api/registers/:id
       │
┌──────┴───────┐
│  Block       │  user click → api.writeRegister
│  (BaseBlock) │              → updater.update() для синхронизации
└──────────────┘
```

**Ключевые детали:**
- Клиент не знает про реальные Modbus-адреса — работает с «номером 16-битного слова» (`regId`).
- `offset = regId * 2` — единая формула на клиенте и сервере.
- Endianness — little-endian везде.
- Типы: `u2` (uint16), `s2` (int16), `f4` (float32), `b0…b15` (биты).
- Один `regId` может быть представлен на UI несколькими блоками — например, регистр 20 как `b0…b9`.

---

## Контекст блока (`ctx`)

Все блоки получают единый объект `ctx`:

```js
{
    renderArea: HTMLElement,     // #render-area
    updater: modbusUpdater,      // ядро обмена
    api: apiClient,              // HTTP-клиент
    numpad: numpadManager,       // экранная клавиатура
    validator: validator,        // валидатор значений
    notification: notification,  // тосты
    popup: popupService,         // глобальные попапы
    confirm: confirmService      // глобальный confirm
}
```

Блок **никогда** не импортирует сервисы напрямую — только через `this.ctx`.

---

## Режимы работы

**Рабочий** (`isEditUIMode: false`):
- Загружается `blocksData.json`.
- Рендерится первая страница.
- Запускается polling каждые 300 мс.

**Режим редактирования** (`isEditUIMode: true`):
- То же самое + `setInterval` каждые 500 мс перезагружает `blocksData.json` и перерисовывает текущую страницу.
- Используется для live-reload UI из JSON (правки в файле видны сразу).

---

## Навигация между страницами

Страницы — ключи верхнего уровня в `blocksData.json`: `main`, `settings`, `graff`, `shit`.

Переключение — через `page-button`:
1. Клик → `window.dispatchEvent('page-change', { targetPage })`.
2. `app.js` слушает, вызывает `switchPage(pageKey)`.
3. `switchPage` → `_renderPage` → `updater.clearCaches()` + `renderer.renderBlocks(blocks)`.

**Важно:** `clearCaches()` вызывается **до** рендера, чтобы при переключении кэши были пустыми.

---

## Что удалено при рефакторинге

- `public/js/blockRenderer.js` — заменён на `renderer/blockRenderer.js`.
- `public/js/pageManager.js` — не использовался, импортировал несуществующий `EVENTS`.
- `public/js/scalingManager.js` — дублировал `_setupScaling()` в `app.js`.