// public/js/blocks/onlyTitleBlock.js
import { BaseBlock } from './baseBlock.js';

export class OnlyTitleBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['only-title']);
        const text = (this.data.text || '').replace(/\n/g, '<br>');
        root.innerHTML = `
            <div class="content">
                <span class="title">${text}</span>
            </div>`;
        this.el = root;
        return root;
    }
}