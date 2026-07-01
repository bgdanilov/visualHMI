// public/js/scalingManager.js

import { CONFIG } from './constants.js';

export class ScalingManager {
    constructor() {
        this.defaultWidth = CONFIG.DEFAULT_WIDTH || 1920;
        this.defaultHeight = CONFIG.DEFAULT_HEIGHT || 1080;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.container = null;
        this.isInitialized = false;
    }

    initialize(container) {
        this.container = container || document.getElementById('app');
        if (!this.container) {
            console.error('❌ Контейнер для масштабирования не найден');
            return;
        }

        this.container.style.transformOrigin = 'top left';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = `${this.defaultWidth}px`;
        this.container.style.height = `${this.defaultHeight}px`;
        this.container.style.overflow = 'hidden';

        this.applyScale();

        window.addEventListener('resize', () => {
            this.applyScale();
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.applyScale(), 200);
        });

        this.isInitialized = true;
        console.log(`📐 Масштабирование инициализировано: ${this.defaultWidth}x${this.defaultHeight}`);
        return this;
    }

    applyScale() {
        if (!this.container) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / this.defaultWidth;
        const scaleY = windowHeight / this.defaultHeight;
        this.scale = Math.min(scaleX, scaleY);

        const scaledWidth = this.defaultWidth * this.scale;
        const scaledHeight = this.defaultHeight * this.scale;

        this.offsetX = (windowWidth - scaledWidth) / 2;
        this.offsetY = (windowHeight - scaledHeight) / 2;

        this.container.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        this.container.style.transformOrigin = 'top left';

        this.container.dataset.scale = this.scale.toFixed(3);

        const event = new CustomEvent('scaleChanged', {
            detail: {
                scale: this.scale,
                offsetX: this.offsetX,
                offsetY: this.offsetY,
                windowWidth: windowWidth,
                windowHeight: windowHeight
            }
        });
        window.dispatchEvent(event);

        console.log(`📐 Масштаб: ${this.scale.toFixed(3)} (${(this.scale * 100).toFixed(0)}%)`);
    }

    getScale() {
        return this.scale;
    }

    getOffset() {
        return { x: this.offsetX, y: this.offsetY };
    }

    screenToLayout(screenX, screenY) {
        const rect = this.container.getBoundingClientRect();
        return {
            x: (screenX - rect.left) / this.scale,
            y: (screenY - rect.top) / this.scale
        };
    }

    layoutToScreen(layoutX, layoutY) {
        const rect = this.container.getBoundingClientRect();
        return {
            x: rect.left + layoutX * this.scale,
            y: rect.top + layoutY * this.scale
        };
    }

    setDefaultSize(width, height) {
        this.defaultWidth = width;
        this.defaultHeight = height;
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;
        this.applyScale();
    }

    refresh() {
        this.applyScale();
    }
}

export const scalingManager = new ScalingManager();