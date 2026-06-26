//console.log = function () { };

const renderArea = document.getElementById('render-area');
const projectConfig = 'projectConfig.json';
const blocksConfig = 'blocksData.json';
const updateIntervalMs = 300;

let isEditUIMode = false;

// --- КЭШИ ---
const modbusDisplaySpanCache = new Map();
const modbusDisplayInputCache = new Map();
const modbusToggleButtonCache = new Map();

// --- ОТСЛЕЖИВАНИЕ ОТПРАВЛЯЕМЫХ РЕГИСТРОВ ---
const sendingRegisters = new Set();

// --- ОТСЛЕЖИВАНИЕ РЕДАКТИРУЕМЫХ INPUT ---
const editingInputs = new Set();

// --- ФУНКЦИИ ДЛЯ РАБОТЫ С /API/MODBUS ---

async function readRegisterValue(regId) {
    try {
        const response = await fetch('/api/modbus');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const bytes = new Uint8Array(await response.arrayBuffer());
        const dataView = new DataView(bytes.buffer);

        const registerNumber = parseInt(regId);
        const offset = registerNumber * 2;

        if (offset + 2 > bytes.length) {
            throw new Error(`Недостаточно данных для регистра ${registerNumber}`);
        }

        const value = dataView.getUint16(offset, true);
        return value;

    } catch (error) {
        console.error('❌ Ошибка чтения регистра:', error);
        throw error;
    }
}

// --- ФУНКЦИИ СОЗДАНИЯ БЛОКОВ ---

function createBlock(blockData) {
    const blockElement = document.createElement('div');
    blockElement.classList.add('block', blockData.type);
    blockElement.id = blockData.id;
    blockElement.style.left = `${blockData.x}px`;
    blockElement.style.top = `${blockData.y}px`;

    let prefix, postfix, regType;

    switch (blockData.type) {
        case 'only-number':
            prefix = blockData.prefix || '';
            postfix = blockData.postfix || '';
            blockElement.innerHTML = `
                <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                    <span class="prefix">${prefix}</span>
                    <span class="number">${blockData.value ?? '--'}</span>
                    <span class="postfix">${postfix}</span>
                </div>`;
            break;

        case 'only-title':
            const titleText = (blockData.text || '').replace(/\n/g, '<br>');
            blockElement.innerHTML = `
                <div class="content">
                    <span class="title">${titleText}</span>
                </div>`;
            break;

        case 'title-number':
            prefix = blockData.prefix || '';
            postfix = blockData.postfix || '';
            blockElement.innerHTML = `
                <div class="content">
                    <span class="title">${blockData.text}</span>
                </div>
                <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                    <span class="prefix">${prefix}</span>
                    <span class="number">${blockData.value ?? '--'}</span>
                    <span class="postfix">${postfix}</span>
                </div>`;
            break;

        case 'title-group-number':
            blockElement.innerHTML = `
                <div class="content">
                    <span class="title">${blockData.text}</span>
                </div>`;

            if (Array.isArray(blockData.regAddress)) {
                blockData.regAddress.forEach((regIdx, i) => {
                    prefix = blockData.prefixes?.[i] || '';
                    postfix = blockData.postfixes?.[i] || '';
                    regType = blockData.regType?.[i] || '';
                    const val = Array.isArray(blockData.value) ? blockData.value[i] : blockData.value;

                    blockElement.innerHTML += `
                        <div class="content" data-reg="${regIdx}" data-type="${regType}">
                            <span class="prefix">${prefix}</span>
                            <span class="number">${val ?? '--'}</span>
                            <span class="postfix">${postfix}</span>
                        </div>`;
                });
            } else {
                console.warn('blockData.regAddress не является массивом');
                blockElement.innerHTML += `
                    <div class="content" data-reg="${blockData.registerIndex}">
                        <span class="number">${blockData.value ?? '--'}</span>
                    </div>`;
            }
            break;

        case 'toggle-button':
            prefix = blockData.prefix || '';
            regType = blockData.regType || '';
            blockElement.innerHTML = `
                <div class="content" data-reg="${blockData.regAddress}" data-type="${regType}">
                    <span class="prefix btn">${prefix}</span>
                    <button class="toggle-button off" data-reg="${blockData.regAddress}">${blockData.text}</button>
                </div>`;
            setupToggleButton(blockElement, blockData.regAddress, blockData.regType);
            break;

            case 'title-input':
                const text = blockData.text || '';
                prefix = blockData.prefix || '';
                postfix = blockData.postfix || '';
                const size = blockData.size || 10;
                // Учитываем размер шрифта: 1.3em ≈ 20px, на символ ~12px
                const wPx = size * 12 + 10; // +10 на padding
                
                blockElement.innerHTML = `
                    <div class="content">
                        <span class="title">${text}</span>
                    </div>
                    <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                        <span class="prefix">${prefix}</span>
                        <input id="${blockData.id}" type="text" class="input-value-field" 
                               placeholder="..." 
                               style="width: ${wPx}px;">  <!-- ← исправлено на wPx -->
                        <span class="postfix">${postfix}</span>
                    </div>`;
                
                setupInputHandlers(blockElement, blockData.regAddress);
                break;

        case 'send-button':
            blockElement.innerHTML = `
                <div class="content">
                    <button class="send-button" data-reg="${blockData.regAddress}">
                        ${blockData.text}
                    </button>
                </div>`;
            setupSendButton(blockElement, blockData);
            break;
    }

    return blockElement;
}

