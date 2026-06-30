// server/configService.js
const fs = require('fs');
const path = require('path');

class ConfigService {
    constructor(publicDir) {
        this.publicDir = publicDir;
        this.cache = new Map();
    }

    loadConfig(fileName) {
        if (this.cache.has(fileName)) {
            return this.cache.get(fileName);
        }

        const filePath = path.join(this.publicDir, fileName);
        const normalizedPath = path.normalize(filePath);
        
        if (!normalizedPath.startsWith(path.normalize(this.publicDir))) {
            throw new Error('Доступ к файлу запрещен');
        }

        try {
            const content = fs.readFileSync(normalizedPath, 'utf8');
            const config = JSON.parse(content);
            this.cache.set(fileName, config);
            return config;
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new Error(`Файл ${fileName} не найден`);
            }
            throw new Error(`Ошибка чтения конфига: ${err.message}`);
        }
    }

    loadConfigAsync(fileName) {
        if (this.cache.has(fileName)) {
            return Promise.resolve(this.cache.get(fileName));
        }

        return new Promise((resolve, reject) => {
            const filePath = path.join(this.publicDir, fileName);
            const normalizedPath = path.normalize(filePath);
            
            if (!normalizedPath.startsWith(path.normalize(this.publicDir))) {
                return reject(new Error('Доступ к файлу запрещен'));
            }

            fs.readFile(normalizedPath, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        return reject(new Error(`Файл ${fileName} не найден`));
                    }
                    return reject(new Error(`Ошибка чтения: ${err.message}`));
                }

                try {
                    const config = JSON.parse(data);
                    this.cache.set(fileName, config);
                    resolve(config);
                } catch (e) {
                    reject(new Error('Неверный формат JSON'));
                }
            });
        });
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = ConfigService;