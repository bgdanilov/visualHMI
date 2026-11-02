// public/js/blocks/svgBlock.js
import { BaseBlock } from './baseBlock.js';
import { modbusUpdater } from '../core/modbusUpdater.js';

export class SvgBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['svg-block']);
        this.el = root;
        this.svgRoot = null;

        const { src, width = 50, height = 50 } = this.data;

        // Базовые стили контейнера
        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.display = 'inline-flex';
        root.style.alignItems = 'center';
        root.style.justifyContent = 'center';
        root.style.transition = 'color 0.3s ease, opacity 0.3s ease, transform 0.3s ease';
        root.style.overflow = 'hidden';

        // Загружаем SVG
        fetch(src)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(svgText => {
                root.innerHTML = svgText;
                this.svgRoot = root.querySelector('svg');
                
                if (this.svgRoot) {
                    this.svgRoot.style.width = '100%';
                    this.svgRoot.style.height = '100%';
                    this.svgRoot.style.display = 'block';
                    // Включаем наследование цвета
                    this.svgRoot.setAttribute('fill', 'currentColor');
                }
                
                // Регистрируем правила в updater
                this._registerRules();
                // Применяем начальные значения (0)
                this._initRules();
            })
            .catch(err => {
                console.error(`Ошибка загрузки SVG ${src}:`, err);
                root.innerHTML = `<span style="color:#e74c3c; font-size:12px; text-align:center;">⚠️ SVG Error</span>`;
            });

        return root;
    }

    // --- РЕГИСТРАЦИЯ ПРАВИЛ В UPDATER ---
    _registerRules() {
        if (!this.data.rules) return;

        // Собираем уникальные регистры (с типом), чтобы не регистрировать дубли
        const seen = new Set();
        this.data.rules.forEach(rule => {
            const parts = String(rule.reg).split(':');
            const regId = parts[0];
            const type = parts[1] || 'u2';
            const key = `${regId}:${type}`;
            if (seen.has(key)) return;
            seen.add(key);

            modbusUpdater.addSvgRule(regId, this, rule.reg, type);
        });
    }

    _initRules() {
        if (!this.data.rules) return;
        // Собираем уникальные reg из правил и инициализируем их нулём
        const seen = new Set();
        this.data.rules.forEach(rule => {
            if (seen.has(rule.reg)) return;
            seen.add(rule.reg);
            this.updateByReg(rule.reg, 0);
        });
    }

    // --- ГЛАВНЫЙ МЕТОД ОБНОВЛЕНИЯ ---
    // Вызывается из updater для конкретного регистра
    updateByReg(regKey, value) {
        if (!this.data.rules) return;

        const rules = this.data.rules.filter(r => r.reg === regKey);
        
        rules.forEach(rule => {
            if (this._evaluate(rule.if, value)) {
                this._applyEffects(rule.then, value);
            }
        });
    }

         // --- ВЫЧИСЛЕНИЕ УСЛОВИЯ (DSL) ---
    _evaluate(condition, value) {
        if (condition === undefined || condition === null || condition === '') return true;

        const v = Number(value);
        if (!Number.isFinite(v)) return false;

        try {
            return this._evalExpr(String(condition), v);
        } catch (e) {
            console.warn(`Неподдерживаемое условие: "${condition}"`, e);
            return false;
        }
    }

    _evalExpr(expr, v) {
        expr = String(expr).trim();
        if (!expr) return true;

        // Внешние скобки, охватывающие всё выражение
        if (expr.startsWith('(') && expr.endsWith(')')) {
            let depth = 0;
            let coversAll = true;
            for (let i = 0; i < expr.length; i++) {
                if (expr[i] === '(') depth++;
                else if (expr[i] === ')') depth--;
                if (depth === 0 && i < expr.length - 1) { coversAll = false; break; }
            }
            if (coversAll) return this._evalExpr(expr.slice(1, -1), v);
        }

        // || (низший приоритет)
        const orParts = this._splitTopLevel(expr, '||');
        if (orParts.length > 1) {
            return orParts.some(p => this._evalExpr(p, v));
        }

        // &&
        const andParts = this._splitTopLevel(expr, '&&');
        if (andParts.length > 1) {
            return andParts.every(p => this._evalExpr(p, v));
        }

        // range a..b
        const rangeMatch = expr.match(/^range\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
            const a = parseFloat(rangeMatch[1]);
            const b = parseFloat(rangeMatch[2]);
            return v >= Math.min(a, b) && v <= Math.max(a, b);
        }

        // Сравнение
        const cmpMatch = expr.match(/^(==|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
        if (cmpMatch) {
            const [, op, numStr] = cmpMatch;
            const num = parseFloat(numStr);
            switch (op) {
                case '==': return v === num;
                case '!=': return v !== num;
                case '>=': return v >= num;
                case '<=': return v <= num;
                case '>':  return v >  num;
                case '<':  return v <  num;
            }
        }

        // Одиночное число — трактуем как "== num"
        if (/^-?\d+(?:\.\d+)?$/.test(expr)) {
            return v === parseFloat(expr);
        }

        throw new Error(`неизвестный токен: "${expr}"`);
    }

    // Разбивает строку по sep, игнорируя вхождения внутри скобок
    _splitTopLevel(expr, sep) {
        const parts = [];
        let depth = 0;
        let start = 0;

        for (let i = 0; i < expr.length; i++) {
            const ch = expr[i];
            if (ch === '(') depth++;
            else if (ch === ')') depth--;

            if (depth === 0 && expr.startsWith(sep, i)) {
                parts.push(expr.slice(start, i));
                i += sep.length - 1;
                start = i + 1;
            }
        }

        if (parts.length === 0) return [expr];
        parts.push(expr.slice(start));
        return parts;
    }

    // --- ПРИМЕНЕНИЕ ЭФФЕКТОВ ---
    _applyEffects(effects, value) {
        if (!effects) return;
        
        // 1. Вращение
        if (effects.spin !== undefined) {
            this._applySpin(effects.spin);
        }
        
        // 2. Цвет
        if (effects.color !== undefined) {
            this._applyColorValue(effects.color);
        }
        
        // 3. Заполнение
        if (effects.fill !== undefined) {
            this._applyFill(effects.fill, value);
        }
        
        // 4. Прозрачность
        if (effects.opacity !== undefined) {
            this.el.style.opacity = effects.opacity;
        }
        
        // 5. Скрытие/показ
        if (effects.visible !== undefined) {
            this.el.style.display = effects.visible ? 'inline-flex' : 'none';
        }
        
        // 6. Поворот (угол в градусах, может быть числом или формулой)
        if (effects.rotate !== undefined) {
            let deg = effects.rotate;
            if (typeof deg === 'string') {
                try {
                    deg = new Function('value', `return ${deg};`)(value);
                } catch (e) {
                    console.warn(`Ошибка в формуле rotate: ${deg}`, e);
                    deg = 0;
                }
            }
            this.el.style.transform = `rotate(${deg}deg)`;
        }
        
        // 7. Масштаб
        if (effects.scale !== undefined) {
            this.el.style.transform = `scale(${effects.scale})`;
        }
    }

    // --- РЕАЛИЗАЦИЯ ЭФФЕКТОВ ---
    
    _applySpin(speed) {
        const SPIN_CLASSES = ['spinning', 'spin-slow', 'spin-fast', 'spin-pause', 'spin-reverse'];
        SPIN_CLASSES.forEach(cls => this.el.classList.remove(cls));
        
        if (speed === null || speed === false || speed === 'off') return;
        
        if (typeof speed === 'string') {
            const cls = {
                'slow': 'spin-slow',
                'fast': 'spin-fast',
                'pause': 'spin-pause',
                'reverse': 'spin-reverse',
                'normal': 'spinning'
            }[speed] || 'spinning';
            this.el.classList.add(cls);
        } else if (typeof speed === 'number') {
            this.el.classList.add('spinning');
            this.el.style.setProperty('--spin-duration', `${speed}s`);
        }
    }
    
    _applyColorValue(color) {
        if (color === null) {
            this.el.style.color = '';
            return;
        }
        this.el.style.color = color;
    }
    
    _applyFill(fillRule, value) {
        if (!this.svgRoot) return;
        
        const target = this.svgRoot.querySelector(fillRule.target);
        if (!target) {
            console.warn(`Цель для fill не найдена: ${fillRule.target}`);
            return;
        }
        
        const min = fillRule.min ?? 0;
        const max = fillRule.max ?? 100;
        const clamped = Math.max(min, Math.min(max, Number(value)));
        const t = (clamped - min) / (max - min);
        
        const prop = fillRule.property || 'height';
        
        if (prop === 'height') {
            if (!target.dataset.origHeight) {
                const bbox = target.getBBox();
                target.dataset.origHeight = bbox.height;
                target.dataset.origY = bbox.y;
            }
            const origH = parseFloat(target.dataset.origHeight);
            const origY = parseFloat(target.dataset.origY);
            const newH = origH * t;
            const newY = origY + (origH - newH);
            target.setAttribute('height', newH);
            target.setAttribute('y', newY);
        } else if (prop === 'width') {
            if (!target.dataset.origWidth) {
                target.dataset.origWidth = target.getBBox().width;
            }
            target.setAttribute('width', parseFloat(target.dataset.origWidth) * t);
        } else if (prop === 'opacity') {
            target.setAttribute('opacity', t);
        }
    }
}