// public/js/blocks/titleInput/InputController.js

const DECIMAL_WARNING_COOLDOWN_MS = 2000;

/**
 * Управляет одним полем ввода (title-input):
 * — синхронизация с updater (dirty, originalValue, editingInputs)
 * — валидация и коррекция через ctx.validator
 * — открытие numpad
 * — сохранение одного поля (кнопка 💾)
 *
 * Все подписки на DOM-события устанавливаются в attach().
 * Состояние (numpadOpen, decimalWarningTimer) — внутри экземпляра.
 */
export class InputController {
    /**
     * @param {Object} params
     * @param {HTMLInputElement} params.input
     * @param {HTMLButtonElement|null} params.resetBtn
     * @param {HTMLButtonElement|null} params.saveBtn
     * @param {ReturnType<import('../../utils/parseInputConfig.js').parseInputConfig>} params.cfg
     * @param {Object} params.ctx — контекст блока (updater, validator, numpad, notification, api)
     */
    constructor({ input, resetBtn, saveBtn, cfg, ctx }) {
        this.input    = input;
        this.resetBtn = resetBtn;
        this.saveBtn  = saveBtn;
        this.cfg      = cfg;
        this.ctx      = ctx;

        this.regKey  = String(cfg.regAddress);
        this.isFloat = cfg.isFloatType;
        this.isBit   = String(cfg.regType).startsWith('b');

        this._numpadOpen       = false;
        this._decimalWarnTimer = null;
    }

    // ============ ПУБЛИЧНЫЙ API ============

    attach() {
        this._bindFocus();
        this._bindBlur();
        this._bindInput();
        this._bindKeydown();
        this._bindReset();
        this._bindNumpad();

        if (this.saveBtn) {
            this._bindSave();
        }
    }

    detach() {
        if (this._decimalWarnTimer) {
            clearTimeout(this._decimalWarnTimer);
            this._decimalWarnTimer = null;
        }
    }

    // ============ ВАЛИДАЦИЯ ============

    _validate(value) {
        return this.ctx.validator.validateWithCorrection(value, {
            min: this.cfg.min,
            max: this.cfg.max,
            decimalPlaces: this.cfg.decimalPlaces,
            registerType: this.cfg.regType
        });
    }

    _applyValidationResult(result) {
        if (result.valid) {
            if (result.corrected || result.wasRounded) {
                const msg = result.corrected
                    ? `Значение скорректировано до ${result.normalized}`
                    : `Значение округлено до ${result.normalized}`;
                this.ctx.notification.warning(msg, { title: 'Коррекция', duration: 2000 });
                this.input.value = result.normalized;
                this._updateDirtyState();
            }
            return true;
        }
        this.ctx.notification.error(result.error, { title: 'Ошибка ввода', duration: 3000 });
        this._flashError();
        return false;
    }

    // ============ DIRTY ============

    _updateDirtyState() {
        const isDirty = this.ctx.updater.isDirty(this.regKey);
        this.input.classList.toggle('input-changed', isDirty);
        window.dispatchEvent(new CustomEvent('input-dirty-change'));
    }

    // ============ СТИЛИ (флаш ошибки) ============

    _flashError() {
        this.input.style.backgroundColor = '#ffebee';
        this.input.style.borderColor = 'red';
        setTimeout(() => {
            this.input.style.backgroundColor = '';
            this.input.style.borderColor = '#ccc';
        }, 2000);
    }

    _flashSuccess() {
        this.input.style.backgroundColor = '#e8f5e9';
        this.input.style.borderColor = 'green';
        setTimeout(() => {
            this.input.style.backgroundColor = '';
            this.input.style.borderColor = '#ccc';
        }, 1000);
    }

    // ============ ПРЕДУПРЕЖДЕНИЕ О ДЕСЯТИЧНЫХ ============

    _warnDecimal(message) {
        if (this._decimalWarnTimer) return;
        this.ctx.notification.warning(message, { title: 'Предупреждение', duration: 2000 });
        this._decimalWarnTimer = setTimeout(() => {
            this._decimalWarnTimer = null;
        }, DECIMAL_WARNING_COOLDOWN_MS);
    }

    // ============ ПОДПИСКИ ============

    _bindFocus() {
        this.input.addEventListener('focus', () => {
            this.ctx.updater.editingInputs.add(this.regKey);
            this.input.style.backgroundColor = '#fff8e1';
            this.input.style.borderColor = '#ff9800';
        });
    }

    _bindBlur() {
        this.input.addEventListener('blur', () => {
            if (this._numpadOpen) return;

            const v = this.input.value;
            if (v && v.trim() !== '') {
                this._applyValidationResult(this._validate(v));
            }

            this.ctx.updater.editingInputs.delete(this.regKey);
            this.input.style.backgroundColor = '';
            if (!this.input.classList.contains('input-changed')) {
                this.input.style.borderColor = '#ccc';
            }
        });
    }

