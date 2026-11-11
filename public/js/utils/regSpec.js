// public/js/utils/regSpec.js

/**
 * Парсит спецификацию регистра: "9:u2", "20:b0", "16" (число или строка).
 * Возвращает { regId: number, regType: string }.
 * Если тип не указан — берётся defaultType.
 *
 * @param {number|string} spec
 * @param {string} [defaultType='u2']
 * @returns {{ regId: number, regType: string }}
 */
 export function parseRegSpec(spec, defaultType = 'u2') {
    if (typeof spec === 'number') {
        return { regId: spec, regType: defaultType };
    }
    const s = String(spec);
    if (s.includes(':')) {
        const [addr, type] = s.split(':');
        return { regId: parseInt(addr, 10), regType: type || defaultType };
    }
    return { regId: parseInt(s, 10), regType: defaultType };
}