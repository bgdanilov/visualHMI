// public/js/utils/parseInputConfig.js
import { parseBlockFormat } from './format.js';

const DEFAULT_DECIMAL_PLACES = 3;

/**
 * Разбирает data блока title-input в нормализованный конфиг.
 * Не трогает DOM, не читает ничего внешнего — чистая функция.
 *
 * @param {Object} data — объект блока из blocksData.json
 * @returns {{
 *   prefix: string,
 *   postfix: string,
 *   regAddress: number|string|undefined,
 *   regType: string,
 *   text: string,
 *   size: number,
 *   min: number|null,
 *   max: number|null,
 *   decimalPlaces: number,
 *   showSaveButton: boolean,
 *   isFloatType: boolean,
 *   width: number
 * }}
 */
export function parseInputConfig(data = {}) {
    let prefix, postfix, regAddress, regType;

    if (data.format) {
        const p = parseBlockFormat(data.format[0], data.format[1]);
        prefix    = p.formatPrefix;
        postfix   = p.formatPostfix;
        regAddress = p.regAddress;
        regType    = p.regType;
    } else {
        prefix    = data.prefix || '';
        postfix   = data.postfix || '';
        regAddress = data.regAddress;
        regType    = data.regType || 'u2';
    }

    const text           = data.text || '';
    const size           = data.size || 10;
    const min            = data.min !== undefined ? data.min : null;
    const max            = data.max !== undefined ? data.max : null;
    const decimalPlaces  = data.decimalPlaces !== undefined
        ? data.decimalPlaces
        : DEFAULT_DECIMAL_PLACES;
    const showSaveButton = data.showSaveButton || false;
    const isFloatType    = regType === 'f4';
    const width          = size * 12 + 10;

    return {
        prefix,
        postfix,
        regAddress,
        regType,
        text,
        size,
        min,
        max,
        decimalPlaces,
        showSaveButton,
        isFloatType,
        width
    };
}