// public/js/validator.js

export class Validator {
    /**
     * Валидация значения с возможностью округления
     * @param {string|number} value - Проверяемое значение
     * @param {Object} options - Опции валидации
     * @param {number|null} options.min - Минимальное значение
     * @param {number|null} options.max - Максимальное значение
     * @param {number|null} options.decimalPlaces - Количество знаков после запятой (null - без округления)
     * @param {boolean} options.allowEmpty - Разрешать пустое значение
     * @returns {Object} Результат валидации
     */
     validate(value, options = {}) {
        const { 
            min = null, 
            max = null, 
            decimalPlaces = null,
            allowEmpty = false,
            registerType = null  // 🔥 Добавляем тип регистра
        } = options;

        // Проверка на пустое значение
        if (value === '' || value === null || value === undefined) {
            if (allowEmpty) {
                return { valid: true, value: '', normalized: '' };
            }
            return { valid: false, error: 'Пустое значение' };
        }

        const strValue = String(value).trim();
        if (strValue === '') {
            if (allowEmpty) {
                return { valid: true, value: '', normalized: '' };
            }
            return { valid: false, error: 'Пустое значение' };
        }

        const num = parseFloat(strValue);
        if (isNaN(num)) {
            return { valid: false, error: `Некорректное число: "${strValue}"` };
        }

        let normalized = num;

        // 🔥 Округляем только для float (f4)
        const isFloat = registerType === 'f4';
        if (isFloat && decimalPlaces !== null && !isNaN(decimalPlaces) && decimalPlaces >= 0) {
            normalized = parseFloat(num.toFixed(decimalPlaces));
        }

        // Корректировка -0 в 0
        if (normalized === 0 || Object.is(normalized, -0)) {
            normalized = 0;
        }

        // Проверка минимума
        if (min !== null && !isNaN(min) && normalized < min) {
            return { 
                valid: false, 
                error: `Значение меньше минимума (${min})`,
                value: strValue,
                normalized: String(min)
            };
        }

        // Проверка максимума
        if (max !== null && !isNaN(max) && normalized > max) {
            return { 
                valid: false, 
                error: `Значение больше максимума (${max})`,
                value: strValue,
                normalized: String(max)
            };
        }

        const wasRounded = decimalPlaces !== null && 
                          !isNaN(decimalPlaces) && 
                          num !== normalized;

        return {
            valid: true,
            value: strValue,
            normalized: String(normalized),
            originalValue: num,
            roundedValue: normalized,
            wasRounded: wasRounded,
            decimalPlaces: decimalPlaces
        };
    }

    /**
     * Валидация с автоматической коррекцией
     */
    validateWithCorrection(value, options = {}) {
        const result = this.validate(value, options);
        
        if (!result.valid && result.normalized) {
            return {
                valid: true,
                value: String(value),
                normalized: result.normalized,
                corrected: true,
                originalValue: result.originalValue,
                roundedValue: result.roundedValue,
                wasRounded: result.wasRounded || false
            };
        }
        
        return result;
    }

    /**
     * Форматирование числа с заданным количеством знаков
     * Возвращает СТРОКУ
     */
    formatNumber(value, decimalPlaces = null) {
        if (value === '' || value === null || value === undefined) return '';
        
        const num = parseFloat(value);
        if (isNaN(num)) return String(value);
        
        if (decimalPlaces !== null && !isNaN(decimalPlaces) && decimalPlaces >= 0) {
            return num.toFixed(decimalPlaces);
        }
        
        return String(num);
    }

    /**
     * Проверка количества знаков после запятой
     */
    getDecimalCount(value) {
        const str = String(value);
        if (!str.includes('.')) return 0;
        return str.split('.')[1].length;
    }
}

export const validator = new Validator();