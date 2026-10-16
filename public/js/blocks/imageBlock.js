// public/js/blocks/imageBlock.js
import { BaseBlock } from './baseBlock.js';

const SPIN_MODES = ['spinning', 'spin-slow', 'spin-fast', 'spin-pause', 'spin-reverse'];

export class ImageBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['image']);

        const {
            src,
            width,
            height,
            alt = '',
            title = '',
            objectFit = 'contain',
            borderRadius = 0,
            border = 'none',
            opacity = 1,
            backgroundColor = 'transparent',
            spin = false,
            spinSpeed = 'normal'
        } = this.data;

        // Размеры корня
        if (width) {
            root.style.width = `${width}px`;
            root.style.minWidth = `${width}px`;
        }
        if (height) {
            root.style.height = `${height}px`;
            root.style.minHeight = `${height}px`;
        }

        root.style.borderRadius = `${borderRadius}px`;
        root.style.opacity = opacity;
        root.style.border = border;
        root.style.backgroundColor = backgroundColor;
        root.style.padding = '0';
        root.style.margin = '0';

        // Если src нет — заглушка
        if (!src) {
            root.innerHTML = `
                <div class="image-placeholder">
                    <span>📷</span>
                    <span>Нет изображения</span>
                </div>`;
            this.el = root;
            return root;
        }

        // Начальный класс вращения
        const initialSpinClass = spin ? this._resolveSpinClass(spinSpeed) : '';

        root.innerHTML = `
            <img
                src="${src}"
                alt="${this.esc(alt)}"
                title="${this.esc(title)}"
                class="${initialSpinClass}"
                style="object-fit: ${objectFit}; display: block; width: 100%; height: 100%;"
                loading="lazy"
            >`;

        const img = root.querySelector('img');

        // Обработка ошибки загрузки
        img.addEventListener('error', () => {
            root.innerHTML = `
                <div class="image-error">
                    <span>❌</span>
                    <span>Ошибка загрузки</span>
                </div>`;
        });

        // Если размеры не заданы — подгоняем корень под натуральный размер
        img.addEventListener('load', () => {
            if (!width) {
                root.style.width = `${img.naturalWidth}px`;
                root.style.minWidth = `${img.naturalWidth}px`;
            }
            if (!height) {
                root.style.height = `${img.naturalHeight}px`;
                root.style.minHeight = `${img.naturalHeight}px`;
            }
        });

        // Клик — циклическое переключение режима вращения
        if (this.data.toggleSpinOnClick) {
            img.style.cursor = 'pointer';
            let currentModeIndex = spin
                ? SPIN_MODES.indexOf(initialSpinClass)
                : -1;

            img.addEventListener('click', () => {
                // Снимаем текущий класс
                SPIN_MODES.forEach(cls => img.classList.remove(cls));

                // Переходим к следующему
                currentModeIndex = (currentModeIndex + 1) % SPIN_MODES.length;
                img.classList.add(SPIN_MODES[currentModeIndex]);
            });
        }

        this.el = root;
        return root;
    }

    _resolveSpinClass(speed) {
        switch (speed) {
            case 'slow':    return 'spin-slow';
            case 'fast':    return 'spin-fast';
            case 'pause':   return 'spin-pause';
            case 'reverse': return 'spin-reverse';
            case 'normal':
            default:        return 'spinning';
        }
    }
}