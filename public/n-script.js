//console.log = function () { };

let renderArea = document.getElementById('render-area');
const projectConfig = 'projectConfig.json';
const blocksConfig = 'blocksData2.json'; // Путь к API, который отдает JSON настроек блоков.
const updateIntervalMs = 500; // Интервал обновления в миллисекундах
let isEditMode = false;

/** Создает новый DOM-элемент блока. */
function createBlock2(blockData) {
    const blockElement = document.createElement('div');
    blockElement.classList.add('block');
    blockElement.classList.add(`${blockData.type}`); // Класс для стилизации по типу

    blockElement.id = blockData.id;
    blockElement.style.left = `${blockData.x}px`;
    blockElement.style.top = `${blockData.y}px`;

    let prefix = null;
    let postfix = null;

    switch (blockData.type) {
        case 'only-number':
            prefix = blockData.prefix !== undefined ? blockData.prefix : '';
            postfix = blockData.postfix !== undefined ? blockData.postfix : '';
            blockElement.innerHTML += `
                <div class="content" data-reg="${blockData.registerIndex}">
                <span class="prefix">${prefix}</span>
                <span class="number">${blockData.value !== undefined ? blockData.value : '--'}</span>
                <span class="postfix">${postfix}</span>
                </div>`;
            break;
        case 'only-title':
            // Обрабатываем перенос строки перед вставкой в HTML
            let titleText = blockData.text !== undefined ? blockData.text : '';
            titleText = titleText.replace(/\n/g, '<br>'); // Заменяем все \n на <br>

            blockElement.innerHTML += `
                <div class="content">
                    <span class="title">${titleText}</span>
                </div>`;
            break;
        case 'title-number':
            prefix = blockData.prefix !== undefined ? blockData.prefix : '';
            postfix = blockData.postfix !== undefined ? blockData.postfix : '';
            blockElement.innerHTML += `
                <div class="content">
                        <span class="title">${blockData.text}</span>
                </div>
                <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                        <span class="prefix">${prefix}</span>
                        <span class="number">${blockData.value !== undefined ? blockData.value : '--'}</span>
                        <span class="postfix">${postfix}</span>
                </div>`;
            break;
        case 'title-group-number':
            // Проверяем, является ли blockData.registerIndex массивом
            if (Array.isArray(blockData.regAddress)) {
                blockElement.innerHTML += `
                    <div class="content">
                        <span class="title">${blockData.text}</span>
                    </div>`;

                // Если это массив, проходим по каждому элементу массива
                blockData.regAddress.forEach((regIdx, i) => {
                    prefix = (blockData.prefixes && blockData.prefixes[i]) || "";
                    postfix = (blockData.postfixes && blockData.postfixes[i]) || "";
                    const val = (Array.isArray(blockData.value) ? blockData.value[i] : blockData.value) || "--";

                    blockElement.innerHTML += `
                <div class="content" data-reg="${regIdx}">
                    <span class="prefix">${prefix}</span>
                    <span class="number">${val}</span>
                    <span class="postfix">${postfix}</span>
                </div>
            `;
                });
            } else {
                // Если blockData.registerIndex не массив (возможно, старый формат или ошибка)
                // Обработка как для одного значения, или сообщение об ошибке
                console.warn(`blockData.registerIndex не является массивом. Обрабатываем как единичное значение.`);
                blockElement.innerHTML += `
                <div class="block-content" data-reg="${blockData.registerIndex}">
                    <span class="text-display">${blockData.text !== undefined ? blockData.text : 'Число:'}</span>
                    <span class="number-display">${blockData.value !== undefined ? blockData.value : '--'}</span>
                </div>
            `;
            }
            // Здесь не нужно setup, только установка начального значения
            break;
        case 'toggle-button':
            prefix = blockData.prefix !== undefined ? blockData.prefix : '';
            blockElement.innerHTML += `
                <div class="content" data-reg="${blockData.registerIndex}">
                <span class="prefix btn">${prefix}</span>
                <button class="toggle-button off">Выкл</button>
                </div>
            `;
            setupToggleButton(blockElement, blockData.registerIndex);
            break;
        case 'title-input-send':
            blockElement.innerHTML += `
            <div class="content">
                <span class="title">${blockData.text}</span>
            </div>
            <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                <input type="text" class="input-value-field" id="input-reg-${blockData.regAddress}" placeholder="Введите значение">
            </div>
            <div class="content">
                <button class="modbus-send-button" 
                    data-reg="${blockData.regAddress}" 
                    data-command="writeSingleRegister"
                    data-target-element="output-display-id-${blockData.regAddress}"> 
                Отправить
            </button>
            </div>`;
            break;
        case 'title-input':
            text = blockData.text !== undefined ? blockData.text : '';
            prefix = blockData.prefix !== undefined ? blockData.prefix : '';
            postfix = blockData.postfix !== undefined ? blockData.postfix : '';
            blockElement.innerHTML += `
                <div class="content">
                    <span class="title">${text}</span>
                </div>
                <div class="content" data-reg="${blockData.regAddress}" data-type="${blockData.regType}">
                    <span class="prefix">${prefix}</span>
                    <input type="text" class="input-value-field" placeholder="Введите значение">
                    <span class="prefix">${postfix}</span>
                </div>`;
            break;
        case 'send-button':
            blockElement.innerHTML += `
                <div class="content">
                    <button class="modbus-send-button" 
                        data-reg="${blockData.regAddress}" 
                        data-command="writeSingleRegister"
                        data-target-element="output-display-id-${blockData.regAddress}"> 
                        ${blockData.text}
                </button>
                </div>`;
            break;
        // default:
        //     console.warn(`Неизвестный тип блока: ${blockData.type} для ID ${id}`);

        //    break;
        //blockElement.textContent = `Неизвестный тип: ${blockData.type}`;
        //return null; // Возвращаем null, если тип неизвестен
    }
    return blockElement;
}

