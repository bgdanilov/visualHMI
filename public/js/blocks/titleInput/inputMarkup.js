// public/js/blocks/titleInput/inputMarkup.js

/**
 * Возвращает HTML-строку для title-input.
 * Ничего не создаёт в DOM, не подписывается на события.
 *
 * @param {ReturnType<import('../../utils/parseInputConfig.js').parseInputConfig>} cfg
 * @returns {string}
 */
 export function inputMarkup(cfg) {
    const {
        prefix, postfix, regAddress, regType,
        text, width, min, max, decimalPlaces, showSaveButton
    } = cfg;

    const titleHtml = text
        ? `<span class="title">${text}</span>`
        : '';

    const saveHtml = showSaveButton
        ? `<button class="input-save" data-reg="${regAddress}" data-type="${regType}">💾</button>`
        : '';

    return `
        ${titleHtml}
        <div class="value">
            <span class="prefix">${prefix}</span>
            <input
                type="text"
                class="input"
                data-reg="${regAddress}"
                data-type="${regType}"
                data-min="${min !== null ? min : ''}"
                data-max="${max !== null ? max : ''}"
                data-decimal-places="${decimalPlaces}"
                style="width: ${width}px;"
            >
            <button class="input-reset" data-reg="${regAddress}" title="Сбросить">×</button>
            <span class="postfix">${postfix}</span>
            ${saveHtml}
        </div>`;
}