// --- ЗАГРУЗКА КОНФИГУРАЦИИ ---

async function loadConfig(configFileName) {
    try {
        const response = await fetch(`/api/loadConfig?file=${encodeURIComponent(configFileName)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        return null;
    }
}

async function loadAndProcessBlocks() {
    const config = await loadConfig(blocksConfig);
    if (!config || !Array.isArray(config)) {
        console.warn('Конфигурация не загружена или неверный формат');
        return [];
    }

    return config.map((block, index) => ({
        ...block,
        id: index
    }));
}

// --- ОБНОВЛЕНИЕ UI ---

async function updateUI() {
    try {
        const blocks = await loadAndProcessBlocks();

        if (!renderArea) {
            console.error('renderArea не найден');
            return;
        }

        renderArea.innerHTML = '';

        blocks.forEach(blockData => {
            const block = createBlock(blockData);
            if (block) renderArea.appendChild(block);
        });
    } catch (error) {
        console.error('Ошибка обновления UI:', error);
    }
}

// --- СБОР ЭЛЕМЕНТОВ ДЛЯ MODBUS ---

function collectModbusElements() {
    if (!renderArea) {
        console.error('renderArea не определен');
        return;
    }

    modbusDisplaySpanCache.clear();
    modbusDisplayInputCache.clear();
    modbusToggleButtonCache.clear();

    const blockDivs = renderArea.querySelectorAll('div.content[data-reg]:not([data-reg="-"])');

    blockDivs.forEach(parentDiv => {
        const regId = parentDiv.dataset.reg;
        const regType = parentDiv.dataset.type;

        // --- 1. ОБРАБОТКА SPAN ---
        const span = parentDiv.querySelector('span.number');
        if (span) {
            const existingSpans = modbusDisplaySpanCache.get(regId);
            if (existingSpans) {
                existingSpans.spans.push(span);
                if (!existingSpans.registerType) {
                    existingSpans.registerType = regType;
                }
            } else {
                modbusDisplaySpanCache.set(regId, {
                    registerType: regType,
                    spans: [span]
                });
            }
        }

        // --- 2. ОБРАБОТКА INPUT ---
        const input = parentDiv.querySelector('input');
        if (input && !modbusDisplayInputCache.has(regId)) {
            modbusDisplayInputCache.set(regId, {
                registerType: regType,
                element: input
            });
        }

        // --- 3. ОБРАБОТКА TOGGLE BUTTON ---
        const toggleButton = parentDiv.querySelector('button.toggle-button');
        if (toggleButton) {
            const existingToggles = modbusToggleButtonCache.get(regId);
            if (existingToggles) {
                if (!existingToggles.toggles.includes(toggleButton)) {
                    existingToggles.toggles.push(toggleButton);
                }
                if (!existingToggles.registerType) {
                    existingToggles.registerType = regType;
                }
            } else {
                modbusToggleButtonCache.set(regId, {
                    registerType: regType,
                    toggles: [toggleButton]
                });
            }
        }
    });

    console.log("spans", modbusDisplaySpanCache);
    console.log("inputs", modbusDisplayInputCache);
    console.log("toggle-buttons", modbusToggleButtonCache);
}

// --- ОПРОС MODBUS ---

function getBytesCount(registerType) {
    return registerType === 'f4' ? 4 : 2;
}

function readRegisterValueFromDataView(dataView, offset, registerType) {
    let value;
    switch (registerType) {
        case 'u2': value = dataView.getUint16(offset, true); break;
        case 's2': value = dataView.getInt16(offset, true); break;
        case 'f4': value = dataView.getFloat32(offset, true); break;
        default:
            if (registerType?.startsWith('b')) {
                const bitIndex = parseInt(registerType.substring(1));
                if (bitIndex >= 0 && bitIndex <= 15) {
                    value = (dataView.getUint16(offset, true) >> bitIndex) & 1;
                }
            }
    }
    return value;
}

async function pollModbusUpdates() {
    try {
        const response = await fetch('/api/modbus');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const bytes = new Uint8Array(await response.arrayBuffer());
        const dataView = new DataView(bytes.buffer);

        // --- ОБНОВЛЕНИЕ СПАНОВ ---
        for (const [registerNumber, regInfo] of modbusDisplaySpanCache) {
            const offset = registerNumber * 2;
            const byteCount = getBytesCount(regInfo.registerType);

            if (offset + byteCount > bytes.length) {
                console.warn(`Недостаточно данных для регистра ${registerNumber}`);
                continue;
            }

            const registerType = regInfo.registerType;
            let value = readRegisterValueFromDataView(dataView, offset, registerType);

            if (value !== undefined && !isNaN(value)) {
                const displayValue = registerType === 'f4' ? value.toFixed(2) : value;
                regInfo.spans.forEach(span => span.innerHTML = displayValue);
            } else {
                regInfo.spans.forEach(span => span.innerHTML = '--');
            }
        }

        // --- ОБНОВЛЕНИЕ ТОГГЛ-КНОПОК ---
        for (const [registerNumber, regInfo] of modbusToggleButtonCache) {
            const regKey = String(registerNumber);

            const offset = registerNumber * 2;

            if (offset + 2 > bytes.length) {
                console.warn(`Недостаточно данных для регистра ${registerNumber}`);
                continue;
            }

            const rawValue = dataView.getUint16(offset, true);

            regInfo.toggles.forEach(button => {
                // НЕ ОБНОВЛЯЕМ ОТПРАВЛЯЮЩУЮСЯ КНОПКУ
                if (button.disabled) return;

                const parentContent = button.closest('.content');
                const buttonRegType = parentContent?.dataset?.type || 'b0';

                if (buttonRegType?.startsWith('b')) {
                    const bitIndex = parseInt(buttonRegType.substring(1));
                    if (bitIndex >= 0 && bitIndex <= 15) {
                        const value = (rawValue >> bitIndex) & 1;
                        const isOn = value === 1;
                        button.classList.toggle('on', isOn);
                        button.classList.toggle('off', !isOn);
                        button.textContent = isOn ? 'Вкл' : 'Выкл';
                    }
                }
            });
        }

        // --- ОБНОВЛЕНИЕ INPUT ---
        for (const [registerNumber, regInfo] of modbusDisplayInputCache) {
            const regKey = String(registerNumber);

            // ⚠️ НЕ ОБНОВЛЯЕМ INPUT, ЕСЛИ:
            // 1. Регистр отправляется (sendingRegisters)
            // 2. Регистр редактируется (editingInputs) - пользователь вводит данные
            if (sendingRegisters.has(regKey) || editingInputs.has(regKey)) {
                continue;
            }

            const offset = registerNumber * 2;
            const byteCount = getBytesCount(regInfo.registerType);

            if (offset + byteCount > bytes.length) {
                console.warn(`Недостаточно данных для регистра ${registerNumber}`);
                continue;
            }

            const value = readRegisterValueFromDataView(dataView, offset, regInfo.registerType);

            if (value !== undefined && !isNaN(value) && regInfo.element) {
                const displayValue = regInfo.registerType === 'f4' ? value.toFixed(2) : value;
                // НЕ ОБНОВЛЯЕМ INPUT, ЕСЛИ ОН ЗАБЛОКИРОВАН
                if (!regInfo.element.disabled) {
                    regInfo.element.value = displayValue;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка опроса Modbus:', error);
    }
}

// --- ОТПРАВКА В MODBUS ---

async function sendModbusData(regId, valueToSend, registerType) {
    const regKey = String(regId);
    sendingRegisters.add(regKey);

    try {
        console.log(`📤 Отправка: регистр=${regId}, значение=${valueToSend}, тип=${registerType}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`/api/registers/${regId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: valueToSend, registerType: registerType || 'u2' }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Ответ сервера:`, result);
        return result;

    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        throw error;
    } finally {
        sendingRegisters.delete(regKey);
    }
}

