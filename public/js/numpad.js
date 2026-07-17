// public/js/numpad.js
import { validator } from './validator.js';
import { notification } from './notification.js';

// 🔥 Глобальная настройка количества знаков после запятой
const DEFAULT_DECIMAL_PLACES = 3;

class NumpadManager {
    constructor() {
        this.overlay = null;
        this._display = null;
        this._limitInfo = null;
        this.value = '';
        this.callbacks = { onOk: null, onCancel: null };
        this.isOpen = false;
        this.min = null;
        this.max = null;
        this.decimalPlaces = null;
        this.maxDecimalPlaces = DEFAULT_DECIMAL_PLACES;
        this.validator = validator;
        this.notification = notification;
        this._errorShown = false;
        this._isDecimalWarningShown = false;
    }

    show(initialValue, options = {}) {
        if (this.isOpen) return;
    
        this.min = options.min !== undefined ? options.min : null;
        this.max = options.max !== undefined ? options.max : null;
        this.decimalPlaces = options.decimalPlaces !== undefined ? options.decimalPlaces : DEFAULT_DECIMAL_PLACES;
        this.maxDecimalPlaces = options.maxDecimalPlaces !== undefined ? options.maxDecimalPlaces : DEFAULT_DECIMAL_PLACES;
        this.allowFloat = options.allowFloat !== undefined ? options.allowFloat : true;  // 🔥 По умолчанию true
        this.value = String(initialValue ?? '');
        this.callbacks.onOk = options.onOk || null;
        this.callbacks.onCancel = options.onCancel || null;
        this._errorShown = false;
        this._isDecimalWarningShown = false;
    
        this._buildDOM();
        this._updateDisplay();
        this.isOpen = true;
    
        document.body.appendChild(this.overlay);
    }

    hide() {
        if (!this.isOpen || !this.overlay) return;
        this.overlay.remove();
        this.isOpen = false;
        this._errorShown = false;
        this._isDecimalWarningShown = false;
    }

