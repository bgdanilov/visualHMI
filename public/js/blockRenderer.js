// public/js/blockRenderer.js
import { BLOCK_TYPES } from './constants.js';
import { api } from './apiClient.js';
import { modbusUpdater } from './modbusUpdater.js';
import { numpadManager } from './numpad.js';

export class BlockRenderer {
    constructor() {
        this.renderArea = null;
        this.blocks = new Map();
        this.blockCounter = 0;
        this.api = api;
        this.updater = modbusUpdater;
        this._numpadOpenReg = null;
    }

    setRenderArea(element) {
        this.renderArea = element;
    }

    getNextId() {
        return ++this.blockCounter;
    }

    createBlock(blockData) {
        const block = document.createElement('div');
        block.classList.add('block', blockData.type);
        // block.id = `block-${blockData.id || this.getNextId()}`;
        block.id = `block-${this.getNextId()}`;
        block.style.left = `${blockData.x}px`;
        block.style.top = `${blockData.y}px`;

        switch (blockData.type) {
            case BLOCK_TYPES.ONLY_NUMBER:
                return this._createOnlyNumber(block, blockData);
            case BLOCK_TYPES.ONLY_TITLE:
                return this._createOnlyTitle(block, blockData);
            case BLOCK_TYPES.TITLE_NUMBER:
                return this._createTitleNumber(block, blockData);
            case BLOCK_TYPES.TITLE_GROUP_NUMBER:
                return this._createTitleGroupNumber(block, blockData);
            case BLOCK_TYPES.TOGGLE_BUTTON:
                return this._createToggleButton(block, blockData);
            case BLOCK_TYPES.TITLE_INPUT:
                return this._createTitleInput(block, blockData);
            case BLOCK_TYPES.SEND_BUTTON:
                return this._createSendButton(block, blockData);
            case BLOCK_TYPES.PAGE_BUTTON:
                return this._createPageButton(block, blockData);
            default:
                console.warn(`Неизвестный тип блока: ${blockData.type}`);
                return null;
        }
    }

    _createOnlyNumber(block, data) {
        if (data.format) {
            const p = this._parseBlockFormat(data.format[0], data.format[1]);
            block.innerHTML = `
                <div class="content" data-reg="${p.regId}" data-type="${p.regType}">
                    <span class="prefix">${p.textBefore}</span>
                    <span class="number">--</span>
                    <span class="postfix">${p.textAfter}</span>
                </div>`;
            this._registerSpan(block, p.regId, p.regType, p.formatSpec);
            return block;
        }
        const { prefix = '', postfix = '', regAddress, regType = 'u2', value = '--' } = data;
        block.innerHTML = `
            <div class="content" data-reg="${regAddress}" data-type="${regType}">
                <span class="prefix">${prefix}</span>
                <span class="number">${value}</span>
                <span class="postfix">${postfix}</span>
            </div>`;
        this._registerSpan(block, regAddress, regType);
        return block;
    }

    _createOnlyTitle(block, data) {
        const text = (data.text || '').replace(/\n/g, '<br>');

        block.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>`;

        return block;
    }

    _createTitleNumber(block, data) {
        let config;
        let regAddress, regType, formatSpec = null;

        if (data.format) {
            const p = this._parseBlockFormat(data.format[0], data.format[1]);
            regAddress = p.regId;
            regType = p.regType;
            formatSpec = p.formatSpec;
            config = {
                text: (data.text || '').replace(/\n/g, '<br>'),
                prefix: p.textBefore,
                postfix: p.textAfter,
                value: '--'
            };
        } else {
            const { text = '', prefix = '', postfix = '', regAddress: addr, regType: type = '', value = '--' } = data;
            regAddress = addr;
            regType = type;
            config = { text, prefix, postfix, value };
        }

        // Одна сборка HTML
        block.innerHTML = `
        <div class="content">
            <span class="title">${config.text}</span>
        </div>
        <div class="content" data-reg="${config.regAddress}" data-type="${config.regType}">
            <span class="prefix">${config.prefix}</span>
            <span class="number">${config.value}</span>
            <span class="postfix">${config.postfix}</span>
        </div>`;
        this._registerSpan(block, regAddress, regType, formatSpec);
        return block;
    }

    _createTitleGroupNumber(block, data) {
        const { text = '', format: formatEntries = [] } = data;

        block.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>`;

        formatEntries.forEach(([fmtStr, regSpec]) => {
            const p = this._parseBlockFormat(fmtStr, regSpec);
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.dataset.reg = p.regId;
            contentDiv.dataset.type = p.regType;
            contentDiv.innerHTML = `
                <span class="prefix">${p.textBefore}</span>
                <span class="number">--</span>
                <span class="postfix">${p.textAfter}</span>
            `;
            block.appendChild(contentDiv);
            this._registerSpan(contentDiv, p.regId, p.regType, p.formatSpec);
        });

        return block;
    }

