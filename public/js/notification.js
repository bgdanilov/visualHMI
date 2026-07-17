// public/js/notification.js

export class NotificationManager {
    constructor() {
        this.container = null;
        this.defaultDuration = 3000; // 🔥 3 секунды по умолчанию
    }

    initialize() {
        if (this.container) {
            return;
        }

        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            width: 100%;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    show(message, options = {}) {
        this.initialize();

        const {
            type = 'info',
            duration = this.defaultDuration,
            closable = true,
            title = '',
            onClick = null
        } = options;

        const colors = {
            success: { bg: '#4caf50', icon: '✅' },
            error: { bg: '#f44336', icon: '❌' },
            warning: { bg: '#ff9800', icon: '⚠️' },
            info: { bg: '#2196f3', icon: 'ℹ️' }
        };

        const color = colors[type] || colors.info;

        const div = document.createElement('div');
        div.className = `notification notification-${type}`;
        div.style.cssText = `
            background: #fff;
            border-left: 4px solid ${color.bg};
            border-radius: 8px;
            padding: 14px 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            pointer-events: auto;
            cursor: ${onClick ? 'pointer' : 'default'};
            display: flex;
            align-items: flex-start;
            gap: 12px;
            min-height: 40px;
            opacity: 0;
            transform: translateX(50px);
            transition: all 0.3s ease;
        `;

        if (onClick) {
            div.addEventListener('click', onClick);
        }

        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = `font-size: 20px; flex-shrink: 0; line-height: 1;`;
        iconSpan.textContent = color.icon;
        div.appendChild(iconSpan);

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `flex: 1; min-width: 0;`;

        if (title) {
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = `
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin-bottom: 4px;
            `;
            titleDiv.textContent = title;
            contentDiv.appendChild(titleDiv);
        }

        const msgDiv = document.createElement('div');
        msgDiv.style.cssText = `
            font-size: 14px;
            color: #555;
            word-wrap: break-word;
            line-height: 1.4;
        `;
        msgDiv.textContent = message;
        contentDiv.appendChild(msgDiv);

        div.appendChild(contentDiv);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                padding: 0 4px;
                flex-shrink: 0;
                line-height: 1;
                transition: color 0.2s;
            `;
            closeBtn.textContent = '✕';
            closeBtn.title = 'Закрыть';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._removeNotification(div);
            });
            
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.color = '#333';
            });
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.color = '#999';
            });
            
            div.appendChild(closeBtn);
        }

        this.container.appendChild(div);

        // Анимация появления
        requestAnimationFrame(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateX(0)';
        });

        // Авто-удаление
        if (duration > 0) {
            setTimeout(() => {
                this._removeNotification(div);
            }, duration);
        }

        return div;
    }

    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }

    _removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(50px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }

    setDefaultDuration(ms) {
        this.defaultDuration = Math.max(0, ms);
    }
}

export const notification = new NotificationManager();