// --- НАСТРОЙКА КНОПОК ---

function setupSendButton(blockElement) {
    const sendButton = blockElement.querySelector('.send-button');
    if (!sendButton) return;

    sendButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const regAttr = sendButton.dataset.reg;
        if (!regAttr) {
            console.error('Нет data-reg у кнопки');
            return;
        }

        const regs = regAttr.split(',').map(r => r.trim());
        const originalText = sendButton.textContent;

        sendButton.textContent = 'Отправка...';
        sendButton.disabled = true;
        sendButton.classList.add('sending');
        await new Promise(resolve => requestAnimationFrame(resolve));

        try {
            for (const reg of regs) {
                const regKey = String(reg);
                const regInfo = modbusDisplayInputCache.get(reg);
                if (!regInfo) {
                    console.error(`Регистр ${reg} не найден в кэше`);
                    continue;
                }

                const value = regInfo.element?.value;
                if (!value) {
                    console.error(`Пустое значение для регистра ${reg}`);
                    continue;
                }

                // Отправляем значение
                await sendModbusData(reg, value, regInfo.registerType || 'u2');

                // ✅ После отправки - убираем из редактируемых
                editingInputs.delete(regKey);

                // ✅ Сбрасываем визуальный индикатор
                if (regInfo.element) {
                    regInfo.element.style.backgroundColor = '#e8f5e9'; // зеленый фон - успех
                    regInfo.element.style.borderColor = 'green';
                    setTimeout(() => {
                        regInfo.element.style.backgroundColor = '';
                        regInfo.element.style.borderColor = '#ccc';
                    }, 1000);
                }
            }

            sendButton.textContent = 'Отправлено';
            sendButton.classList.remove('sending');
            sendButton.classList.add('success');
            setTimeout(() => {
                sendButton.textContent = originalText;
                sendButton.disabled = false;
                sendButton.classList.remove('success');
            }, 2000);

        } catch (error) {
            console.error('❌ Ошибка отправки:', error);
            sendButton.textContent = 'Ошибка';
            sendButton.classList.remove('sending');
            sendButton.classList.add('error');

            // При ошибке тоже убираем из редактируемых
            for (const reg of regs) {
                editingInputs.delete(String(reg));
            }

            setTimeout(() => {
                sendButton.textContent = originalText;
                sendButton.disabled = false;
                sendButton.classList.remove('error');
            }, 1500);
        }
    });
}

