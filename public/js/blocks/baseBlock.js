// public/js/blocks/baseBlock.js

/**
 * Базовый класс для всех блоков HMI.
 * Один блок = один файл, реализующий render().
 *
 * Контракт:
 *   - render()      — создать DOM, вернуть HTMLElement. Вызывается один раз.
 *   - mounted()     — опционально. Вызывается после вставки в DOM.
 *   - unmounted()   — опционально. Вызывается перед удалением из DOM.
 *
 * Поля:
 *   - this.data     — объект блока из blocksData.json
 *   - this.ctx      — { api, updater, numpad, validator, notification, renderer, renderArea }
 *   - this.el       — корневой HTMLElement (заполняется в render())
 */
 export class BaseBlock {
    constructor(data, context) {
        this.data = data;
        this.ctx = context;
        this.el = null;
        this._mounted = false;
    }

    render() {
        throw new Error(`${this.constructor.name}: render() не реализован`);
    }

    mounted() {
        this._mounted = true;
    }

    unmounted() {
        this._mounted = false;
    }

    /** Утилита: безопасно экранировать HTML-спецсимволы в тексте. */
    esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Утилита: базовый контейнер .block с позицией. */
    makeRoot(extraClasses = []) {
        const root = document.createElement('div');
        root.classList.add('block', ...extraClasses);
        if (this.data.plain) root.classList.add('plain');
        if (this.data.x !== undefined) root.style.left = `${this.data.x}px`;
        if (this.data.y !== undefined) root.style.top = `${this.data.y}px`;
        return root;
    }
}