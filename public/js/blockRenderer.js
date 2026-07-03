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
        block.id = `block-${blockData.id || this.getNextId()}`;
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
    let p = null;
    
    if (data.format) {
        p = this._parseBlockFormat(data.format[0], data.format[1]);
        config = {
            text: (data.text || '').replace(/\n/g, '<br>'),
            prefix: p.textBefore,
            postfix: p.textAfter,
            regAddress: p.regId,
            regType: p.regType,
            value: '--'
        };
    } else {
        const { text = '', prefix = '', postfix = '', regAddress, regType = '', value = '--' } = data;
        config = { text, prefix, postfix, regAddress, regType, value };
    }
    
    // Одна сборка HTML
    block.innerHTML = `
        <div class="content">
            <span class="title">${config.text}</span>
        </div>
        <div class="content" data-reg="${config.regAddress}">
            <span class="prefix">${config.prefix}</span>
            <span class="number">${config.value}</span>
            <span class="postfix">${config.postfix}</span>
        </div>`;
     this._registerSpan(block, p.regId, p.regType, p.formatSpec);
    return block;
}

    

  /*  _createTitleNumber(block, data) {
    if (data.format) {
        const p = this._parseBlockFormat(data.format[0], data.format[1]);
        const text = (data.text || '').replace(/\n/g, '<br>');
        block.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>
            <div class="content" data-reg="${p.regId}" data-type="${p.regType}">
                <span class="prefix">${p.textBefore}</span>
                <span class="number">--</span>
                <span class="postfix">${p.textAfter}</span>
            </div>`;
        this._registerSpan(block, p.regId, p.regType, p.formatSpec);
        return block;
    }
    const { text = '', prefix = '', postfix = '', regAddress, regType = '', value = '--' } = data;
    block.innerHTML = `
        <div class="content">
            <span class="title">${text}</span>
        </div>
        <div class="content" data-reg="${regAddress}" data-type="${regType}">
            <span class="prefix">${prefix}</span>
            <span class="number">${value}</span>
            <span class="postfix">${postfix}</span>
        </div>`;
    this._registerSpan(block, regAddress, regType);
    return block;
}*/






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
                for (const reg of regs) {
                    const regKey = String(reg);
                    
                    let regInfo = this.updater.caches.inputs.get(regKey);
                    
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
                        continue;
                    }

                    const value = regInfo.element?.value;
                    if (!value) {
                        console.error(`Пустое значение для регистра ${reg}`);
                        continue;
                    }

                    await this.api.writeRegister(reg, value, regInfo.registerType || 'u2');
                    
                    this.updater.updateOriginalValue(reg, value);
                    this._updateInputDirtyState(regInfo.element, reg);
                    
                    this.updater.editingInputs.delete(regKey);
                    
                    if (regInfo.element) {
                        regInfo.element.style.backgroundColor = '#e8f5e9';
                        regInfo.element.style.borderColor = 'green';
                        setTimeout(() => {
                            regInfo.element.style.backgroundColor = '';
                            regInfo.element.style.borderColor = '#ccc';
                        }, 1000);
                    }
                }

                sendButton.textContent = '✅ Отправлено';
                sendButton.classList.remove('sending');
                sendButton.classList.add('success');
                
                setTimeout(() => {
                    sendButton.textContent = originalText;
                    sendButton.disabled = false;
                    sendButton.classList.remove('success');
                }, 2000);

            } catch (error) {
                console.error('❌ Ошибка отправки:', error);
                sendButton.textContent = '❌ Ошибка';
                sendButton.classList.remove('sending');
                sendButton.classList.add('error');

                for (const reg of regs) {
                    this.updater.editingInputs.delete(String(reg));
                }

                setTimeout(() => {
                    sendButton.textContent = originalText;
                    sendButton.disabled = false;
                    sendButton.classList.remove('error');
                }, 1500);
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

        console.log(`✅ Отображено ${this.blocks.size} блоков`);
        console.log(`📊 Кэш inputs:`, this.updater.caches.inputs);
    }

    clear() {
        if (this.renderArea) {
            this.renderArea.innerHTML = '';
        }
        this.blocks.clear();
        this.updater.clearCaches();
    }
}

export const blockRenderer = new BlockRenderer();