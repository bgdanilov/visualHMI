// public/js/core/popupService.js

const OFFSET = 12;
const POPUP_H_DEFAULT = 240;

class PopupService {
    constructor() {
        this._backdrop = null;
        this._popup = null;
        this._anchor = null;
        this._type = null;
        this._data = null;
        this._renders = new Map();
        this._liveTimer = null;

        // Регистрируем встроенные типы попапов
        this._registerBuiltins();
    }

    // ============ ПУБЛИЧНЫЙ API ============

    /**
     * Открыть попап рядом с элементом-якорем.
     * @param {Object} opts
     * @param {string} opts.type    — 'trend' | 'menu' | ... (зарегистрированный тип)
     * @param {HTMLElement} opts.anchor — элемент, рядом с которым позиционировать
     * @param {Object} [opts.data]  — данные для попапа
     */
    show({ type, anchor, data = {} }) {
        const render = this._renders.get(type);
        if (!render) {
            console.warn(`⚠️ popupService: неизвестный тип попапа "${type}"`);
            return;
        }

        // Если открыт другой попап — закрыть
        if (this._popup) this._closeCurrent();

        this._type = type;
        this._anchor = anchor;
        this._data = data;

        this._ensureBackdrop();
        this._ensurePopup();

        // Рендер содержимого
        render(this._popup, data, {
            close: () => this.hide()
        });

        // Позиционирование
        this._position();

        // Показать
        this._popup.classList.add('visible');
        this._backdrop.classList.add('visible');
    }

    hide() {
        this._closeCurrent();
    }

    /** Проверка: открыт ли попап указанного типа. */
    isOpen(type = null) {
        if (!this._popup || !this._popup.classList.contains('visible')) return false;
        return type ? this._type === type : true;
    }

    /** Регистрация кастомного попапа. */
    register(type, render) {
        this._renders.set(type, render);
    }

    // ============ ВНУТРЕННЕЕ ============

    _closeCurrent() {
        if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
        if (this._popup) this._popup.classList.remove('visible');
        if (this._backdrop) this._backdrop.classList.remove('visible');
        this._anchor = null;
        this._type = null;
        this._data = null;
    }

    _ensureBackdrop() {
        if (this._backdrop) return;
        this._backdrop = document.createElement('div');
        this._backdrop.className = 'popup-backdrop';
        this._backdrop.addEventListener('click', () => this.hide());
        document.body.appendChild(this._backdrop);
    }

    _ensurePopup() {
        if (this._popup) {
            // Очищаем содержимое, оставляем корень
            this._popup.innerHTML = '';
            this._popup.className = 'popup';
            return;
        }
        this._popup = document.createElement('div');
        this._popup.className = 'popup';
        document.body.appendChild(this._popup);
    }

    _position() {
        if (!this._popup || !this._anchor) return;

        const r = this._anchor.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Размеры попапа могут быть любыми — читаем после рендера
        const popupRect = this._popup.getBoundingClientRect();
        const w = popupRect.width || 320;
        const h = popupRect.height || POPUP_H_DEFAULT;

        // Попробовать слева от якоря
        let left = r.left - w - OFFSET;
        let top = r.top;

        // Не влезает слева — справа
        if (left < 8) left = r.right + OFFSET;

        // Не влезает ни слева, ни справа — снизу
        if (left + w > vw - 8) {
            left = Math.max(8, Math.min(r.left, vw - w - 8));
            top = r.bottom + OFFSET;
        }

        // Не влезает снизу — прижимаем
        if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
        if (top < 8) top = 8;

        this._popup.style.left = left + 'px';
        this._popup.style.top = top + 'px';
    }

    // ============ ВСТРОЕННЫЕ ТИПЫ ============

