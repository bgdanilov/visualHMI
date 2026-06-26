//console.log = function () { };
const addon = require('./build/Release/modbus_mmap');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 4000;

const numRegistersToRead = 4096;
const bytesPerRegister = 2;
const startRegisterNumber = 0;
const totalBytes = numRegistersToRead * bytesPerRegister;

let mapped_memory = null;
let testBuffer = null;
let isDataInitialized = false;
let source = null;

// 1. Статические файлы и middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Функции инициализации ---
function initializeDataSourcesAndParams() {
    console.log("Начинается инициализация данных и параметров...");

    if (testBuffer) {
        source = testBuffer;
        console.log("Используется testBuffer.");
        return true;
    } else if (mapped_memory) {
        source = mapped_memory;
        console.log("Используется mapped_memory.");
        return true;
    } else {
        console.error("Ошибка: Источник данных не определен.");
        return false;
    }
}

function bufferInit() {
    const bufferSize = numRegistersToRead * bytesPerRegister;
    const buffer = Buffer.alloc(bufferSize);
    
    // Тестовые данные
    const testValues = [0, 0, 184, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < testValues.length && i < bufferSize; i++) {
        buffer.writeUInt8(testValues[i], i);
    }
    
    return buffer;
}

function mmapInit() {
    try {
        const buffer = addon.mmapDevice('/dev/modbus_rtu');
        console.log('Успех! Размер буфера:', buffer.length);
        
        if (buffer.length < totalBytes) {
            throw new Error(`Буфер слишком мал: ${buffer.length} < ${totalBytes}`);
        }
        
        mapped_memory = buffer.subarray(startRegisterNumber);
        return mapped_memory;
        
    } catch (err) {
        console.error('Ошибка инициализации mmap:', err.message);
        throw err;
    }
}

function getActiveBuffer() {
    if (testBuffer) {
        return { buffer: testBuffer, name: 'testBuffer' };
    } else if (mapped_memory) {
        return { buffer: mapped_memory, name: 'mapped_memory' };
    }
    return { buffer: null, name: null };
}

// --- API Маршруты ---

// Получение сырых данных
app.get('/api/modbus', (req, res) => {
    if (!isDataInitialized) {
        console.error("Попытка запроса, когда данные не инициализированы.");
        return res.status(500).json({ error: "Серверные данные не были инициализированы." });
    }

    try {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(source.subarray(0));
    } catch (error) {
        console.error(`Ошибка обработки данных: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Загрузка конфигурации
app.get('/api/loadConfig', (req, res) => {
    const configFileName = req.query.file;
    if (!configFileName) {
        return res.status(400).json({ error: 'Не указан параметр file' });
    }
    
    const configFilePath = path.join(__dirname, 'public', configFileName);
    const normalizedConfigFilePath = path.normalize(configFilePath);
    const publicDir = path.normalize(path.join(__dirname, 'public'));

    if (!normalizedConfigFilePath.startsWith(publicDir)) {
        console.warn(`Попытка загрузить файл вне разрешенной директории: ${configFileName}`);
        return res.status(400).json({ error: 'Запрос недопустимого файла' });
    }

    fs.readFile(normalizedConfigFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Ошибка при чтении файла конфигурации:`, err);
            const statusCode = err.code === 'ENOENT' ? 404 : 500;
            return res.status(statusCode).json({ error: `Ошибка загрузки конфигурации: ${err.message}` });
        }

        try {
            const config = JSON.parse(data);
            res.json(config);
        } catch (parseError) {
            console.error(`Ошибка при парсинге JSON:`, parseError);
            res.status(500).json({ error: 'Неверный формат JSON в файле конфигурации' });
        }
    });
});

