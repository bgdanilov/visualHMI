// public/js/blocks/titleGroupNumberBlock.js
import { BaseBlock } from './baseBlock.js';
import { parseBlockFormat } from '../utils/format.js';

export class TitleGroupNumberBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['title-group-number']);

        const text = this.data.text || '';
        const formatEntries = this.data.format || [];

        let titleHtml = '';
        if (text) {
            titleHtml = `<span class="title">${text}</span>`;
        }

        const rowsHtml = formatEntries.map(([formatString, regSpec]) => {
            const p = parseBlockFormat(formatString, regSpec);
            return `
                <div class="value">
                    <span class="prefix">${p.formatPrefix}</span>
                    <span class="number" data-reg="${p.regAddress}" data-type="${p.regType}">--</span>
                    <span class="postfix">${p.formatPostfix}</span>
                </div>`;
        }).join('');

        root.innerHTML = titleHtml + rowsHtml;
        this.el = root;

        formatEntries.forEach(([formatString, regSpec]) => {
            const p = parseBlockFormat(formatString, regSpec);
            const span = root.querySelector(
                `span.number[data-reg="${p.regAddress}"][data-type="${p.regType}"]`
            );
            if (span) {
                this.ctx.updater.addSpan(p.regAddress, span, p.regType, p.formatSpec);
            }
        });

        return root;
    }
}