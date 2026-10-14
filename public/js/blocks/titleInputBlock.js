// public/js/blocks/titleInputBlock.js
import { BaseBlock } from './baseBlock.js';
import { parseBlockFormat } from '../utils/format.js';

const DEFAULT_DECIMAL_PLACES = 3;

export class TitleInputBlock extends BaseBlock {
    constructor(data, context) {
        super(data, context);
        this._numpadOpen = false;
        this._decimalWarningShown = false;
    }

    render() {
        const root = this.makeRoot(['title-input']);

        // Разбор data (с поддержкой format)
        let prefix, postfix, regAddress, regType, text = '';
        let size = 10;
        let showSaveButton = false;
        let min = null, max = null;
        let decimalPlaces = DEFAULT_DECIMAL_PLACES;

        if (this.data.format) {
            const p = parseBlockFormat(this.data.format[0], this.data.format[1]);
            prefix = p.formatPrefix;
            postfix = p.formatPostfix;
            regAddress = p.regAddress;
            regType = p.regType;
        } else {
            prefix = this.data.prefix || '';
            postfix = this.data.postfix || '';
            regAddress = this.data.regAddress;
            regType = this.data.regType || 'u2';
        }

        text = this.data.text || '';
        size = this.data.size || 10;
        showSaveButton = this.data.showSaveButton || false;
        min = this.data.min !== undefined ? this.data.min : null;
        max = this.data.max !== undefined ? this.data.max : null;
        decimalPlaces = this.data.decimalPlaces !== undefined
            ? this.data.decimalPlaces
            : DEFAULT_DECIMAL_PLACES;

        const width = size * 12 + 10;

        const titleHtml = text
            ? `<span class="title">${text}</span>`
            : '';

        const saveHtml = showSaveButton
            ? `<button class="input-save" data-reg="${regAddress}" data-type="${regType}">💾</button>`
            : '';

        root.innerHTML = `
            ${titleHtml}
            <div class="value">
                <span class="prefix">${prefix}</span>
                <input
                    type="text"
                    class="input"
                    data-reg="${regAddress}"
                    data-type="${regType}"
                    data-min="${min !== null ? min : ''}"
                    data-max="${max !== null ? max : ''}"
                    data-decimal-places="${decimalPlaces}"
                    style="width: ${width}px;"
                >
                <button class="input-reset" data-reg="${regAddress}" title="Сбросить">×</button>
                <span class="postfix">${postfix}</span>
                ${saveHtml}
            </div>`;

        const input = root.querySelector('.input');
        const resetBtn = root.querySelector('.input-reset');
        const saveBtn = root.querySelector('.input-save');

        // Регистрация в updater
        this.ctx.updater.addInput(regAddress, input, regType);

        // Валидация и numpad
        this._setupInputHandlers(input, regAddress, regType, { min, max, decimalPlaces });
        this._setupChangeTracking(input, regAddress, resetBtn);

        if (saveBtn) {
            this._setupSaveButton(saveBtn, input, regAddress, regType);
        }

        this.el = root;
        return root;
    }

    // ==== Numpad + валидация ====

    _setupInputHandlers(input, regAddress, registerType, { min, max, decimalPlaces }) {
        const regKey = String(regAddress);
        const isFloatType = registerType === 'f4';

        const validateAndCorrect = (value) => {
            if (!value || value.trim() === '') {
                return { valid: true, value, normalized: value };
            }
            return this.ctx.validator.validateWithCorrection(value, {
                min, max, decimalPlaces, registerType
            });
        };

        const applyResult = (result) => {
            if (result.valid) {
                if (result.corrected || result.wasRounded) {
                    const msg = result.corrected
                        ? `Значение скорректировано до ${result.normalized}`
                        : `Значение округлено до ${result.normalized}`;
                    this.ctx.notification.warning(msg, { title: 'Коррекция', duration: 2000 });
                    input.value = result.normalized;
                    this._updateDirtyState(input, regAddress);
                }
                return true;
            } else {
                this.ctx.notification.error(result.error, { title: 'Ошибка ввода', duration: 3000 });
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
            this.ctx.updater.editingInputs.add(regKey);
            input.style.backgroundColor = '#fff8e1';
            input.style.borderColor = '#ff9800';
        });

        input.addEventListener('blur', () => {
            if (this._numpadOpen) return;

            const v = input.value;
            if (v && v.trim() !== '') {
                const result = validateAndCorrect(v);
                applyResult(result);
            }

            this.ctx.updater.editingInputs.delete(regKey);
            input.style.backgroundColor = '';
            if (!input.classList.contains('input-changed')) {
                input.style.borderColor = '#ccc';
            }
        });

        input.addEventListener('input', () => {
            const v = input.value;

            if (!isFloatType && v.includes('.')) {
                input.value = v.replace(/\./g, '');
                if (!this._decimalWarningShown) {
                    this._decimalWarningShown = true;
                    this.ctx.notification.warning(
                        'Для этого регистра допустимы только целые числа',
                        { title: 'Предупреждение', duration: 2000 }
                    );
                    setTimeout(() => { this._decimalWarningShown = false; }, 2000);
                }
                this._updateDirtyState(input, regAddress);
                return;
            }

            if (isFloatType && v.includes('.')) {
                const parts = v.split('.');
                if (parts.length === 2 && parts[1].length > decimalPlaces) {
                    input.value = parts[0] + '.' + parts[1].slice(0, decimalPlaces);
                    if (!this._decimalWarningShown) {
                        this._decimalWarningShown = true;
                        this.ctx.notification.warning(
                            `Максимум ${decimalPlaces} знаков после запятой`,
                            { title: 'Предупреждение', duration: 2000 }
                        );
                        setTimeout(() => { this._decimalWarningShown = false; }, 2000);
                    }
                }
            }

            this._updateDirtyState(input, regAddress);
        });

        input.addEventListener('keydown', (e) => {
            if (!isFloatType && e.key === '.') {
                e.preventDefault();
                this.ctx.notification.warning(
                    'Для этого регистра допустимы только целые числа',
                    { title: 'Предупреждение', duration: 2000 }
                );
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }

            if (e.key === 'Escape') {
                if (this._numpadOpen) return;
                input.blur();
                this.ctx.updater.editingInputs.delete(regKey);
                input.style.backgroundColor = '';
                if (!input.classList.contains('input-changed')) {
                    input.style.borderColor = '#ccc';
                }
            }
        });

        input.addEventListener('change', () => {
            this._updateDirtyState(input, regAddress);
        });

        // Клик — открыть numpad
        input.addEventListener('click', () => {
            if (this._numpadOpen) return;
            this._numpadOpen = true;
            input.readOnly = true;

            const curValue = input.value;

            this.ctx.numpad.show(curValue, {
                min,
                max,
                maxDecimalPlaces: isFloatType ? decimalPlaces : 0,
                decimalPlaces: isFloatType ? decimalPlaces : 0,
                allowFloat: isFloatType,
                onOk: (val) => {
                    input.readOnly = false;
                    input.value = val;
                    this._updateDirtyState(input, regAddress);

                    const result = validateAndCorrect(val);
                    applyResult(result);

                    this._numpadOpen = false;
                    this.ctx.updater.editingInputs.delete(regKey);
                    input.style.backgroundColor = '';
                    if (!input.classList.contains('input-changed')) {
                        input.style.borderColor = '#ccc';
                    }

                    setTimeout(() => {
                        this._updateDirtyState(input, regAddress);
                    }, 50);

                    input.blur();
                },
                onCancel: () => {
                    input.readOnly = false;
                    const entry = this.ctx.updater.caches.inputs.get(regKey);
                    if (entry) {
                        input.value = entry.originalValue;
                    }
                    this._updateDirtyState(input, regAddress);

                    this._numpadOpen = false;
                    this.ctx.updater.editingInputs.delete(regKey);
                    input.style.backgroundColor = '';
                    if (!input.classList.contains('input-changed')) {
                        input.style.borderColor = '#ccc';
                    }

                    setTimeout(() => {
                        this._updateDirtyState(input, regAddress);
                    }, 50);

                    input.blur();
                }
            });
        });
    }

