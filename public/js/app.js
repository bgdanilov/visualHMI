// public/js/app.js
import { CONFIG } from './constants.js';
import { api } from './apiClient.js';
import { modbusUpdater } from './modbusUpdater.js';
import { BlockRenderer } from './blockRenderer.js';

class App {
    constructor() {
        this.isEditMode = false;
        this.updateInterval = null;
        this.renderArea = document.getElementById('render-area');
        
        this.updater = modbusUpdater;
        this.renderer = new BlockRenderer();
        this.renderer.setRenderArea(this.renderArea);
        
        this.isRunning = false;
        this.isInitialized = false;
        this.pages = null;
        this.currentPage = null;
    }

    _setupScaling() {
        const CANVAS_W = 1280;
        const CANVAS_H = 760;

        const fit = () => {
            const scale = Math.min(
                window.innerWidth / CANVAS_W,
                window.innerHeight / CANVAS_H
            );
            const el = this.renderArea;
            el.style.position = 'absolute';
            el.style.transformOrigin = 'top left';
            el.style.transform = `scale(${scale})`;
            el.style.left = `${(window.innerWidth - CANVAS_W * scale) / 2}px`;
            el.style.top = `${(window.innerHeight - CANVAS_H * scale) / 2}px`;
        };

        fit();
        window.addEventListener('resize', fit);
    }

    async initialize() {
        console.log('🚀 Инициализация приложения...');

        this._setupScaling();

        try {
            const config = await api.loadConfig(CONFIG.PROJECT);
            this.isEditMode = config?.isEditUIMode || false;

            window.addEventListener('page-change', (event) => {
                this.switchPage(event.detail.targetPage);
            });

            if (this.isEditMode) {
                console.log('🛠️ Режим редактирования включен');
                await this._startEditMode();
            } else {
                console.log('📊 Рабочий режим');
                await this._startProductionMode();
            }

            console.log('✅ Приложение инициализировано');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this._showError('Не удалось инициализировать приложение');
        }
    }

    async _loadPages() {
        const data = await api.loadConfig(CONFIG.BLOCKS);

        if (Array.isArray(data)) {
            this.pages = { main: data };
        } else if (data && typeof data === 'object') {
            this.pages = data;
        } else {
            throw new Error('Неверный формат blocksData.json');
        }

        return this.pages;
    }

    _renderPage(pageKey) {
        const blocks = this.pages[pageKey];
        if (!blocks) {
            console.error(`Страница "${pageKey}" не найдена`);
            return;
        }

        this.currentPage = pageKey;
        const blocksWithIds = blocks.map((block, index) => ({
            ...block,
            id: index
        }));
        this.renderer.renderBlocks(blocksWithIds);
    }

    switchPage(pageKey) {
        if (pageKey === this.currentPage || !this.pages[pageKey]) return;
        this.renderer.clear();
        this._renderPage(pageKey);
    }

    async _startProductionMode() {
        await this._loadPages();
        const firstPage = Object.keys(this.pages)[0];
        if (!firstPage) throw new Error('Нет ни одной страницы');

        this._renderPage(firstPage);
        this._startPolling();
    }

    async _startEditMode() {
        await this._loadPages();
        const firstPage = Object.keys(this.pages)[0];

        this._renderPage(firstPage);

        this.updateInterval = setInterval(async () => {
            try {
                const data = await api.loadConfig(CONFIG.BLOCKS);
                let pages = data;
                if (Array.isArray(data)) {
                    pages = { main: data };
                }
                this.pages = pages;
                if (this.currentPage && this.pages[this.currentPage]) {
                    this._renderPage(this.currentPage);
                } else {
                    const fp = Object.keys(this.pages)[0];
                    if (fp) this._renderPage(fp);
                }
            } catch (error) {
                console.error('Ошибка обновления UI в режиме редактирования:', error);
            }
        }, 500);
    }

    _startPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.isRunning = true;
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
                this.updater.update().catch(error => {
                    console.error('Ошибка опроса Modbus:', error);
                });
            }
        }, CONFIG.UPDATE_INTERVAL_MS);

        // Первое обновление сразу
        this.updater.update().catch(error => {
            console.error('Ошибка первого опроса:', error);
        });
    }

    stop() {
        this.isRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('⏹️ Приложение остановлено');
    }

    restart() {
        this.stop();
        this.initialize();
    }

    _showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 9999;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        errorDiv.textContent = `❌ ${message}`;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.5s';
            setTimeout(() => errorDiv.remove(), 500);
        }, 5000);
    }
}

// --- Запуск приложения ---

const app = new App();

document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});

// Обработка ошибок
window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанная ошибка:', event.reason);
});

// Экспортируем для использования в консоли
window.__app = app;