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
        
        // Используем импортированные экземпляры
        this.updater = modbusUpdater;
        this.renderer = new BlockRenderer();
        this.renderer.setRenderArea(this.renderArea);
        
        this.isRunning = false;
        this.isInitialized = false;
    }

    async initialize() {
        console.log('🚀 Инициализация приложения...');

        try {
            // Загружаем конфигурацию проекта
            const config = await api.loadConfig(CONFIG.PROJECT);
            this.isEditMode = config?.isEditUIMode || false;

            if (this.isEditMode) {
                console.log('🛠️ Режим редактирования включен');
                this._startEditMode();
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

    async _startProductionMode() {
        // Загружаем блоки
        const blocks = await api.loadConfig(CONFIG.BLOCKS);
        if (!Array.isArray(blocks)) {
            throw new Error('Неверный формат blocksData.json');
        }

        // Добавляем id блокам
        const blocksWithIds = blocks.map((block, index) => ({
            ...block,
            id: index
        }));

        // Рендерим блоки
        this.renderer.renderBlocks(blocksWithIds);

        // Запускаем обновление
        this._startPolling();
    }

    _startEditMode() {
        // В режиме редактирования обновляем UI каждые 500ms
        this.updateInterval = setInterval(async () => {
            try {
                const blocks = await api.loadConfig(CONFIG.BLOCKS);
                if (Array.isArray(blocks)) {
                    const blocksWithIds = blocks.map((block, index) => ({
                        ...block,
                        id: index
                    }));
                    this.renderer.renderBlocks(blocksWithIds);
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