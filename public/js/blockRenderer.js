// public/js/blockRenderer.js
import { BLOCK_TYPES } from './constants.js';
import { api } from './apiClient.js';
import { modbusUpdater } from './modbusUpdater.js';
import { numpadManager } from './numpad.js';
import { validator } from './validator.js';
import { notification } from './notification.js';

// 🔥 Глобальная настройка количества знаков после запятой
const DEFAULT_DECIMAL_PLACES = 3;

export class BlockRenderer {
    constructor() {
        this.renderArea = null;
        this.blocks = new Map();
        this.blockCounter = 0;
        this.api = api;
        this.updater = modbusUpdater;
        this._numpadOpenReg = null;
        this.validator = validator;
        this.notification = notification;
        this._decimalWarningShown = false;
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
        block.id = `block-${this.getNextId()}`;
        block.style.left = `${blockData.x}px`;
        block.style.top = `${blockData.y}px`;

        // 🔥 Если установлен флаг plain - добавляем класс
        if (blockData.plain) {
            block.classList.add('plain');
        }

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
            case BLOCK_TYPES.EMPTY_BOX:  // 🔥 Новый случай
                return this._createEmptyBox(block, blockData);
            case BLOCK_TYPES.IMAGE:  // 🔥 Новый случай
                return this._createImage(block, blockData);
            default:
                console.warn(`Неизвестный тип блока: ${blockData.type}`);
                return null;
        }
    }

    _createOnlyNumber(block, data) {
        if (data.format) {
            const p = this._parseBlockFormat(data.format[0], data.format[1]);
            block.innerHTML = `
                <div class="content" data-reg="${p.regAddress}" data-type="${p.regType}">
                    <span class="prefix">${p.formatPrefix}</span>
                    <span class="number">--</span>
                    <span class="postfix">${p.formatPostfix}</span>
                </div>`;
            this._registerSpan(block, p.regAddress, p.regType, p.formatSpec);
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
        let regAddress, regType, text, prefix, postfix, formatSpec = '--';
        let value = '--';

        if (data.format) {
            const parsed = this._parseBlockFormat(data.format[0], data.format[1]);
            regAddress = parsed.regAddress;
            regType = parsed.regType;
            text = (data.text || '').replace(/\n/g, '<br>');
            prefix = parsed.formatPrefix;
            postfix = parsed.formatPostfix;
            formatSpec = parsed.formatSpec;
        } else {
            return;
        }

        block.innerHTML = `
        <div class="content">
            <span class="title">${text}</span>
        </div>
        <div class="content" data-reg="${regAddress}" data-type="${regType}">
            <span class="prefix">${prefix}</span>
            <span class="number">${value}</span>
            <span class="postfix">${postfix}</span>
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

        formatEntries.forEach(([formatString, regSpec]) => {
            const p = this._parseBlockFormat(formatString, regSpec);
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            contentDiv.dataset.reg = p.regAddress;
            contentDiv.dataset.type = p.regType;
            contentDiv.innerHTML = `
                <span class="prefix">${p.formatPrefix}</span>
                <span class="number">--</span>
                <span class="postfix">${p.formatPostfix}</span>
            `;
            block.appendChild(contentDiv);
            this._registerSpan(contentDiv, p.regAddress, p.regType, p.formatSpec);
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
        let min = null, max = null, decimalPlaces = DEFAULT_DECIMAL_PLACES;

        if (data.format) {
            const p = this._parseBlockFormat(data.format[0], data.format[1]);
            prefix = p.formatPrefix;
            postfix = p.formatPostfix;
            regAddress = p.regAddress;
            regType = p.regType;
            text = data.text || '';
            size = data.size || 10;
            showSaveButton = data.showSaveButton || false;
            min = data.min !== undefined ? data.min : null;
            max = data.max !== undefined ? data.max : null;
            decimalPlaces = data.decimalPlaces !== undefined ? data.decimalPlaces : DEFAULT_DECIMAL_PLACES;
        } else {
            text = data.text || '';
            prefix = data.prefix || '';
            postfix = data.postfix || '';
            regAddress = data.regAddress;
            regType = data.regType || 'u2';
            size = data.size || 10;
            showSaveButton = data.showSaveButton || false;
            min = data.min !== undefined ? data.min : null;
            max = data.max !== undefined ? data.max : null;
            decimalPlaces = data.decimalPlaces !== undefined ? data.decimalPlaces : DEFAULT_DECIMAL_PLACES;
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
                       data-min="${min !== null ? min : ''}"
                       data-max="${max !== null ? max : ''}"
                       data-decimal-places="${decimalPlaces}"
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

    _createEmptyBox(block, data) {
        // 🔥 Получаем ширину и высоту из данных, с значениями по умолчанию
        const width = data.width || 100;
        const height = data.height || 100;

        // 🔥 Опциональные стили рамки
        const borderColor = data.borderColor || '#cccccc';
        const borderWidth = data.borderWidth || 2;
        const borderStyle = data.borderStyle || 'solid';
        const borderRadius = data.borderRadius || 0;

        // 🔥 Цвет фона (только цвет)
        const backgroundColor = data.backgroundColor || 'transparent';

        // 🔥 Устанавливаем размеры блоку
        block.style.width = `${width}px`;
        block.style.height = `${height}px`;

        // 🔥 Применяем стили рамки
        block.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
        block.style.borderRadius = `${borderRadius}px`;

        // 🔥 Применяем цвет фона
        block.style.backgroundColor = backgroundColor;

        // 🔥 Если есть дополнительные CSS классы
        if (data.className) {
            block.classList.add(data.className);
        }

        return block;
    }

    _createImage(block, data) {
        const {
            src,
            width,
            height,
            alt = '',
            title = '',
            objectFit = 'contain',
            borderRadius = 0,
            border = 'none',
            opacity = 1,
            backgroundColor = 'transparent',
            spin = false,        // 🔥 Включить вращение
            spinSpeed = 'normal' // 🔥 Скорость: 'slow', 'normal', 'fast'
        } = data;

        // Стили
        if (width) {
            block.style.width = `${width}px`;
            block.style.minWidth = `${width}px`;
        }

        if (height) {
            block.style.height = `${height}px`;
            block.style.minHeight = `${height}px`;
        }

        block.style.borderRadius = `${borderRadius}px`;
        block.style.opacity = opacity;
        block.style.border = border;
        block.style.backgroundColor = backgroundColor;
        block.style.padding = '0';
        block.style.margin = '0';

        if (!src) {
            block.innerHTML = `
                <div class="content image-placeholder">
                    <span>📷 Нет изображения</span>
                </div>
            `;
            return block;
        }

        // 🔥 Определяем класс вращения
        let spinClass = '';
        if (spin) {
            if (spinSpeed === 'slow') {
                spinClass = 'spin-slow';
            } else if (spinSpeed === 'fast') {
                spinClass = 'spin-fast';
            } else if (spinSpeed === 'pause') {
                spinClass = 'spin-pause';
            } else if (spinSpeed === 'reverse') {
                spinClass = 'spin-reverse';
            } else {
                spinClass = 'spinning'; // normal
            }
        }

        block.innerHTML = `
            <div class="content image-wrapper" style="padding: 0; margin: 0;">
                <img 
                    src="${src}" 
                    alt="${alt}" 
                    title="${title}"
                    class="image-block ${spinClass}"
                    style="object-fit: ${objectFit}; padding: 0; margin: 0; display: block;"
                    loading="lazy"
                >
            </div>
        `;

        const img = block.querySelector('img');
        if (img) {
            img.onerror = function () {
                this.style.display = 'none';
                this.parentElement.innerHTML = `
                    <div class="image-error">
                        <span>❌</span>
                        <span>Ошибка загрузки</span>
                    </div>
                `;
            };

            img.onload = function () {
                if (!width) {
                    block.style.width = `${this.naturalWidth}px`;
                    block.style.minWidth = `${this.naturalWidth}px`;
                }
                if (!height) {
                    block.style.height = `${this.naturalHeight}px`;
                    block.style.minHeight = `${this.naturalHeight}px`;
                }
            };
        }

        // 🔥 Управление вращением через клик (опционально)
        if (data.toggleSpinOnClick) {
            const imgEl = block.querySelector('img');
            if (imgEl) {
                imgEl.style.cursor = 'pointer';
                imgEl.addEventListener('click', () => {
                    imgEl.classList.toggle('spinning');
                    imgEl.classList.toggle('spin-slow');
                    imgEl.classList.toggle('spin-fast');
                    imgEl.classList.toggle('spin-pause');
                    imgEl.classList.toggle('spin-reverse');
                });
            }
        }

        if (data.onClick) {
            const imgEl = block.querySelector('img');
            if (imgEl) {
                imgEl.style.cursor = 'pointer';
                imgEl.addEventListener('click', () => {
                    if (typeof data.onClick === 'function') {
                        data.onClick(data);
                    } else if (typeof data.onClick === 'string') {
                        try {
                            new Function(data.onClick)(); пше
                        } catch (e) {
                            console.warn('Ошибка выполнения onClick:', e);
                        }
                    }
                });
            }
        }

        return block;
    }

    _parseBlockFormat(formatString, regSpec) {
        let i = 0, formatPrefix = '', formatSpec = null, formatPostfix = '';

        while (i < formatString.length) {
            if (formatString[i] === '%') {
                if (i + 1 < formatString.length && formatString[i + 1] === '%') {
                    formatPrefix += '%'; i += 2; continue;
                }
                const start = i; i++;
                while (i < formatString.length && /[#0\- +]/.test(formatString[i])) i++;
                while (i < formatString.length && /\d/.test(formatString[i])) i++;
                if (i < formatString.length && formatString[i] === '.') { i++; while (i < formatString.length && /\d/.test(formatString[i])) i++; }
                if (i < formatString.length && /[diufegGcxX]/.test(formatString[i])) {
                    formatSpec = formatString.slice(start, i + 1); i++;
                }
                formatPostfix = formatString.slice(i);
                break;
            }
            formatPrefix += formatString[i]; i++;
        }

        formatPrefix = formatPrefix.trimEnd();
        formatPostfix = formatPostfix.trimStart();

        let regAddress, regType;
        if (typeof regSpec === 'string' && regSpec.includes(':')) {
            const parts = regSpec.split(':');
            regAddress = parseInt(parts[0]);
            regType = parts[1];
        } else {
            regAddress = parseInt(regSpec);
            const last = formatSpec ? formatSpec.slice(-1) : '';
            regType = ({ f: 'f4', e: 'f4', E: 'f4', g: 'f4', G: 'f4', c: 'b0', d: 's2', i: 's2', u: 'u2', x: 'u2', X: 'u2', o: 'u2' })[last] || 'u2';
        }
        return { regAddress, regType, formatPrefix, formatPostfix, formatSpec };
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
            this.notification.warning('Пустое значение', { title: 'Предупреждение' });
            return false;
        }

        const min = input.dataset.min !== '' ? parseFloat(input.dataset.min) : null;
        const max = input.dataset.max !== '' ? parseFloat(input.dataset.max) : null;
        const decimalPlaces = input.dataset.decimalPlaces !== undefined
            ? parseInt(input.dataset.decimalPlaces)
            : DEFAULT_DECIMAL_PLACES;

        // 🔥 Передаем registerType в валидатор
        const result = this.validator.validateWithCorrection(value, {
            min,
            max,
            decimalPlaces: decimalPlaces,
            registerType: regType  // 🔥 Добавляем
        });

        if (!result.valid) {
            this.notification.error(result.error, {
                title: 'Ошибка валидации',
                duration: 4000
            });
            input.style.backgroundColor = '#ffebee';
            input.style.borderColor = 'red';
            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 3000);
            return false;
        }

        const finalValue = result.normalized;

        if (result.corrected || result.wasRounded) {
            let message = '';
            if (result.corrected) {
                message = `Значение скорректировано до ${finalValue}`;
            } else if (result.wasRounded) {
                message = `Значение округлено до ${finalValue}`;
            }

            this.notification.warning(message, {
                title: 'Коррекция',
                duration: 2000
            });
        }

        if (finalValue !== input.value) {
            input.value = finalValue;
        }

        const regKey = String(regAddress);
        this.updater.markAsSending(regKey);

        try {
            await this.api.writeRegister(regAddress, finalValue, regType);

            this.updater.updateOriginalValue(regAddress, finalValue);
            this._updateInputDirtyState(input, regAddress);

            input.style.backgroundColor = '#e8f5e9';
            input.style.borderColor = 'green';

            this.notification.success(`Значение ${finalValue} сохранено`, {
                title: 'Успешно',
                duration: 2000
            });

            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 1000);

            return true;

        } catch (error) {
            console.error(`❌ Ошибка сохранения:`, error);

            input.style.backgroundColor = '#ffebee';
            input.style.borderColor = 'red';

            this.notification.error(error.message || 'Ошибка сохранения', {
                title: 'Ошибка',
                duration: 4000
            });

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

        const min = input.dataset.min !== '' ? parseFloat(input.dataset.min) : null;
        const max = input.dataset.max !== '' ? parseFloat(input.dataset.max) : null;
        const decimalPlaces = input.dataset.decimalPlaces !== undefined
            ? parseInt(input.dataset.decimalPlaces)
            : DEFAULT_DECIMAL_PLACES;
        const registerType = input.dataset.type || 'u2';  // 🔥 Тип регистра

        // 🔥 Проверка, является ли тип float
        const isFloatType = registerType === 'f4';

        const validateAndCorrectInput = (value) => {
            if (!value || value.trim() === '') {
                return { valid: true, value: value, normalized: value };
            }

            const result = renderer.validator.validateWithCorrection(value, {
                min: min,
                max: max,
                decimalPlaces: decimalPlaces,
                registerType: registerType
            });

            return result;
        };

        const applyValidationResult = (result, input, regAddress) => {
            if (result.valid) {
                if (result.corrected || result.wasRounded) {
                    let message = '';
                    if (result.corrected) {
                        message = `Значение скорректировано до ${result.normalized}`;
                    } else if (result.wasRounded) {
                        message = `Значение округлено до ${result.normalized}`;
                    }

                    if (message) {
                        renderer.notification.warning(message, {
                            title: 'Коррекция',
                            duration: 2000
                        });
                    }

                    input.value = result.normalized;
                    renderer._updateInputDirtyState(input, regAddress);
                }
                return true;
            } else {
                renderer.notification.error(result.error, {
                    title: 'Ошибка ввода',
                    duration: 3000
                });
                input.style.backgroundColor = '#ffebee';
                input.style.borderColor = 'red';
                setTimeout(() => {
                    input.style.backgroundColor = '';
                    input.style.borderColor = '#ccc';
                }, 2000);
                return false;
            }
        };

        input.addEventListener('focus', () => {
            this.updater.editingInputs.add(regKey);
            input.style.backgroundColor = '#fff8e1';
            input.style.borderColor = '#ff9800';
        });

        // 🔥 Валидация при потере фокуса
        input.addEventListener('blur', () => {
            if (this._numpadOpenReg === regKey) return;

            const currentValue = input.value;
            if (currentValue && currentValue.trim() !== '') {
                const result = validateAndCorrectInput(currentValue);
                applyValidationResult(result, input, regAddress);
            }

            this.updater.editingInputs.delete(regKey);
            input.style.backgroundColor = '';
            if (!input.classList.contains('input-changed')) {
                input.style.borderColor = '#ccc';
            }
        });

        // 🔥 Ввод с клавиатуры с проверкой типа
        input.addEventListener('input', () => {
            const value = input.value;

            // 🔥 Если не float - запрещаем ввод точки
            if (!isFloatType && value.includes('.')) {
                // Удаляем точку
                input.value = value.replace(/\./g, '');

                if (!this._decimalWarningShown) {
                    this._decimalWarningShown = true;
                    this.notification.warning(
                        'Для этого регистра допустимы только целые числа',
                        { title: 'Предупреждение', duration: 2000 }
                    );
                    setTimeout(() => {
                        this._decimalWarningShown = false;
                    }, 2000);
                }
                this._updateInputDirtyState(input, regAddress);
                return;
            }

            // 🔥 Если float - проверяем количество знаков после запятой
            if (isFloatType && value.includes('.')) {
                const parts = value.split('.');
                if (parts.length === 2 && parts[1].length > decimalPlaces) {
                    const corrected = parts[0] + '.' + parts[1].slice(0, decimalPlaces);
                    input.value = corrected;

                    if (!this._decimalWarningShown) {
                        this._decimalWarningShown = true;
                        this.notification.warning(
                            `Максимум ${decimalPlaces} знаков после запятой`,
                            { title: 'Предупреждение', duration: 2000 }
                        );
                        setTimeout(() => {
                            this._decimalWarningShown = false;
                        }, 2000);
                    }
                }
            }

            this._updateInputDirtyState(input, regAddress);
        });

        input.addEventListener('keydown', (event) => {
            // 🔥 Блокируем ввод точки для целых типов
            if (!isFloatType && event.key === '.') {
                event.preventDefault();
                this.notification.warning(
                    'Для этого регистра допустимы только целые числа',
                    { title: 'Предупреждение', duration: 2000 }
                );
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                input.blur();
            }

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

        input.addEventListener('change', () => {
            this._updateInputDirtyState(input, regAddress);
        });

        // 🔥 Открытие numpad с учетом типа
        input.addEventListener('click', () => {
            if (this._numpadOpenReg === regKey) return;
            this._numpadOpenReg = regKey;
            input.readOnly = true;

            const curValue = input.value;

            numpadManager.show(curValue, {
                min: min,
                max: max,
                maxDecimalPlaces: isFloatType ? decimalPlaces : 0,
                decimalPlaces: isFloatType ? decimalPlaces : 0,
                allowFloat: isFloatType,
                onOk(val) {
                    input.readOnly = false;

                    console.log('📥 Значение из numpad:', val);
                    console.log('📥 Текущее originalValue:', renderer.updater.caches.inputs.get(regKey)?.originalValue);

                    // 🔥 Устанавливаем значение в input
                    input.value = val;

                    // 🔥 Сразу обновляем dirty-статус
                    renderer._updateInputDirtyState(input, regAddress);

                    // 🔥 Применяем валидацию
                    const result = validateAndCorrectInput(val);
                    applyValidationResult(result, input, regAddress);

                    renderer._numpadOpenReg = null;
                    renderer.updater.editingInputs.delete(regKey);
                    input.style.backgroundColor = '';
                    if (!input.classList.contains('input-changed')) {
                        input.style.borderColor = '#ccc';
                    }

                    // 🔥 ПРИНУДИТЕЛЬНО обновляем кнопку сохранения
                    setTimeout(() => {
                        renderer._updateInputDirtyState(input, regAddress);
                        window.dispatchEvent(new CustomEvent('input-dirty-change'));
                        console.log('🔄 Принудительное обновление dirty-статуса');
                    }, 50);

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

                    // 🔥 Обновляем кнопку сохранения при отмене
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('input-dirty-change'));
                    }, 50);

                    input.blur();
                }
            });
        });
    }

    _updateInputDirtyState(input, regAddress) {
        const regKey = String(regAddress);
        const isDirty = this.updater.isDirty(regKey);

        console.log(`🔄 Dirty-статус для ${regKey}:`, {
            current: input.value,
            original: this.updater.caches.inputs.get(regKey)?.originalValue,
            isDirty: isDirty
        });

        input.classList.toggle('input-changed', isDirty);

        // 🔥 Обновляем состояние кнопки сохранения
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

        console.log(`🔘 Кнопка сохранения для ${regAttr}: dirty=${hasDirty}`);

        sendButton.disabled = !hasDirty;
    }

    _setupSendButton(sendButton) {
        const originalText = sendButton.textContent;

        this._updateSendButtonState(sendButton);

        // 🔥 Подписываемся на событие изменения dirty-статуса
        window.addEventListener('input-dirty-change', () => {
            if (!document.body.contains(sendButton)) return;
            console.log('🔄 Событие input-dirty-change');
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
                const registersToSend = [];
                const failedRegisters = [];

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
                        failedRegisters.push(reg);
                        continue;
                    }

                    const value = regInfo.element?.value;
                    if (!value || value.trim() === '') {
                        console.error(`❌ Пустое значение для регистра ${reg}`);
                        failedRegisters.push(reg);
                        continue;
                    }

                    registersToSend.push({
                        regAddress: reg,
                        value: value.trim(),
                        type: regInfo.registerType || 'u2',
                        element: regInfo.element,
                        regKey: regKey
                    });
                }

                if (registersToSend.length === 0) {
                    sendButton.textContent = '❌ Нет данных';
                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('sending');
                    }, 1500);
                    return;
                }

                console.log(`📤 Отправка ${registersToSend.length} регистров параллельно...`);

                const promises = registersToSend.map(({ regAddress, value, type }) =>
                    this.api.writeRegister(regAddress, value, type)
                );

                const results = await Promise.allSettled(promises);

                let successCount = 0;
                let errorCount = 0;

                results.forEach((result, index) => {
                    const regData = registersToSend[index];

                    if (result.status === 'fulfilled') {
                        successCount++;
                        console.log(`✅ Регистр ${regData.regAddress} сохранён:`, result.value);

                        this.updater.updateOriginalValue(regData.regAddress, regData.value);
                        this._updateInputDirtyState(regData.element, regData.regAddress);

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
                        errorCount++;
                        console.error(`❌ Ошибка регистра ${regData.regAddress}:`, result.reason);

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

                if (errorCount === 0) {
                    sendButton.textContent = `✅ Отправлено (${successCount})`;
                    sendButton.classList.remove('sending');
                    sendButton.classList.add('success');

                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('success');
                    }, 2000);

                } else if (successCount === 0) {
                    sendButton.textContent = `❌ Ошибка (${errorCount})`;
                    sendButton.classList.remove('sending');
                    sendButton.classList.add('error');

                    setTimeout(() => {
                        sendButton.textContent = originalText;
                        sendButton.disabled = false;
                        sendButton.classList.remove('error');
                    }, 2500);

                } else {
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
                console.error('❌ Критическая ошибка:', error);
                sendButton.textContent = '❌ Ошибка сети';
                sendButton.classList.remove('sending');
                sendButton.classList.add('error');

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
    }
}

export const blockRenderer = new BlockRenderer();