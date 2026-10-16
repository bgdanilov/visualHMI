// public/js/blocks/pageButtonBlock.js
import { BaseBlock } from './baseBlock.js';

export class PageButtonBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['page-button']);

        const text = this.data.text || 'Страница';
        const targetPage = this.data.targetPage;

        root.innerHTML = `
            <div class="value">
                <button class="page-button" data-target="${targetPage}">${text}</button>
            </div>`;

        const btn = root.querySelector('.page-button');
        btn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('page-change', {
                detail: { targetPage }
            }));
        });

        this.el = root;
        return root;
    }
}