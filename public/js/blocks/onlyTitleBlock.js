// public/js/blocks/onlyTitleBlock.js
import { BaseBlock } from './baseBlock.js';

export class OnlyTitleBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['only-title']);
        const text = (this.data.text || '').replace(/\n/g, '<br>');
        root.innerHTML = `<span class="title">${text}</span>`;
        this.el = root;
        return root;
    }
}