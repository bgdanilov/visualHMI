// public/js/pageManager.js

import { EVENTS } from './constants.js';

export class PageManager {
    constructor() {
        this.pages = [];
        this.currentPageIndex = 0;
        this.renderArea = null;
        this.listeners = {};
    }

    setRenderArea(renderArea) {
        this.renderArea = renderArea;
    }

    loadPages(data) {
        if (!data || !Array.isArray(data.pages)) {
            console.error('❌ Неверный формат blocksData.json: ожидается { pages: [...] }');
            return;
        }
        this.pages = data.pages;
        this.currentPageIndex = 0;
        this.renderCurrentPage();
    }

    goToPage(index) {
        if (index < 0 || index >= this.pages.length) {
            console.warn(`⚠️ Страница ${index} не существует`);
            return;
        }
        this.currentPageIndex = index;
        this.renderCurrentPage();
        this.emit(EVENTS.PAGE_CHANGE, {
            pageIndex: index,
            page: this.pages[index]
        });
    }

    goToPageById(pageId) {
        const index = this.pages.findIndex(p => p.id === pageId);
        if (index === -1) {
            console.warn(`⚠️ Страница с id "${pageId}" не найдена`);
            return;
        }
        this.goToPage(index);
    }

    getCurrentPage() {
        return this.pages[this.currentPageIndex] || null;
    }

    getCurrentBlocks() {
        const page = this.getCurrentPage();
        return page ? page.blocks : [];
    }

    getCurrentPageName() {
        const page = this.getCurrentPage();
        return page ? page.name : '';
    }

    getCurrentPageId() {
        const page = this.getCurrentPage();
        return page ? page.id : '';
    }

    renderCurrentPage() {
        if (!this.renderArea) {
            console.warn('⚠️ renderArea не установлена');
            return;
        }

        const blocks = this.getCurrentBlocks();
        this.renderArea.innerHTML = '';

        const event = new CustomEvent('renderPage', {
            detail: {
                blocks: blocks,
                page: this.getCurrentPage(),
                pageIndex: this.currentPageIndex
            }
        });
        this.renderArea.dispatchEvent(event);
    }

    getAllPages() {
        return this.pages;
    }

    getPagesCount() {
        return this.pages.length;
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

export const pageManager = new PageManager();