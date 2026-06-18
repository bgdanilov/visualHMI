//console.log = function () { };
//const addon = require('./build/Release/modbus_mmap');
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 4000;

const device_path = "/dev/modbus_rtu"; // путь к ОЗУ
const device_size_str = "4096";
const device_size = parseInt(device_size_str, 10);

//let fd = -1;

const numRegistersToRead = 4096;
const bytesPerRegister = 2;
const startRegisterNumber = 0;
const totalBytes = numRegistersToRead * bytesPerRegister;

let mapped_memory = null;
let testBuffer = null;
let parseParams = null; // Будет хранить объект с параметрами парсинга
let isDataInitialized = false; // Флаг, показывающий, прошла ли инициализация успешно


// 1. Статические файлы (CSS, JS, картинки)
app.use(express.static(path.join(__dirname, 'public')));
// Работа с JSON
app.use(express.json());

// --- Функция для инициализации данных и параметров ---
function initializeDataSourcesAndParams() {
    console.log("Начинается инициализация данных и параметров...");

    // 1. Инициализация source
    if (typeof testBuffer !== 'undefined' && testBuffer !== null) {
        source = testBuffer;
        console.log("Используется testBuffer.");
    } else if (typeof mapped_memory !== 'undefined' && mapped_memory !== null) {
        source = mapped_memory;
        console.log("Используется mapped_memory.");
    } else {
        console.error("Ошибка: Источник данных (testBuffer или mapped_memory) не определен или null.");
        return false; // Возвращаем false, если инициализация не удалась
    }

    // 2. Проверка параметров парсинга
    if (typeof numRegistersToRead === 'undefined' || numRegistersToRead === null ||
        typeof bytesPerRegister === 'undefined' || bytesPerRegister === null ||
        typeof startRegisterNumber === 'undefined' || startRegisterNumber === null) {
        console.error("Ошибка: Необходимые параметры для парсинга (numRegistersToRead, bytesPerRegister, startRegisterNumber) не определены.");
        return false; // Возвращаем false, если параметры не определены
    }

    // Дополнительная валидация параметров (опционально, но рекомендуется)
    if (typeof numRegistersToRead !== 'number' || !Number.isInteger(numRegistersToRead) || numRegistersToRead <= 0) {
        console.error(`Ошибка: Некорректное значение numRegistersToRead: ${numRegistersToRead}. Ожидается положительное целое число.`);
        return false;
    }
    if (typeof bytesPerRegister !== 'number' || !Number.isInteger(bytesPerRegister) || bytesPerRegister <= 0) {
        console.error(`Ошибка: Некорректное значение bytesPerRegister: ${bytesPerRegister}. Ожидается положительное целое число.`);
        return false;
    }
    // startRegisterNumber может быть 0, поэтому проверка немного другая
    if (typeof startRegisterNumber !== 'number' || !Number.isInteger(startRegisterNumber) || startRegisterNumber < 0) {
        console.error(`Ошибка: Некорректное значение startRegisterNumber: ${startRegisterNumber}. Ожидается неотрицательное целое число.`);
        return false;
    }

    // Сохраняем параметры, если все ОК
    parseParams = {
        numRegistersToRead: numRegistersToRead,
        bytesPerRegister: bytesPerRegister,
        startRegisterNumber: startRegisterNumber
    };

    console.log("Инициализация данных и параметров прошла успешно.");
    return true; // Возвращаем true, если все успешно
}

function bufferInit() {
    const bufferSize = numRegistersToRead * bytesPerRegister;
    testBuffer = Buffer.alloc(bufferSize);
    testBuffer.writeUInt8(0, 0); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 1); // Регистр 1 (смещение 1)
    testBuffer.writeUInt8(184, 2); // Регистр 2 (смещение 2)
    testBuffer.writeUInt8(64, 3); // Регистр 3 (смещение 3)
    testBuffer.writeUInt8(0, 4); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 5); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 6); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 7); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 8); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 9); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 10); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 11); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 12); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 13); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 14); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 15); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 16); // Регистр 0 (смещение 0)
    testBuffer.writeUInt8(0, 17); // Регистр 0 (смещение 0)

    return testBuffer;
}

