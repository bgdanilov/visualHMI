// public/js/renderer/blockRenderer.js
import { blockRegistry } from '../core/blockRegistry.js';

export class BlockRenderer {
    constructor(context) {
        this.ctx = context;      // { renderArea, updater, api, numpad, validator, notification }
        this.blocks = new Map(); // id → BaseBlock
        this._counter = 0;
    }

    setRenderArea(el) {
        this.ctx.renderArea = el;
    }

    renderBlocks(blocksData) {
        this.clear();
        for (const data of blocksData) {
            const Cls = blockRegistry.get(data.type);
            if (!Cls) {
                console.warn(`⚠️ Неизвестный тип блока: ${data.type}`);
                continue;
            }
            try {
                const block = new Cls(data, this.ctx);
                const el = block.render();
                if (!el) continue;
                if (!el.id) el.id = `block-${++this._counter}`;
                this.ctx.renderArea.appendChild(el);
                block.mounted();
                this.blocks.set(el.id, block);
            } catch (err) {
                console.error(`❌ Ошибка рендера блока "${data.type}":`, err);
            }
        }
    }

    clear() {
        for (const block of this.blocks.values()) {
            try { block.unmounted(); } catch {}
        }
        this.blocks.clear();
        if (this.ctx.renderArea) this.ctx.renderArea.innerHTML = '';
    }
}