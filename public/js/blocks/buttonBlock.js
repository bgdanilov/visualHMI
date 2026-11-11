// public/js/blocks/buttonBlock.js
import { BaseBlock } from './baseBlock.js';
import { flash } from '../utils/flash.js';

export class ButtonBlock extends BaseBlock {
    constructor(data, context) {
        super(data, context);
        this._states = [];
        this._regId = null;
        this._regType = null;
        this._mode = 'maintained';
        this._pressed = false;
        this._isProcessing = false;
        this._stateKey = null;
        this._btn = null;
    }

    render() {
        const root = this.makeRoot(['button-block']);

        const width  = this.data.width  || 140;
        const height = this.data.height || 50;
        root.style.width  = `${width}px`;
        root.style.height = `${height}px`;
        root.style.minWidth  = `${width}px`;
        root.style.minHeight = `${height}px`;

        this._regId = parseInt(this.data.regAddress);
        this._regType = this.data.regType || 'u2';
        this._mode = this.data.mode === 'momentary' ? 'momentary' : 'maintained';

        const rawStates = Array.isArray(this.data.states) ? this.data.states : [];
        this._states = rawStates.map(s => ({
            value: parseFloat(s.value),
            class: s.class || null,
            text:  s.text  ?? String(s.value),
            color: s.color ?? null
        }));

        if (this._states.length === 0) {
            console.warn(`⚠️ button "${this.data.name}": нет states`);
            this._states = [{ value: 0, text: '', color: null, class: null }];
        }
        if (this._mode === 'momentary' && this._states.length < 2) {
            console.warn(`⚠️ button "${this.data.name}": momentary требует 2 states`);
        }

        this._stateKey = `button:${this._regId}:${this._regType}`;

        root.innerHTML = `<button class="btn" type="button"></button>`;
        const btn = root.querySelector('.btn');
        btn.textContent = this._states[0].text;
        this._applyStateVisual(btn, 0);

        if (this._mode === 'maintained') {
            this._setupMaintained(root, btn);
        } else {
            this._setupMomentary(btn);
        }

        this._btn = btn;
        this.el = root;

        this.ctx.updater.addButton(
            this._regId, root, this._regType, this._stateKey,
            (actual) => this._onActualValue(actual)
        );

        return root;
    }

    unmounted() {
        // Подписок нет — addButton хранит ссылку в кеше updater'а,
        // кеш чистится при смене страницы (clearCaches).
    }

    // ============ РЕЖИМЫ ============

    _setupMaintained(root, btn) {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._isProcessing) return;
            if (this.ctx.popup.isOpen()) return;

            const current = this.ctx.updater.getButtonStateIndex(this._stateKey);
            const next = (current + 1) % this._states.length;
            const step = this._states[next];

            if (this.data.confirm) {
                const ok = await this.ctx.confirm.ask({
                    title: 'Вы уверены?',
                    text: `Выполнить <b>${step.text}</b> для <b>${this.data.name || 'кнопки'}</b>?`,
                    confirmText: step.text,
                    cancelText: 'Отмена',
                    danger: false
                });
                if (!ok) return;
            }

            await this._write(step.value, next);
        });
    }

    _setupMomentary(btn) {
        const on  = this._states[0];
        const off = this._states[1] || { value: 0 };

        const press = async () => {
            if (this._pressed) return;
            this._pressed = true;
            btn.classList.add('pressed');
            try {
                await this.ctx.api.writeRegister(this._regId, on.value, this._regType);
            } catch (e) {
                console.error('button press error:', e);
            }
        };

        const release = async () => {
            if (!this._pressed) return;
            this._pressed = false;
            btn.classList.remove('pressed');
            try {
                await this.ctx.api.writeRegister(this._regId, off.value, this._regType);
            } catch (e) {
                console.error('button release error:', e);
            }
        };

        btn.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            press();
        });
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('pointerleave', release);
    }

    // ============ ЗАПИСЬ ============

    async _write(value, nextIndex) {
        this._isProcessing = true;
        this._btn.disabled = true;
        this.el.classList.add('sending');

        try {
            await this.ctx.api.writeRegister(this._regId, value, this._regType);
            this.ctx.updater.setButtonStateIndex(this._stateKey, nextIndex, this._states.length);
            await new Promise(r => setTimeout(r, 50));
            await this.ctx.updater.updateButton(this._regId);
        } catch (e) {
            console.error('button write error:', e);
            flash(this.el, 'error', 1500);
        } finally {
            this._isProcessing = false;
            this._btn.disabled = false;
            this.el.classList.remove('sending');
        }
    }

    // ============ ОТОБРАЖЕНИЕ ============

    _onActualValue(actual) {
        if (!this._btn) return;

        let idx = this._states.findIndex(s => Number(s.value) === Number(actual));
        if (idx < 0) idx = 0;

        if (this.data.inversion && this._states.length === 2) {
            idx = 1 - idx;
        }

        const known = new Set(this._states.map(s => s.class).filter(Boolean));
        known.forEach(c => this.el.classList.remove(c));

        const st = this._states[idx] || this._states[0];
        if (st.class) this.el.classList.add(st.class);

        this._applyStateVisual(this._btn, idx);
        this.ctx.updater.setButtonStateIndex(this._stateKey, idx, this._states.length);
    }

    _applyStateVisual(btn, idx) {
        const st = this._states[idx] || this._states[0];
        btn.textContent = st.text;
        btn.style.backgroundColor = st.color || '';
    }
}