function mmapInit2() {
    try {
        const buffer = addon.mmapDevice('/dev/modbus_rtu');
        console.log('✅ Успех! Размер буфера:', buffer.length);
        
        if (buffer.length < totalBytes) {
            throw new Error(`Буфер слишком мал: ${buffer.length} < ${totalBytes}`);
        }
        
        mapped_memory = buffer.subarray(startRegisterNumber);
        return mapped_memory;
        
    } catch (err) {
        console.error('❌ Ошибка инициализации mmap:', err.message);
        throw err;  // Пробрасываем ошибку дальше
    }
}

function parseModbusData2(source, numRegistersToRead, bytesPerRegister, startRegisterNumber) {
    const totalBytes = numRegistersToRead * bytesPerRegister;

    // Проверка размера
    if (!source || source.length < totalBytes) {
        console.warn(`[Server Parse] Буфер мал. Ожидалось ${totalBytes} байт.`);
        return [];
    }

    const states = [];

    for (let i = 0; i < numRegistersToRead; i++) {
        const registerValue = source.readUInt16LE(i * bytesPerRegister);
        states.push({
            reg: (startRegisterNumber + i).toString(),
            state: registerValue
        });
    }

    return states;
}


function parseModbusData3(source, registersConfig) {
    const registersState = [];
    let currentOffset = 0; // Начальное смещение для чтения из source

    for (const regInfo of registersConfig) {
        let value;
        //const offset = currentOffset; // Смещение для текущего регистра

        try {
            for (let i = 0; i < numRegistersToRead; i++) {
            // Определяем, как читать данные в зависимости от размера и типа
            switch (regInfo.regType) {
                /*case 'byte':
                    if (regInfo.size !== 2) throw new Error(`Invalid size ${regInfo.size} for uint16 type.`);
                    value = source.readUInt16LE(offset);
                    break;*/
                case 'uint16':
                    //if (regInfo.size !== 4) throw new Error(`Invalid size ${regInfo.size} for uint32 type.`);
                    value = source.readUInt16LE(regInfo.regAddress);
                    break;
                // Добавьте другие типы по необходимости (int16, float, double...)
                case 'float':
                    //if (regInfo.size !== 4) throw new Error(`Invalid size ${regInfo.size} for float type.`);
                    value = source.readFloatLE(regInfo.regAddress);
                    break;
                default:
                    throw new Error(`Unsupported register type: ${regInfo.type}`);
            }
        }

            registersState.push({
                reg: regInfo.regAddress,
                state: value
            });

            // Передвигаем текущее смещение на размер прочитанного регистра
            currentOffset += regInfo.size * bytesPerRegister; // Если bytesPerRegister - это количество байт на 16-битный регистр (т.е. 2)
                                                            // Или просто currentOffset += regInfo.size, если size уже в байтах
            // В вашем случае, если регистры могут быть 2 или 4 байта, то currentOffset += regInfo.size * (16 / 8);  // 2 байта на 16-бит регистр
            // Или просто: currentOffset += regInfo.size; если regInfo.size это уже в байтах
            // Важно: Убедитесь, что offset правильный. Если регистры идут подряд, то смещение для следующего - это смещение текущего + размер текущего.
            // Если startRegisterNumber и numRegistersToRead предполагают 16-битные блоки, то нужно учесть это.
            // Например: currentOffset += regInfo.size * 2;  (если 16 бит = 2 байта)
            // Или: currentOffset += regInfo.size; (если regInfo.size уже в байтах)

        } catch (e) {
            console.error(`Ошибка при чтении регистра ${regInfo.address} (тип: ${regInfo.type}, размер: ${regInfo.size} байт): ${e.message}`);
            // Можно добавить ошибку в результат или пропустить регистр
        }
    }
    return registersState;
}

