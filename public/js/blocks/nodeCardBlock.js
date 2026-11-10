// public/js/blocks/nodeCardBlock.js
import { BaseBlock } from './baseBlock.js';
import { blockRegistry } from '../core/blockRegistry.js';

const HOLD_MS = 500;
const TAP_THRESHOLD_MS = 100;

// Селектор всего интерактивного — клик по нему не считается кликом по карточке
const INTERACTIVE_SELECTOR = [
    'button', 'input',
    '.toggle', '.page-button', '.send-button',
    '.input', '.input-reset', '.input-save'
].join(',');

// Иконки-подсказки для longPress: "popup:<type>"
const HINT_ICONS = {
    trend: `
        <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
            <polyline points="6,22 13,15 18,19 25,9"
                      fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="18,9 25,9 25,16"
                      fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
    menu: `
        <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
            <circle cx="6"  cy="15" r="3" fill="currentColor"/>
            <circle cx="15" cy="15" r="3" fill="currentColor"/>
            <circle cx="24" cy="15" r="3" fill="currentColor"/>
        </svg>`,
    settings: `
        <svg viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
            <circle cx="15" cy="15" r="4"
                    fill="none" stroke="currentColor" stroke-width="2.5"/>
            <path d="M15 3.5 L16.4 7.2 L20.3 6.2 L19.3 10.1 L23 11.5 L19.9 14.1
                     L22.4 17.2 L18.5 17.8 L18 21.7 L14.5 19.8 L11.5 22.3 L10.5 18.4
                     L6.6 18.4 L8.1 14.7 L5 12.6 L8.4 10.3 L7.4 6.5 L11.3 7.1 Z"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
};

const HINT_DEFAULT = HINT_ICONS.menu;


export class NodeCardBlock extends BaseBlock {
    constructor(data, context) {
        super(data, context);
        this._children = [];
        this._holdTimer = null;
        this._holdStartTime = 0;
        this._suppressClick = false;
        this._isProcessing = false;
        this._pointerDown = false;
    }

    render() {
        const root = this.makeRoot(['node-card']);

        const width = this.data.width || 210;
        const height = this.data.height || 345;
        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.minWidth = `${width}px`;
        root.style.minHeight = `${height}px`;

        const isToggle = !!this.data.toggle;
        if (isToggle) root.classList.add('has-toggle');

        // Подсказка «три точки» — для любого longPress с popup:
        const longPress = this.data.longPress;
        let hintHtml = '';
        if (typeof longPress === 'string' && longPress.startsWith('popup:')) {
            const popupType = longPress.slice('popup:'.length);
            const hintSvg = HINT_ICONS[popupType] || HINT_DEFAULT;
            hintHtml = `<span class="hint-icon">${hintSvg}</span>`;
        }

        const stateDotHtml = `<span class="state-dot"></span>`;
        const holdHtml = `<div class="hold-indicator"></div>`;

        root.innerHTML = `${hintHtml}${stateDotHtml}${holdHtml}`;

        this.el = root;

        this._renderChildren(root);

        // 🔥 Регистрация в updater: если это toggle ИЛИ задано onCondition
        const hasReg = this.data.regAddress !== undefined;
        const onCondition = typeof this.data.onCondition === 'string'
            ? this.data.onCondition
            : null;

        if (hasReg && (isToggle || onCondition)) {
            root.dataset.reg  = this.data.regAddress;
            root.dataset.type = this.data.regType || 'b0';
            this.ctx.updater.addNodeCard(
                this.data.regAddress,
                root,
                this.data.regType || 'b0',
                onCondition
            );
        }

        this._setupInteractivity(root);

        return root;
    }