function setupToggleButton(blockElement, blockId, registerIndex) {
    const toggleButton = blockElement.querySelector('.toggle-button');

    toggleButton.addEventListener('click', () => {
        const currentStateIsOn = toggleButton.classList.contains('on');
        const newText = currentStateIsOn ? 'Выкл' : 'Вкл';
        const newState = !currentStateIsOn;

        toggleButton.classList.toggle('on');
        toggleButton.classList.toggle('off');
        toggleButton.textContent = newText;

        console.log(`Блок ${blockId} (Регистр: ${registerIndex !== undefined ? registerIndex : 'N/A'}): Переключен в ${newText}`);
        // !!! Отправка состояния на ПЛК (WebSocket/API)
    });
}

/** Асинхронно загружает конфигурацию блоков с сервера. */
async function loadConfig(configFileName) {
    try {
        const response = await fetch(`/api/loadConfig?file=${encodeURIComponent(configFileName)}`);

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const config = await response.json();
        return config;
    } catch (error) {
        console.error("Не удалось загрузить конфигурацию:", error);
        return null;
    }
}

// Функция, которая загружает блоки и раздает им id по порядку. На выходе массив блоков.
async function loadAndProcessBlocks() {
    const loadedBlocksConfig = await loadConfig(blocksConfig);
    console.log(loadedBlocksConfig);
    let processedBlocks = [];

    if (loadedBlocksConfig && Array.isArray(loadedBlocksConfig)) {
        let nextBlockId = 0; // Локальная переменная для ID
        console.log("Конфигурация блоков загружена, обрабатываем...");
        processedBlocks = loadedBlocksConfig.map(block => ({
            ...block,
            id: nextBlockId++
        }));
        console.log(`Обработано ${processedBlocks.length} блоков.`);
    } else {
        console.warn("Конфигурация блоков не загружена или имеет неверный формат. Блоки не будут обновлены.");
    }
    return processedBlocks;
}

// Функция, которая обновляет UI (вызывается периодически)
async function updateUI() {
    try {
        const processedBlocks = await loadAndProcessBlocks(); // Загружаем и обрабатываем блоки

        if (!renderArea) {
            console.error("Область отрисовки 'renderArea' не определена.");
            return;
        }
        if (!processedBlocks || processedBlocks.length === 0) {
            console.warn("Нет данных для отрисовки блоков. Очищаем область.");
            renderArea.innerHTML = ''; // Очищаем, если данных нет
            return;
        }

        renderArea.innerHTML = '';

        // Создаем и добавляем каждый блок из нового массива
        processedBlocks.forEach((blockData, id) => {
            const newBlock = createBlock2(blockData); // Ваша функция createBlock

            if (newBlock) {
                renderArea.appendChild(newBlock);
            } else {
                console.warn(`[renderOrUpdateBlocks] Не удалось создать блок для данных:`, blockData);
            }
        });
    } catch (error) {
        console.error("Ошибка в цикле обновления UI:", error);
    }
}

