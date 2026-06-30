Отличная идея! Добавление **нескольких экранов (страниц)** с навигацией свайпом сделает интерфейс гораздо удобнее для работы с большим количеством блоков. Это особенно актуально для HMI-систем.

Давайте реализуем это поэтапно.

---

## 📐 Архитектура решения

### Структура данных

**`blocksData.json`** теперь будет содержать массив страниц:

```json
{
  "pages": [
    {
      "id": "main",
      "name": "Основная",
      "blocks": [
        { "type": "title-number", "x": 20, "y": 20, ... },
        { "type": "toggle-button", "x": 360, "y": 490, ... }
      ]
    },
    {
      "id": "settings",
      "name": "Настройки",
      "blocks": [
        { "type": "title-input", "x": 20, "y": 300, ... },
        { "type": "send-button", "x": 20, "y": 486, ... }
      ]
    },
    {
      "id": "diagnostics",
      "name": "Диагностика",
      "blocks": [
        { "type": "only-number", "x": 630, "y": 280, ... }
      ]
    }
  ]
}
```

---

## 📁 Новые и измененные файлы

### 1. `public/js/pageManager.js` (новый файл)

```javascript
// public/js/pageManager.js
export class PageManager {
    constructor(renderArea, renderer, updater) {
        this.renderArea = renderArea;
        this.renderer = renderer;
        this.updater = updater;
        this.pages = [];
        this.currentPageIndex = 0;
        this.isAnimating = false;
        this._setupSwipe();
        this._setupKeyboard();
    }

    setPages(pages) {
        this.pages = pages;
        this.currentPageIndex = 0;
        this.renderCurrentPage();
        this._updateIndicators();
    }

    renderCurrentPage() {
        if (this.pages.length === 0) return;
        
        const page = this.pages[this.currentPageIndex];
        const blocks = page.blocks || [];
        
        // Очищаем кэш перед рендерингом новой страницы
        this.updater.clearCaches();
        
        // Рендерим блоки
        this.renderer.renderBlocks(blocks);
        
        // Обновляем индикаторы
        this._updateIndicators();
        this._updatePageTitle();
    }

    goToPage(index) {
        if (this.isAnimating) return;
        if (index < 0 || index >= this.pages.length) return;
        if (index === this.currentPageIndex) return;

        this.isAnimating = true;
        this.currentPageIndex = index;
        this.renderCurrentPage();
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }

    nextPage() {
        if (this.currentPageIndex < this.pages.length - 1) {
            this.goToPage(this.currentPageIndex + 1);
        }
    }

    prevPage() {
        if (this.currentPageIndex > 0) {
            this.goToPage(this.currentPageIndex - 1);
        }
    }

    // --- СВАЙП ---
    _setupSwipe() {
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

        this.renderArea.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            isSwiping = true;
        }, { passive: true });

        this.renderArea.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            // Предотвращаем скролл страницы при свайпе
            e.preventDefault();
        }, { passive: false });

        this.renderArea.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;

            const touch = e.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;
            
            const diffX = endX - startX;
            const diffY = endY - startY;
            
            // Минимальное расстояние для свайпа (50px)
            const minSwipeDistance = 50;
            
            // Если свайп по вертикали больше чем по горизонтали - игнорируем
            if (Math.abs(diffY) > Math.abs(diffX)) return;
            
            if (diffX < -minSwipeDistance) {
                // Свайп влево → следующая страница
                this.nextPage();
            } else if (diffX > minSwipeDistance) {
                // Свайп вправо → предыдущая страница
                this.prevPage();
            }
        }, { passive: true });

        // Поддержка мыши (для десктопа)
        let mouseDown = false;
        let mouseStartX = 0;

        this.renderArea.addEventListener('mousedown', (e) => {
            mouseDown = true;
            mouseStartX = e.clientX;
        });

        this.renderArea.addEventListener('mouseup', (e) => {
            if (!mouseDown) return;
            mouseDown = false;
            
            const diffX = e.clientX - mouseStartX;
            const minSwipeDistance = 50;
            
            if (diffX < -minSwipeDistance) {
                this.nextPage();
            } else if (diffX > minSwipeDistance) {
                this.prevPage();
            }
        });
    }

    // --- КЛАВИАТУРА ---
    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Left / Ctrl+Right для навигации
            if (e.ctrlKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevPage();
            } else if (e.ctrlKey && e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextPage();
            }
        });
    }

    // --- ИНДИКАТОРЫ СТРАНИЦ ---
    _updateIndicators() {
        let container = document.getElementById('page-indicators');
        if (!container) {
            container = document.createElement('div');
            container.id = 'page-indicators';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
                z-index: 1000;
                background: rgba(0,0,0,0.5);
                padding: 8px 16px;
                border-radius: 20px;
                backdrop-filter: blur(4px);
            `;
            document.body.appendChild(container);
        }

        container.innerHTML = this.pages.map((page, index) => {
            const isActive = index === this.currentPageIndex;
            return `
                <button 
                    data-page="${index}"
                    style="
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        border: none;
                        background: ${isActive ? '#4caf50' : 'rgba(255,255,255,0.4)'};
                        cursor: pointer;
                        transition: all 0.3s;
                        padding: 0;
                        ${isActive ? 'transform: scale(1.3);' : ''}
                    "
                    title="${page.name || `Страница ${index + 1}`}"
                ></button>
            `;
        }).join('');

        // Добавляем обработчики на индикаторы
        container.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.page);
                this.goToPage(index);
            });
        });
    }

    _updatePageTitle() {
        const page = this.pages[this.currentPageIndex];
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = page?.name || `Страница ${this.currentPageIndex + 1}`;
        }
    }
}
```

---

### 2. Обновленный `public/index.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>visualHMI</title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        /* ... существующие стили ... */
        
        /* Дополнительные стили для страниц */
        #page-title {
            font-size: 16px;
            font-weight: 500;
            color: #333;
            margin: 0 20px;
        }
        
        #render-area {
            touch-action: none; /* Отключаем нативные жесты браузера */
        }
        
        /* Анимация переключения страниц */
        .page-transition {
            animation: fadeSlide 0.3s ease;
        }
        
        @keyframes fadeSlide {
            from {
                opacity: 0.5;
                transform: translateX(20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    </style>
</head>
<body>
    <div id="app">
        <header>
            <h1>📊 visualHMI</h1>
            <div id="status-bar">
                <span id="page-title">Основная</span>
                <span id="connection-status">🔄 Загрузка...</span>
                <span id="update-info">⏱️ 300ms</span>
            </div>
        </header>
        
        <main>
            <div id="render-area">
                <div style="display:flex;justify-content:center;align-items:center;height:100%;color:#999;font-size:16px;">
                    ⏳ Загрузка данных...
                </div>
            </div>
        </main>
        
        <footer>
            <span>visualHMI v2.0</span>
            <span id="debug-info">Готов</span>
        </footer>
    </div>

    <script type="module" src="js/app.js"></script>
</body>
</html>
```

---

### 3. Обновленный `public/js/app.js`

```javascript
// public/js/app.js
import { CONFIG } from './constants.js';
import { api } from './apiClient.js';
import { modbusUpdater } from './modbusUpdater.js';
import { BlockRenderer } from './blockRenderer.js';
import { PageManager } from './pageManager.js';

class App {
    constructor() {
        this.isEditMode = false;
        this.updateInterval = null;
        this.renderArea = document.getElementById('render-area');
        
        this.updater = modbusUpdater;
        this.renderer = new BlockRenderer();
        this.renderer.setRenderArea(this.renderArea);
        
        // Инициализация PageManager
        this.pageManager = new PageManager(
            this.renderArea,
            this.renderer,
            this.updater
        );
        
        this.isRunning = false;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Приложение уже инициализировано');
            return;
        }

        console.log('🚀 Инициализация приложения...');

        try {
            const config = await api.loadConfig(CONFIG.PROJECT);
            this.isEditMode = config?.isEditUIMode || false;

            if (this.isEditMode) {
                console.log('🛠️ Режим редактирования включен');
                this._startEditMode();
            } else {
                console.log('📊 Рабочий режим');
                await this._startProductionMode();
            }

            this.isInitialized = true;
            this._updateStatus('ready');
            console.log('✅ Приложение инициализировано');

        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this._updateStatus('error');
            this._showError('Не удалось инициализировать приложение');
            throw error;
        }
    }

    async _startProductionMode() {
        try {
            // Загружаем данные страниц
            const data = await api.loadConfig(CONFIG.BLOCKS);
            
            // Проверяем формат: массив страниц или массив блоков (для обратной совместимости)
            let pages;
            if (data.pages && Array.isArray(data.pages)) {
                // Новый формат: страницы
                pages = data.pages;
            } else if (Array.isArray(data)) {
                // Старый формат: плоский массив блоков
                pages = [{
                    id: 'default',
                    name: 'Основная',
                    blocks: data
                }];
            } else {
                throw new Error('Неверный формат blocksData.json');
            }

            if (pages.length === 0) {
                console.warn('⚠️ Нет страниц для отображения');
                pages = [{
                    id: 'empty',
                    name: 'Пусто',
                    blocks: []
                }];
            }

            // Передаем страницы в PageManager
            this.pageManager.setPages(pages);
            console.log(`✅ Отображено ${pages.length} страниц`);

            // Запускаем обновление
            this._startPolling();

        } catch (error) {
            console.error('Ошибка загрузки страниц:', error);
            throw new Error(`Не удалось загрузить страницы: ${error.message}`);
        }
    }

    // ... остальные методы ( _startEditMode, _startPolling, _updateStatus, stop, restart и т.д.)
    // остаются без изменений
}

// --- Запуск ---
const app = new App();

document.addEventListener('DOMContentLoaded', () => {
    app.initialize().catch(error => {
        console.error('Критическая ошибка:', error);
        // ... обработка ошибки
    });
});

window.__app = app;
```

---

### 4. Новый формат `blocksData.json`

```json
{
  "pages": [
    {
      "id": "main",
      "name": "Основная",
      "blocks": [
        {
          "regAddress": 0,
          "regType": "f4",
          "x": 360,
          "y": 20,
          "type": "title-number",
          "text": "Реактивный ток",
          "prefix": "Iреак.",
          "postfix": "A"
        },
        {
          "regAddress": 16,
          "regType": "f4",
          "x": 20,
          "y": 300,
          "type": "title-input",
          "prefix": "Ток",
          "postfix": "А",
          "size": 5
        }
      ]
    },
    {
      "id": "settings",
      "name": "Настройки",
      "blocks": [
        {
          "regAddress": 20,
          "regType": "b0",
          "x": 360,
          "y": 490,
          "type": "toggle-button",
          "text": "Вкл",
          "prefix": "20[0]"
        },
        {
          "regAddress": [0, 2, 4, 16, 18],
          "x": 20,
          "y": 486,
          "type": "send-button",
          "text": "Сохранить"
        }
      ]
    },
    {
      "id": "diagnostics",
      "name": "Диагностика",
      "blocks": [
        {
          "regAddress": 12,
          "regType": "b12",
          "x": 630,
          "y": 220,
          "type": "only-number",
          "prefix": "12[12]",
          "postfix": ""
        }
      ]
    }
  ]
}
```

---

## 🎯 Как это работает

| Действие | Результат |
|----------|-----------|
| **Свайп влево** | Переход к следующей странице |
| **Свайп вправо** | Переход к предыдущей странице |
| **Ctrl+←** | Предыдущая страница (десктоп) |
| **Ctrl+→** | Следующая страница (десктоп) |
| **Клик на индикатор** | Переход к конкретной странице |
| **Индикаторы внизу** | Показывают текущую страницу |

---

## 📝 Обратная совместимость

Если ваш `blocksData.json` остался в старом формате (массив блоков), код автоматически создаст одну страницу "Основная" со всеми блоками.

---

Что скажете? Пробуем внедрять? 😊