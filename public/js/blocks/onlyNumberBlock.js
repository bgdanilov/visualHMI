// public/js/blocks/onlyNumberBlock.js
import { BaseBlock } from './baseBlock.js';
import { parseBlockFormat } from '../utils/format.js';

export class OnlyNumberBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['only-number']);

        let prefix, postfix, regAddress, regType, formatSpec = null;
        let value = '--';

        if (this.data.format) {
            const p = parseBlockFormat(this.data.format[0], this.data.format[1]);
            prefix = p.formatPrefix;
            postfix = p.formatPostfix;
            regAddress = p.regAddress;
            regType = p.regType;
            formatSpec = p.formatSpec;
        } else {
            prefix = this.data.prefix || '';
            postfix = this.data.postfix || '';
            regAddress = this.data.regAddress;
            regType = this.data.regType || 'u2';
            value = this.data.value ?? '--';
        }

        root.innerHTML = `
            <div class="value">
                <span class="prefix">${prefix}</span>
                <span class="number" data-reg="${regAddress}" data-type="${regType}">${value}</span>
                <span class="postfix">${postfix}</span>
            </div>`;

        this.el = root;

        const span = root.querySelector('span.number');
        if (span && regAddress !== undefined) {
            this.ctx.updater.addSpan(regAddress, span, regType, formatSpec);
        }
        return root;
    }
}