let modbusDisplaySpanCache = new Map();
let modbusDisplayInputCache = new Map();
let allSpanElementsNodeList;

function collectModbusElements(renderArea) {
    if (!renderArea) {
        console.error("Ошибка: renderAreaElement не определен для сбора элементов.");
        return new Map();
    }

    modbusDisplaySpanCache.clear(); // Очищаем перед новым сбором
    modbusDisplayInputCache.clear(); // Очищаем перед новым сбором

    // 1. Получаем все div.content, у которых есть data-reg кроме -
    const blockDivs = renderArea.querySelectorAll('div.content[data-reg]:not([data-reg="-"])');
    //console.log(`Найдено ${blockDivs.length} родительских div.block-content с data-reg.`);

    if (blockDivs.length === 0) {
        console.warn("Внимание: Не найдено ни одного элемента '.block-content[data-reg]'. Проверьте HTML структуру и селектор.");
    }

    // 2. Для каждого такого div находим его span.number и группируем по data-reg
    blockDivs.forEach(parentDiv => {
        let regId = parentDiv.dataset.reg;
        let regType = parentDiv.dataset.type;
        // console.log("regType", regType);
        // console.log('  Все атрибуты:', Array.from(parentDiv.attributes).map(a => `${a.name}=${a.value}`));

        // Находим span.number внутри этого родительского div
        const span = parentDiv.querySelector('span.number');
        // Находим input.number внутри этого родительского div
        const input = parentDiv.querySelector('input');

        if (span) {
            // Получаем текущий массив спанов для этого regId
            const existingSpans = modbusDisplaySpanCache.get(regId);

            if (existingSpans) {
                // Если массив уже существует, добавляем текущий span в него
                existingSpans.spans.push(span);
                // Обновляем тип последним значением
                existingSpans.registerType = regType;
            } else {
                // Если массива еще нет, создаем новый массив с текущим span
                modbusDisplaySpanCache.set(regId, {
                    "registerType": regType,
                    "spans": [span]
                });
            }
            // --- Конец логики ---
        } else if (input) {
            // Сохраняем ТОЛЬКО ПЕРВЫЙ найденный input для этого регистра
            if (!modbusDisplayInputCache.has(regId)) {
                modbusDisplayInputCache.set(regId, {
                    registerType: regType,
                    element: input
                });
            }
            // --- Конец логики ---
        } else {
            console.warn(`В div.block-content[data-reg="${regId}"] не найден span.display-number.`);
            console.warn(`Дубль input для регистра ${regId} — пропускаем.`);
        }
    });

    console.log(`Заполнено ${modbusDisplaySpanCache.size} уникальных register IDs в кэш (Map).`);
    console.log("modbusDisplaySpanCache", modbusDisplaySpanCache);
    console.log("modbusDisplayInputCache", modbusDisplayInputCache);
    return modbusDisplaySpanCache;
}

