// server/modbusService.js
const { readRegister, writeRegister, validateRegister, BYTES_PER_REGISTER } = require('./registerUtils');

class ModbusService {
    constructor() {
        this.source = null;
        this.isInitialized = false;
        this.totalRegisters = 4096;
        this.totalBytes = this.totalRegisters * BYTES_PER_REGISTER;
        this.startRegister = 0;
        this.mappedMemory = null;
        this.testBuffer = null;
        this.bufferName = null;
    }

    initialize() {
        try {
            const addon = require('../build/Release/modbus_mmap');
            this.mappedMemory = this._initMmap(addon);
            this.source = this.mappedMemory;
            this.bufferName = 'mapped_memory';
            console.log('✅ Используется mapped_memory (реальное устройство)');
        } catch (error) {
            console.log('⚠️ Ошибка mmap, используем testBuffer');
            this.testBuffer = this._initTestBuffer();
            this.source = this.testBuffer;
            this.bufferName = 'testBuffer';
            console.log('✅ Используется testBuffer (тестовый режим)');
        }
        
        this.isInitialized = true;
        console.log(`✅ Modbus сервис инициализирован (${this.bufferName})`);
        return this.isInitialized;
    }

    _initMmap(addon) {
        try {
            const buffer = addon.mmapDevice('/dev/modbus_rtu');
            if (buffer.length < this.totalBytes) {
                throw new Error(`Буфер слишком мал: ${buffer.length} < ${this.totalBytes}`);
            }
            return buffer.subarray(this.startRegister);
        } catch (err) {
            console.error('Ошибка инициализации mmap:', err.message);
            throw err;
        }
    }

    _initTestBuffer() {
        const buffer = Buffer.alloc(this.totalBytes);
        // Заполняем тестовыми данными
        const testData = [
            0, 0, 0, 0,    // 0-3: float 0
            0, 0, 184, 64, // 4-7: float 6.0
        ];
        
        for (let i = 0; i < Math.min(testData.length, this.totalBytes); i++) {
            buffer.writeUInt8(testData[i] || 0, i);
        }
        
        return buffer;
    }

    getData() {
        if (!this.isInitialized || !this.source) {
            throw new Error('Данные не инициализированы');
        }
        return this.source.subarray(0);
    }

    getBufferName() {
        return this.bufferName;
    }

    readRegister(regId, type = 'u2') {
        if (!this.isInitialized) {
            throw new Error('Сервис не инициализирован');
        }
        const offset = validateRegister(regId, this.source.length);
        return readRegister(this.source, regId, type);
    }

    writeRegister(regId, value, type = 'u2') {
        if (!this.isInitialized) {
            throw new Error('Сервис не инициализирован');
        }
        validateRegister(regId, this.source.length);
        writeRegister(this.source, regId, value, type);
    }
}

module.exports = new ModbusService();