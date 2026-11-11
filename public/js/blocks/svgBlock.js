// public/js/blocks/svgBlock.js
import { BaseBlock } from './baseBlock.js';
import { modbusUpdater } from '../core/modbusUpdater.js';

export class SvgBlock extends BaseBlock {
    render() {
        const root = this.makeRoot(['svg-block']);
        this.el = root;
        this.svgRoot = null;

        const { src, width = 50, height = 50 } = this.data;

        root.style.width = `${width}px`;
        root.style.height = `${height}px`;
        root.style.display = 'inline-flex';
        root.style.alignItems = 'center';
        root.style.justifyContent = 'center';
        root.style.transition = 'color 0.3s ease, opacity 0.3s ease, transform 0.3s ease';
        root.style.overflow = 'hidden'; // Оставляем, чтобы ничего не вылезало
        
        if (typeof src !== 'string' || !src.startsWith('/')) {
            root.innerHTML = `<span style="color:#e74c3c; font-size:12px;">⚠️ Bad SVG src</span>`;
            this.el = root;
            return root;
        }

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
                    this.svgRoot.setAttribute('fill', 'currentColor');
                }
                
                this._registerRules();
                this._initRules();
            })
            .catch(err => {
                console.error(`Ошибка загрузки SVG ${src}:`, err);
                root.innerHTML = `<span style="color:#e74c3c; font-size:12px; text-align:center;">⚠️ SVG Error</span>`;
            });

        return root;
    }

    _registerRules() {
        if (!this.data.rules) return;
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
        const seen = new Set();
        this.data.rules.forEach(rule => {
            if (seen.has(rule.reg)) return;
            seen.add(rule.reg);
            this.updateByReg(rule.reg, 0);
        });
    }

    // --- ГЛАВНЫЙ МЕТОД ОБНОВЛЕНИЯ ---
    updateByReg(regKey, value) {
        if (!this.data.rules) return;

        const rules = this.data.rules.filter(r => r.reg === regKey);
        if (!rules.length) return;

        // Защита от повторного сброса анимации при каждом опросе Modbus
        if (!this._lastValues) this._lastValues = {};
        const lastValue = this._lastValues[regKey];
        if (lastValue === value) return;
        this._lastValues[regKey] = value;

        rules.forEach(rule => {
            if (this._evaluate(rule.if, value)) {
                this._applyEffects(rule.then, value);
            }
        });
    }

    // --- ВЫЧИСЛЕНИЕ УСЛОВИЯ ---
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

        const orParts = this._splitTopLevel(expr, '||');
        if (orParts.length > 1) return orParts.some(p => this._evalExpr(p, v));

        const andParts = this._splitTopLevel(expr, '&&');
        if (andParts.length > 1) return andParts.every(p => this._evalExpr(p, v));

        const rangeMatch = expr.match(/^range\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
            const a = parseFloat(rangeMatch[1]);
            const b = parseFloat(rangeMatch[2]);
            return v >= Math.min(a, b) && v <= Math.max(a, b);
        }

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

        if (/^-?\d+(?:\.\d+)?$/.test(expr)) return v === parseFloat(expr);

        throw new Error(`неизвестный токен: "${expr}"`);
    }

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
        
        // Ищем цель (target), если она есть
        const target = effects.target && this.svgRoot 
            ? this.svgRoot.querySelector(effects.target) 
            : null;
        
        // ЦВЕТ: если указан target — красим только его, иначе весь блок
        if (effects.color !== undefined) {
            const colorEl = target || this.el;
            if (effects.color === null) colorEl.style.color = '';
            else colorEl.style.color = effects.color;
        }
        
        // Для анимаций цель ищется так же
        const animEl = target || this.el;
        
        // Вращение
        if (effects.spin !== undefined) {
            this._applySpin(effects.spin, animEl);
        }
        
        // Пульсация
        if ('pulse' in effects) {
            this._applyPulse(effects.pulse, animEl);
        }
        
        // Прозрачность (оставим на весь блок)
        if (effects.opacity !== undefined) {
            this.el.style.opacity = effects.opacity;
        }
        
        // Скрытие/показ (оставим на весь блок)
        if (effects.visible !== undefined) {
            this.el.style.display = effects.visible ? 'inline-flex' : 'none';
        }
    }

    _applySpin(speed, el = this.el) {
        const SPIN_CLASSES = ['spinning', 'spin-slow', 'spin-fast', 'spin-pause', 'spin-reverse'];
        SPIN_CLASSES.forEach(cls => el.classList.remove(cls));

        if (speed === null || speed === false || speed === 'off') return;

        if (typeof speed === 'string') {
            const cls = {
                'slow': 'spin-slow', 'fast': 'spin-fast', 'pause': 'spin-pause',
                'reverse': 'spin-reverse', 'normal': 'spinning'
            }[speed] || 'spinning';
            el.classList.add(cls);
        } else if (typeof speed === 'number') {
            el.classList.add('spinning');
            el.style.setProperty('--spin-duration', `${speed}s`);
        }
    }

    _applyPulse(speed, el = this.el) {
        const PULSE_CLASSES = ['pulsing', 'pulse-slow', 'pulse-fast'];
        PULSE_CLASSES.forEach(cls => el.classList.remove(cls));

        if (speed === null || speed === undefined || speed === false || speed === 'off' || speed === 0) return;

        if (typeof speed === 'string') {
            const cls = { slow: 'pulse-slow', fast: 'pulse-fast', normal: 'pulsing' }[speed] || 'pulsing';
            el.classList.add(cls);
        } else if (typeof speed === 'number') {
            el.classList.add('pulsing');
            el.style.setProperty('--pulse-duration', `${speed}s`);
        }
    }
}