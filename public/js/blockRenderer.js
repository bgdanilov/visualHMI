// public/js/blockRenderer.js
import { BLOCK_TYPES } from './constants.js';
import { api } from './apiClient.js';
import { modbusUpdater } from './modbusUpdater.js'; // ✅ теперь импорт работает

export class BlockRenderer {
    constructor() {
        this.renderArea = null;
        this.blocks = new Map();
        this.blockCounter = 0;
        this.api = api;
        this.updater = modbusUpdater; // ✅ используем экземпляр
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
            default:
                console.warn(`Неизвестный тип блока: ${blockData.type}`);
                return null;
        }
    }

    _createOnlyNumber(block, data) {
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
        const { text = '', prefix = '', postfix = '', regAddress, regType = 'u2', value = '--' } = data;
        
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
    }

    _createTitleGroupNumber(block, data) {
        const { text = '', regAddress, prefixes = [], postfixes = [], regType = [], value = [] } = data;
        
        block.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>`;

        if (!Array.isArray(regAddress)) {
            console.warn('regAddress не является массивом');
            return block;
        }

        regAddress.forEach((regIdx, i) => {
            const prefix = prefixes[i] || '';
            const postfix = postfixes[i] || '';
            const type = regType[i] || 'u2';
            const val = Array.isArray(value) ? value[i] : value;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.dataset.reg = regIdx;
            contentDiv.dataset.type = type;
            contentDiv.innerHTML = `
                <span class="prefix">${prefix}</span>
                <span class="number">${val ?? '--'}</span>
                <span class="postfix">${postfix}</span>
            `;
            
            block.appendChild(contentDiv);
            this._registerSpan(contentDiv, regIdx, type);
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
        const { 
            text = '', 
            prefix = '', 
            postfix = '', 
            regAddress, 
            regType = 'u2', 
            size = 10,
            showSaveButton = false,
            autoSave = false
        } = data;
        
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
                <span class="postfix">${postfix}</span>
                ${saveButtonHtml}
            </div>`;

        const input = block.querySelector('.input-value-field');
        
        // ✅ РЕГИСТРИРУЕМ INPUT В КЭШЕ
        this.updater.addInput(regAddress, input, regType);
        
        this._setupInputHandlers(input, regAddress);
        this._setupInputSaveOnEnter(input, regAddress, regType);
        
        const saveBtn = block.querySelector('.input-save-btn');
        if (saveBtn) {
            this._setupSaveButton(saveBtn, regAddress, regType);
        }
        
        if (autoSave) {
            input.addEventListener('blur', async () => {
                const value = input.value.trim();
                if (value) {
                    await this._saveInputValue(input, regAddress, regType);
                }
            });
        }
        
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

    _registerSpan(parentElement, regAddress, regType) {
        const span = parentElement.querySelector('span.number');
        if (span) {
            this.updater.addSpan(regAddress, span, regType);
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
    
        input.addEventListener('focus', () => {
            this.updater.editingInputs.add(regKey);
            input.style.backgroundColor = '#fff8e1';
            input.style.borderColor = '#ff9800';
            console.log(`✏️ Редактирование начато для регистра ${regAddress}`);
        });
    
        input.addEventListener('blur', () => {
            // ✅ Убираем из редактируемых при потере фокуса
            this.updater.editingInputs.delete(regKey);
            input.style.backgroundColor = '';
            input.style.borderColor = '#ccc';
            console.log(`✏️ Редактирование завершено для регистра ${regAddress}`);
            
            // ✅ Принудительно обновляем значение из Modbus
            // Небольшая задержка, чтобы сервер успел обработать
            setTimeout(() => {
                this.updater.update().catch(error => {
                    console.error('Ошибка обновления после blur:', error);
                });
            }, 100);
        });
    
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                input.blur();
                this.updater.editingInputs.delete(regKey);
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
                // Сразу обновляем
                this.updater.update().catch(error => {
                    console.error('Ошибка обновления после Escape:', error);
                });
            }
        });
    }

    _setupInputSaveOnEnter(input, regAddress, regType) {
        input.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await this._saveInputValue(input, regAddress, regType);
            }
        });
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

    _setupSendButton(sendButton) {
        const originalText = sendButton.textContent;

        sendButton.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const regAttr = sendButton.dataset.reg;
            if (!regAttr) {
                console.error('Нет data-reg у кнопки');
                return;
            }

            const regs = regAttr.split(',').map(r => r.trim());

            sendButton.textContent = '⏳ Отправка...';
            sendButton.disabled = true;
            sendButton.classList.add('sending');

            try {
                for (const reg of regs) {
                    const regKey = String(reg);
                    
                    // Пытаемся получить из кэша
                    let regInfo = this.updater.caches.inputs.get(regKey);
                    
                    // Если нет в кэше - ищем в DOM
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