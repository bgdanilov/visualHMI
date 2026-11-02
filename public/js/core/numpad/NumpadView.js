// public/js/core/numpad/NumpadView.js
import { numpadMarkup, NUMPAD_KEYS } from './numpadMarkup.js';

/**
 * Только DOM: создать, показать/скрыть, обновить отображение.
 * Никакой бизнес-логики — все решения принимает NumpadController.
 */
export class NumpadView {
    constructor() {
        this.overlay = null;
        this.els = null;
        this._onDigit = null;
        this._onBackspace = null;
        this._onToggleSign = null;
        this._onOk = null;
        this._onCancel = null;
        this._abort = null;
    }

    /**
     * @param {Object} handlers
     * @param {(d: string) => void} handlers.onDigit
     * @param {() => void} handlers.onBackspace
     * @param {() => void} handlers.onToggleSign
     * @param {() => void} handlers.onOk
     * @param {() => void} handlers.onCancel
     */
    build(handlers) {
        this._onDigit      = handlers.onDigit;
        this._onBackspace  = handlers.onBackspace;
        this._onToggleSign = handlers.onToggleSign;
        this._onOk         = handlers.onOk;
        this._onCancel     = handlers.onCancel;

        this.overlay = document.createElement('div');
        this.overlay.className = 'numpad-overlay';
        this.overlay.innerHTML = numpadMarkup();

        this.els = {
            rangeInfo: this.overlay.querySelector('[data-role="range-info"]'),
            display:   this.overlay.querySelector('[data-role="display"]'),
            limitInfo: this.overlay.querySelector('[data-role="limit-info"]'),
            grid:      this.overlay.querySelector('[data-role="grid"]'),
            ok:        this.overlay.querySelector('[data-role="ok"]'),
            cancel:    this.overlay.querySelector('[data-role="cancel"]')
        };

        this._renderKeys();
        this._bindStaticHandlers();
    }

    _renderKeys() {
        const grid = this.els.grid;
        grid.innerHTML = '';

        for (const key of NUMPAD_KEYS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'numpad-btn';

            if (key === '⌫') {
                btn.classList.add('numpad-btn-clear');
                btn.textContent = '⌫';
            } else if (key === '+/-') {
                btn.textContent = '+/-';
            } else {
                btn.textContent = key;
            }

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleKeyClick(key);
            });
            grid.appendChild(btn);
        }
    }

    _handleKeyClick(key) {
        if (key === '⌫')        this._onBackspace();
        else if (key === '+/-') this._onToggleSign();
        else                    this._onDigit(key);
    }

    _bindStaticHandlers() {
        this._abort = new AbortController();
        const { signal } = this._abort;

        this.els.ok.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onOk();
        }, { signal });

        this.els.cancel.addEventListener('click', (e) => {
            e.stopPropagation();
            this._onCancel();
        }, { signal });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this._onCancel();
        }, { signal });

        // Глобальный keydown — с signal, снимется в destroy()
        document.addEventListener('keydown', (e) => {
            if (!this.overlay) return;
            if (e.key === 'Enter')         { e.preventDefault(); this._onOk(); }
            else if (e.key === 'Escape')   { e.preventDefault(); this._onCancel(); }
            else if (e.key === 'Backspace'){ e.preventDefault(); this._onBackspace(); }
            else if (/^[\d.]$/.test(e.key)){ e.preventDefault(); this._onDigit(e.key); }
        }, { signal });
    }

    // ============ ПУБЛИЧНЫЕ ОБНОВЛЕНИЯ ============

    updateDisplay(text) {
        if (!this.els) return;
        this.els.display.textContent = text;
    }

    updateDisplayStyle({ color = '', borderColor = '' } = {}) {
        if (!this.els) return;
        this.els.display.style.color = color;
        this.els.display.style.borderColor = borderColor;
    }

    updateLimitInfo(text, color = '#999') {
        if (!this.els) return;
        this.els.limitInfo.textContent = text;
        this.els.limitInfo.style.color = color;
    }

    updateRangeInfo(text) {
        if (!this.els) return;
        this.els.rangeInfo.textContent = text || '';
        this.els.rangeInfo.style.display = text ? '' : 'none';
    }

    /** '.', '+'/'-', цифры вне allowedValues — переводим в disabled */
    setDecimalAllowed(allowed) {
        if (!this.els) return;
        const dotBtn = Array.from(this.els.grid.querySelectorAll('.numpad-btn'))
            .find(b => b.textContent === '.');
        if (dotBtn) dotBtn.disabled = !allowed;
    }

    setSignAllowed(allowed) {
        if (!this.els) return;
        const signBtn = Array.from(this.els.grid.querySelectorAll('.numpad-btn'))
            .find(b => b.textContent === '+/-');
        if (signBtn) signBtn.disabled = !allowed;
    }

    /**
     * @param {number[]|null} allowedValues — если задан, кнопки цифр вне списка
     *   становятся disabled (но остаются на месте — layout не прыгает).
     */
    setAllowedDigits(allowedValues) {
        if (!this.els) return;
        const buttons = Array.from(this.els.grid.querySelectorAll('.numpad-btn'));

        if (!allowedValues) {
            buttons.forEach(b => {
                if (/^\d$/.test(b.textContent)) b.disabled = false;
            });
            return;
        }

        const allowedSet = new Set(allowedValues.map(String));
        buttons.forEach(b => {
            if (/^\d$/.test(b.textContent)) {
                b.disabled = !allowedSet.has(b.textContent);
            }
        });
    }

    // ============ ЖИЗНЕННЫЙ ЦИКЛ ============

    mount() {
        if (this.overlay && !this.overlay.parentNode) {
            document.body.appendChild(this.overlay);
        }
    }

    unmount() {
        if (this._abort) {
            this._abort.abort();
            this._abort = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.els = null;
    }
}