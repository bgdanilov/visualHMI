// public/js/blocks/toggleButtonBlock.js
import { BaseBlock } from './baseBlock.js';

export class ToggleButtonBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['toggle-button']);

        const {
            regAddress,
            regType = 'b0',
            prefix = '',
            textOn = 'Вкл',
            textOff = 'Выкл',
            width,
            height
        } = this.data;

        const defaultText = this.data.text || textOn;

        const prefixHtml = prefix
            ? `<span class="prefix btn">${prefix}</span>`
            : '';

        root.innerHTML = `
            <div class="value">
                ${prefixHtml}
                <button
                    class="toggle off"
                    data-reg="${regAddress}"
                    data-type="${regType}"
                    data-text-on="${textOn}"
                    data-text-off="${textOff}"
                >${defaultText}</button>
            </div>`;

        const button = root.querySelector('.toggle');

        if (width || height) {
            const content = root.querySelector('.value');
            if (content) {
                content.style.padding = '0';
                content.style.gap = '0';
            }
        }
        if (width) {
            button.style.width = `${width}px`;
            button.style.minWidth = `${width}px`;
        }
        if (height) {
            button.style.height = `${height}px`;
            button.style.minHeight = `${height}px`;
        }

        this.ctx.updater.addToggle(regAddress, button, regType);
        this._setupClick(button, regAddress, regType);

        this.el = root;
        return root;
    }

    _setupClick(button, regAddress, registerType) {
        let isProcessing = false;

        button.addEventListener('click', async () => {
            if (isProcessing || button.disabled) return;
            if (this.ctx.popup.isOpen()) return;

            const isOn = button.classList.contains('on');
            const newState = isOn ? 0 : 1;

            isProcessing = true;
            button.disabled = true;
            button.classList.add('waiting');

            try {
                await this.ctx.api.writeRegister(regAddress, newState, registerType);
                await new Promise(resolve => setTimeout(resolve, 50));
                // Точечно — только этот регистр, а не весь буфер
                await this.ctx.updater.updateToggle(regAddress);
            } catch (error) {
                console.error('❌ Ошибка toggle-button:', error);
                button.textContent = '❌';
                button.style.borderColor = 'red';
                setTimeout(() => {
                    button.style.borderColor = '';
                }, 1500);
            } finally {
                setTimeout(() => {
                    isProcessing = false;
                    button.disabled = false;
                    button.classList.remove('waiting');
                }, 150);
            }
        });
    }
}