    _createToggleButton(block, data) {
        const { regAddress, regType = 'b0', prefix = '', text = 'Вкл' } = data;

        block.innerHTML = `
            <div class="content" data-reg="${regAddress}" data-type="${regType}">
                <span class="prefix btn">${prefix}</span>
                <button class="toggle-button off" data-reg="${regAddress}">
                    ${text}
                </button>
            </div>`;

        const toggleButton = block.querySelector('.toggle-button');
        this.updater.addToggle(regAddress, toggleButton, regType);
        this._setupToggleButton(toggleButton, regAddress, regType);

        return block;
    }

    _createTitleInput(block, data) {
        let prefix, postfix, regAddress, regType, size = 10, showSaveButton = false, text = '';

        if (data.format) {
            const p = this._parseBlockFormat(data.format[0], data.format[1]);
            prefix = p.textBefore;
            postfix = p.textAfter;
            regAddress = p.regId;
            regType = p.regType;
            text = data.text || '';
            size = data.size || 10;
            showSaveButton = data.showSaveButton || false;
        } else {
            text = data.text || '';
            prefix = data.prefix || '';
            postfix = data.postfix || '';
            regAddress = data.regAddress;
            regType = data.regType || 'u2';
            size = data.size || 10;
            showSaveButton = data.showSaveButton || false;
        }

        const width = size * 12 + 10;
        const inputId = `input-${regAddress}-${Date.now()}`;

        let saveButtonHtml = '';
        if (showSaveButton) {
            saveButtonHtml = `
                <button class="input-save-btn" data-reg="${regAddress}" data-type="${regType}">
                    💾
                </button>
            `;
        }

        block.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>
            <div class="content" data-reg="${regAddress}" data-type="${regType}">
                <span class="prefix">${prefix}</span>
                <input type="text" class="input-value-field" 
                       id="${inputId}"
                       data-reg="${regAddress}"
                       data-type="${regType}"
                       style="width: ${width}px;"
                       placeholder="...">
                <button class="input-reset-btn" data-reg="${regAddress}" title="Сбросить">×</button>
                <span class="postfix">${postfix}</span>
                ${saveButtonHtml}
            </div>`;

        const input = block.querySelector('.input-value-field');

        this.updater.addInput(regAddress, input, regType);

        this._setupInputHandlers(input, regAddress);
        this._setupInputChangeTracking(input, regAddress);

        const saveBtn = block.querySelector('.input-save-btn');
        if (saveBtn) {
            this._setupSaveButton(saveBtn, regAddress, regType);
        }

        return block;
    }

    _createPageButton(block, data) {
        const { text = 'Страница', targetPage } = data;

        block.innerHTML = `
            <div class="content">
                <button class="page-button" data-target="${targetPage}">${text}</button>
            </div>`;

        block.querySelector('.page-button').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('page-change', {
                detail: { targetPage }
            }));
        });

        return block;
    }

    _createSendButton(block, data) {
        const { regAddress, text = 'Сохранить' } = data;

        block.innerHTML = `
            <div class="content">
                <button class="send-button" data-reg="${regAddress}">
                    ${text}
                </button>
            </div>`;

        const sendButton = block.querySelector('.send-button');
        this._setupSendButton(sendButton);

        return block;
    }

    _parseBlockFormat(fmtStr, regSpec) {
        let i = 0, textBefore = '', formatSpec = null, textAfter = '';
        while (i < fmtStr.length) {
            if (fmtStr[i] === '%') {
                if (i + 1 < fmtStr.length && fmtStr[i + 1] === '%') {
                    textBefore += '%'; i += 2; continue;
                }
                const start = i; i++;
                while (i < fmtStr.length && /[#0\- +]/.test(fmtStr[i])) i++;
                while (i < fmtStr.length && /\d/.test(fmtStr[i])) i++;
                if (i < fmtStr.length && fmtStr[i] === '.') { i++; while (i < fmtStr.length && /\d/.test(fmtStr[i])) i++; }
                if (i < fmtStr.length && /[diufegGc]/.test(fmtStr[i])) {
                    formatSpec = fmtStr.slice(start, i + 1); i++;
                }
                textAfter = fmtStr.slice(i);
                break;
            }
            textBefore += fmtStr[i]; i++;
        }

        let regId, regType;
        if (typeof regSpec === 'string' && regSpec.includes(':')) {
            const parts = regSpec.split(':');
            regId = parseInt(parts[0]);
            regType = parts[1];
        } else {
            regId = parseInt(regSpec);
            const last = formatSpec ? formatSpec.slice(-1) : '';
            regType = ({ f: 'f4', e: 'f4', E: 'f4', g: 'f4', G: 'f4', c: 'b0', d: 's2', i: 's2', u: 'u2', x: 'u2', X: 'u2', o: 'u2' })[last] || 'u2';
        }
        return { regId, regType, textBefore, textAfter, formatSpec };
    }

    _registerSpan(parentElement, regAddress, regType, formatSpec) {
        const span = parentElement.querySelector('span.number');
        if (span) {
            this.updater.addSpan(regAddress, span, regType, formatSpec);
        }
    }

    async _saveInputValue(input, regAddress, regType) {
        const value = input.value.trim();
        if (!value) {
            console.warn(`Пустое значение для регистра ${regAddress}`);
            return false;
        }

        const regKey = String(regAddress);
        this.updater.markAsSending(regKey);

        try {
            console.log(`📝 Сохранение: регистр=${regAddress}, значение=${value}, тип=${regType}`);

            const result = await this.api.writeRegister(regAddress, value, regType);

            this.updater.updateOriginalValue(regAddress, value);
            this._updateInputDirtyState(input, regAddress);

            input.style.backgroundColor = '#e8f5e9';
            input.style.borderColor = 'green';

            console.log(`✅ Значение сохранено:`, result);

            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 1000);

            return true;

        } catch (error) {
            console.error(`❌ Ошибка сохранения:`, error);

            input.style.backgroundColor = '#ffebee';
            input.style.borderColor = 'red';

            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 2000);

            return false;
        } finally {
            this.updater.unmarkAsSending(regKey);
            this.updater.editingInputs.delete(regKey);
        }
    }

    _setupInputHandlers(input, regAddress) {
        const regKey = String(regAddress);
        const renderer = this;

        input.addEventListener('focus', () => {
            this.updater.editingInputs.add(regKey);
            input.style.backgroundColor = '#fff8e1';
            input.style.borderColor = '#ff9800';
        });

        input.addEventListener('blur', () => {
            if (this._numpadOpenReg === regKey) return;
            this.updater.editingInputs.delete(regKey);
            input.style.backgroundColor = '';
            if (!input.classList.contains('input-changed')) {
                input.style.borderColor = '#ccc';
            }
        });

        input.addEventListener('click', () => {
            if (this._numpadOpenReg === regKey) return;
            this._numpadOpenReg = regKey;
            input.readOnly = true;

            const curValue = input.value;
            numpadManager.show(curValue, {
                onOk(val) {
                    input.readOnly = false;
                    input.value = val;
                    renderer._updateInputDirtyState(input, regAddress);
                    renderer._numpadOpenReg = null;
                    renderer.updater.editingInputs.delete(regKey);
                    input.style.backgroundColor = '';
                    if (!input.classList.contains('input-changed')) {
                        input.style.borderColor = '#ccc';
                    }
                    input.blur();
                },
                onCancel() {
                    input.readOnly = false;
                    const entry = renderer.updater.caches.inputs.get(regKey);
                    if (entry) {
                        input.value = entry.originalValue;
                    }
                    renderer._updateInputDirtyState(input, regAddress);
                    renderer._numpadOpenReg = null;
                    renderer.updater.editingInputs.delete(regKey);
                    input.style.backgroundColor = '';
                    if (!input.classList.contains('input-changed')) {
                        input.style.borderColor = '#ccc';
                    }
                    input.blur();
                }
            });
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this._numpadOpenReg === regKey) return;
                input.blur();
                this.updater.editingInputs.delete(regKey);
                input.style.backgroundColor = '';
                if (!input.classList.contains('input-changed')) {
                    input.style.borderColor = '#ccc';
                }
            }
        });
    }

    _updateInputDirtyState(input, regAddress) {
        const regKey = String(regAddress);
        const isDirty = this.updater.isDirty(regKey);

        input.classList.toggle('input-changed', isDirty);

        window.dispatchEvent(new CustomEvent('input-dirty-change'));
    }

    _setupInputChangeTracking(input, regAddress) {
        const regKey = String(regAddress);

        input.addEventListener('input', () => {
            this._updateInputDirtyState(input, regAddress);
        });

        input.addEventListener('change', () => {
            this._updateInputDirtyState(input, regAddress);
        });

        const resetBtn = input.parentElement.querySelector('.input-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const entry = this.updater.caches.inputs.get(regKey);
                if (entry) {
                    input.value = entry.originalValue;
                    this._updateInputDirtyState(input, regAddress);
                }
            });
        }
    }

    _setupSaveButton(button, regAddress, regType) {
        button.addEventListener('click', async () => {
            const input = button.closest('.content').querySelector('.input-value-field');
            if (!input) return;

            const originalText = button.textContent;
            button.textContent = '⏳';
            button.disabled = true;

            const success = await this._saveInputValue(input, regAddress, regType);

            if (success) {
                button.textContent = '✅';
            } else {
                button.textContent = '❌';
            }

            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1500);
        });
    }

    _setupToggleButton(button, regAddress, registerType) {
        let isProcessing = false;

        button.addEventListener('click', async () => {
            if (isProcessing || button.disabled) return;

            const isOn = button.classList.contains('on');
            const newState = isOn ? 0 : 1;
            const regKey = String(regAddress);

            console.log(`🔄 Кнопка ${regAddress}: ${isOn ? 'Выкл' : 'Вкл'}`);

            isProcessing = true;
            button.disabled = true;
            button.classList.add('waiting');

            try {
                await this.api.writeRegister(regAddress, newState, registerType);

                await new Promise(resolve => setTimeout(resolve, 400));

                await this.updater.update();

            } catch (error) {
                console.error('❌ Ошибка:', error);
                button.textContent = '❌';
                button.style.borderColor = 'red';

                setTimeout(() => {
                    button.textContent = isOn ? 'Вкл' : 'Выкл';
                    button.style.borderColor = '';
                    button.classList.remove('waiting');
                }, 1500);
            } finally {
                setTimeout(() => {
                    isProcessing = false;
                    button.disabled = false;
                    button.classList.remove('waiting');
                }, 150);
            }
        });
    }

    _updateSendButtonState(sendButton) {
        const regAttr = sendButton.dataset.reg;
        if (!regAttr) return;
        const regs = regAttr.split(',').map(r => r.trim());
        const hasDirty = regs.some(reg => this.updater.isDirty(reg));
        sendButton.disabled = !hasDirty;
    }

    _setupSendButton(sendButton) {
        const originalText = sendButton.textContent;

        this._updateSendButtonState(sendButton);

        window.addEventListener('input-dirty-change', () => {
            if (!document.body.contains(sendButton)) return;
            this._updateSendButtonState(sendButton);
        });

        sendButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const regAttr = sendButton.dataset.reg;
            if (!regAttr) {
                console.error('Нет data-reg у кнопки');
                return;
            }

            const regs = regAttr.split(',').map(r => r.trim());

            // Проверяем, есть ли изменённые регистры
            const hasDirty = regs.some(reg => this.updater.isDirty(reg));
            if (!hasDirty) {
                sendButton.textContent = 'Нет изменений';
                setTimeout(() => {
                    sendButton.textContent = originalText;
                }, 1500);
                return;
            }

            sendButton.textContent = '⏳ Отправка...';
            sendButton.disabled = true;
            sendButton.classList.add('sending');

            try {
                // 🔍 ШАГ 1: Собираем все регистры для отправки
                const registersToSend = [];
                const failedRegisters = [];

                for (const reg of regs) {
                    const regKey = String(reg);
                    let regInfo = this.updater.caches.inputs.get(regKey);

                    // Если регистр не найден в кэше — ищем в DOM
                    if (!regInfo) {
                        console.warn(`⚠️ Регистр ${reg} не найден в кэше, ищем в DOM...`);
                        const inputElement = document.querySelector(`.input-value-field[data-reg="${reg}"]`);
                        if (inputElement) {
                            const parentContent = inputElement.closest('.content');
                            const regType = parentContent?.dataset?.type || 'u2';
                            this.updater.addInput(reg, inputElement, regType);
                            regInfo = this.updater.caches.inputs.get(regKey);
                            console.log(`✅ Найден и добавлен в кэш регистр ${reg}`);
                        }
                    }

                    if (!regInfo) {
                        console.error(`❌ Регистр ${reg} не найден`);
                        failedRegisters.push(reg);
                        continue;
                    }

                    const value = regInfo.element?.value;
                    if (!value || value.trim() === '') {
                        console.error(`❌ Пустое значение для регистра ${reg}`);
                        failedRegisters.push(reg);
                        continue;
                    }

                    // Добавляем в массив для отправки
                    registersToSend.push({
                        regId: reg,
                        value: value.trim(),
                        type: regInfo.registerType || 'u2',
                        element: regInfo.element,
                        regKey: regKey
                    });
                }

                // Если нет регистров для отправки — выходим
                if (registersToSend.length === 0) {
                    sendButton.textContent = '❌ Нет данных';
                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('sending');
                    }, 1500);
                    return;
                }

                // ⚡ ШАГ 2: Отправляем ВСЕ регистры ПАРАЛЛЕЛЬНО
                console.log(`📤 Отправка ${registersToSend.length} регистров параллельно...`);

                const promises = registersToSend.map(({ regId, value, type }) =>
                    this.api.writeRegister(regId, value, type)
                );

                // Используем Promise.allSettled для обработки всех результатов
                const results = await Promise.allSettled(promises);

                // 📊 ШАГ 3: Обрабатываем результаты
                let successCount = 0;
                let errorCount = 0;

                results.forEach((result, index) => {
                    const regData = registersToSend[index];

                    if (result.status === 'fulfilled') {
                        // ✅ Успешно
                        successCount++;
                        console.log(`✅ Регистр ${regData.regId} сохранён:`, result.value);

                        // Обновляем originalValue
                        this.updater.updateOriginalValue(regData.regId, regData.value);
                        this._updateInputDirtyState(regData.element, regData.regId);

                        // Подсветка зелёным
                        if (regData.element) {
                            regData.element.style.backgroundColor = '#e8f5e9';
                            regData.element.style.borderColor = 'green';
                            setTimeout(() => {
                                regData.element.style.backgroundColor = '';
                                regData.element.style.borderColor = '#ccc';
                            }, 1000);
                        }

                        this.updater.editingInputs.delete(regData.regKey);

                    } else {
                        // ❌ Ошибка
                        errorCount++;
                        console.error(`❌ Ошибка регистра ${regData.regId}:`, result.reason);

                        // Подсветка красным
                        if (regData.element) {
                            regData.element.style.backgroundColor = '#ffebee';
                            regData.element.style.borderColor = 'red';
                            setTimeout(() => {
                                regData.element.style.backgroundColor = '';
                                regData.element.style.borderColor = '#ccc';
                            }, 2000);
                        }
                    }
                });

                // 📊 ШАГ 4: Показываем результат пользователю
                if (errorCount === 0) {
                    // Все успешно
                    sendButton.textContent = `✅ Отправлено (${successCount})`;
                    sendButton.classList.remove('sending');
                    sendButton.classList.add('success');

                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('success');
                    }, 2000);

                } else if (successCount === 0) {
                    // Все с ошибкой
                    sendButton.textContent = `❌ Ошибка (${errorCount})`;
                    sendButton.classList.remove('sending');
                    sendButton.classList.add('error');

                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('error');
                    }, 2500);

                } else {
                    // Частичный успех
                    sendButton.textContent = `⚠️ ${successCount}/${successCount + errorCount}`;
                    sendButton.classList.remove('sending');
                    sendButton.classList.add('partial');

                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('partial');
                    }, 3000);
                }

            } catch (error) {
                // Критическая ошибка (например, сеть)
                console.error('❌ Критическая ошибка:', error);
                sendButton.textContent = '❌ Ошибка сети';
                sendButton.classList.remove('sending');
                sendButton.classList.add('error');

                // Снимаем dirty-статус со всех регистров
                for (const reg of regs) {
                    this.updater.editingInputs.delete(String(reg));
                }

                setTimeout(() => {
                    sendButton.textContent = originalText;
                    sendButton.disabled = false;
                    sendButton.classList.remove('error');
                }, 2500);
            }
        });
    }

    renderBlocks(blocksData) {
        if (!this.renderArea) {
            console.error('Render area не установлена');
            return;
        }

        this.renderArea.innerHTML = '';
        this.blocks.clear();

        blocksData.forEach(blockData => {
            const block = this.createBlock(blockData);
            if (block) {
                this.renderArea.appendChild(block);
                this.blocks.set(block.id, block);
            }
        });

        console.log(`✅ Отображено ${this.blocks.size} блоков`, this.blocks);
        console.log(`📊 Кэш inputs:`, this.updater.caches.inputs);
    }

    clear() {
        if (this.renderArea) {
            this.renderArea.innerHTML = '';
        }
        this.blocks.clear();
        this.updater.clearCaches();
        // this.blockCounter = 0; не буду обнулять, пусть растет с каждым переходом по странице. большие числа id не страшны.
    }
}

export const blockRenderer = new BlockRenderer();