// --- ФУНКЦИИ ДЛЯ TOGGLE BUTTON ---

async function updateToggleButtonFromModbus(regId, button) {
    try {
        console.log(`🔄 Обновление кнопки для регистра ${regId} из /api/modbus`);

        const value = await readRegisterValue(regId);

        const parentContent = button.closest('.content');
        const buttonRegType = parentContent?.dataset?.type || 'b0';

        if (buttonRegType?.startsWith('b')) {
            const bitIndex = parseInt(buttonRegType.substring(1));
            if (bitIndex >= 0 && bitIndex <= 15) {
                const currentState = ((value >> bitIndex) & 1) === 1;

                button.classList.toggle('on', currentState);
                button.classList.toggle('off', !currentState);
                button.textContent = currentState ? 'Вкл' : 'Выкл';

                // ✅ Убираем класс ожидания
                button.classList.remove('waiting');

                console.log(`🔄 Обновлено: состояние=${currentState ? 'Вкл' : 'Выкл'}, значение=${value}, бит=${bitIndex}`);
                return currentState;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Ошибка обновления кнопки:', error);
        return false;
    }
}

function setupToggleButton(blockElement, blockId, registerType) {
    const toggleButton = blockElement.querySelector('.toggle-button');
    if (!toggleButton) return;

    let isProcessing = false;

    toggleButton.addEventListener('click', async () => {
        if (isProcessing || toggleButton.disabled) return;

        const isOn = toggleButton.classList.contains('on');
        const newState = !isOn;
        const reg = toggleButton.dataset.reg;

        if (!reg) {
            console.error('Нет data-reg у кнопки');
            return;
        }

        console.log(`🔄 Клик: регистр=${reg}, текущее состояние=${isOn ? 'Вкл' : 'Выкл'}, новое состояние=${newState ? 'Вкл' : 'Выкл'}`);

        isProcessing = true;
        toggleButton.disabled = true;
        // ✅ Добавляем CSS-класс для состояния ожидания
        toggleButton.classList.add('waiting');

        try {
            await sendModbusData(reg, newState ? 1 : 0, registerType || 'b0');

            console.log(`✅ Команда отправлена, ждем синхронизации...`);

            await new Promise(resolve => setTimeout(resolve, 400));

            await updateToggleButtonFromModbus(reg, toggleButton);

        } catch (error) {
            console.error(`❌ Ошибка:`, error);
            toggleButton.textContent = '❌';
            toggleButton.style.borderColor = 'red';

            setTimeout(() => {
                toggleButton.textContent = isOn ? 'Вкл' : 'Выкл';
                toggleButton.style.borderColor = '';
                // ✅ Убираем класс ожидания
                toggleButton.classList.remove('waiting');
            }, 1500);
        } finally {
            setTimeout(() => {
                isProcessing = false;
                toggleButton.disabled = false;
                // ✅ Убираем класс ожидания
                toggleButton.classList.remove('waiting');
            }, 150);
        }
    });
}

// --- НАСТРОЙКА INPUT ---
function setupInputHandlers(blockElement, regAddress) {
    const input = blockElement.querySelector('.input-value-field');
    if (!input) return;

    const regKey = String(regAddress);

    // При фокусе - добавляем в список редактируемых
    input.addEventListener('focus', () => {
        editingInputs.add(regKey);
        console.log(`✏️ Начало редактирования регистра ${regAddress}`);
        // Визуальный индикатор редактирования
        input.style.backgroundColor = '#fff8e1';
        input.style.borderColor = '#ff9800';
    });

    // При потере фокуса - просто убираем индикатор, НЕ отправляем
    input.addEventListener('blur', () => {
        // Не убираем из editingInputs сразу!
        // Ждем, пока кнопка отправит значение
        input.style.backgroundColor = '';
        input.style.borderColor = '#ccc';
        console.log(`✏️ Завершено редактирование регистра ${regAddress}`);
    });

    // Отмена редактирования по Escape (возвращаем старое значение)
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Убираем фокус, не отправляя
            input.blur();
            // Удаляем из редактируемых
            editingInputs.delete(regKey);
            // Возвращаем старый цвет
            input.style.backgroundColor = '';
            input.style.borderColor = '#ccc';
            console.log(`✏️ Редактирование отменено для регистра ${regAddress}`);
        }
    });
}

// --- ИНИЦИАЛИЗАЦИЯ ---

async function initializePage() {
    const config = await loadConfig(projectConfig);
    isEditUIMode = config?.isEditUIMode || false;

    if (isEditUIMode) {
        setInterval(updateUI, 500);
    } else {
        await updateUI();
        collectModbusElements();
        setInterval(pollModbusUpdates, updateIntervalMs);
    }
}

document.addEventListener('DOMContentLoaded', initializePage);