// public/js/renderer/blockRenderer.js
import { blockRegistry } from '../core/blockRegistry.js';

export class BlockRenderer {
    constructor(context) {
        this.ctx = context;
        this.blocks = new Map(); // HTMLElement → BaseBlock
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
                this.ctx.renderArea.appendChild(el);
                block.mounted();
                this.blocks.set(el, block);
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