    unmounted() {
        if (this._holdTimer) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }
        for (const child of this._children) {
            try { child.unmounted(); } catch { }
        }
        this._children = [];
    }

    // ============ ДЕТИ ============

    _renderChildren(root) {
        if (!Array.isArray(this.data.children) || this.data.children.length === 0) return;

        for (const childData of this.data.children) {
            const Cls = blockRegistry.get(childData.type);
            if (!Cls) {
                console.warn(`⚠️ node-card: неизвестный тип дочернего блока "${childData.type}"`);
                continue;
            }
            try {
                const childBlock = new Cls(childData, this.ctx);
                const childEl = childBlock.render();
                if (!childEl) continue;

                childEl.classList.remove('block');
                childEl.classList.add('node');

                childEl.style.position = 'absolute';
                childEl.style.left = `${childData.x || 0}px`;
                childEl.style.top = `${childData.y || 0}px`;
                childEl.style.margin = '0';

                if (childData.plain) childEl.classList.add('plain');

                root.appendChild(childEl);
                childBlock.mounted();
                this._children.push(childBlock);
            } catch (err) {
                console.error(`❌ node-card: ошибка рендера "${childData.type}":`, err);
            }
        }
    }

    // ============ ИНТЕРАКТИВ ============

    _setupInteractivity(root) {
        root.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            this._pointerDown = true;
            this._holdStartTime = Date.now();

            root.style.setProperty('--hold-ms', HOLD_MS + 'ms');
            root.classList.add('holding');

            this._holdTimer = setTimeout(() => {
                this._holdTimer = null;
                this._suppressClick = true;
                root.classList.remove('holding');
                root.classList.add('triggered');
                setTimeout(() => root.classList.remove('triggered'), 350);

                this._triggerLongPress(root);
            }, HOLD_MS);
        });

        const cancelHold = () => {
            if (this._holdTimer) {
                clearTimeout(this._holdTimer);
                this._holdTimer = null;
            }
            root.classList.remove('holding');
            this._pointerDown = false;

            const heldFor = Date.now() - this._holdStartTime;
            if (heldFor >= TAP_THRESHOLD_MS) {
                this._suppressClick = true;
                setTimeout(() => { this._suppressClick = false; }, 300);
            }
        };

        root.addEventListener('pointerup', cancelHold);
        root.addEventListener('pointercancel', cancelHold);
        root.addEventListener('pointerleave', cancelHold);

        root.addEventListener('click', async (e) => {
            if (this._suppressClick) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (this.ctx.popup.isOpen()) return;
            if (e.target.closest(INTERACTIVE_SELECTOR)) return;

            // Клик по карточке имеет смысл только для toggle
            if (this.data.toggle) {
                await this._handleToggle();
            }
        });
    }

    async _handleToggle() {
        if (this._isProcessing) return;

        const root = this.el;
        const regAddress = this.data.regAddress;
        const regType = this.data.regType || 'b0';

        const isOn = root.classList.contains('on');
        const newState = isOn ? 0 : 1;

        if (this.data.requireConfirm !== false) {
            const name = this.data.name || this.data.title || 'узел';
            const action = isOn ? 'выключить' : 'включить';
            const ok = await this.ctx.confirm.ask({
                title: 'Вы уверены?',
                text: `Вы собираетесь <b>${action}</b> <b>${name}</b>.<br>Продолжить?`,
                confirmText: `Да, ${action}`,
                cancelText: 'Отмена',
                danger: isOn
            });
            if (!ok) return;
        }

        this._isProcessing = true;
        root._isProcessing = true;
        root.style.opacity = '0.7';

        try {
            await this.ctx.api.writeRegister(regAddress, newState, regType);
            await new Promise(r => setTimeout(r, 400));
            await this.ctx.updater.update();
        } catch (error) {
            console.error('❌ node-card toggle error:', error);
            root.style.borderColor = 'red';
            setTimeout(() => { root.style.borderColor = ''; }, 1500);
        } finally {
            this._isProcessing = false;
            root._isProcessing = false;
            root.style.opacity = '1';
        }
    }

    _triggerLongPress(anchor) {
        const action = this.data.longPress;
        if (!action || action === 'none') return;

        if (action.startsWith('popup:')) {
            const type = action.slice('popup:'.length);
            const data = Object.assign(
                {
                    title: this.data.name || this.data.title,
                    reg: this.data.regAddress
                },
                this.data.popupData || {}
            );
            this.ctx.popup.show({ type, anchor, data });
        } else {
            console.warn(`node-card: неизвестное действие longPress "${action}"`);
        }
    }
}