// 2. Маршруты API
// Обращается к ОЗУ (mapped_memory), парсит данные регистров, отправляет клиенту Json
app.get('/api/modbus', (req, res) => {
    // Проверяем, была ли инициализация успешной
    if (!isDataInitialized) {
        console.error("Попытка запроса, когда данные не были инициализированы.");
        // Важно: ответ уже был отправлен при ошибке инициализации, но на всякий случай
        if (!res.headersSent) {
            return res.status(500).json({ error: "Серверные данные не были инициализированы." });
        }
        return;
    }

    // Теперь source и parseParams определены и валидны, если isDataInitialized === true
    try {
       /** const registersState = parseModbusData2(
            source, // Используем глобальную переменную source
            parseParams.numRegistersToRead,
            parseParams.bytesPerRegister,
            parseParams.startRegisterNumber
        );
        */

        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(source.subarray(0));  // Отправляем сырые байты
    } catch (error) {
        console.error(`Ошибка обработки данных на сервере: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// Маршрут для загрузки конфигурации.
// Клиент может указать файл через query-параметр 'file', например: /api/loadConfig?file=myConfig.json
app.get('/api/loadConfig', (req, res) => {
    // Получаем имя файла из query-параметра. Используем 'defaultConfig.json', если параметр не предоставлен.
    const configFileName = req.query.file;
    // Формируем полный путь к файлу, предполагая, что файлы конфигурации находятся в папке 'public'.
    const configFilePath = path.join(__dirname, 'public', configFileName);
    // --- Дополнительная проверка безопасности ---
    // Нормализуем пути и проверяем, что запрашиваемый файл находится внутри директории 'public'.
    // Это предотвращает атаки path traversal (например, запрос ../../secret.txt).
    const normalizedConfigFilePath = path.normalize(configFilePath);
    const publicDir = path.normalize(path.join(__dirname, 'public'));

    if (!normalizedConfigFilePath.startsWith(publicDir)) {
        console.warn(`Попытка загрузить файл вне разрешенной директории: ${configFileName}`);
        return res.status(400).json({ error: 'Запрос недопустимого файла' });
    }

    fs.readFile(normalizedConfigFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Ошибка при чтении файла конфигурации ${normalizedConfigFilePath}:`, err);
            // Возвращаем 404, если файл не найден, или 500 для других ошибок чтения
            const statusCode = err.code === 'ENOENT' ? 404 : 500;
            const errorMessage = err.code === 'ENOENT' ? `Файл конфигурации '${configFileName}' не найден.` : `Ошибка при чтении файла конфигурации.`;
            return res.status(statusCode).json({ error: errorMessage });
        }

        try {
            // Парсим содержимое файла JSON
            const config = JSON.parse(data);
            // Отправляем распарсенную конфигурацию клиенту в формате JSON
            res.json(config);
        } catch (parseError) {
            console.error(`Ошибка при парсинге JSON из файла ${normalizedConfigFilePath}:`, parseError);
            res.status(500).json({ error: 'Неверный формат JSON в файле конфигурации' });
        }
    });
});

function valueToLEBytes(value, buffer, offset, bytesPerRegister = 2) {
    if (bytesPerRegister === 2) {
        // Записываем 16-битное целое число в Little-Endian
        buffer.writeUInt16LE(value, offset);
    }
}


