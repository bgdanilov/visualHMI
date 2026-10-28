// public/js/blocks/nodeCardBlock.js
import { BaseBlock } from './baseBlock.js';
import { blockRegistry } from '../core/blockRegistry.js';

const HOLD_MS = 500;
const TAP_THRESHOLD_MS = 100;

// Набор встроенных иконок для узлов
const ICONS = {
    damper: `
        <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="1.5"/>
            <line x1="6" y1="9"  x2="18" y2="9"/>
            <line x1="6" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="15" x2="18" y2="15"/>
        </svg>`,
    fan: `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/>
            <path d="M 12 12 Q 8 8 12 4 Q 16 8 12 12"/>
            <path d="M 12 12 Q 16 14 20 10 Q 18 16 12 12"/>
            <path d="M 12 12 Q 8 14 4 18 Q 10 20 12 12"/>
        </svg>`,
    filter: `
        <svg viewBox="0 0 24 24">
            <path d="M 6 4 L 18 8 L 6 12 L 18 16 L 6 20"/>
        </svg>`,
    heater: `
        <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="1.5"/>
            <path d="M 7 8 Q 9 12 7 16"/>
            <path d="M 12 8 Q 14 12 12 16"/>
            <path d="M 17 8 Q 19 12 17 16"/>
        </svg>`,
    reco: `
        <svg viewBox="0 0 24 24">
            <path d="M 4 20 L 12 4 L 20 20 Z"/>
            <line x1="8" y1="14" x2="16" y2="14"/>
        </svg>`,
    pump: `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7"/>
            <path d="M 12 5 V 19"/>
            <path d="M 5 12 H 19"/>
            <path d="M 7 7 Q 12 10 17 7"/>
            <path d="M 7 17 Q 12 14 17 17"/>
        </svg>`,
    humidifier: `
        <svg viewBox="0 0 24 24">
            <path d="M 12 3 C 8 9, 5 13, 5 16 a 7 7 0 0 0 14 0 c 0 -3 -3 -7 -7 -13 z"/>
            <path d="M 9 16 a 3 3 0 0 0 3 3"/>
        </svg>`,
    valve: `
        <svg viewBox="0 0 24 24">
            <path d="M 4 8 L 12 12 L 4 16 Z"/>
            <path d="M 20 8 L 12 12 L 20 16 Z"/>
            <line x1="12" y1="4" x2="12" y2="12"/>
        </svg>`,
    trend: `
        <svg viewBox="0 0 16 16">
            <polyline points="2,11 6,7 9,9 14,4"/>
            <polyline points="10,4 14,4 14,8"/>
        </svg>`,
    menu: `
    <svg class="hint-icon" viewBox="0 0 30 30" width="30" height="30">
    <circle cx="3" cy="3" r="3" fill="#666"/>
    <circle cx="12" cy="3" r="3" fill="#666"/>
    <circle cx="21" cy="3" r="3" fill="#666"/>
</svg>`,
    default: `
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8"/>
        </svg>`
};

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

        // Размеры
        const width = this.data.width || 210;
        const height = this.data.height || 345;
        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.minWidth = `${width}px`;
        root.style.minHeight = `${height}px`;

        // Флаг toggle
        const isToggle = !!this.data.toggle;
        if (isToggle) root.classList.add('has-toggle');

        // Подсказка (автоматическая)
        const PREFIX = 'popup:';
        const longPress = this.data.longPress;
        let hintSvg = '';
        let hintHtml = '';

        if (typeof longPress === 'string' && longPress.startsWith(PREFIX)) {
            const iconKey = longPress.slice(PREFIX.length);
            hintSvg = ICONS[iconKey] || '';   // или дефолтная иконка
            hintHtml = `<span class="hint-icon">${hintSvg}</span>`;
        }

        // Иконка
        /*const iconKey = this.data.icon || 'default';*/
       /* const iconSvg = ICONS[iconKey] || ICONS.default;*/
        // const iconHtml = this.data.icon !== undefined || true
        //     ? `<span class="elem-icon">${iconSvg}</span>`
        //     : '';

        // State dot
        const stateDotHtml = `<span class="state-dot"></span>`;

        // Подсказка (стрелка)
       /* const hintHtml = this.data.longPress && this.data.longPress !== 'none'
            ? `<span class="hint-icon">${iconSvg}</span>` : '';*/

        // Заголовок
        //const titleHtml = this.data.title
        //     ? `<div class="title">${this.esc(this.data.title)}</div>`
        //     : '';

        // Полоса удержания
        const holdHtml = `<div class="hold-indicator"></div>`;

        root.innerHTML = `${hintHtml}${stateDotHtml}${holdHtml}`;

        this.el = root;

        // Рендер дочерних блоков
        this._renderChildren(root);

        // Регистрация toggle в updater (если нужно)
        if (isToggle && this.data.regAddress !== undefined) {
            root.dataset.reg = this.data.regAddress;
            root.dataset.type = this.data.regType || 'b0';
            this.ctx.updater.addNodeCard(
                this.data.regAddress,
                root,
                this.data.regType || 'b0'
            );
        }

        // Интерактив
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

                // Переводим из .block в .node
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

            // Полоса удержания
            root.style.setProperty('--hold-ms', HOLD_MS + 'ms');
            root.classList.add('holding');

            this._holdTimer = setTimeout(() => {
                this._holdTimer = null;
                this._suppressClick = true;
                root.classList.remove('holding');
                root.classList.add('triggered');
                setTimeout(() => root.classList.remove('triggered'), 350);

                // Открываем попап
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

            // Если открыт попап — не реагируем на клик по карточке
            if (this.ctx.popup.isOpen()) return;

            // Если клик по интерактивному элементу внутри — игнорируем
            if (e.target.closest('button') ||
                e.target.closest('input') ||
                e.target.closest('.toggle') ||
                e.target.closest('.page-button') ||
                e.target.closest('.send-button') ||
                e.target.closest('.input') ||
                e.target.closest('.input-reset') ||
                e.target.closest('.input-save')) {
                return;
            }

            if (this.data.toggle) {
                await this._handleToggle();
            }
            // Если toggle нет — короткий тап ничего не делает
        });
    }

    async _handleToggle() {
        if (this._isProcessing) return;

        const root = this.el;
        const regAddress = this.data.regAddress;
        const regType = this.data.regType || 'b0';

        const isOn = root.classList.contains('on');
        const newState = isOn ? 0 : 1;

        // Confirm
        if (this.data.requireConfirm !== false) {
            const name = this.data.title || 'узел';
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
        root._isProcessing = true;   // ← добавить
        root.style.opacity = '0.7';

        try {
            await this.ctx.api.writeRegister(regAddress, newState, regType);
            await new Promise(resolve => setTimeout(resolve, 400));
            await this.ctx.updater.update();
        } catch (error) {
            console.error('❌ node-card toggle error:', error);
            root.style.borderColor = 'red';
            setTimeout(() => {
                root.style.borderColor = '';
            }, 1500);
        } finally {
            this._isProcessing = false;
            root._isProcessing = false;   // ← добавить
            root.style.opacity = '1';
        }
    }

    _triggerLongPress(anchor) {
        const action = this.data.longPress;
        if (!action || action === 'none') return;

        // Формат: "popup:menu" / "popup:trend" / ...
        if (action.startsWith('popup:')) {
            const type = action.slice('popup:'.length);
            const data = Object.assign(
                { title: this.data.title, reg: this.data.regAddress },
                this.data.popupData || {}
            );

            this.ctx.popup.show({
                type,
                anchor,
                data
            });
        } else {
            console.warn(`node-card: неизвестное действие longPress "${action}"`);
        }
    }
}