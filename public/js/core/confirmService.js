// public/js/core/confirmService.js

class ConfirmService {
    constructor() {
        this._overlay = null;
        this._resolve = null;
        this._els = null;
    }

    /**
     * Показать диалог подтверждения.
     * @param {Object} opts
     * @param {string} [opts.title]       — заголовок (по умолчанию «Вы уверены?»)
     * @param {string} [opts.text]        — основной текст (можно HTML)
     * @param {string} [opts.confirmText] — текст на кнопке «Да» (по умолчанию «Да»)
     * @param {string} [opts.cancelText]  — текст на кнопке «Отмена» (по умолчанию «Отмена»)
     * @param {boolean} [opts.danger]     — красный стиль кнопки и иконки
     * @returns {Promise<boolean>}         — true, если подтвердили
     */
    ask(opts = {}) {
        // Если уже открыт — закрыть старый как «отмена»
        if (this._overlay) {
            this._resolveOnce(false);
            this._destroy();
        }

        const {
            title = 'Вы уверены?',
            text = '',
            confirmText = 'Да',
            cancelText = 'Отмена',
            danger = false
        } = opts;

        this._ensureOverlay();
        this._populate({ title, text, confirmText, cancelText, danger });

        this._overlay.classList.add('open');

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    // ============ ВНУТРЕННЕЕ ============

    _ensureOverlay() {
        if (this._overlay) return;

        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm">
                <div class="icon" data-role="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 9v4"/>
                        <path d="M12 17h.01"/>
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                </div>
                <h2 data-role="title">Вы уверены?</h2>
                <p data-role="text"></p>
                <div class="actions">
                    <button class="btn-cancel" data-role="cancel">Отмена</button>
                    <button class="btn-confirm" data-role="ok">Да</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._els = {
            icon: overlay.querySelector('[data-role="icon"]'),
            title: overlay.querySelector('[data-role="title"]'),
            text: overlay.querySelector('[data-role="text"]'),
            ok: overlay.querySelector('[data-role="ok"]'),
            cancel: overlay.querySelector('[data-role="cancel"]')
        };

        this._els.ok.addEventListener('click', () => this._resolveOnce(true));
        this._els.cancel.addEventListener('click', () => this._resolveOnce(false));

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this._resolveOnce(false);
        });

        document.addEventListener('keydown', (e) => {
            if (!this._overlay?.classList.contains('open')) return;
            if (e.key === 'Escape') this._resolveOnce(false);
            if (e.key === 'Enter') this._resolveOnce(true);
        });
    }

    _populate({ title, text, confirmText, cancelText, danger }) {
        const { icon, title: t, text: txt, ok, cancel } = this._els;

        icon.classList.toggle('danger', danger);
        t.textContent = title;
        txt.innerHTML = text || '';
        ok.textContent = confirmText;
        cancel.textContent = cancelText;

        ok.classList.toggle('danger', danger);
    }

    _resolveOnce(value) {
        if (!this._resolve) return;
        const resolve = this._resolve;
        this._resolve = null;
        this._destroy();
        resolve(value);
    }

    _destroy() {
        if (this._overlay) {
            this._overlay.classList.remove('open');
        }
    }
}

export const confirmService = new ConfirmService();