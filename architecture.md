Конечно! Вот полный Markdown-файл со всей схемой работы проекта:

```markdown
# 📊 Полная архитектура HMI-проекта

## 📁 Структура проекта

```
project/
├── public/
│   ├── index.html
│   ├── blocksData.json          # Конфигурация блоков
│   ├── projectConfig.json       # Конфигурация проекта
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── apiClient.js         # HTTP-клиент
│       ├── app.js               # Главный контроллер
│       ├── blockRenderer.js     # Фабрика блоков
│       ├── modbusUpdater.js     # Кэш и обновление данных
│       ├── numpad.js            # Экранная клавиатура
│       ├── pageManager.js       # Управление страницами (не используется)
│       ├── scalingManager.js    # Масштабирование (не используется)
│       └── constants.js         # Константы
├── server/
│   ├── index.js                 # Express сервер
│   ├── configService.js         # Загрузка конфигов
│   ├── modbusService.js         # Modbus через mmap
│   └── registerUtils.js         # Работа с регистрами
└── build/Release/
    └── modbus_mmap.node         # Native-модуль для mmap
```

---

## 🗺️ Полная архитектура проекта (клиент-сервер)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              БРАУЗЕР (Клиент)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                         index.html                                       │ │
│  │  <div id="render-area">  ← сюда рендерятся блоки                       │ │
│  │  <script type="module" src="/js/app.js"></script>                       │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                         app.js (App)                                    │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  initialize()                                                      │ │ │
│  │  │    → _setupScaling()          масштабирование                     │ │ │
│  │  │    → api.loadConfig()         загрузка projectConfig.json          │ │ │
│  │  │    → isEditMode?              проверка режима                     │ │ │
│  │  │         ├── true  → _startEditMode()    перезагрузка каждые 500ms│ │ │
│  │  │         └── false → _startProductionMode()   опрос 300ms         │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    blockRenderer.js (BlockRenderer)                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  renderBlocks(blocksData)                                         │ │ │
│  │  │    → очищает renderArea                                           │ │ │
│  │  │    → для каждого блока: createBlock()                            │ │ │
│  │  │         ├── only-number      → _createOnlyNumber()               │ │ │
│  │  │         ├── only-title       → _createOnlyTitle()                │ │ │
│  │  │         ├── title-number     → _createTitleNumber()              │ │ │
│  │  │         ├── title-group-number → _createTitleGroupNumber()       │ │ │
│  │  │         ├── toggle-button    → _createToggleButton()             │ │ │
│  │  │         ├── title-input      → _createTitleInput()               │ │ │
│  │  │         ├── send-button      → _createSendButton()               │ │ │
│  │  │         └── page-button      → _createPageButton()               │ │ │
│  │  │    → appendChild(block) в renderArea                             │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    modbusUpdater.js (ModbusUpdater)                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  caches: {                                                         │ │ │
│  │  │    spans:   Map<regId, { registerType, spans: [{element, formatSpec}] }>│
│  │  │    inputs:  Map<regId, { registerType, element, originalValue }>   │ │ │
│  │  │    toggles: Map<regId, { registerType, toggles: [button] }>       │ │ │
│  │  │  }                                                                 │ │ │
│  │  │  sendingRegisters: Set<regId>                                     │ │ │
│  │  │  editingInputs: Set<regId>                                        │ │ │
│  │  │                                                                    │ │ │
│  │  │  update()                                                          │ │ │
│  │  │    → api.readModbus()            получает DataView                │ │ │
│  │  │    → обновляет spans (числа)                                      │ │ │
│  │  │    → обновляет toggles (кнопки)                                   │ │ │
│  │  │    → обновляет inputs (поля ввода)                                │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                      apiClient.js (ApiClient)                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  _fetchWithTimeout(url, options)  ← AbortController, 5 сек        │ │ │
│  │  │                                                                    │ │ │
│  │  │  loadConfig(fileName)        → GET /api/loadConfig?file=...       │ │ │
│  │  │  loadStaticJSON(fileName)    → GET /{fileName}                    │ │ │
│  │  │  readModbus()                → GET /api/modbus  (возвращает DataView)│
│  │  │  writeRegister(regId, value, type) → POST /api/registers/{regId}  │ │ │
│  │  │  writeMultipleRegisters(registers) → Promise.all()                │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                      numpad.js (NumpadManager)                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  show(initialValue, { onOk, onCancel })                          │ │ │
│  │  │    → создаёт overlay с клавиатурой                                │ │ │
│  │  │    → обрабатывает ввод (цифры, точка, backspace)                 │ │ │
│  │  │    → onOk(val) / onCancel()                                      │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP (fetch)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              СЕРВЕР (Node.js + Express)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                      server/index.js (Express)                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  GET  /api/modbus       → modbusService.getData()                 │ │ │
│  │  │  GET  /api/loadConfig   → configService.loadConfigAsync()         │ │ │
│  │  │  POST /api/registers/:regId → modbusService.writeRegister()       │ │ │
│  │  │  GET  /*                → express.static(public)                  │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    server/configService.js (ConfigService)               │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  loadConfigAsync(fileName)                                        │ │ │
│  │  │    → проверка пути (безопасность)                                 │ │ │
│  │  │    → fs.readFile()                                                │ │ │
│  │  │    → JSON.parse()                                                 │ │ │
│  │  │    → кэширует в Map                                               │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    server/modbusService.js (ModbusService)              │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  initialize()                                                      │ │ │
│  │  │    → try: require('../build/Release/modbus_mmap')                 │ │ │
│  │  │         → mmapDevice('/dev/modbus_rtu')  ← РЕАЛЬНОЕ УСТРОЙСТВО    │ │ │
│  │  │    → catch: _initTestBuffer()            ← ТЕСТОВЫЙ РЕЖИМ         │ │ │
│  │  │                                                                    │ │ │
│  │  │  getData()      → возвращает Buffer (4096 регистров × 2 байта)    │ │ │
│  │  │  readRegister() → чтение по типу (u2/s2/f4/bN)                    │ │ │
│  │  │  writeRegister() → запись по типу                                 │ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                           │
│                                    ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │                    server/registerUtils.js                               │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  registerHandlers = {                                              │ │ │
│  │  │    u2: { read: readUInt16LE, write: writeUInt16LE, range: 0-65535}│ │ │
│  │  │    s2: { read: readInt16LE,  write: writeInt16LE,  range: -32768..32767}│
│  │  │    f4: { read: readFloatLE,  write: writeFloatLE }                │ │ │
│  │  │    bN: { битовая операция: current | (1<<bit) }                   │ │ │
│  │  │  }                                                                 │ │ │
│  │  │                                                                    │ │ │
│  │  │  readRegister(buffer, regId, type)   → handler.read(offset)       │ │ │
│  │  │  writeRegister(buffer, regId, value, type) → handler.write(offset)│ │ │
│  │  └────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ mmap
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          /dev/modbus_rtu (ядро Linux)                          │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  Shared memory с драйвером Modbus RTU                                   │ │
│  │  4096 регистров × 2 байта = 8KB                                        │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📥 Загрузка конфигурации (детально)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ЗАГРУЗКА КОНФИГУРАЦИИ                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  DOMContentLoaded                                                              │
│       ↓                                                                        │
│  app.initialize()                                                              │
│       ↓                                                                        │
│  app._setupScaling()  ← масштабирование под экран                            │
│       ↓                                                                        │
│  api.loadConfig('projectConfig.json')                                         │
│       ↓                                                                        │
│  GET /api/loadConfig?file=projectConfig.json                                  │
│       ↓                                                                        │
│  configService.loadConfigAsync('projectConfig.json')                          │
│       ↓                                                                        │
│  fs.readFile('/public/projectConfig.json')                                    │
│       ↓                                                                        │
│  isEditUIMode = config?.isEditUIMode || false                                 │
│       ↓                                                                        │
│  ┌──────────────────────┴──────────────────────┐                              │
│  │                                             │                              │
│  ▼ true (Edit Mode)                            ▼ false (Production Mode)      │
│  _startEditMode()                              _startProductionMode()         │
│       ↓                                             ↓                          │
│  _loadPages()                                    _loadPages()                  │
│       ↓                                             ↓                          │
│  api.loadStaticJSON('blocksData.json')           api.loadStaticJSON('blocksData.json')│
│       ↓                                             ↓                          │
│  GET /blocksData.json                             GET /blocksData.json          │
│       ↓                                             ↓                          │
│  { main: [...], settings: [...], graff: [...] }  { main: [...], settings: [...], graff: [...] }│
│       ↓                                             ↓                          │
│  this.pages = data                                this.pages = data            │
│       ↓                                             ↓                          │
│  this._renderPage(firstPage)                      this._renderPage(firstPage)  │
│       ↓                                             ↓                          │
│  renderer.renderBlocks(blocks)                    renderer.renderBlocks(blocks)│
│       ↓                                             ↓                          │
│  setInterval(500ms) ← перезагрузка JSON           setInterval(300ms) ← опрос Modbus│
│       ↓                                             ↓                          │
│  перерендер всех блоков                           updater.update()             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Отрисовка блоков (детально)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ОТРИСОВКА БЛОКОВ                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  renderer.renderBlocks(blocksData)                                             │
│       ↓                                                                        │
│  this.renderArea.innerHTML = ''  ← очистка                                    │
│  this.blocks.clear()              ← очистка Map                               │
│       ↓                                                                        │
│  for each blockData:                                                           │
│       ↓                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  createBlock(blockData)                                                 │  │
│  │       ↓                                                                 │  │
│  │  const block = document.createElement('div')                           │  │
│  │  block.classList.add('block', blockData.type)                          │  │
│  │  block.style.left = blockData.x + 'px'                                 │  │
│  │  block.style.top = blockData.y + 'px'                                  │  │
│  │       ↓                                                                 │  │
│  │  switch (blockData.type):                                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │  'only-number'       → _createOnlyNumber(block, data)         │  │  │
│  │  │  'only-title'        → _createOnlyTitle(block, data)          │  │  │
│  │  │  'title-number'      → _createTitleNumber(block, data)        │  │  │
│  │  │  'title-group-number'→ _createTitleGroupNumber(block, data)   │  │  │
│  │  │  'toggle-button'     → _createToggleButton(block, data)       │  │  │
│  │  │  'title-input'       → _createTitleInput(block, data)         │  │  │
│  │  │  'send-button'       → _createSendButton(block, data)         │  │  │
│  │  │  'page-button'       → _createPageButton(block, data)         │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                        │
│  this.renderArea.appendChild(block)                                           │
│  this.blocks.set(block.id, block)                                            │
│       ↓                                                                        │
│  ✅ Блок отображается на экране                                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Цикл обновления данных (Polling)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ОБНОВЛЕНИЕ ДАННЫХ (Polling)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  _startPolling()                                                               │
│       ↓                                                                        │
│  setInterval(() => updater.update(), 300ms)                                   │
│       ↓                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ModbusUpdater.update()                                                 │  │
│  │       ↓                                                                 │  │
│  │  1. api.readModbus()                                                    │  │
│  │       ↓                                                                 │  │
│  │     GET /api/modbus                                                     │  │
│  │       ↓                                                                 │  │
│  │     DataView с 4096 регистрами × 2 байта = 8KB                        │  │
│  │       ↓                                                                 │  │
│  │  2. ОБНОВЛЕНИЕ SPANS (числа)                                            │  │
│  │       ↓                                                                 │  │
│  │     for (regId, regInfo) of caches.spans:                              │  │
│  │       offset = regId * 2                                               │  │
│  │       value = readValue(dataView, offset, regInfo.registerType)       │  │
│  │       display = formatSpec ? applyFormat(formatSpec, value) : value   │  │
│  │       element.textContent = display                                    │  │
│  │       ↓                                                                 │  │
│  │  3. ОБНОВЛЕНИЕ TOGGLES (кнопки)                                         │  │
│  │       ↓                                                                 │  │
│  │     for (regId, regInfo) of caches.toggles:                            │  │
│  │       rawValue = dataView.getUint16(regId * 2, true)                  │  │
│  │       bitIndex = parseInt(regType.substring(1))                       │  │
│  │       isOn = (rawValue >> bitIndex) & 1                               │  │
│  │       button.classList.toggle('on', isOn)                             │  │
│  │       button.textContent = isOn ? 'Вкл' : 'Выкл'                       │  │
│  │       ↓                                                                 │  │
│  │  4. ОБНОВЛЕНИЕ INPUTS (поля ввода) — ПРОПУСКАЕМ ЕСЛИ:                   │  │
│  │       ↓                                                                 │  │
│  │     for (regId, regInfo) of caches.inputs:                             │  │
│  │       if (sendingRegisters.has(regId)) continue;   ← отправка         │  │
│  │       if (editingInputs.has(regId)) continue;      ← в фокусе         │  │
│  │       if (input.value !== originalValue) continue; ← изменено         │  │
│  │       // иначе обновляем                                               │  │
│  │       value = readValue(dataView, offset, regInfo.registerType)       │  │
│  │       input.value = value                                              │  │
│  │       originalValue = value                                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                        │
│  Ждём 300 мс и повторяем                                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Запись данных (Ввод/Отправка)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ЗАПИСЬ ДАННЫХ                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ВАРИАНТ 1: TITLE-INPUT (поле ввода)                                   │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                         │  │
│  │  1. Пользователь кликает на input                                      │  │
│  │       ↓                                                                 │  │
│  │  2. _setupInputHandlers() → click → numpadManager.show()               │  │
│  │       ↓                                                                 │  │
│  │  3. Пользователь вводит число на экранной клавиатуре                   │  │
│  │       ↓                                                                 │  │
│  │  4. onOk(val) → input.value = val                                      │  │
│  │       ↓                                                                 │  │
│  │  5. _updateInputDirtyState() → помечаем как "изменено"                  │  │
│  │       ↓                                                                 │  │
│  │  6. (если есть кнопка 💾) _setupSaveButton() → click                   │  │
│  │       ↓                                                                 │  │
│  │  7. _saveInputValue(input, regAddress, regType)                        │  │
│  │       ↓                                                                 │  │
│  │     api.writeRegister(regAddress, value, regType)                      │  │
│  │       ↓                                                                 │  │
│  │     POST /api/registers/:regId                                         │  │
│  │       ↓                                                                 │  │
│  │     Сервер пишет в mmap/testBuffer                                     │  │
│  │       ↓                                                                 │  │
│  │  8. updater.updateOriginalValue(regAddress, value)                     │  │
│  │  9. _updateInputDirtyState() → снимаем dirty-статус                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ВАРИАНТ 2: TOGGLE-BUTTON (кнопка вкл/выкл)                           │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                         │  │
│  │  1. Пользователь кликает на кнопку                                     │  │
│  │       ↓                                                                 │  │
│  │  2. _setupToggleButton() → click                                       │  │
│  │       ↓                                                                 │  │
│  │  3. isOn = button.classList.contains('on')                             │  │
│  │     newState = isOn ? 0 : 1                                            │  │
│  │       ↓                                                                 │  │
│  │  4. api.writeRegister(regAddress, newState, registerType)              │  │
│  │       ↓                                                                 │  │
│  │     POST /api/registers/:regId                                         │  │
│  │       ↓                                                                 │  │
│  │  5. await sleep(400ms)                                                │  │
│  │       ↓                                                                 │  │
│  │  6. updater.update() → обновляем все данные                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  ВАРИАНТ 3: SEND-BUTTON (массовая отправка)                           │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                         │  │
│  │  1. Пользователь кликает на кнопку                                     │  │
│  │       ↓                                                                 │  │
│  │  2. _setupSendButton() → click                                         │  │
│  │       ↓                                                                 │  │
│  │  3. regs = data-reg.split(',').map(r => r.trim())                      │  │
│  │       ↓                                                                 │  │
│  │  4. hasDirty = regs.some(reg => updater.isDirty(reg))                 │  │
│  │     if (!hasDirty) → "Нет изменений"                                   │  │
│  │       ↓                                                                 │  │
│  │  5. for each reg:                                                      │  │
│  │       regInfo = updater.caches.inputs.get(reg)                         │  │
│  │       value = regInfo.element.value                                    │  │
│  │       await api.writeRegister(reg, value, regInfo.registerType)        │  │
│  │       updater.updateOriginalValue(reg, value)                          │  │
│  │       _updateInputDirtyState()                                         │  │
│  │       ↓                                                                 │  │
│  │  6. sendButton.textContent = '✅ Отправлено'                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Серверная часть (детально)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              СЕРВЕР (Express)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/modbus                                                       │  │
│  │       ↓                                                                 │  │
│  │  modbusService.getData()                                               │  │
│  │       ↓                                                                 │  │
│  │  Возвращает Buffer из:                                                 │  │
│  │    ├── mmapDevice('/dev/modbus_rtu') → реальное устройство             │  │
│  │    └── testBuffer (fallback) → тестовые данные                         │  │
│  │       ↓                                                                 │  │
│  │  res.setHeader('Content-Type', 'application/octet-stream')             │  │
│  │  res.send(data)                                                        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/loadConfig?file=projectConfig.json                           │  │
│  │       ↓                                                                 │  │
│  │  configService.loadConfigAsync(fileName)                               │  │
│  │       ↓                                                                 │  │
│  │  if (cache.has(fileName)) return cache.get(fileName)                   │  │
│  │       ↓                                                                 │  │
│  │  filePath = path.join(publicDir, fileName)                            │  │
│  │  if (!normalizedPath.startsWith(publicDir)) throw Error               │  │
│  │       ↓                                                                 │  │
│  │  fs.readFile(filePath, 'utf8')                                         │  │
│  │       ↓                                                                 │  │
│  │  JSON.parse(content)                                                   │  │
│  │       ↓                                                                 │  │
│  │  cache.set(fileName, config)                                           │  │
│  │  res.json(config)                                                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  GET /blocksData.json                                                  │  │
│  │       ↓                                                                 │  │
│  │  express.static() → отдаёт файл из /public/                            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  POST /api/registers/:regId                                            │  │
│  │       ↓                                                                 │  │
│  │  regId = parseInt(req.params.regId)                                   │  │
│  │  { state, registerType } = req.body                                   │  │
│  │       ↓                                                                 │  │
│  │  numericValue = parseFloat(state)                                     │  │
│  │  if (isNaN(numericValue)) → 400 Bad Request                           │  │
│  │       ↓                                                                 │  │
│  │  modbusService.writeRegister(regId, numericValue, registerType)        │  │
│  │       ↓                                                                 │  │
│  │  Записывает в буфер (mmap или testBuffer):                            │  │
│  │    ├── u2 → buffer.writeUInt16LE(value, offset)                       │  │
│  │    ├── s2 → buffer.writeInt16LE(value, offset)                        │  │
│  │    ├── f4 → buffer.writeFloatLE(value, offset)                        │  │
│  │    └── bN → битовая операция:                                         │  │
│  │          current = buffer.readUInt16LE(offset)                        │  │
│  │          if (value === 1) current | (1 << bitIndex)                   │  │
│  │          else current & ~(1 << bitIndex)                              │  │
│  │          buffer.writeUInt16LE(current, offset)                        │  │
│  │       ↓                                                                 │  │
│  │  res.json({ message: 'OK', registerType, value, buffer })             │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Поток данных (Data Flow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            ПОТОК ДАННЫХ                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  📥 ЧТЕНИЕ (от устройства к экрану)                                           │
│  ─────────────────────────────────────                                         │
│                                                                                 │
│  Modbus-устройство (физическое)                                               │
│       ↓ (mmap)                                                                │
│  Buffer (4096 регистров × 2 байта = 8KB)                                     │
│       ↓ (GET /api/modbus)                                                    │
│  DataView (клиент)                                                           │
│       ↓ (modbusUpdater.update)                                               │
│  Чтение по offset = regId * 2                                                │
│       ↓                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  switch (registerType):                                                │  │
│  │    'u2' → dataView.getUint16(offset, true)    → 0 ... 65535           │  │
│  │    's2' → dataView.getInt16(offset, true)     → -32768 ... 32767      │  │
│  │    'f4' → dataView.getFloat32(offset, true)   → ±3.4×10³⁸             │  │
│  │    'bN' → (getUint16() >> bitIndex) & 1      → 0 или 1                │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  Применение формата (formatSpec):                                      │  │
│  │    '%f'  → value.toFixed(2)          → "12.34"                         │  │
│  │    '%e'  → value.toExponential(2)    → "1.23e+01"                     │  │
│  │    '%d'  → String(Math.round(value)) → "123"                           │  │
│  │    '%c'  → String(value)             → "1"                             │  │
│  │    '%6.2f' → value.toFixed(2).padStart(6) → " 12.34"                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                        │
│  Обновление DOM:                                                               │
│    → span.textContent = displayValue (для чисел)                             │
│    → input.value = displayValue (для полей ввода)                            │
│                                                                                 │
│                                                                                 │
│  📤 ЗАПИСЬ (от экрана к устройству)                                           │
│  ─────────────────────────────────────                                         │
│                                                                                 │
│  Пользователь вводит значение                                                  │
│       ↓                                                                        │
│  Проверка типа:                                                                │
│    ├── u2: 0 ... 65535                                                        │
│    ├── s2: -32768 ... 32767                                                   │
│    └── bN: 0 или 1                                                            │
│       ↓                                                                        │
│  POST /api/registers/:regId                                                   │
│       ↓                                                                        │
│  Запись в Buffer:                                                              │
│    ├── u2 → writeUInt16LE(value, offset)                                     │
│    ├── s2 → writeInt16LE(value, offset)                                      │
│    ├── f4 → writeFloatLE(value, offset)                                      │
│    └── bN → битовая операция в writeUInt16LE                                 │
│       ↓                                                                        │
│  mmap → реальное устройство                                                   │
│       ↓                                                                        │
│  Обновление originalValue в кэше клиента                                      │
│       ↓                                                                        │
│  Снятие dirty-статуса (input.classList.remove('input-changed'))              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Кэши в ModbusUpdater

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             КЭШИ UPDATER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  this.caches = {                                                               │
│                                                                                 │
│    ┌─────────────────────────────────────────────────────────────────────────┐ │
│    │  spans: Map<regId, {                                                   │ │
│    │    registerType: 'u2' | 's2' | 'f4' | 'b0' | ...,                     │ │
│    │    spans: [                                                           │ │
│    │      { element: HTMLSpanElement, formatSpec: '%f' | null },           │ │
│    │      { element: HTMLSpanElement, formatSpec: '%e' | null }            │ │
│    │    ]                                                                   │ │
│    │  }>                                                                    │ │
│    └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│    ┌─────────────────────────────────────────────────────────────────────────┐ │
│    │  inputs: Map<regId, {                                                  │ │
│    │    registerType: 'u2' | 's2' | 'f4',                                  │ │
│    │    element: HTMLInputElement,                                          │ │
│    │    originalValue: string   // последнее подтверждённое значение       │ │
│    │  }>                                                                    │ │
│    └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│    ┌─────────────────────────────────────────────────────────────────────────┐ │
│    │  toggles: Map<regId, {                                                 │ │
│    │    registerType: 'b0' | 'b1' | 'b2' | ...,                            │ │
│    │    toggles: [                                                         │ │
│    │      HTMLButtonElement,                                               │ │
│    │      HTMLButtonElement                                                │ │
│    │    ]                                                                   │ │
│    │  }>                                                                    │ │
│    └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  }                                                                             │
│                                                                                 │
│  Дополнительные множества:                                                     │
│  sendingRegisters: Set<regId>   // регистры в процессе отправки              │
│  editingInputs: Set<regId>      // поля в фокусе (редактируются)             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📄 Формат конфигурации (blocksData.json)

```json
{
  "main": [
    {
      "type": "title-number",
      "text": "Сумма",
      "format": ["%e кВтч", 16],
      "x": 760,
      "y": 580
    },
    {
      "type": "toggle-button",
      "regAddress": 20,
      "regType": "b0",
      "text": "Сеть",
      "prefix": "Сеть",
      "x": 10,
      "y": 10
    },
    {
      "type": "title-input",
      "text": "Ввод значения",
      "format": ["Ток=%f А", 16],
      "x": 400,
      "y": 100,
      "size": 5
    },
    {
      "type": "send-button",
      "regAddress": [16, 18, 20],
      "text": "Сохранить",
      "x": 400,
      "y": 300
    }
  ],
  "settings": [...],
  "graff": [...]
}
```

---

## 🎯 Сводка по типам регистров

| Тип | Размер | Диапазон | Формат в конфиге | Чтение | Запись |
|-----|--------|----------|------------------|--------|--------|
| `u2` | 2 байта | 0 ... 65535 | `"%d"`, `"%u"` | `getUint16LE` | `writeUint16LE` |
| `s2` | 2 байта | -32768 ... 32767 | `"%d"`, `"%i"` | `getInt16LE` | `writeInt16LE` |
| `f4` | 4 байта | ±3.4×10³⁸ | `"%f"`, `"%e"`, `"%g"` | `getFloat32LE` | `writeFloatLE` |
| `bN` | 1 бит | 0/1 | `"20:b0"` | `(getUint16LE >> bit) & 1` | битовая операция |

---

## 📌 Сводка по типам блоков

| Тип | Назначение | Регистрирует в updater |
|-----|-----------|----------------------|
| `only-number` | Только число с префиксом/постфиксом | span |
| `only-title` | Только текст | — |
| `title-number` | Заголовок + число | span |
| `title-group-number` | Заголовок + группа чисел | span (несколько) |
| `toggle-button` | Кнопка вкл/выкл (битовый регистр) | toggle |
| `title-input` | Поле ввода с сохранением | input |
| `send-button` | Кнопка массовой отправки | — (работает с inputs) |
| `page-button` | Кнопка переключения страниц | — |

---

## ⚡ Тайминги

| Операция | Интервал | Описание |
|----------|----------|----------|
| Polling Modbus | 300 мс | Чтение данных с устройства |
| API таймаут | 5000 мс | Таймаут для HTTP-запросов |
| Edit Mode обновление | 500 мс | Перезагрузка конфига в режиме редактирования |
| Задержка после toggle | 400 мс | Ожидание после записи перед обновлением |

---

## 📋 Список API-эндпоинтов

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/modbus` | Получить все данные (Buffer) |
| GET | `/api/loadConfig?file=...` | Загрузить JSON-конфиг |
| POST | `/api/registers/:regId` | Записать в регистр |
| GET | `/*` | Статические файлы (SPA) |

