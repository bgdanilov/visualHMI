// public/js/core/numpad/NumpadController.js
import { NumpadView } from './NumpadView.js';
import { validator } from '../validator.js';
import { notification } from '../notification.js';

const DEFAULT_DECIMAL_PLACES = 3;
const DECIMAL_WARNING_COOLDOWN_MS = 2000;

/**
 * Логика numpad'а: config, состояние value, валидация, callbacks.
 * Не трогает DOM — всё через NumpadView.
 */
export class NumpadController {
    constructor() {
        this.view = new NumpadView();
        this.isOpen = false;

        this.config = this._defaultConfig();
        this.value = '';

        this._decimalWarnTimer = null;
        this._errorWarned = false;
    }

    _defaultConfig() {
        return {
            min: null,
            max: null,
            decimalPlaces: DEFAULT_DECIMAL_PLACES,
            maxDecimalPlaces: DEFAULT_DECIMAL_PLACES,
            allowFloat: true,
            allowedValues: null,
            allowSign: true,
            onOk: null,
            onCancel: null
        };
    }

    // ============ ПУБЛИЧНЫЙ API ============

    show(initialValue, options = {}) {
        if (this.isOpen) return;

        this.config = {
            min:              options.min ?? null,
            max:              options.max ?? null,
            decimalPlaces:    options.decimalPlaces ?? DEFAULT_DECIMAL_PLACES,
            maxDecimalPlaces: options.maxDecimalPlaces ?? DEFAULT_DECIMAL_PLACES,
            allowFloat:       options.allowFloat ?? true,
            allowedValues:    Array.isArray(options.allowedValues) ? options.allowedValues : null,
            allowSign:        options.allowSign ?? true,
            onOk:             options.onOk || null,
            onCancel:         options.onCancel || null
        };

        this.value = String(initialValue ?? '');
        this._errorWarned = false;

        this.view.build({
            onDigit:      (d) => this._handleDigit(d),
            onBackspace:  () => this._handleBackspace(),
            onToggleSign: () => this._handleToggleSign(),
            onOk:         () => this._handleOk(),
            onCancel:     () => this._handleCancel()
        });

        this.view.setDecimalAllowed(this.config.allowFloat);
        this.view.setSignAllowed(this.config.allowSign);
        this.view.setAllowedDigits(this.config.allowedValues);
        this.view.updateRangeInfo(this._buildRangeInfo());
        this.view.updateDisplay(this._displayValue());
        this._updateLimitInfo();
        this.view.mount();

        this.isOpen = true;
    }

    hide() {
        if (!this.isOpen) return;
        this._cleanup();
    }

    // ============ ВВОД ============

    _handleDigit(d) {
        // Битовый/ограниченный регистр: разрешены только значения из allowedValues.
        // Проверка нужна для physical keyboard (кнопки уже disabled в view).
        if (this.config.allowedValues) {
            if (d === '.' || d === '+/-') return;
            const candidate = this.value + d;
            const num = parseFloat(candidate);
            if (!isNaN(num)) {
                const stillValidPrefix = this.config.allowedValues.some(v =>
                    String(v).startsWith(String(num))
                );
                if (!stillValidPrefix) return;
            }
        }

        if (d === '.' && !this.config.allowFloat) {
            this._warnDecimal('Для этого регистра допустимы только целые числа');
            return;
        }

        if (d === '.') {
            if (this.value.includes('.')) return;
            if (this.value === '' || this.value === '-') this.value += '0';
            this.value += '.';
            this._refreshDisplay();
            return;
        }

        if (d === '0') {
            if (this.value === '' || this.value === '-') {
                this.value += '0';
                this._refreshDisplay();
                return;
            }
            if (this.value === '0') return;
        }

        // Ограничение знаков после запятой
        if (this.config.maxDecimalPlaces !== null && this.config.maxDecimalPlaces >= 0) {
            const parts = this.value.split('.');
            if (parts.length === 2 && parts[1].length >= this.config.maxDecimalPlaces) {
                this._warnDecimal(`Максимум ${this.config.maxDecimalPlaces} знаков после запятой`);
                return;
            }
        }

        this.value += d;
        this._refreshDisplay();
    }

    _handleToggleSign() {
        if (!this.config.allowSign) return;

        const num = parseFloat(this.value);
        if (isNaN(num) || this.value === '' || num === 0) return;

        this.value = this.value.startsWith('-')
            ? this.value.slice(1)
            : '-' + this.value;

        this._refreshDisplay();
    }

    _handleBackspace() {
        if (this.value.length <= 1) {
            this.value = '';
        } else {
            const next = this.value.slice(0, -1);
            this.value = (next === '-') ? '' : next;
        }
        this._refreshDisplay();
    }

    // ============ ОТОБРАЖЕНИЕ ============

    _displayValue() {
        if (this.value === '' || this.value === '-') return '0';
        return this.value;
    }

    _refreshDisplay() {
        this.view.updateDisplay(this._displayValue());
        this._updateLimitInfo();
        this._validateAndStyle();
    }