// Отправляет на сервер запрос данных регистров.
async function pollModbusUpdates() {
    try {
        const response = await fetch('/api/modbus');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Используем Uint8Array для сырых байт
        const bytes = new Uint8Array(await response.arrayBuffer());
        const dataView = new DataView(bytes.buffer);

        for (const [registerNumber, regInfo] of modbusDisplaySpanCache) {
            // Вычисляем смещение (предполагаем, что регистры нумеруются с 40001)
            const offset = registerNumber * 2;

            // Проверка, что данные не выходят за границы
            if (offset + getBytesCount(regInfo.registerType) > bytes.length) {
                console.warn(`Недостаточно данных для регистра ${registerNumber}`);
                continue;
            }

            // === SWITCH ===
            const registerType = regInfo?.registerType;

            if (!registerType || typeof registerType !== 'string') {
                //console.warn(`Регистр ${registerNumber}: некорректный registerType`);
                continue;
            }

            let value;

            switch (registerType) {
                case 'u2': value = dataView.getUint16(offset, true); break;
                case 's2': value = dataView.getInt16(offset, true); break;
                case 'f4': value = dataView.getFloat32(offset, true); break;
                default:
                    if (registerType.startsWith('b')) {
                        const bitIndex = parseInt(registerType.substring(1));
                        if (bitIndex >= 0 && bitIndex <= 15) {
                            value = (dataView.getUint16(offset, true) >> bitIndex) & 1;
                        } else {
                            console.warn(`Неверный бит: ${bitIndex} в ${registerType}`);
                            value = undefined;
                        }
                    } else {
                        console.warn(`Неизвестный тип: ${registerType}`);
                        value = undefined;
                    }
            }

            // Обновляем все спаны для этого регистра
            for (const span of regInfo.spans) {
                if (value !== undefined && !isNaN(value)) {
                    // Форматирование для float
                    if (regInfo.registerType === 'f4') {
                        span.innerHTML = value.toFixed(2);
                    } else {
                        span.innerHTML = value;
                    }
                } else {
                    span.innerHTML = '--';
                }
            }
        }

    } catch (error) {
        console.error('Ошибка при загрузке обновлений состояний регистров:', error);
    }
}

// Вспомогательная функция
function getBytesCount(registerType) {
    if (registerType === 'f4') return 4;
    return 2; // u2, s2, bx
}



// ========== ЗАПИСЬ РЕГИСТРОВ ==========
async function sendModbusData2(regId, valueToSend, registerType) {
    console.log(`Отправка в Modbus: Регистр=${regId}, Значение=${valueToSend}, Тип=${registerType}`);

    try {
        const response = await fetch(`/api/registers/${regId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                state: valueToSend,
                registerType: registerType
            })
        });

        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log('Modbus write response:', result);
        return result;

    } catch (error) {
        console.error('Ошибка при отправке данных в Modbus:', error);
        throw error;
    }
}


function setupModbusSendHandlers() {
    const sendElements = document.querySelectorAll('button[data-reg]');

    sendElements.forEach(element => {
        if (element.classList.contains('modbus-send-handler-attached')) {
            return;
        }
        element.classList.add('modbus-send-handler-attached');

        element.addEventListener('click', async (event) => {
            event.preventDefault();
            const regAttr = element.getAttribute('data-reg');

            if (!regAttr) {
                console.error("Не хватает атрибутов для отправки Modbus:", element);
                return;
            }

            const regs = regAttr.split(',').map(r => r.trim());

            for (const reg of regs) {
                // === БЕРЁМ ДАННЫЕ ИЗ КЭША ===
                const regInfo = modbusDisplayInputCache.get(reg);
                
                if (!regInfo) {
                    console.error(`Регистр ${reg} не найден в кэше modbusDisplayInputCache.`);
                    continue;
                }

                const inputElement = regInfo.element;
                const registerType = regInfo.registerType || 'u2';

                if (!inputElement) {
                    console.error(`Для регистра ${reg} нет элемента в кэше.`);
                    continue;
                }

                let valueToSend = inputElement.value;

                if (valueToSend === null || valueToSend === undefined || valueToSend === '') {
                    console.error(`Пустое значение для регистра ${reg}`);
                    continue;
                }

                console.log(`[DEBUG] Отправка: reg=${reg}, value=${valueToSend}, type=${registerType}`);
                await sendModbusData2(reg, valueToSend, registerType);
            }
        });
    });
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initializePage() {
    const fetchedProjectConfig = await loadConfig(projectConfig);

    isEditUIMode = fetchedProjectConfig && fetchedProjectConfig.isEditUIMode !== undefined
        ? fetchedProjectConfig.isEditUIMode
        : false;
    if (isEditUIMode === false) {
        await updateUI();
        collectModbusElements(renderArea);
        setupModbusSendHandlers();
        setInterval(pollModbusUpdates, updateIntervalMs);

    } else {
        setInterval(updateUI, 500);
    }
}

// Запускаем инициализацию при загрузке DOM
document.addEventListener('DOMContentLoaded', initializePage);