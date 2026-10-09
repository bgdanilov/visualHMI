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

        // Для обратной совместимости со старым параметром 'text'
        const defaultText = this.data.text || textOn;

        root.innerHTML = `
            <div class="content" data-reg="${regAddress}" data-type="${regType}">
                <span class="prefix btn">${prefix}</span>
                <button class="toggle-button off" data-reg="${regAddress}">
                    ${defaultText}
                </button>
            </div>`;

        const button = root.querySelector('.toggle-button');

        // Размеры, если заданы
        if (width || height) {
            const content = root.querySelector('.content');
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

        // Тексты для updater
        button.dataset.textOn = textOn;
        button.dataset.textOff = textOff;

        // Регистрация в updater + клик
        this.ctx.updater.addToggle(regAddress, button, regType);
        this._setupClick(button, regAddress, regType);

        this.el = root;
        return root;
    }

    _setupClick(button, regAddress, registerType) {
        let isProcessing = false;

        button.addEventListener('click', async () => {
            if (isProcessing || button.disabled) return;

            const isOn = button.classList.contains('on');
            const newState = isOn ? 0 : 1;

            const textOn = button.dataset.textOn || 'Вкл';
            const textOff = button.dataset.textOff || 'Выкл';

            console.log(`🔄 Кнопка ${regAddress}: ${isOn ? textOff : textOn}`);

            isProcessing = true;
            button.disabled = true;
            button.classList.add('waiting');

            try {
                await this.ctx.api.writeRegister(regAddress, newState, registerType);
                await new Promise(resolve => setTimeout(resolve, 400));
                await this.ctx.updater.update();
            } catch (error) {
                console.error('❌ Ошибка:', error);
                button.textContent = '❌';
                button.style.borderColor = 'red';

                setTimeout(() => {
                    button.textContent = isOn ? textOn : textOff;
                    button.style.borderColor = '';
                    button.classList.remove('waiting');
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