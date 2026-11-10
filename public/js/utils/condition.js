// public/js/utils/condition.js

/**
 * Парсер строковых условий для SVG-правил, node-card onCondition/states.
 *
 * Поддерживает:
 *   "== 1"  "!= 0"  "> 0"  "< 10"  ">= 2.5"  "<= 100"
 *   "range 1..5"
 *   "== 1 || > 10"
 *   "> 0 && < 100"
 *   "(== 1 || == 2) && > 0"
 *   "3"   — просто число (равно)
 *   ""    — всегда true (fallback-правило)
 *
 * @param {string} expr  — условие из JSON
 * @param {number} value — значение регистра
 * @returns {boolean}
 */
 export function evalCondition(expr, value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return false;

    const s = String(expr ?? '').trim();
    if (!s) return true;

    // Снять внешние скобки, если они покрывают всё выражение
    if (s.startsWith('(') && s.endsWith(')')) {
        let depth = 0;
        let coversAll = true;
        for (let i = 0; i < s.length; i++) {
            if (s[i] === '(') depth++;
            else if (s[i] === ')') depth--;
            if (depth === 0 && i < s.length - 1) { coversAll = false; break; }
        }
        if (coversAll) return evalCondition(s.slice(1, -1), v);
    }

    // ИЛИ
    const orParts = splitTopLevel(s, '||');
    if (orParts.length > 1) return orParts.some(p => evalCondition(p, v));

    // И
    const andParts = splitTopLevel(s, '&&');
    if (andParts.length > 1) return andParts.every(p => evalCondition(p, v));

    // range a..b
    const range = s.match(/^range\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)$/);
    if (range) {
        const a = parseFloat(range[1]);
        const b = parseFloat(range[2]);
        return v >= Math.min(a, b) && v <= Math.max(a, b);
    }

    // Сравнения: == != > < >= <=
    const cmp = s.match(/^(==|!=|>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)$/);
    if (cmp) {
        const [, op, numStr] = cmp;
        const n = parseFloat(numStr);
        switch (op) {
            case '==': return v === n;
            case '!=': return v !== n;
            case '>=': return v >= n;
            case '<=': return v <= n;
            case '>':  return v >  n;
            case '<':  return v <  n;
        }
    }

    // Просто число — «равно»
    if (/^-?\d+(?:\.\d+)?$/.test(s)) return v === parseFloat(s);

    console.warn(`evalCondition: неизвестное выражение "${expr}"`);
    return false;
}

/**
 * Разбивает выражение по разделителю верхнего уровня (не внутри скобок).
 * @param {string} expr
 * @param {string} sep
 * @returns {string[]}
 */
function splitTopLevel(expr, sep) {
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