// Запись в регистр
app.post('/api/registers/:regId', (req, res) => {
    const regId = parseInt(req.params.regId);
    const newState = req.body.state;
    const registerType = req.body.registerType || 'u2';

    if (isNaN(regId) || newState === undefined) {
        return res.status(400).json({ 
            error: "Необходимо указать номер регистра в URL и поле 'state' в теле запроса." 
        });
    }

    const { buffer, name: bufferName } = getActiveBuffer();
    
    if (!buffer) {
        console.error("Ошибка: Нет доступного буфера для записи.");
        return res.status(500).json({ error: "Нет доступного буфера для записи." });
    }

    try {    
        const registerIndex = regId - startRegisterNumber;

        if (registerIndex < 0) {
            return res.status(400).json({ error: `Недопустимый номер регистра: ${regId}.` });
        }

        const offset = registerIndex * bytesPerRegister;

        if (offset + bytesPerRegister > buffer.length) {
            return res.status(400).json({ error: `Регистр ${regId} выходит за пределы устройства.` });
        }

        const numericValue = parseFloat(newState);
        if (isNaN(numericValue)) {
            return res.status(400).json({ error: `Некорректное значение: ${newState}. Ожидается число.` });
        }

        // Запись в зависимости от типа
        if (registerType === 'u2') {
            if (numericValue < 0 || numericValue > 65535) {
                return res.status(400).json({ error: `Значение вне диапазона для u2 (0...65535).` });
            }
            buffer.writeUInt16LE(numericValue, offset);
            console.log(`[u2] Записано ${numericValue} в регистр ${regId} [${bufferName}]`);

        } else if (registerType === 's2') {
            if (numericValue < -32768 || numericValue > 32767) {
                return res.status(400).json({ error: `Значение вне диапазона для s2 (-32768...32767).` });
            }
            buffer.writeInt16LE(numericValue, offset);
            console.log(`[s2] Записано ${numericValue} в регистр ${regId} [${bufferName}]`);

        } else if (registerType === 'f4') {
            if (offset + 4 > buffer.length) {
                return res.status(400).json({ error: `Недостаточно места для f4 в регистре ${regId}.` });
            }
            buffer.writeFloatLE(numericValue, offset);
            console.log(`[f4] Записано ${numericValue} в регистр ${regId} [${bufferName}]`);

        } else if (registerType && registerType.startsWith('b')) {
            const bitIndex = parseInt(registerType.substring(1));
            if (bitIndex < 0 || bitIndex > 15) {
                return res.status(400).json({ error: `Некорректный бит: ${bitIndex}. Допустимо 0...15.` });
            }

            const currentValue = buffer.readUInt16LE(offset);
            let newValue;
            if (numericValue === 0) {
                newValue = currentValue & ~(1 << bitIndex);
            } else if (numericValue === 1) {
                newValue = currentValue | (1 << bitIndex);
            } else {
                return res.status(400).json({ error: `Для битового регистра допустимы только 0 или 1.` });
            }

            buffer.writeUInt16LE(newValue, offset);
            console.log(`[b${bitIndex}] Записан бит ${numericValue} в регистр ${regId}. Новое значение: ${newValue} [${bufferName}]`);

        } else {
            return res.status(400).json({ error: `Неизвестный тип регистра: ${registerType}.` });
        }

        res.status(200).json({ 
            message: `Состояние регистра ${regId} обновлено на ${newState}.`,
            registerType: registerType,
            value: numericValue,
            buffer: bufferName
        });

    } catch (error) {
        console.error(`Ошибка записи данных: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: "Не удалось записать данные в устройство." });
        }
    }
});

// 3. Всё остальное отдает index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Ваши статические файлы находятся в папке 'public'`);
    
    // Выбор источника данных
    // testBuffer = bufferInit();  // Для тестового буфера
    // mapped_memory = mmapInit(); // Для реального устройства
    
    // По умолчанию используем mapped_memory
    try {
        mapped_memory = mmapInit();
        console.log('✅ Используется mapped_memory (реальное устройство)');
    } catch (error) {
        console.log('⚠️ Ошибка mmap, используем testBuffer');
        testBuffer = bufferInit();
        console.log('✅ Используется testBuffer (тестовый режим)');
    }

    isDataInitialized = initializeDataSourcesAndParams();

    if (!isDataInitialized) {
        console.error("Критическая ошибка: Не удалось инициализировать данные.");
        process.exit(1);
    } else {
        console.log("✅ Сервер готов к приему запросов.");
    }
});