---

## 🚀 Последовательность запуска

1. **Запуск сервера:** `node server/index.js`
2. **Загрузка страницы:** браузер открывает `http://localhost:4000`
3. **Инициализация:** `app.initialize()`
4. **Загрузка конфига:** `api.loadConfig('projectConfig.json')`
5. **Загрузка блоков:** `api.loadStaticJSON('blocksData.json')`
6. **Рендеринг:** `renderer.renderBlocks()`
7. **Запуск опроса:** `setInterval(updater.update, 300)`

---

## 📁 Зависимости

### Клиентские:
- Чистый JavaScript (ES Modules)
- Fetch API с AbortController

### Серверные:
- `express` — HTTP-сервер
- `fs` / `path` — работа с файлами
- Native-модуль `modbus_mmap.node` (C++ addon)

---

## 🔧 Режимы работы

| Режим | Условие | Особенности |
|-------|---------|-------------|
| **Production** | `isEditUIMode: false` | Опрос Modbus 300 мс |
| **Edit** | `isEditUIMode: true` | Перезагрузка конфига 500 мс |

### Источники данных на сервере:

| Источник | Условие | Описание |
|----------|---------|----------|
| **Реальное устройство** | `require('modbus_mmap')` успешен | `/dev/modbus_rtu` через mmap |
| **Test Buffer** | Ошибка загрузки mmap | Тестовые данные в памяти |
```

---

Сохраните этот текст в файл `ARCHITECTURE.md` или любое другое имя с расширением `.md`.