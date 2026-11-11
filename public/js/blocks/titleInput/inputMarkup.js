// public/js/blocks/titleInput/inputMarkup.js

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function inputMarkup(cfg) {
    const {
        prefix, postfix, regAddress, regType,
        text, width, min, max, decimalPlaces, showSaveButton
    } = cfg;

    const titleHtml = text
        ? `<span class="title">${esc(text)}</span>`
        : '';

    const saveHtml = showSaveButton
        ? `<button class="input-save" data-reg="${esc(regAddress)}" data-type="${esc(regType)}">💾</button>`
        : '';

    return `
        ${titleHtml}
        <div class="value">
            <span class="prefix">${esc(prefix)}</span>
            <input
                type="text"
                class="input"
                data-reg="${esc(regAddress)}"
                data-type="${esc(regType)}"
                data-min="${esc(min !== null ? min : '')}"
                data-max="${esc(max !== null ? max : '')}"
                data-decimal-places="${esc(decimalPlaces)}"
                style="width: ${Number(width) || 0}px;"
            >
            <button class="input-reset" data-reg="${esc(regAddress)}" title="Сбросить">×</button>
            <span class="postfix">${esc(postfix)}</span>
            ${saveHtml}
        </div>`;
}