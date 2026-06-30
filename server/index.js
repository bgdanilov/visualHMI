// server/index.js
const express = require('express');
const path = require('path');
const ConfigService = require('./configService');
const modbusService = require('./modbusService');
const { validateRegister } = require('./registerUtils');

const app = express();
const PORT = 4000;
const publicDir = path.join(__dirname, '../public');
const configService = new ConfigService(publicDir);

// Middleware
app.use(express.static(publicDir));
app.use(express.json());

// Инициализация Modbus
if (!modbusService.initialize()) {
    console.error('❌ Критическая ошибка: Не удалось инициализировать Modbus');
    process.exit(1);
}

// API: Получение данных
app.get('/api/modbus', (req, res) => {
    try {
        const data = modbusService.getData();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(data);
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Загрузка конфигурации
app.get('/api/loadConfig', async (req, res) => {
    try {
        const fileName = req.query.file;
        if (!fileName) {
            return res.status(400).json({ error: 'Не указан параметр file' });
        }
        const config = await configService.loadConfigAsync(fileName);
        res.json(config);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

// API: Запись в регистр
app.post('/api/registers/:regId', (req, res) => {
    try {
        const regId = parseInt(req.params.regId);
        const { state, registerType = 'u2' } = req.body;

        if (isNaN(regId) || state === undefined) {
            return res.status(400).json({ 
                error: 'Укажите номер регистра и значение' 
            });
        }

        const numericValue = parseFloat(state);
        if (isNaN(numericValue)) {
            return res.status(400).json({ 
                error: 'Некорректное значение. Ожидается число.' 
            });
        }

        modbusService.writeRegister(regId, numericValue, registerType);
        
        res.json({
            message: `Регистр ${regId} обновлен на ${numericValue}`,
            registerType,
            value: numericValue,
            buffer: modbusService.getBufferName()
        });

    } catch (error) {
        console.error('Ошибка записи:', error);
        res.status(500).json({ error: error.message });
    }
});

// SPA: Все остальные маршруты отдают index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Статика: ${publicDir}`);
});