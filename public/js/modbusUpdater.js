// public/js/modbusUpdater.js
import { api } from './apiClient.js';

export class ModbusUpdater {
    constructor() {
        this.caches = {
            spans: new Map(),
            inputs: new Map(),
            toggles: new Map()
        };
        this.sendingRegisters = new Set();
        this.editingInputs = new Set();
    }

    clearCaches() {
        this.caches.spans.clear();
        this.caches.inputs.clear();
        this.caches.toggles.clear();
    }

    _applyFormat(formatSpec, value, regType) {
        const specifier = formatSpec.slice(-1);
        const m = formatSpec.match(/^%([#0\- +])?(\d+)?(\.(\d+))?([diufegGc])$/);
        const width = m ? parseInt(m[2]) || 0 : 0;
        const prec = m ? parseInt(m[4]) : -1;

        let s;
        switch (specifier) {
            case 'f':
                s = value.toFixed(prec >= 0 ? prec : 2);
                break;
            case 'e':
                s = value.toExponential(prec >= 0 ? prec : 2);
                break;
            case 'E':
                s = value.toExponential(prec >= 0 ? prec : 2).toUpperCase();
                break;
            case 'g':
                s = prec >= 0 ? value.toPrecision(prec) : value.toPrecision(4);
                break;
            case 'G':
                s = (prec >= 0 ? value.toPrecision(prec) : value.toPrecision(4)).toUpperCase();
                break;
            case 'd': case 'i':
                s = String(Math.round(value));
                break;
            case 'u':
                s = String(Math.max(0, Math.round(value)));
                break;
            case 'c':
                s = String(value);
                break;
            default:
                s = String(value);
        }

        if (width > s.length) {
            const flag = m ? m[1] || '' : '';
            if (flag === '0' && !['x', 'X'].includes(specifier)) {
            s = s.padStart(width, '0');      // ← нули слева
        } else if (flag === '-') {
            s = s.padEnd(width, ' ');        // ← пробелы справа (влево!)
        } else {
            s = s.padStart(width, ' ');      // ← пробелы слева (вправо!)
        }
        }
        return s;
    }

    addSpan(regId, span, registerType, formatSpec) {
        const key = String(regId);
        if (!this.caches.spans.has(key)) {
            this.caches.spans.set(key, { registerType, spans: [] });
        }
        this.caches.spans.get(key).spans.push({ element: span, formatSpec });
    }

    addInput(regId, input, registerType) {
        const key = String(regId);
        this.caches.inputs.set(key, { registerType, element: input, originalValue: input.value });
    }

    updateOriginalValue(regId, value) {
        const key = String(regId);
        const entry = this.caches.inputs.get(key);
        if (entry) {
            entry.originalValue = String(value);
        }
    }

    isDirty(regId) {
        const key = String(regId);
        const entry = this.caches.inputs.get(key);
        if (!entry || !entry.element) return false;
        return entry.element.value !== entry.originalValue;
    }

    addToggle(regId, button, registerType) {
        const key = String(regId);
        if (!this.caches.toggles.has(key)) {
            this.caches.toggles.set(key, { registerType, toggles: [] });
        }
        this.caches.toggles.get(key).toggles.push(button);
    }

    getBytesCount(registerType) {
        return registerType === 'f4' ? 4 : 2;
    }

    readValue(dataView, offset, registerType) {
        try {
            switch (registerType) {
                case 'u2': return dataView.getUint16(offset, true);
                case 's2': return dataView.getInt16(offset, true);
                case 'f4': return dataView.getFloat32(offset, true);
                default:
                    if (registerType?.startsWith('b')) {
                        const bitIndex = parseInt(registerType.substring(1));
                        if (bitIndex >= 0 && bitIndex <= 15) {
                            return (dataView.getUint16(offset, true) >> bitIndex) & 1;
                        }
                    }
                    return undefined;
            }
        } catch (error) {
            console.error(`Ошибка чтения регистра:`, error);
            return undefined;
        }
    }

    async update() {
        try {
            const dataView = await api.readModbus();
            const bytesLength = dataView.byteLength;

            // --- ОБНОВЛЕНИЕ СПАНОВ ---
            for (const [regId, regInfo] of this.caches.spans) {
                const offset = parseInt(regId) * 2;
                const byteCount = this.getBytesCount(regInfo.registerType);

                if (offset + byteCount > bytesLength) {
                    console.warn(`Недостаточно данных для регистра ${regId}`);
                    continue;
                }

                const value = this.readValue(dataView, offset, regInfo.registerType);
                
                if (value !== undefined && !isNaN(value)) {
                    regInfo.spans.forEach(({ element, formatSpec }) => {
                        const displayValue = formatSpec
                            ? this._applyFormat(formatSpec, value, regInfo.registerType)
                            : String(value);
                        if (element.textContent !== displayValue) {
                            element.textContent = displayValue;
                        }
                    });
                }
            }

            // --- ОБНОВЛЕНИЕ TOGGLE КНОПОК ---
            for (const [regId, regInfo] of this.caches.toggles) {
                const offset = parseInt(regId) * 2;
                
                if (offset + 2 > bytesLength) {
                    console.warn(`Недостаточно данных для регистра ${regId}`);
                    continue;
                }

                const rawValue = dataView.getUint16(offset, true);

                regInfo.toggles.forEach(button => {
                    if (button.disabled) return;

                    const parentContent = button.closest('.content');
                    const buttonRegType = parentContent?.dataset?.type || 'b0';

                    if (buttonRegType?.startsWith('b')) {
                        const bitIndex = parseInt(buttonRegType.substring(1));
                        if (bitIndex >= 0 && bitIndex <= 15) {
                            const isOn = ((rawValue >> bitIndex) & 1) === 1;
                            button.classList.toggle('on', isOn);
                            button.classList.toggle('off', !isOn);
                            button.textContent = isOn ? 'Вкл' : 'Выкл';
                        }
                    }
                });
            }

            // --- ОБНОВЛЕНИЕ INPUTS ---
            for (const [regId, regInfo] of this.caches.inputs) {
                const regKey = String(regId);
                const input = regInfo.element;

                if (this.sendingRegisters.has(regKey) || 
                    this.editingInputs.has(regKey) ||
                    document.activeElement === input ||
                    input.value !== regInfo.originalValue) {
                    continue;
                }

                const offset = parseInt(regId) * 2;
                const byteCount = this.getBytesCount(regInfo.registerType);

                if (offset + byteCount > bytesLength) {
                    console.warn(`Недостаточно данных для регистра ${regId}`);
                    continue;
                }

                const value = this.readValue(dataView, offset, regInfo.registerType);

                if (value !== undefined && !isNaN(value) && input) {
                    const displayValue = regInfo.registerType === 'f4' 
                        ? value.toFixed(2) 
                        : value;
                    
                    if (input.value !== String(displayValue)) {
                        input.value = displayValue;
                        regInfo.originalValue = String(displayValue);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Ошибка опроса Modbus:', error);
            throw error;
        }
    }

    async updateSingleInput(regId) {
        try {
            const regKey = String(regId);
            const regInfo = this.caches.inputs.get(regKey);
            
            if (!regInfo || !regInfo.element) {
                console.warn(`Input для регистра ${regId} не найден`);
                return;
            }

            const dataView = await api.readModbus();
            const bytesLength = dataView.byteLength;
            
            const offset = parseInt(regId) * 2;
            const byteCount = this.getBytesCount(regInfo.registerType);

            if (offset + byteCount > bytesLength) {
                console.warn(`Недостаточно данных для регистра ${regId}`);
                return;
            }

            const value = this.readValue(dataView, offset, regInfo.registerType);

            if (value !== undefined && !isNaN(value) && regInfo.element) {
                const displayValue = regInfo.registerType === 'f4' 
                    ? value.toFixed(2) 
                    : value;
                
                if (regInfo.element.value !== String(displayValue)) {
                    regInfo.element.value = displayValue;
                    regInfo.originalValue = String(displayValue);
                }
            }
        } catch (error) {
            console.error(`Ошибка обновления input ${regId}:`, error);
        }
    }

    markAsSending(regId) {
        this.sendingRegisters.add(String(regId));
    }

    unmarkAsSending(regId) {
        this.sendingRegisters.delete(String(regId));
    }

    isSending(regId) {
        return this.sendingRegisters.has(String(regId));
    }
}

// ✅ ЭКСПОРТИРУЕМ ЭКЗЕМПЛЯР
export const modbusUpdater = new ModbusUpdater();