    _buildDOM() {
        if (this.overlay) {
            this.overlay.remove();
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'numpad-overlay';

        const panel = document.createElement('div');
        panel.className = 'numpad';

        const rangeInfo = document.createElement('div');
        rangeInfo.className = 'numpad-range-info';
        let infoText = '';
        
        if (this.min !== null && this.max !== null) {
            infoText = `Диапазон: ${this.min} ... ${this.max}`;
        } else if (this.min !== null) {
            infoText = `Мин: ${this.min}`;
        } else if (this.max !== null) {
            infoText = `Макс: ${this.max}`;
        }

        if (this.maxDecimalPlaces !== null && this.maxDecimalPlaces >= 0) {
            infoText += infoText ? ' | ' : '';
            infoText += `Макс. ${this.maxDecimalPlaces} знаков после запятой`;
        }

        if (infoText) {
            rangeInfo.textContent = infoText;
            rangeInfo.style.cssText = `
                font-size: 12px;
                color: #666;
                text-align: center;
                padding: 4px 8px;
                background: #f5f5f5;
                border-radius: 4px;
                margin-bottom: 8px;
                min-height: 24px;
            `;
        }

        this._display = document.createElement('div');
        this._display.className = 'numpad-display';
        this._display.style.cssText = `
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 16px 8px;
            margin-bottom: 12px;
            background: #fafafa;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            min-height: 60px;
            transition: border-color 0.3s, color 0.3s;
            font-family: 'Courier New', monospace;
        `;

        this._limitInfo = document.createElement('div');
        this._limitInfo.style.cssText = `
            font-size: 11px;
            color: #999;
            text-align: right;
            padding: 2px 4px;
            margin-top: -8px;
            margin-bottom: 8px;
            min-height: 18px;
            transition: color 0.3s;
        `;
        if (this.maxDecimalPlaces !== null && this.maxDecimalPlaces >= 0) {
            this._updateLimitInfo();
        }

        const grid = document.createElement('div');
        grid.className = 'numpad-grid';
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        `;

        const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫', '+/-'];
    digits.forEach(d => {
        const btn = document.createElement('button');
        btn.className = 'numpad-btn';
        if (d === '⌫') btn.classList.add('numpad-btn-clear');
        btn.textContent = d;
        
        // 🔥 Если дробные запрещены - скрываем/отключаем кнопку точки
        if (d === '.' && !this.allowFloat) {
            btn.style.display = 'none';  // Скрываем кнопку
            // или btn.disabled = true; // Отключаем кнопку
        }
            btn.style.cssText = `
                padding: 16px 8px;
                font-size: 20px;
                border: 1px solid #ddd;
                border-radius: 6px;
                background: #fff;
                cursor: pointer;
                transition: background 0.15s;
                user-select: none;
            `;
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#f0f0f0';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#fff';
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleClick(d);
            });
            grid.appendChild(btn);
        });

        const actions = document.createElement('div');
        actions.className = 'numpad-actions';
        actions.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        `;

        const okBtn = document.createElement('button');
        okBtn.className = 'numpad-btn numpad-btn-ok';
        okBtn.textContent = 'OK';
        okBtn.style.cssText = `
            padding: 14px;
            font-size: 18px;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            background: #4caf50;
            color: white;
            cursor: pointer;
            transition: background 0.15s;
        `;
        okBtn.addEventListener('mouseenter', () => {
            okBtn.style.background = '#45a049';
        });
        okBtn.addEventListener('mouseleave', () => {
            okBtn.style.background = '#4caf50';
        });
        okBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleOk();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'numpad-btn numpad-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 14px;
            font-size: 18px;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            background: #f44336;
            color: white;
            cursor: pointer;
            transition: background 0.15s;
        `;
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#d32f2f';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = '#f44336';
        });
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleCancel();
        });

        actions.appendChild(okBtn);
        actions.appendChild(cancelBtn);

        if (infoText) {
            panel.appendChild(rangeInfo);
        }
        panel.appendChild(this._display);
        if (this._limitInfo) {
            panel.appendChild(this._limitInfo);
        }
        panel.appendChild(grid);
        panel.appendChild(actions);

        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            width: 320px;
            max-width: 90vw;
            z-index: 10000;
        `;

        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        this.overlay.appendChild(panel);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this._handleCancel();
            }
        });

        document.addEventListener('keydown', this._boundKeydown = (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Enter') {
                e.preventDefault();
                this._handleOk();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this._handleCancel();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this._handleBackspace();
            } else if (/^[\d.]$/.test(e.key)) {
                e.preventDefault();
                this._handleDigit(e.key);
            }
        });
    }

    _handleClick(d) {
        if (d === '⌫') {
            this._handleBackspace();
        } else if (d === '+/-') {
            this._handleToggleSign();
        } else {
            this._handleDigit(d);
        }
    }

    _handleDigit(d) {
        // 🔥 Если дробные запрещены и нажата точка - игнорируем
        if (d === '.' && !this.allowFloat) {
            this.notification.warning(
                'Для этого регистра допустимы только целые числа',
                { title: 'Предупреждение', duration: 2000 }
            );
            return;
        }
        
        // Проверка на точку
        if (d === '.') {
            if (this.value.includes('.')) return;
            if (this.value === '' || this.value === '-') {
                this.value = this.value + '0';
            }
            this.value = this.value + '.';
            this._updateDisplay();
            this._updateLimitInfo();
            this._validateAndNotify();
            return;
        }

        // 🔥 Обработка ввода нуля
        if (d === '0') {
            // Если значение пустое или только минус - добавляем 0
            if (this.value === '' || this.value === '-') {
                this.value = this.value + '0';
                this._updateDisplay();
                this._updateLimitInfo();
                this._validateAndNotify();
                return;
            }
            
            // Если значение "0" - не добавляем еще один ноль
            if (this.value === '0') {
                return;
            }
        }

        // Проверка на количество знаков после запятой
        if (this.maxDecimalPlaces !== null && this.maxDecimalPlaces >= 0) {
            const currentParts = this.value.split('.');
            if (currentParts.length === 2) {
                const currentDecimals = currentParts[1].length;
                if (currentDecimals >= this.maxDecimalPlaces) {
                    if (!this._isDecimalWarningShown) {
                        this._isDecimalWarningShown = true;
                        this.notification.warning(
                            `Максимум ${this.maxDecimalPlaces} знаков после запятой`,
                            { title: 'Предупреждение', duration: 2000 }
                        );
                        setTimeout(() => {
                            this._isDecimalWarningShown = false;
                        }, 2000);
                    }
                    return;
                }
            }
        }

        const newValue = this.value + d;
        this.value = newValue;
        this._updateDisplay();
        this._updateLimitInfo();
        this._validateAndNotify();
    }

    _handleToggleSign() {
        const num = parseFloat(this.value);
        if (isNaN(num) || this.value === '' || num === 0) return;

        this.value = this.value.startsWith('-')
            ? this.value.slice(1)
            : '-' + this.value;

        this._updateDisplay();
        this._validateAndNotify();
    }

    _handleBackspace() {
        // 🔥 При удалении последнего символа
        if (this.value.length <= 1) {
            this.value = '';
        } else {
            const newValue = this.value.slice(0, -1);
            // Если удаляем и остается только '-' - очищаем
            if (newValue === '-') {
                this.value = '';
            } else {
                this.value = newValue;
            }
        }
        
        this._updateDisplay();
        this._updateLimitInfo();
        this._validateAndNotify();
    }

    _updateDisplay() {
        // 🔥 Если значение пустое или только минус - показываем 0
        if (this.value === '' || this.value === '-') {
            this._display.textContent = '0';
            return;
        }
        
        // 🔥 Если значение заканчивается на точку - показываем с точкой
        if (this.value.endsWith('.')) {
            this._display.textContent = this.value;
            return;
        }
        
        // 🔥 Если есть значение - форматируем
        const num = parseFloat(this.value);
        if (!isNaN(num)) {
            // Если это 0 - показываем 0
            if (num === 0 && this.value === '0') {
                this._display.textContent = '0';
                return;
            }
            // Показываем как есть
            this._display.textContent = this.value;
            return;
        }
        
        this._display.textContent = this.value || '0';
    }

    _updateLimitInfo() {
        if (!this._limitInfo) return;
        
        const decimalCount = this.validator.getDecimalCount(this.value);
        const maxDecimals = this.maxDecimalPlaces;
        
        if (maxDecimals === null || maxDecimals < 0) {
            this._limitInfo.textContent = '';
            return;
        }

        let text = `${decimalCount}/${maxDecimals}`;
        let color = '#999';
        
        if (decimalCount >= maxDecimals) {
            color = '#f44336';
        } else if (decimalCount >= maxDecimals - 1) {
            color = '#ff9800';
        }
        
        this._limitInfo.textContent = text;
        this._limitInfo.style.color = color;
    }

    _validateAndNotify() {
        if (this.min === null && this.max === null && this.decimalPlaces === null) return;
        
        const num = parseFloat(this.value);
        if (isNaN(num) || this.value === '' || this.value === '-' || this.value === '.') {
            this._errorShown = false;
            this._display.style.color = '';
            this._display.style.borderColor = '#e0e0e0';
            return;
        }

        const result = this.validator.validate(this.value, {
            min: this.min,
            max: this.max,
            decimalPlaces: this.decimalPlaces || null
        });

        if (!result.valid) {
            this._display.style.color = '#f44336';
            this._display.style.borderColor = '#f44336';
            
            if (!this._errorShown) {
                this._errorShown = true;
                this.notification.warning(result.error, {
                    title: 'Предупреждение',
                    duration: 20000
                });
            }
        } else {
            this._display.style.color = '';
            this._display.style.borderColor = '#e0e0e0';
            this._errorShown = false;
        }
    }

    _handleOk() {
        // 🔥 Если значение пустое, '-' или '.' - считаем как 0
        if (this.value === '' || this.value === '-' || this.value === '.') {
            this.value = '0';
        }

        const result = this.validator.validateWithCorrection(this.value, {
            min: this.min,
            max: this.max,
            decimalPlaces: this.decimalPlaces !== null ? this.decimalPlaces : this.maxDecimalPlaces
        });

        if (!result.valid) {
            this.notification.error(result.error || 'Некорректное значение', {
                title: 'Ошибка',
                duration: 3000
            });
            this._display.style.color = '#f44336';
            this._display.style.borderColor = '#f44336';
            return;
        }

        let finalValue = result.normalized;

        if (result.corrected && result.normalized !== this.value) {
            this.notification.warning(
                `Значение скорректировано до ${result.normalized}`,
                { title: 'Коррекция', duration: 2000 }
            );
        }
        
        if (result.wasRounded) {
            this.notification.info(
                `Значение округлено до ${result.normalized}`,
                { title: 'Округление', duration: 2000 }
            );
        }

        const decimalCount = this.validator.getDecimalCount(finalValue);
        if (this.maxDecimalPlaces !== null && decimalCount > this.maxDecimalPlaces) {
            const rounded = parseFloat(parseFloat(finalValue).toFixed(this.maxDecimalPlaces));
            finalValue = String(rounded);
            this.notification.warning(
                `Значение округлено до ${this.maxDecimalPlaces} знаков: ${finalValue}`,
                { title: 'Округление', duration: 2000 }
            );
        }
        
        this.value = finalValue;
        this._updateDisplay();
        this._display.style.color = '';
        this._display.style.borderColor = '#e0e0e0';

        this.isOpen = false;
        if (this.callbacks.onOk) {
            this.callbacks.onOk(finalValue);
        }
        this._cleanup();
    }

    _handleCancel() {
        this.isOpen = false;
        if (this.callbacks.onCancel) {
            this.callbacks.onCancel();
        }
        this._cleanup();
    }

    _cleanup() {
        if (this.overlay) {
            this.overlay.remove();
        }
        if (this._boundKeydown) {
            document.removeEventListener('keydown', this._boundKeydown);
            this._boundKeydown = null;
        }
        this.value = '';
        this.callbacks = { onOk: null, onCancel: null };
        this.min = null;
        this.max = null;
        this.decimalPlaces = null;
        this.maxDecimalPlaces = DEFAULT_DECIMAL_PLACES;
        this._errorShown = false;
        this._isDecimalWarningShown = false;
        this._display = null;
        this._limitInfo = null;
    }
}

export const numpadManager = new NumpadManager();