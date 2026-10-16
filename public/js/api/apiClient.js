// public/js/api/apiClient.js
import { CONFIG } from '../constants.js';

class ApiClient {
    constructor() {
        this.baseUrl = '';
        this.timeout = CONFIG.API_TIMEOUT_MS;
    }

    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания');
            }
            throw error;
        }
    }

    async loadConfig(fileName) {
        const response = await this._fetchWithTimeout(
            `/api/loadConfig?file=${encodeURIComponent(fileName)}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }

    async loadStaticJSON(fileName) {
        const response = await this._fetchWithTimeout(`/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }

    async readModbus() {
        const response = await this._fetchWithTimeout('/api/modbus');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const bytes = new Uint8Array(await response.arrayBuffer());
        return new DataView(bytes.buffer);
    }

    // 🔥 БЕЗ ОКРУГЛЕНИЯ - просто отправляем то, что пришло
    async writeRegister(regId, value, registerType = 'u2') {
        // Преобразуем в число, если нужно
        let numericValue;
        if (registerType === 'f4' || registerType === 'u2' || registerType === 's2') {
            numericValue = parseFloat(value);
            if (isNaN(numericValue)) {
                throw new Error(`Некорректное значение: ${value}. Ожидается число.`);
            }
        } else if (registerType.startsWith('b')) {
            numericValue = parseInt(value);
            if (![0, 1].includes(numericValue)) {
                throw new Error(`Для битового регистра допустимы только 0 или 1`);
            }
        } else {
            numericValue = value;
        }

        console.log(`📤 Отправка регистра ${regId}:`, { 
            значение: numericValue, 
            тип: registerType 
        });

        const response = await this._fetchWithTimeout(`/api/registers/${regId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                state: numericValue, 
                registerType 
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async writeMultipleRegisters(registers) {
        const promises = registers.map(({ regId, value, type }) => 
            this.writeRegister(regId, value, type)
        );
        return Promise.all(promises);
    }
}

export const api = new ApiClient();