    _bindInput() {
        // Единственный input-обработчик: и фильтр формата, и dirty.
        this.input.addEventListener('input', () => {
            const v = this.input.value;

            // Битовый регистр — в поле только 0 или 1
            if (this.isBit) {
                const filtered = v.replace(/[^01]/g, '');
                if (filtered !== v) {
                    this.input.value = filtered.slice(0, 1);
                    this._warnDecimal('Для битового регистра допустимы только 0 или 1');
                } else if (filtered.length > 1) {
                    this.input.value = filtered.slice(0, 1);
                }
                this._updateDirtyState();
                return;
            }

            if (!this.isFloat && v.includes('.')) {
                this.input.value = v.replace(/\./g, '');
                this._warnDecimal('Для этого регистра допустимы только целые числа');
                this._updateDirtyState();
                return;
            }

            if (this.isFloat && v.includes('.')) {
                const parts = v.split('.');
                if (parts.length === 2 && parts[1].length > this.cfg.decimalPlaces) {
                    this.input.value = parts[0] + '.' + parts[1].slice(0, this.cfg.decimalPlaces);
                    this._warnDecimal(`Максимум ${this.cfg.decimalPlaces} знаков после запятой`);
                }
            }

            this._updateDirtyState();
        });
    }

    _bindKeydown() {
        this.input.addEventListener('keydown', (e) => {
            if (!this.isFloat && e.key === '.') {
                e.preventDefault();
                this._warnDecimal('Для этого регистра допустимы только целые числа');
                return;
            }

            if (this.isBit && /^[2-9]$/.test(e.key)) {
                e.preventDefault();
                this._warnDecimal('Для битового регистра допустимы только 0 или 1');
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                this.input.blur();
            }

            if (e.key === 'Escape') {
                if (this._numpadOpen) return;
                this.input.blur();
                this.ctx.updater.editingInputs.delete(this.regKey);
                this.input.style.backgroundColor = '';
                if (!this.input.classList.contains('input-changed')) {
                    this.input.style.borderColor = '#ccc';
                }
            }
        });
    }

    _bindReset() {
        if (!this.resetBtn) return;
        this.resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const entry = this.ctx.updater.caches.inputs.get(this.regKey);
            if (entry) {
                this.input.value = entry.originalValue;
                this._updateDirtyState();
            }
        });
    }

    _bindNumpad() {
        this.input.addEventListener('click', () => {
            if (this._numpadOpen) return;
            this._openNumpad();
        });
    }

    _openNumpad() {
        this._numpadOpen = true;
        this.input.readOnly = true;

        const dp = this.isFloat ? this.cfg.decimalPlaces : 0;

        this.ctx.numpad.show(this.input.value, {
            min: this.cfg.min,
            max: this.cfg.max,
            maxDecimalPlaces: dp,
            decimalPlaces: dp,
            allowFloat: this.isFloat,
            allowedValues: this.isBit ? [0, 1] : null,
            allowSign: !this.isBit,
            onOk: (val) => {
                this.input.readOnly = false;
                this.input.value = val;
                this._updateDirtyState();
                this._applyValidationResult(this._validate(val));
                this._closeNumpad();
                this.input.blur();
                setTimeout(() => this._updateDirtyState(), 50);
            },
            onCancel: () => {
                this.input.readOnly = false;
                const entry = this.ctx.updater.caches.inputs.get(this.regKey);
                if (entry) this.input.value = entry.originalValue;
                this._updateDirtyState();
                this._closeNumpad();
                this.input.blur();
                setTimeout(() => this._updateDirtyState(), 50);
            }
        });
    }

    _closeNumpad() {
        this._numpadOpen = false;
        this.ctx.updater.editingInputs.delete(this.regKey);
        this.input.style.backgroundColor = '';
        if (!this.input.classList.contains('input-changed')) {
            this.input.style.borderColor = '#ccc';
        }
    }

    // ============ СОХРАНЕНИЕ ОДНОГО ПОЛЯ (💾) ============

    _bindSave() {
        this.saveBtn.addEventListener('click', async () => {
            const originalText = this.saveBtn.textContent;
            this.saveBtn.textContent = '⏳';
            this.saveBtn.disabled = true;

            const success = await this._save();

            this.saveBtn.textContent = success ? '✅' : '❌';
            setTimeout(() => {
                this.saveBtn.textContent = originalText;
                this.saveBtn.disabled = false;
            }, 1500);
        });
    }

    async _save() {
        const value = this.input.value.trim();
        if (!value) {
            this.ctx.notification.warning('Пустое значение', { title: 'Предупреждение' });
            return false;
        }

        const result = this._validate(value);
        if (!result.valid) {
            this.ctx.notification.error(result.error, { title: 'Ошибка валидации', duration: 4000 });
            this._flashError();
            return false;
        }

        const finalValue = result.normalized;

        if (result.corrected || result.wasRounded) {
            const msg = result.corrected
                ? `Значение скорректировано до ${finalValue}`
                : `Значение округлено до ${finalValue}`;
            this.ctx.notification.warning(msg, { title: 'Коррекция', duration: 2000 });
        }

        if (finalValue !== this.input.value) {
            this.input.value = finalValue;
        }

        this.ctx.updater.markAsSending(this.regKey);

        try {
            await this.ctx.api.writeRegister(this.cfg.regAddress, finalValue, this.cfg.regType);
            this.ctx.updater.updateOriginalValue(this.cfg.regAddress, finalValue);
            this._updateDirtyState();
            this._flashSuccess();
            this.ctx.notification.success(`Значение ${finalValue} сохранено`, {
                title: 'Успешно', duration: 2000
            });
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            this._flashError();
            this.ctx.notification.error(error.message || 'Ошибка сохранения', {
                title: 'Ошибка', duration: 4000
            });
            return false;
        } finally {
            this.ctx.updater.unmarkAsSending(this.regKey);
            this.ctx.updater.editingInputs.delete(this.regKey);
        }
    }
}