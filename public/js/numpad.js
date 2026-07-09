// public/js/numpad.js

class NumpadManager {
    constructor() {
        this.overlay = null;
        this._display = null;
        this.value = '';
        this.callbacks = { onOk: null, onCancel: null };
        this.isOpen = false;
        this.maxDecimalPlaces = 2; // Максимум 2 знака после запятой
    }

    show(initialValue, { onOk, onCancel }) {
        if (this.isOpen) return;

        // Нормализуем начальное значение
        this.value = this._normalizeValue(String(initialValue ?? ''));
        this.callbacks.onOk = onOk || null;
        this.callbacks.onCancel = onCancel || null;

        this._buildDOM();
        this._display.textContent = this.value;
        this.isOpen = true;

        document.body.appendChild(this.overlay);
    }

    hide() {
        if (!this.isOpen || !this.overlay) return;
        this.overlay.remove();
        this.isOpen = false;
    }

    _buildDOM() {
        if (this.overlay) {
            this.overlay.remove();
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'numpad-overlay';

        const panel = document.createElement('div');
        panel.className = 'numpad';

        this._display = document.createElement('div');
        this._display.className = 'numpad-display';

        const grid = document.createElement('div');
        grid.className = 'numpad-grid';

        const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫', '+/-'];
        digits.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'numpad-btn';
            if (d === '⌫') btn.classList.add('numpad-btn-clear');
            else if (d === '.') btn.dataset.digit = d;
            btn.textContent = d;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleClick(d);
            });
            grid.appendChild(btn);
        });

        const actions = document.createElement('div');
        actions.className = 'numpad-actions';

        const okBtn = document.createElement('button');
        okBtn.className = 'numpad-btn numpad-btn-ok';
        okBtn.textContent = 'OK';
        okBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleOk();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'numpad-btn numpad-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._handleCancel();
        });

        actions.appendChild(okBtn);
        actions.appendChild(cancelBtn);

        panel.appendChild(this._display);
        panel.appendChild(grid);
        panel.appendChild(actions);
        this.overlay.appendChild(panel);

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this._handleCancel();
            }
        });

        document.addEventListener('keydown', this._boundKeydown = (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Enter') this._handleOk();
            else if (e.key === 'Escape') this._handleCancel();
            else if (e.key === 'Backspace') this._handleBackspace();
            else if (/^[\d.]$/.test(e.key)) this._handleDigit(e.key);
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
        // Запрещаем больше одной точки
        if (d === '.' && this.value.includes('.')) return;

        // Проверка для цифр: если уже 2 знака после запятой
        if (d !== '.') {
            const parts = this.value.split('.');
            if (parts.length === 2 && parts[1].length >= this.maxDecimalPlaces) {
                return; // Не даём вводить цифры
            }
        }

        this.value += d;
        this._display.textContent = this.value;
    }

    _handleToggleSign() {
        const num = parseFloat(this.value);

        // Игнорируем NaN, пустую строку и нулевые значения
        if (isNaN(num) || this.value === '' || num === 0) {
            return;
        }

        this.value = this.value.startsWith('-')
            ? this.value.slice(1)
            : '-' + this.value;

        this._display.textContent = this.value;
    }

    _normalizeValue(value) {
        const num = parseFloat(value);
        // Если это -0 или 0 в любом виде
        if (num === 0 || Object.is(num, -0)) {
            return '0';
        }
        return String(value);
    }

    _handleBackspace() {
        this.value = this.value.slice(0, -1);
        this._display.textContent = this.value;
    }

    _handleOk() {
        // Нормализуем значение перед отправкой
        const finalValue = this._normalizeValue(this.value);
        this.value = finalValue;
        this._display.textContent = finalValue;

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
    }
}

export const numpadManager = new NumpadManager();