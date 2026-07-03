# visualHMI v2.0 — Modbus HMI панель

## Быстрый старт
- `npm start` / `npm run dev` (nodemon) — Express на `:4000`
- Зависимости: `express` ^4.18 (prod), `nodemon` ^3.0 (dev)
- Нет тестов, линтера, тайпчекера, билд-степа

## Модульная система
```
server/           ← CommonJS (require / module.exports)
  index.js            Express + API маршруты
  configService.js    ConfigService (class): загрузка + кэш JSON (только projectConfig.json)
  modbusService.js    ModbusService (singleton): буфер 8192 байт (4096 регистров × 2)
  registerUtils.js    Чистые функции: readRegister/writeRegister/validateRegister

public/js/        ← ES Modules (import / export)
  app.js             App (class): жизненный цикл, __app в window для отладки
  apiClient.js       ApiClient (singleton): fetch + AbortController/timeout
  blockRenderer.js   BlockRenderer (class): createBlock + _create* для каждого из 8 типов
  modbusUpdater.js   ModbusUpdater (singleton): 3 кэша (spans/inputs/toggles), поллинг 300ms
  constants.js       CONFIG (пути, интервалы) + BLOCK_TYPES
  scalingManager.js  ScalingManager (singleton): масштабирование холста 1280×760
  numpad.js          NumpadManager (singleton): модальный нумпад для title-input
```

## API
- `GET /api/modbus` — сырые байты буфера (application/octet-stream)
- `GET /api/loadConfig?file=...` — JSON из `public/` (path traversal check); **только** для `projectConfig.json`
- `POST /api/registers/:regId` — запись `{state, registerType}` (по умолч. `u2`)

## Ключевые особенности

### Загрузка конфигов
- **`projectConfig.json`** — через `/api/loadConfig` (сервер кэширует, загружается 1 раз)
- **`blocksData.json`** — напрямую как статика (`fetch('/blocksData.json')`), без серверного кэша

### Масштабирование
- `app._setupScaling()` — холст 1280×760, `transform: scale()` под размер окна + центрирование, пересчёт на `resize`

### Dirty-трекинг (title-input)
- `modbusUpdater.caches.inputs` хранит `originalValue` для каждого input
- `update()` polling (300ms) пропускает dirty-инпуты (`input.value !== originalValue`)
- Изменённый input получает класс `.input-changed` (жёлтая рамка)
- × кнопка сброса восстанавливает `originalValue` из кэша
- `updateOriginalValue(regId, value)` вызывается после успешного сохранения

### Нумпад (title-input)
- При клике на `title-input` открывается модальный нумпад (центр экрана, `backdrop-filter: blur`)
- Цифры 0–9, точка (`.`), ⌫ (backspace), OK, Cancel
- Значение отображается в `<div class="numpad-display">` внутри нумпада
- OK: копирует значение в input, обновляет dirty-трекинг
- Cancel: восстанавливает `originalValue` из кэша
- На физической клавиатуре: Enter→OK, Escape→Cancel, Backspace→⌫, цифры/точка напрямую
- Пока нумпад открыт, input становится `readOnly` для предотвращения прямого ввода

### Send-button
- Следит за событием `input-dirty-change` — дизейблит кнопку когда ни один reg не изменён
- `data-reg` может содержать несколько ID через запятую
- Если `regInfo` нет в кэше — fallback через DOM-селектор `.input-value-field[data-reg="..."]`

### Toggle-button
- Отправляет 0/1 через API → ждёт 400ms → поллинг обновляет состояние
- `waiting` CSS-класс с пульсацией

### Формат-стринг (printf-стиль)
- Блоки `only-number`, `title-number`, `title-input`, `title-group-number` поддерживают `format` вместо `regAddress`/`regType`/`prefix`/`postfix`
- Синтаксис: `["printf-строка", regSpec]` где regSpec — число (регистр) или `"regId:type"` (явный тип)
- Вывод типа из printf-спецификатора: `%f`/`%e`/`%g` → `f4`, `%d`/`%i` → `s2`, `%u` → `u2`, `%c` → `b0`
- `_applyFormat(formatSpec, value, regType)` в `modbusUpdater.js` — форматирует значение по спецификатору
- `_parseBlockFormat(fmtStr, regSpec)` в `blockRenderer.js` — парсит `["prefix %f postfix", 0]` в textBefore/textAfter/regType/formatSpec
- Пример: `"format": ["Ток=%f А", 16]` для `title-number`/`title-input`/`only-number`, `"format": [["A=%f A", 0], ["20[0]=%c", "20:b0"]]` для `title-group-number`

### Блоки
- Типы: `only-number`, `only-title`, `title-number`, `title-group-number`, `toggle-button`, `title-input`, `send-button`, `page-button`
- Координаты `x`, `y` — абсолютный px в пространстве холста 1280×760

### Типы регистров
- `u2` (uint16 LE), `s2` (int16 LE), `f4` (float32 LE), `b0`–`b15` (бит)
- Смещение: `regId * 2` (BYTES_PER_REGISTER)
- Битовые: mask + shift на запись, shift + &1 на чтение

### Многостраничность
- `blocksData.json` — объект `{ pageKey: [blocks] }` или плоский массив (авто-обёртка в `{ main }`)
- `CustomEvent('page-change')` → `app.switchPage()` → `renderer.clear()` + `renderBlocks()`
- Поллинг Modbus не прерывается; кэши перестраиваются при рендере

### Режим редактирования
- `isEditUIMode: true` в `projectConfig.json` — полная перерисовка DOM каждые 500ms
- `blocksData.json` загружается как статика, без серверного кэша

### Защита от перезаписи
- `sendingRegisters` (Set), `editingInputs` (Set), `document.activeElement` — поллинг пропускает такие регистры

### Инициализация Modbus
- try `build/Release/modbus_mmap.node` (Linux c `/dev/modbus_rtu`) → fallback `Buffer.alloc(8192)` с тестовыми данными

## Отладка (браузер)
- `__app.restart()`, `__app.stop()`, `__app.updater.caches`

### Dead code
- `pageManager.js` существует, но **не импортирован** `app.js` (не используется); навигация по страницам реализована напрямую в `app.js`
- `scalingManager.js` экспортирует singleton, но **не импортирован** — масштабирование реализовано напрямую в `app._setupScaling()`
- `copy.md` в `public/js/` — планировочный артефакт (неактуальная документация по `pageManager`), не следовать
- `readme.md`, `architecture.md`, `architecture_short.md` — устаревшие/черновые документы; за актуальной информацией обращаться в `AGENTS.md`

## Gotchas
- Порт 4000 хардкодом в `server/index.js`
- `sendingRegisters` маркируется ДО сбора значений (не после) — борьба с race condition между blur и поллингом
- `send-button` пишет даже пустые строки; проверка `if (!value)` только на falsy, пустая строка пропускается
- В `_startEditMode()` индентация колбэка сломана (лишний 4-пробельный отступ перед `const data`) — не трогать, работает
- `projectConfig.json` загружается через `/api/loadConfig` — сервер кэширует; при ручном изменении нужен перезапуск сервера
