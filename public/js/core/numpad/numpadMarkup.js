// public/js/core/numpad/numpadMarkup.js

/**
 * HTML-строка для numpad. Классы — из style.css (секция NUMPAD).
 * Никаких инлайн-стилей — всё в CSS.
 */
 export function numpadMarkup() {
    return `
        <div class="numpad">
            <div class="numpad-range-info" data-role="range-info"></div>
            <div class="numpad-display" data-role="display">0</div>
            <div class="numpad-limit-info" data-role="limit-info"></div>
            <div class="numpad-grid" data-role="grid"></div>
            <div class="numpad-actions">
                <button class="numpad-btn numpad-btn-ok"     data-role="ok">OK</button>
                <button class="numpad-btn numpad-btn-cancel" data-role="cancel">Cancel</button>
            </div>
        </div>`;
}

/** Кнопки цифровой клавиатуры в порядке сетки 4×3 + ⌫ + +/- */
export const NUMPAD_KEYS = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    '.', '0', '⌫',
    '+/-'
];