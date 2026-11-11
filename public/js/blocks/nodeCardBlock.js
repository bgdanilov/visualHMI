// public/js/blocks/nodeCardBlock.js
import { BaseBlock } from './baseBlock.js';
import { blockRegistry } from '../core/blockRegistry.js';

const HOLD_MS = 800;
const TAP_THRESHOLD_MS = 200;

const INTERACTIVE_SELECTOR = [
    'button', 'input',
    '.toggle', '.page-button', '.send-button',
    '.input', '.input-reset', '.input-save',
    '.btn'
].join(',');

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

        const longPress = this.data.longPress;
        let hintHtml = '';
        if (typeof longPress === 'string' && longPress.startsWith('popup:')) {
            const popupType = longPress.slice('popup:'.length);
            const hintSvg = HINT_ICONS[popupType] || HINT_DEFAULT;
            hintHtml = `<span class="hint-icon">${hintSvg}</span>`;
        }

        root.innerHTML = `${hintHtml}<span class="state-dot"></span><div class="hold-indicator"></div>`;

        this.el = root;

        this._renderChildren(root);
        this._registerRules(root);
        this._setupClick(root);
        this._setupLongPress(root);

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

    // ============ RULES (индикация) ============

    _registerRules(root) {
        const rules = Array.isArray(this.data.rules) ? this.data.rules : null;
        if (!rules || !rules.length) return;

        const byReg = new Map();
        rules.forEach((rule, idx) => {
            if (!rule.reg) return;
            const { regId, regType } = splitRegSpec(rule.reg, 'u2');
            if (!byReg.has(regId)) byReg.set(regId, { regType, rules: [] });
            byReg.get(regId).rules.push({
                expr: rule.if,
                then: rule.then || {},
                order: idx
            });
        });

        for (const [regId, info] of byReg) {
            this.ctx.updater.addNodeCardRules(regId, root, info.regType, info.rules);
        }
    }

    // ============ CLICK ============

    _setupClick(root) {
        const clickCfg = this.data.click;
        if (!clickCfg) return;

        if (!clickCfg.reg) {
            console.warn(`node-card "${this.data.name}": click без reg`);
            return;
        }

        const { regId, regType } = splitRegSpec(clickCfg.reg, 'b0');

        const toggle     = clickCfg.toggle === true;
        const fixedValue = clickCfg.value !== undefined ? parseFloat(clickCfg.value) : null;
        const confirm    = clickCfg.confirm === true;

        root.addEventListener('click', async (e) => {
            if (this._suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
            if (this.ctx.popup.isOpen()) return;
            if (e.target.closest(INTERACTIVE_SELECTOR)) return;
            if (this._isProcessing) return;

            // Флаг ДО любого await — иначе двойной тап проходит
            this._isProcessing = true;

            try {
                let value;

                if (toggle) {
                    // Берём последний известный снимок (от регулярного опроса
                    // или от предыдущего действия). Отдельный readModbus()
                    // не нужен: сервер отдаёт mmap as-is, гонка только добавляется.
                    const view = this.ctx.api.lastDataView;
                    if (!view) {
                        console.warn(`node-card "${this.data.name}": ещё нет данных с ПЛК`);
                        return;
                    }
                    const actual = this.ctx.updater.readValue(view, regId * 2, regType);
                    if (actual === undefined || isNaN(actual)) {
                        console.warn(`node-card "${this.data.name}": не прочитать регистр ${regId}:${regType}`);
                        return;
                    }
                    value = (Number(actual) === 0) ? 1 : 0;
                } else {
                    if (fixedValue === null) {
                        console.warn(`node-card "${this.data.name}": click без value и toggle`);
                        return;
                    }
                    value = fixedValue;
                }

                if (confirm) {
                    const name = this.data.name || this.data.title || 'карточки';
                    const action = toggle
                        ? (value === 1 ? 'включить' : 'выключить')
                        : `записать ${value}`;
                    const ok = await this.ctx.confirm.ask({
                        title: 'Вы уверены?',
                        text: `Вы собираетесь <b>${action}</b> <b>${name}</b>.<br>Продолжить?`,
                        confirmText: 'Да',
                        cancelText: 'Отмена',
                        danger: value === 0
                    });
                    if (!ok) return;
                }

                root.classList.add('sending');
                await this.ctx.api.writeRegister(regId, value, regType);
                await new Promise(r => setTimeout(r, 50));
                await this.ctx.updater.updateButton(regId);
            } catch (err) {
                console.error('node-card click write error:', err);
                root.style.borderColor = 'red';
                setTimeout(() => { root.style.borderColor = ''; }, 1500);
            } finally {
                this._isProcessing = false;
                root.classList.remove('sending');
            }
        });
    }

    // ============ LONGPRESS ============

    _setupLongPress(root) {
        const action = this.data.longPress;
        if (!action || action === 'none') return;

        root.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (e.target.closest(INTERACTIVE_SELECTOR)) return;
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
                setTimeout(() => { this._suppressClick = false; }, 500);
            }
        };

        root.addEventListener('pointerup', cancelHold);
        root.addEventListener('pointercancel', cancelHold);
        root.addEventListener('pointerleave', cancelHold);
    }

    _triggerLongPress(anchor) {
        const action = this.data.longPress;
        if (!action || action === 'none') return;

        if (action.startsWith('popup:')) {
            const type = action.slice('popup:'.length);
            const data = Object.assign(
                { title: this.data.name || this.data.title, reg: this.data.regAddress },
                this.data.popupData || {}
            );
            this.ctx.popup.show({ type, anchor, data });
        } else {
            console.warn(`node-card: неизвестное действие longPress "${action}"`);
        }
    }
}

/** "9:u2" → { regId: 9, regType: "u2" }, "9" → { regId: 9, regType: defaultType } */
function splitRegSpec(spec, defaultType) {
    if (typeof spec === 'number') return { regId: spec, regType: defaultType };
    const s = String(spec);
    if (s.includes(':')) {
        const [addr, type] = s.split(':');
        return { regId: parseInt(addr), regType: type || defaultType };
    }
    return { regId: parseInt(s), regType: defaultType };
}