    _setupChangeTracking(input, regAddress, resetBtn) {
        const regKey = String(regAddress);

        input.addEventListener('input', () => {
            this._updateDirtyState(input, regAddress);
        });

        input.addEventListener('change', () => {
            this._updateDirtyState(input, regAddress);
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const entry = this.ctx.updater.caches.inputs.get(regKey);
                if (entry) {
                    input.value = entry.originalValue;
                    this._updateDirtyState(input, regAddress);
                }
            });
        }
    }

    _updateDirtyState(input, regAddress) {
        const regKey = String(regAddress);
        const isDirty = this.ctx.updater.isDirty(regKey);
        input.classList.toggle('input-changed', isDirty);
        window.dispatchEvent(new CustomEvent('input-dirty-change'));
    }

    // ==== Кнопка 💾 — сохранить только это поле ====

    _setupSaveButton(button, input, regAddress, regType) {
        button.addEventListener('click', async () => {
            const originalText = button.textContent;
            button.textContent = '⏳';
            button.disabled = true;

            const success = await this._saveInputValue(input, regAddress, regType);

            button.textContent = success ? '✅' : '❌';

            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1500);
        });
    }

    async _saveInputValue(input, regAddress, regType) {
        const value = input.value.trim();
        if (!value) {
            this.ctx.notification.warning('Пустое значение', { title: 'Предупреждение' });
            return false;
        }

        const min = input.dataset.min !== '' ? parseFloat(input.dataset.min) : null;
        const max = input.dataset.max !== '' ? parseFloat(input.dataset.max) : null;
        const decimalPlaces = input.dataset.decimalPlaces !== undefined
            ? parseInt(input.dataset.decimalPlaces)
            : DEFAULT_DECIMAL_PLACES;

        const result = this.ctx.validator.validateWithCorrection(value, {
            min, max, decimalPlaces, registerType: regType
        });

        if (!result.valid) {
            this.ctx.notification.error(result.error, { title: 'Ошибка валидации', duration: 4000 });
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
            const msg = result.corrected
                ? `Значение скорректировано до ${finalValue}`
                : `Значение округлено до ${finalValue}`;
            this.ctx.notification.warning(msg, { title: 'Коррекция', duration: 2000 });
        }

        if (finalValue !== input.value) {
            input.value = finalValue;
        }

        const regKey = String(regAddress);
        this.ctx.updater.markAsSending(regKey);

        try {
            await this.ctx.api.writeRegister(regAddress, finalValue, regType);
            this.ctx.updater.updateOriginalValue(regAddress, finalValue);
            this._updateDirtyState(input, regAddress);

            input.style.backgroundColor = '#e8f5e9';
            input.style.borderColor = 'green';

            this.ctx.notification.success(`Значение ${finalValue} сохранено`, {
                title: 'Успешно', duration: 2000
            });

            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 1000);

            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            input.style.backgroundColor = '#ffebee';
            input.style.borderColor = 'red';
            this.ctx.notification.error(error.message || 'Ошибка сохранения', {
                title: 'Ошибка', duration: 4000
            });
            setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#ccc';
            }, 2000);
            return false;
        } finally {
            this.ctx.updater.unmarkAsSending(regKey);
            this.ctx.updater.editingInputs.delete(regKey);
        }
    }
}