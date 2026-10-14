// public/js/blocks/titleNumberBlock.js
import { BaseBlock } from './baseBlock.js';
import { parseBlockFormat } from '../utils/format.js';

export class TitleNumberBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['title-number']);

        if (!this.data.format) {
            console.warn('⚠️ title-number без format — пропущен');
            return null;
        }

        const p = parseBlockFormat(this.data.format[0], this.data.format[1]);
        const text = (this.data.text || '').replace(/\n/g, '<br>');

        root.innerHTML = `
            <span class="title">${text}</span>
            <div class="value">
                <span class="prefix">${p.formatPrefix}</span>
                <span class="number" data-reg="${p.regAddress}" data-type="${p.regType}">--</span>
                <span class="postfix">${p.formatPostfix}</span>
            </div>`;

        this.el = root;

        const span = root.querySelector('span.number');
        if (span) {
            this.ctx.updater.addSpan(p.regAddress, span, p.regType, p.formatSpec);
        }
        return root;
    }
}