    _registerBuiltins() {
        // --- trend ---
        this.register('trend', (popup, data, { close }) => {
            popup.classList.add('trend-popup');

            const title = data.title || 'Тренд';
            popup.innerHTML = `
                <div class="popup-head">
                    <div class="popup-title">${this._esc(title)}</div>
                    <button class="popup-close" aria-label="Закрыть">✕</button>
                </div>
                <svg class="chart" viewBox="0 0 380 140" preserveAspectRatio="none"></svg>
                <div class="popup-stats">
                    <div class="stat"><div class="lbl">Мин</div><div class="v" data-stat="min">—</div></div>
                    <div class="stat"><div class="lbl">Сред</div><div class="v" data-stat="avg">—</div></div>
                    <div class="stat"><div class="lbl">Макс</div><div class="v" data-stat="max">—</div></div>
                    <div class="stat"><div class="lbl">Сейчас</div><div class="v" data-stat="now">—</div></div>
                </div>
            `;

            popup.querySelector('.popup-close').addEventListener('click', (e) => {
                e.stopPropagation();
                close();
            });

            // Заглушка истории — фейковые данные
            let history = this._generateSeries(30);
            const chart = popup.querySelector('.chart');

            const draw = (arr) => {
                chart.innerHTML = this._renderTrendSvg(arr);
                const min = Math.min(...arr);
                const max = Math.max(...arr);
                const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
                const now = arr[arr.length - 1];
                popup.querySelector('[data-stat="min"]').textContent = min.toFixed(1);
                popup.querySelector('[data-stat="avg"]').textContent = avg.toFixed(1);
                popup.querySelector('[data-stat="max"]').textContent = max.toFixed(1);
                popup.querySelector('[data-stat="now"]').textContent = now.toFixed(1);
            };

            draw(history);

            this._liveTimer = setInterval(() => {
                history.push(this._nextValue(history[history.length - 1]));
                if (history.length > 30) history.shift();
                draw(history);
            }, 400);
        });

        // --- menu ---
        this.register('menu', (popup, data, { close }) => {
            popup.classList.add('ctx-popup');

            const title = data.title || 'Меню';
            popup.innerHTML = `
                <div class="popup-head">
                    <div class="popup-title">${this._esc(title)}</div>
                    <button class="popup-close" aria-label="Закрыть">✕</button>
                </div>

                <button class="ctx-item" data-action="trend">
                    <span class="ico">
                        <svg viewBox="0 0 24 24">
                            <polyline points="3,17 9,11 13,13 21,5"/>
                            <polyline points="15,5 21,5 21,11"/>
                        </svg>
                    </span>
                    Открыть тренд
                </button>

                <div class="ctx-section">
                    <div class="ctx-slider-block">
                        <div class="lbl">
                            <span>Уставка влажности</span>
                            <span class="val" data-slider-val>45 %</span>
                        </div>
                        <input type="range" class="slider" min="0" max="100" value="45" step="1">
                        <div class="slider-scale"><span>0</span><span>50</span><span>100</span></div>
                    </div>
                </div>

                <div class="ctx-section">
                    <button class="ctx-item" data-action="lock">
                        <span class="ico">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="11" width="16" height="10" rx="2"/>
                                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                            </svg>
                        </span>
                        Заблокировать
                    </button>

                    <button class="ctx-item danger" data-action="stop">
                        <span class="ico">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="9"/>
                                <line x1="8" y1="8" x2="16" y2="16"/>
                                <line x1="16" y1="8" x2="8" y2="16"/>
                            </svg>
                        </span>
                        Отключить
                    </button>
                </div>
            `;

            popup.querySelector('.popup-close').addEventListener('click', (e) => {
                e.stopPropagation();
                close();
            });

            const slider = popup.querySelector('.slider');
            const sliderVal = popup.querySelector('[data-slider-val]');
            slider.addEventListener('input', (e) => {
                sliderVal.textContent = e.target.value + ' %';
            });
            slider.addEventListener('change', (e) => {
                console.log('Уставка влажности:', e.target.value, '% для', data.title);
            });

            popup.querySelectorAll('.ctx-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = item.dataset.action;
                    if (action === 'trend') {
                        // Переоткрываем попап тренда для того же якоря
                        const anchor = this._anchor;
                        this.show({
                            type: 'trend',
                            anchor,
                            data: { title }
                        });
                        return;
                    }
                    console.log('Действие:', action, 'для', data.title);
                    close();
                });
            });
        });
    }

    // ============ ХЕЛПЕРЫ ============

    _esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _generateSeries(n) {
        const arr = [];
        let v = 45;
        for (let i = 0; i < n; i++) {
            v += (Math.random() - 0.5) * 8;
            v = Math.max(20, Math.min(70, v));
            arr.push(v);
        }
        return arr;
    }

    _nextValue(prev) {
        let v = prev + (Math.random() - 0.5) * 8;
        return Math.max(20, Math.min(70, v));
    }

    _renderTrendSvg(data) {
        const W = 380, H = 140;
        const padL = 32, padR = 10, padT = 10, padB = 20;
        const innerW = W - padL - padR;
        const innerH = H - padT - padB;

        if (data.length < 2) return '';

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const yMin = min - range * 0.15;
        const yMax = max + range * 0.15;
        const yRange = yMax - yMin;

        const x = i => padL + (i / (data.length - 1)) * innerW;
        const y = v => padT + innerH - ((v - yMin) / yRange) * innerH;

        let grid = '';
        for (let i = 0; i <= 4; i++) {
            const yy = padT + (innerH / 4) * i;
            const val = yMax - (yRange / 4) * i;
            grid += `<line class="grid-line" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/>`;
            grid += `<text class="axis" x="${padL - 6}" y="${yy + 3}" text-anchor="end">${val.toFixed(0)}</text>`;
        }

        const points = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const areaPoints = `${padL},${padT + innerH} ${points} ${W - padR},${padT + innerH}`;
        const lastX = x(data.length - 1);
        const lastY = y(data[data.length - 1]);

        return `
            ${grid}
            <polygon class="area" points="${areaPoints}"/>
            <polyline class="line" points="${points}"/>
            <circle class="last-dot" cx="${lastX}" cy="${lastY}" r="4"/>
        `;
    }
}

export const popupService = new PopupService();