app.post('/api/registers/:regId', (req, res) => {
    const regId = parseInt(req.params.regId);
    const newState = req.body.state;        // Значение для записи
    const registerType = req.body.registerType || 'u2';  // Тип регистра (по умолчанию u2)

    // Проверка обязательных полей
    if (isNaN(regId) || newState === undefined) {
        return res.status(400).json({ 
            error: "Необходимо указать номер регистра в URL и поле 'state' в теле запроса." 
        });
    }

    if (!testBuffer) {
        console.error("Ошибка: Память устройства не отображена для записи.");
        return res.status(500).json({ error: "Память устройства не отображена или не имеет прав на запись." });
    }

    try {    
        const BYTES_PER_REGISTER = 2;
        const START_REGISTER_NUMBER = 0;

        // Преобразуем номер регистра в индекс (смещение)
        const registerIndex = parseInt(regId, 10) - START_REGISTER_NUMBER;

        if (isNaN(registerIndex) || registerIndex < 0) {
            return res.status(400).json({ error: `Недопустимый номер регистра: ${regId}.` });
        }

        const offset = registerIndex * BYTES_PER_REGISTER;

        // Проверяем, что смещение не выходит за пределы буфера
        if (offset + BYTES_PER_REGISTER > testBuffer.length) {
            console.error(`Ошибка записи: Смещение ${offset} + размер ${BYTES_PER_REGISTER} превышает размер буфера ${testBuffer.length}.`);
            return res.status(400).json({ error: `Регистр ${regId} выходит за пределы устройства.` });
        }

        // === ЗАПИСЬ В ЗАВИСИМОСТИ ОТ ТИПА ===
        const numericValue = parseFloat(newState);
        if (isNaN(numericValue)) {
            return res.status(400).json({ error: `Некорректное значение: ${newState}. Ожидается число.` });
        }

        // Определяем тип регистра и записываем
        if (registerType === 'u2') {
            // Беззнаковое 16-битное целое (0...65535)
            if (numericValue < 0 || numericValue > 65535) {
                return res.status(400).json({ error: `Значение ${numericValue} вне диапазона для u2 (0...65535).` });
            }
            testBuffer.writeUInt16LE(numericValue, offset);
            console.log(`[u2] Записано ${numericValue} в регистр ${regId} (смещение ${offset})`);

        } else if (registerType === 's2') {
            // Знаковое 16-битное целое (-32768...32767)
            if (numericValue < -32768 || numericValue > 32767) {
                return res.status(400).json({ error: `Значение ${numericValue} вне диапазона для s2 (-32768...32767).` });
            }
            testBuffer.writeInt16LE(numericValue, offset);
            console.log(`[s2] Записано ${numericValue} в регистр ${regId} (смещение ${offset})`);

        } else if (registerType === 'f4') {
            // 32-битное число с плавающей точкой (занимает 4 байта)
            // Для f4 нужно проверить, что регистр не выходит за границы
            if (offset + 4 > testBuffer.length) {
                return res.status(400).json({ error: `Недостаточно места для f4 в регистре ${regId}.` });
            }
            testBuffer.writeFloatLE(numericValue, offset);
            console.log(`[f4] Записано ${numericValue} в регистр ${regId} (смещение ${offset})`);

        } else if (registerType && registerType.startsWith('b')) {
            // Битовая операция: b0...b15
            const bitIndex = parseInt(registerType.substring(1));
            if (bitIndex < 0 || bitIndex > 15) {
                return res.status(400).json({ error: `Некорректный бит: ${bitIndex}. Допустимо 0...15.` });
            }

            // Читаем текущее значение регистра
            const currentValue = testBuffer.readUInt16LE(offset);
            
            // Устанавливаем или сбрасываем бит
            let newValue;
            if (numericValue === 0) {
                // Сбросить бит
                newValue = currentValue & ~(1 << bitIndex);
            } else if (numericValue === 1) {
                // Установить бит
                newValue = currentValue | (1 << bitIndex);
            } else {
                return res.status(400).json({ error: `Для битового регистра допустимы только 0 или 1. Получено: ${numericValue}` });
            }

            testBuffer.writeUInt16LE(newValue, offset);
            console.log(`[b${bitIndex}] Записан бит ${numericValue} в регистр ${regId} (смещение ${offset}). Новое значение: ${newValue}`);

        } else {
            return res.status(400).json({ error: `Неизвестный тип регистра: ${registerType}.` });
        }

        res.status(200).json({ 
            message: `Состояние регистра ${regId} обновлено на ${newState}.`,
            registerType: registerType,
            value: numericValue
        });

        console.log("test buffer", testBuffer);

    } catch (error) {
        console.error(`Ошибка записи данных: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: "Не удалось записать данные в устройство." });
        }
    }
});


// 3. В КОНЦЕ: Всё остальное отдает index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запускаем сервер
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
    console.log(`Ваши статические файлы находятся в папке 'public'`);
    testBuffer = bufferInit();
    //mapped_memory = mmapInit2();

    // Инициализация данных и параметров при запуске сервера
    isDataInitialized = initializeDataSourcesAndParams();

    // Если инициализация не удалась, можно вывести критическое сообщение
    if (!isDataInitialized) {
        console.error("Критическая ошибка: Не удалось инициализировать данные. Сервер может работать некорректно.");
    } else {
        console.log("Сервер готов к приему запросов.");
    }
});