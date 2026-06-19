//console.log = function () { };

const renderArea = document.getElementById('render-area');
const projectConfig = 'projectConfig.json';
const blocksConfig = 'blocksData.json';
const updateIntervalMs = 500;

let isEditUIMode = false;

// --- КЭШИ ---
const modbusDisplaySpanCache = new Map();
const modbusDisplayInputCache = new Map();

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
                <div class="content" data-reg="${blockData.registerIndex}">
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
            blockElement.innerHTML = `
                <div class="content" data-reg="${blockData.regAddress}">
                    <span class="prefix btn">${prefix}</span>
                    <button class="toggle-button off" data-reg="${blockData.regAddress}">${blockData.text}</button>
                </div>`;
            setupToggleButton(blockElement, blockData.regAddress, blockData.regType);
            break;

        case 'title-input':
            const text = blockData.text || '';
            prefix = blockData.prefix || '';
            postfix = blockData.postfix || '';
            blockElement.innerHTML = `
                <div class="content">
                    <span class="title">${text}</span>
                </div>
                <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                    <span class="prefix">${prefix}</span>
                    <input id="${blockData.id}" type="text" class="input-value-field" placeholder="Введите значение">
                    <span class="postfix">${postfix}</span>
                </div>`;
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

    const blockDivs = renderArea.querySelectorAll('div.content[data-reg]:not([data-reg="-"])');

    blockDivs.forEach(parentDiv => {
        const regId = parentDiv.dataset.reg;
        const regType = parentDiv.dataset.type;
        const span = parentDiv.querySelector('span.number');
        const input = parentDiv.querySelector('input');

        if (span) {
            const existing = modbusDisplaySpanCache.get(regId);
            if (existing) {
                existing.spans.push(span);
                existing.registerType = regType;
            } else {
                modbusDisplaySpanCache.set(regId, {
                    registerType: regType,
                    spans: [span]
                });
            }
        } else if (input && !modbusDisplayInputCache.has(regId)) {
            modbusDisplayInputCache.set(regId, {
                registerType: regType,
                element: input
            });
        }
    });

    console.log(`Собрано ${modbusDisplaySpanCache.size} спанов и ${modbusDisplayInputCache.size} инпутов`);
}

// --- ОПРОС MODBUS ---

function getBytesCount(registerType) {
    return registerType === 'f4' ? 4 : 2;
}

async function pollModbusUpdates() {
    try {
        const response = await fetch('/api/modbus');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const bytes = new Uint8Array(await response.arrayBuffer());
        const dataView = new DataView(bytes.buffer);

        for (const [registerNumber, regInfo] of modbusDisplaySpanCache) {
            const offset = registerNumber * 2;
            const byteCount = getBytesCount(regInfo.registerType);

            if (offset + byteCount > bytes.length) {
                console.warn(`Недостаточно данных для регистра ${registerNumber}`);
                continue;
            }

            const registerType = regInfo.registerType;
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

            if (value !== undefined && !isNaN(value)) {
                const displayValue = registerType === 'f4' ? value.toFixed(2) : value;
                regInfo.spans.forEach(span => span.innerHTML = displayValue);
            } else {
                regInfo.spans.forEach(span => span.innerHTML = '--');
            }
        }
    } catch (error) {
        console.error('Ошибка опроса Modbus:', error);
    }
}

// --- ОТПРАВКА В MODBUS ---

async function sendModbusData(regId, valueToSend, registerType) {
    try {
        const response = await fetch(`/api/registers/${regId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: valueToSend, registerType })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка отправки в Modbus:', error);
        throw error;
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

                await sendModbusData(reg, value, regInfo.registerType || 'u2');
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
            sendButton.textContent = 'Ошибка';
            sendButton.classList.remove('sending');
            sendButton.classList.add('error');
            setTimeout(() => {
                sendButton.textContent = originalText;
                sendButton.disabled = false;
                sendButton.classList.remove('error');
            }, 1500);
        }
    });
}

function setupToggleButton(blockElement, blockId, registerType) {
    const toggleButton = blockElement.querySelector('.toggle-button');
    if (!toggleButton) return;

    toggleButton.addEventListener('click', async () => {
        const isOn = toggleButton.classList.contains('on');
        const newState = !isOn;

        toggleButton.classList.toggle('on');
        toggleButton.classList.toggle('off');
        toggleButton.textContent = newState ? 'Вкл' : 'Выкл';

        const reg = toggleButton.dataset.reg;
        if (!reg) {
            console.error('Нет data-reg у кнопки');
            return;
        }

        const originalText = toggleButton.textContent;
        toggleButton.textContent = 'Отправка...';
        toggleButton.disabled = true;
        toggleButton.classList.add('sending');
        await new Promise(resolve => requestAnimationFrame(resolve));

        try {
            await sendModbusData(reg, newState ? 1 : 0, registerType || 'u2');

            toggleButton.textContent = 'Отправлено';
            toggleButton.classList.remove('sending');
            toggleButton.classList.add('success');
            setTimeout(() => {
                toggleButton.textContent = originalText;
                toggleButton.disabled = false;
                toggleButton.classList.remove('success');
            }, 1500);

        } catch (error) {
            // Откат состояния
            toggleButton.classList.remove('on', 'off');
            toggleButton.classList.add(isOn ? 'on' : 'off');
            toggleButton.textContent = isOn ? 'Вкл' : 'Выкл';
            toggleButton.disabled = false;
            toggleButton.classList.remove('sending');
            toggleButton.classList.add('error');
            setTimeout(() => toggleButton.classList.remove('error'), 1500);
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