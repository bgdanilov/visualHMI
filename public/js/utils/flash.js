// public/js/utils/flash.js

/**
 * Кратковременно подсвечивает элемент (фон + рамка), потом возвращает как было.
 * Если элемент уже удалён из DOM — тихо выходит.
 *
 * @param {HTMLElement} el
 * @param {'success'|'error'} kind
 * @param {number} [ms] — длительность подсветки. По умолчанию 1000/2000.
 */
 export function flash(el, kind, ms) {
    if (!el || !document.body.contains(el)) return;

    const isSuccess = kind === 'success';
    el.style.backgroundColor = isSuccess ? '#e8f5e9' : '#ffebee';
    el.style.borderColor     = isSuccess ? 'green'   : 'red';

    const duration = ms ?? (isSuccess ? 1000 : 2000);
    setTimeout(() => {
        if (!document.body.contains(el)) return;
        el.style.backgroundColor = '';
        el.style.borderColor = '#ccc';
    }, duration);
}