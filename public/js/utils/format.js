// public/js/utils/format.js

/**
 * Парсит строку формата вида "%2.2f" и спецификацию регистра "20:b0".
 * Возвращает { regAddress, regType, formatPrefix, formatPostfix, formatSpec }.
 */
 export function parseBlockFormat(formatString, regSpec) {
    let i = 0;
    let formatPrefix = '';
    let formatSpec = null;
    let formatPostfix = '';

    while (i < formatString.length) {
        if (formatString[i] === '%') {
            if (i + 1 < formatString.length && formatString[i + 1] === '%') {
                formatPrefix += '%';
                i += 2;
                continue;
            }
            const start = i;
            i++;
            while (i < formatString.length && /[#0\- +]/.test(formatString[i])) i++;
            while (i < formatString.length && /\d/.test(formatString[i])) i++;
            if (i < formatString.length && formatString[i] === '.') {
                i++;
                while (i < formatString.length && /\d/.test(formatString[i])) i++;
            }
            if (i < formatString.length && /[diufegGcxX]/.test(formatString[i])) {
                formatSpec = formatString.slice(start, i + 1);
                i++;
            }
            formatPostfix = formatString.slice(i);
            break;
        }
        formatPrefix += formatString[i];
        i++;
    }

    formatPrefix = formatPrefix.trimEnd();
    formatPostfix = formatPostfix.trimStart();

    let regAddress;
    let regType;
    if (typeof regSpec === 'string' && regSpec.includes(':')) {
        const parts = regSpec.split(':');
        regAddress = parseInt(parts[0]);
        regType = parts[1];
    } else {
        regAddress = parseInt(regSpec);
        const last = formatSpec ? formatSpec.slice(-1) : '';
        regType = ({
            f: 'f4', e: 'f4', E: 'f4', g: 'f4', G: 'f4',
            c: 'b0', d: 's2', i: 's2',
            u: 'u2', x: 'u2', X: 'u2', o: 'u2'
        })[last] || 'u2';
    }

    return { regAddress, regType, formatPrefix, formatPostfix, formatSpec };
}

/**
 * Применяет printf-подобный формат к числу.
 * Поведение 1:1 как в modbusUpdater._applyFormat.
 */
export function applyFormat(formatSpec, value /*, regType */) {
    const specifier = formatSpec.slice(-1);
    const m = formatSpec.match(/^%([#0\- +])?(\d+)?(\.(\d+))?([diufegGc])$/);
    const width = m ? parseInt(m[2]) || 0 : 0;
    const prec = m ? parseInt(m[4]) : -1;

    let s;
    switch (specifier) {
        case 'f': s = value.toFixed(prec >= 0 ? prec : 2); break;
        case 'e': s = value.toExponential(prec >= 0 ? prec : 2); break;
        case 'E': s = value.toExponential(prec >= 0 ? prec : 2).toUpperCase(); break;
        case 'g': s = prec >= 0 ? value.toPrecision(prec) : value.toPrecision(4); break;
        case 'G': s = (prec >= 0 ? value.toPrecision(prec) : value.toPrecision(4)).toUpperCase(); break;
        case 'd':
        case 'i': s = String(Math.round(value)); break;
        case 'u': s = String(Math.max(0, Math.round(value))); break;
        case 'c': s = String(value); break;
        default:  s = String(value);
    }

    if (width > s.length) {
        const flag = m ? m[1] || '' : '';
        if (flag === '0' && !['x', 'X'].includes(specifier)) {
            s = s.padStart(width, '0');
        } else if (flag === '-') {
            s = s.padEnd(width, ' ');
        } else {
            s = s.padStart(width, ' ');
        }
    }
    return s;
}