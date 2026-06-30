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

    addSpan(regId, span, registerType) {
        const key = String(regId);
        if (!this.caches.spans.has(key)) {
            this.caches.spans.set(key, { registerType, spans: [] });
        }
        this.caches.spans.get(key).spans.push(span);
    }

    addInput(regId, input, registerType) {
        const key = String(regId);
        this.caches.inputs.set(key, { registerType, element: input });
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
                    const displayValue = regInfo.registerType === 'f4' 
                        ? value.toFixed(2) 
                        : value;
                    regInfo.spans.forEach(span => {
                        if (span.textContent !== String(displayValue)) {
                            span.textContent = displayValue;
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
                    document.activeElement === input) {
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
                    }
                }
            }

        } catch (error) {
            console.error('❌ Ошибка опроса Modbus:', error);
            throw error;
        }
    }

    // Добавляем метод для принудительного обновления конкретного input
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
                console.log(`🔄 Обновлен input ${regId}: ${displayValue}`);
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