    _buildRangeInfo() {
        const { min, max, maxDecimalPlaces, allowedValues } = this.config;
        const parts = [];

        if (allowedValues) {
            parts.push(`Допустимо: ${allowedValues.join(', ')}`);
        } else {
            if (min !== null && max !== null)      parts.push(`Диапазон: ${min} ... ${max}`);
            else if (min !== null)                 parts.push(`Мин: ${min}`);
            else if (max !== null)                 parts.push(`Макс: ${max}`);

            if (maxDecimalPlaces !== null && maxDecimalPlaces >= 0) {
                parts.push(`Макс. ${maxDecimalPlaces} знаков после запятой`);
            }
        }

        return parts.join(' | ');
    }

    _updateLimitInfo() {
        const max = this.config.maxDecimalPlaces;
        if (max === null || max < 0 || this.config.allowedValues) {
            this.view.updateLimitInfo('');
            return;
        }

        const count = validator.getDecimalCount(this.value);
        let color = '#999';
        if (count >= max)          color = '#f44336';
        else if (count >= max - 1) color = '#ff9800';

        this.view.updateLimitInfo(`${count}/${max}`, color);
    }

    // ============ ВАЛИДАЦИЯ / СТИЛИ ============

    _validateAndStyle() {
        // Для allowedValues уже есть проверка в _handleDigit; здесь не дублируем
        if (this.config.allowedValues) {
            this.view.updateDisplayStyle();
            return;
        }

        const { min, max, decimalPlaces } = this.config;
        if (min === null && max === null && decimalPlaces === null) {
            this.view.updateDisplayStyle();
            return;
        }

        const num = parseFloat(this.value);
        if (isNaN(num) || this.value === '' || this.value === '-' || this.value === '.') {
            this.view.updateDisplayStyle();
            this._errorWarned = false;
            return;
        }

        const result = validator.validate(this.value, {
            min,
            max,
            decimalPlaces: decimalPlaces ?? null
        });

        if (!result.valid) {
            this.view.updateDisplayStyle({ color: '#f44336', borderColor: '#f44336' });
            if (!this._errorWarned) {
                this._errorWarned = true;
                notification.warning(result.error, { title: 'Предупреждение', duration: 2000 });
            }
        } else {
            this.view.updateDisplayStyle();
            this._errorWarned = false;
        }
    }

    _warnDecimal(message) {
        if (this._decimalWarnTimer) return;
        notification.warning(message, { title: 'Предупреждение', duration: 2000 });
        this._decimalWarnTimer = setTimeout(() => {
            this._decimalWarnTimer = null;
        }, DECIMAL_WARNING_COOLDOWN_MS);
    }

    // ============ OK / CANCEL ============

    _handleOk() {
        if (this.value === '' || this.value === '-' || this.value === '.') {
            this.value = '0';
        }

        // Финальная проверка allowedValues
        if (this.config.allowedValues) {
            const num = parseInt(this.value, 10);
            if (!this.config.allowedValues.includes(num)) {
                notification.error(
                    `Допустимые значения: ${this.config.allowedValues.join(', ')}`,
                    { title: 'Ошибка', duration: 3000 }
                );
                this.view.updateDisplayStyle({ color: '#f44336', borderColor: '#f44336' });
                return;
            }
        }

        const result = validator.validateWithCorrection(this.value, {
            min: this.config.min,
            max: this.config.max,
            decimalPlaces: this.config.decimalPlaces ?? this.config.maxDecimalPlaces
        });

        if (!result.valid) {
            notification.error(result.error || 'Некорректное значение', {
                title: 'Ошибка', duration: 3000
            });
            this.view.updateDisplayStyle({ color: '#f44336', borderColor: '#f44336' });
            return;
        }

        let finalValue = result.normalized;

        if (result.corrected && finalValue !== this.value) {
            notification.warning(`Значение скорректировано до ${finalValue}`, {
                title: 'Коррекция', duration: 2000
            });
        }
        if (result.wasRounded) {
            notification.info(`Значение округлено до ${finalValue}`, {
                title: 'Округление', duration: 2000
            });
        }

        const decimalCount = validator.getDecimalCount(finalValue);
        if (this.config.maxDecimalPlaces !== null &&
            decimalCount > this.config.maxDecimalPlaces) {
            const rounded = parseFloat(parseFloat(finalValue).toFixed(this.config.maxDecimalPlaces));
            finalValue = String(rounded);
            notification.warning(
                `Значение округлено до ${this.config.maxDecimalPlaces} знаков: ${finalValue}`,
                { title: 'Округление', duration: 2000 }
            );
        }

        const onOk = this.config.onOk;
        this._cleanup();
        if (onOk) onOk(finalValue);
    }

    _handleCancel() {
        const onCancel = this.config.onCancel;
        this._cleanup();
        if (onCancel) onCancel();
    }

    // ============ ЖИЗНЕННЫЙ ЦИКЛ ============

    _cleanup() {
        this.view.unmount();
        this.isOpen = false;

        if (this._decimalWarnTimer) {
            clearTimeout(this._decimalWarnTimer);
            this._decimalWarnTimer = null;
        }

        this.value = '';
        this.config = this._defaultConfig();
        this._errorWarned = false;
    }
}