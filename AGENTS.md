# visualHMI v2.0 — Modbus HMI панель

## Быстрый старт
- **Запуск:** `npm start` или `npm run dev` (nodemon, Express `:4000`)
- **Зависимости:** `express` ^4.18 (prod), `nodemon` ^3.0 (dev)

## Архитектура
```
server/              ← CommonJS (require / module.exports)
  index.js           — Express, API маршруты, инициализация
  configService.js   — ConfigService (class): загрузка + кэширование JSON
  modbusService.js   — ModbusService (singleton): чтение/запись буфера
  registerUtils.js   — чистые функции: readRegister/writeRegister/validateRegister

public/js/           ← ES Modules (import / export)
  app.js             — App (class): жизненный цикл, __app в window для отладки
  apiClient.js       — ApiClient (singleton): fetch с AbortController/timeout
  blockRenderer.js   — BlockRenderer (class): createBlock + _create* для каждого типа
  modbusUpdater.js   — ModbusUpdater (singleton): 3 кэша (spans/inputs/toggles)
  constants.js       — CONFIG (пути, интервалы) + BLOCK_TYPES
```

## API (сервер)
- `GET /api/modbus` — сырые байты буфера (application/octet-stream)
- `GET /api/loadConfig?file=...` — JSON из `public/` (с path traversal check)
- `POST /api/registers/:regId` — запись `{state, registerType}` (по умолч. `u2`)

## Типы блоков (BLOCK_TYPES)
`only-number`, `only-title`, `title-number`, `title-group-number`, `toggle-button`, `title-input`, `send-button`

## Ключевые особенности
- **ModbusUpdater** 3 кэша: `.caches.spans`, `.caches.inputs`, `.caches.toggles`. Ключи — строковые ID регистров.
- **sendingRegisters** (Set) и **editingInputs** (Set) — защита от перезаписи во время отправки/редактирования.
- **toggle-button** отправляет 0/1 через API, ждёт 400ms, затем обновляется из поллинга.
- **title-input** может иметь `showSaveButton` (💾), `autoSave` (blur), `size` (ширина поля). Отправка по Enter.
- **send-button** читает значения из кэша inputs (с fallback в DOM по `.input-value-field[data-reg]`).
- **Block IDs:** `block-${index}` (генерируются в `renderBlocks`).
- **Режим редактирования** (`isEditUIMode: true`): полная перерисовка DOM каждые 500ms.
- **Инициализация Modbus:** try mmap (`build/Release/modbus_mmap.node`) → fallback `testBuffer`.
- **Типы регистров:** `u2` (uint16 LE), `s2` (int16 LE), `f4` (float32 LE), `b0`-`b15` (бит).
- **Битовые регистры** (`b0`-`b15`): при записи mask + shift, при чтении shift + &1.

## Отладка
- `__app.getState()`, `__app.updater.caches`, `__app.restart()`, `__app.stop()` — в консоли браузера.

## Gotchas
- Порт хардкодом 4000 в `server/index.js` (env не читается).
- `configService` кэширует конфиги в памяти — при ручном изменении `blocksData.json` нужен сброс кэша или перезапуск.
- Для mmap нужен Linux с `/dev/modbus_rtu`; на Windows и macOS всегда `testBuffer`.
- `const ports = require('portfinder')` не используется — порт фиксированный.
- `writeRegister` на клиенте (apiClient.js) парсит `value` в число, для битовых типов принимает только 0/1.
- `registerUtils.js` НЕ имеет обработчика для чтения/записи битовых регистров через `getRegisterType` — биты обрабатываются отдельно в writeRegister.
