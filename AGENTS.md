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
  blockRenderer.js   BlockRenderer (class): createBlock + _create* для каждого из 9 типов
  modbusUpdater.js   ModbusUpdater (singleton): 3 кэша (spans/inputs/toggles), поллинг 300ms
  constants.js       CONFIG (пути, интервалы) + BLOCK_TYPES
  scalingManager.js  ScalingManager (singleton): масштабирование холста 1280×760
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
- `scalingManager.js` — холст 1280×760, `transform: scale()` под размер окна + центрирование
- `app._setupScaling()` — пересчёт на `resize`

### Dirty-трекинг (title-input)
- `modbusUpdater.caches.inputs` хранит `originalValue` для каждого input
- `update()` polling (300ms) пропускает dirty-инпуты (`input.value !== originalValue`)
- Изменённый input получает класс `.input-changed` (жёлтая рамка)
- × кнопка сброса восстанавливает `originalValue` из кэша
- `updateOriginalValue(regId, value)` вызывается после успешного сохранения

### Send-button
- Следит за событием `input-dirty-change` — дизейблит кнопку когда ни один reg не изменён
- `data-reg` может содержать несколько ID через запятую
- Если `regInfo` нет в кэше — fallback через DOM-селектор `.input-value-field[data-reg="..."]`

### Toggle-button
- Отправляет 0/1 через API → ждёт 400ms → поллинг обновляет состояние
- `waiting` CSS-класс с пульсацией

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

## Gotchas
- Порт 4000 хардкодом в `server/index.js`
- `sendingRegisters` маркируется ДО сбора значений (не после) — борьба с race condition между blur и поллингом
- `send-button` пишет даже пустые строки; проверка `if (!value)` только на falsy, пустая строка пропускается
- В `_startEditMode()` индентация колбэка сломана (лишний 4-пробельный отступ перед `const data`) — не трогать, работает
- `projectConfig.json` загружается через `/api/loadConfig` — сервер кэширует; при ручном изменении нужен перезапуск сервера
