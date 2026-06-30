// server/registerUtils.js
const BYTES_PER_REGISTER = 2;
const START_REGISTER = 0;

const registerHandlers = {
    u2: {
        read: (buffer, offset) => buffer.readUInt16LE(offset),
        write: (buffer, offset, value) => buffer.writeUInt16LE(value, offset),
        validate: (value) => value >= 0 && value <= 65535
    },
    s2: {
        read: (buffer, offset) => buffer.readInt16LE(offset),
        write: (buffer, offset, value) => buffer.writeInt16LE(value, offset),
        validate: (value) => value >= -32768 && value <= 32767
    },
    f4: {
        read: (buffer, offset) => buffer.readFloatLE(offset),
        write: (buffer, offset, value) => buffer.writeFloatLE(value, offset),
        validate: () => true
    }
};

function getRegisterType(type) {
    if (type && type.startsWith('b')) {
        return { type: 'bit', bitIndex: parseInt(type.substring(1)) };
    }
    return { type: type || 'u2', bitIndex: null };
}

function readRegister(buffer, regId, registerType = 'u2') {
    const offset = (regId - START_REGISTER) * BYTES_PER_REGISTER;
    const { type, bitIndex } = getRegisterType(registerType);
    
    if (type === 'bit') {
        const value = buffer.readUInt16LE(offset);
        return (value >> bitIndex) & 1;
    }
    
    const handler = registerHandlers[type];
    if (!handler) throw new Error(`Неизвестный тип: ${type}`);
    return handler.read(buffer, offset);
}

function writeRegister(buffer, regId, value, registerType = 'u2') {
    const offset = (regId - START_REGISTER) * BYTES_PER_REGISTER;
    const { type, bitIndex } = getRegisterType(registerType);
    
    if (type === 'bit') {
        const current = buffer.readUInt16LE(offset);
        const newValue = value === 1 
            ? current | (1 << bitIndex)
            : current & ~(1 << bitIndex);
        buffer.writeUInt16LE(newValue, offset);
        return;
    }
    
    const handler = registerHandlers[type];
    if (!handler) throw new Error(`Неизвестный тип: ${type}`);
    if (!handler.validate(value)) {
        throw new Error(`Значение вне диапазона для ${type}`);
    }
    handler.write(buffer, offset, value);
}

function validateRegister(regId, bufferLength) {
    const offset = (regId - START_REGISTER) * BYTES_PER_REGISTER;
    if (offset < 0 || offset + BYTES_PER_REGISTER > bufferLength) {
        throw new Error(`Регистр ${regId} вне допустимого диапазона`);
    }
    return offset;
}

module.exports = {
    readRegister,
    writeRegister,
    validateRegister,
    BYTES_PER_REGISTER,
    START_REGISTER
};