// public/js/blocks/emptyBoxBlock.js
import { BaseBlock } from './baseBlock.js';
import { blockRegistry } from '../core/blockRegistry.js';

export class EmptyBoxBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['empty-box']);

        const width = this.data.width || 300;
        const height = this.data.height || 200;
        const borderColor = this.data.borderColor || '#cccccc';
        const borderWidth = this.data.borderWidth || 2;
        const borderStyle = this.data.borderStyle || 'solid';
        const borderRadius = this.data.borderRadius || 0;
        const backgroundColor = this.data.backgroundColor || 'transparent';

        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.minWidth = `${width}px`;
        root.style.minHeight = `${height}px`;
        root.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
        root.style.borderRadius = `${borderRadius}px`;
        root.style.backgroundColor = backgroundColor;
        root.style.overflow = 'hidden';
        root.style.position = 'absolute';
        root.style.zIndex = '1';

        // Заголовок
        const titleHtml = this.data.title
            ? `<span class="box-title">${this.data.title}</span>`
            : '';

        root.innerHTML = titleHtml;

        // Дочерние блоки через реестр
        if (Array.isArray(this.data.children) && this.data.children.length > 0) {
            for (const childData of this.data.children) {
                const Cls = blockRegistry.get(childData.type);
                if (!Cls) {
                    console.warn(`⚠️ Неизвестный тип дочернего блока: ${childData.type}`);
                    continue;
                }
                try {
                    const childBlock = new Cls(childData, this.ctx);
                    const childEl = childBlock.render();
                    if (!childEl) continue;

                    // Переводим из .block в .node
                    childEl.classList.remove('block');
                    childEl.classList.add('node');

                    childEl.style.position = 'absolute';
                    childEl.style.left = `${childData.x || 0}px`;
                    childEl.style.top = `${childData.y || 0}px`;
                    childEl.style.margin = '0';

                    if (childData.plain) childEl.classList.add('plain');

                    root.appendChild(childEl);
                    childBlock.mounted();

                    // Сохраняем ссылку, чтобы можно было вызвать unmounted
                    if (!this._children) this._children = [];
                    this._children.push(childBlock);
                } catch (err) {
                    console.error(`❌ Ошибка рендера дочернего блока "${childData.type}":`, err);
                }
            }
        }

        // Если контейнер работает как toggle (empty-box с флагом toggle)
        if (this.data.toggle && this.data.regAddress !== undefined) {
            this._setupToggleBlock(root, this.data);
        }

        if (this.data.className) {
            root.classList.add(this.data.className);
        }

        this.el = root;
        return root;
    }

    unmounted() {
        if (this._children) {
            for (const child of this._children) {
                try { child.unmounted(); } catch {}
            }
            this._children = null;
        }
    }

    _setupToggleBlock(root, data) {
        const regAddress = data.regAddress;
        const regType = data.regType || 'b0';
        let isProcessing = false;

        const borderColor = data.borderColor || '#cccccc';
        const backgroundColor = data.backgroundColor || 'transparent';

        root.classList.add('toggle-block');
        root.style.cursor = 'pointer';
        root.style.transition = 'all 0.3s ease';

        // Регистрируем блок как toggle в updater — чтобы состояние приходило из опроса
        this.ctx.updater.addToggle(regAddress, root, regType);

        root.addEventListener('click', async (event) => {
            if (event.target.closest('button') ||
                event.target.closest('input') ||
                event.target.closest('.toggle') ||
                event.target.closest('.page-button') ||
                event.target.closest('.send-button') ||
                event.target.closest('.input') ||
                event.target.closest('.input-reset') ||
                event.target.closest('.input-save')) {
                return;
            }

            if (isProcessing) return;

            const isOn = root.classList.contains('on');
            const newState = isOn ? 0 : 1;

            isProcessing = true;
            root.style.opacity = '0.7';

            try {
                await this.ctx.api.writeRegister(regAddress, newState, regType);
                await new Promise(resolve => setTimeout(resolve, 400));
                await this.ctx.updater.update();
            } catch (error) {
                console.error('❌ Ошибка:', error);
                root.style.borderColor = 'red';
                setTimeout(() => {
                    root.style.borderColor = borderColor;
                }, 2000);
            } finally {
                isProcessing = false;
                root.style.opacity = '1';
            }
        });
    }
}