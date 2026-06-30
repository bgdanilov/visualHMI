Вот готовый README.md с оформлением:

```markdown
# 📊 visualHMI v2.0

## Визуальный интерфейс для управления Modbus-устройствами

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)
![Express](https://img.shields.io/badge/express-4.18.x-lightgrey.svg)

**Простой, мощный и гибкий инструмент для визуализации и управления данными Modbus-устройств в реальном времени**

---

## 📋 Оглавление

- [📖 Описание](#-описание)
- [✨ Возможности](#-возможности)
- [📁 Структура проекта](#-структура-проекта)
- [🚀 Установка и запуск](#-установка-и-запуск)
- [⚙️ Конфигурация](#️-конфигурация)
- [🧩 Типы блоков](#-типы-блоков)
- [🌐 API](#-api)
- [🛠️ Разработка](#️-разработка)
- [🐛 Отладка](#-отладка)
- [📝 Лицензия](#-лицензия)

---

## 📖 Описание

**visualHMI** — это веб-приложение для визуализации и управления данными Modbus-устройств. Позволяет создавать интерактивные панели управления с различными типами элементов без написания кода.

### ✨ Возможности

| Возможность | Описание |
|-------------|----------|
| 📊 **Отображение данных** | Числовые значения, текстовые блоки, группы данных |
| ✏️ **Ввод данных** | Поля ввода с отправкой по Enter или кнопке |
| 🔘 **Управление** | Toggle-кнопки для битовых регистров |
| 💾 **Массовая отправка** | Отправка нескольких значений одной кнопкой |
| 🔄 **Реальное время** | Автоматическое обновление данных (интервал настраивается) |
| 🎨 **Гибкая настройка** | Конфигурация через JSON-файлы |
| 🛠️ **Режим редактирования** | Визуальное редактирование интерфейса |

---

## 📁 Структура проекта

```
visualHMI/
├── 📂 server/                          # Серверная часть (Node.js + Express)
│   ├── 📄 index.js                     # Главный файл сервера (API, маршруты)
│   ├── 📄 modbusService.js             # Работа с Modbus (чтение/запись регистров)
│   ├── 📄 configService.js             # Загрузка и кэширование конфигураций
│   └── 📄 registerUtils.js             # Утилиты для работы с регистрами
│
├── 📂 public/                          # Клиентская часть (статичные файлы)
│   ├── 📄 index.html                   # Главная страница
│   │
│   ├── 📂 css/
│   │   └── 📄 style.css                # Стили приложения
│   │
│   ├── 📂 js/                          # Модули JavaScript (ES Modules)
│   │   ├── 📄 app.js                   # 🔷 Главный файл приложения
│   │   ├── 📄 apiClient.js             # 🌐 API клиент (запросы к серверу)
│   │   ├── 📄 blockRenderer.js         # 🎨 Рендеринг и управление блоками
│   │   ├── 📄 modbusUpdater.js         # 🔄 Обновление данных из Modbus
│   │   ├── 📄 constants.js             # 📌 Константы приложения
│   │   └── 📄 eventHandlers.js         # 🎯 Глобальные обработчики событий
│   │
│   ├── 📄 projectConfig.json           # ⚙️ Конфигурация проекта
│   └── 📄 blocksData.json              # 📋 Данные блоков интерфейса
│
├── 📂 build/                           # Скомпилированные нативные модули
│   └── 📂 Release/
│       └── 📄 modbus_mmap.node         # Нативный модуль для работы с устройством
│
├── 📄 package.json                     # Зависимости и скрипты
└── 📄 README.md                        # Документация
```

### 📂 Описание модулей

#### Серверная часть (`server/`)

| Файл | Описание |
|------|----------|
| `index.js` | Точка входа. Настройка Express, маршруты API, инициализация |
| `modbusService.js` | Класс для работы с Modbus: инициализация, чтение, запись |
| `configService.js` | Загрузка JSON-конфигураций с кэшированием |
| `registerUtils.js` | Утилиты: чтение/запись регистров, валидация, преобразование типов |

#### Клиентская часть (`public/js/`)

| Файл | Описание |
|------|----------|
| `app.js` | Главный класс приложения. Управляет жизненным циклом |
| `apiClient.js` | HTTP-клиент. Запросы к серверу с таймаутом |
| `blockRenderer.js` | Рендеринг блоков. Создание, обновление, обработчики |
| `modbusUpdater.js` | Обновление данных. Опрос Modbus, кэширование элементов |
| `constants.js` | Константы: пути, интервалы, типы блоков |
| `eventHandlers.js` | Глобальные обработчики: сеть, ошибки, уведомления |

---

## 🚀 Установка и запуск

### 📋 Требования

| Компонент | Версия |
|-----------|--------|
| Node.js | >= 16.x |
| npm | >= 7.x |
| ОС | Linux / macOS / Windows |
| Для реального устройства | Драйвер `/dev/modbus_rtu` |

### 📦 Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd visualHMI

# Установка зависимостей
npm install
```

### ▶️ Запуск

```bash
# Режим разработки (с автоматической перезагрузкой)
npm run dev

# Production режим
npm start
```

**🌐 Приложение доступно по адресу:** `http://localhost:4000`

### 🔧 Настройка порта

В файле `server/index.js` измените переменную `port`:

```javascript
const port = 4000;  // Измените на нужный порт
```

---

## ⚙️ Конфигурация

### 📄 `projectConfig.json`

Основные настройки проекта:

```json
{
  "isEditUIMode": false,
  "projectName": "visualHMI",
  "updateInterval": 300
}
```

**Параметры:**

| Поле | Тип | Описание |
|------|-----|----------|
| `isEditUIMode` | boolean | `true` - режим редактирования (перерисовка каждые 500мс) |
| `projectName` | string | Название проекта |
| `updateInterval` | number | Интервал опроса Modbus (мс) |

### 📄 `blocksData.json`

Конфигурация блоков интерфейса:

```json
[
  {
    "type": "title-input",
    "regAddress": 16,
    "regType": "f4",
    "x": 20,
    "y": 300,
    "prefix": "Ток",
    "postfix": "А",
    "text": "Ввод значения",
    "size": 5,
    "showSaveButton": true
  }
]
```

---

## 🧩 Типы блоков

### 1. `only-number` — Только число

```json
{
  "type": "only-number",
  "regAddress": 20,
  "regType": "u2",
  "x": 630,
  "y": 280,
  "prefix": "№20",
  "postfix": ""
}
```

**Пример:**

```
┌──────────────┐
│  №20  1234   │
└──────────────┘
```

---

### 2. `only-title` — Только заголовок

```json
{
  "type": "only-title",
  "x": 100,
  "y": 100,
  "text": "Заголовок"
}
```

**Пример:**

```
┌──────────────┐
│  Заголовок   │
└──────────────┘
```

---

### 3. `title-number` — Заголовок + число

```json
{
  "type": "title-number",
  "regAddress": 0,
  "regType": "f4",
  "x": 360,
  "y": 20,
  "text": "Реактивный ток",
  "prefix": "Iреак.",
  "postfix": "A"
}
```

**Пример:**

```
┌──────────────────────┐
│  Реактивный ток      │
│  Iреак.  1.23  A     │
└──────────────────────┘
```

---

### 4. `title-group-number` — Группа чисел

```json
{
  "type": "title-group-number",
  "regAddress": [0, 1, 2],
  "regType": ["f4", "u2", "f4"],
  "x": 610,
  "y": 20,
  "text": "Список",
  "prefixes": ["Iреак.", "T", "Uном."],
  "postfixes": ["W", "sec", "V"]
}
```

**Пример:**

```
┌──────────────────────┐
│  Список              │
│  Iреак.  1.23  W     │
│  T        45   sec   │
│  Uном.   220   V     │
└──────────────────────┘
```

---

### 5. `toggle-button` — Кнопка-переключатель

```json
{
  "type": "toggle-button",
  "regAddress": 20,
  "regType": "b0",
  "x": 360,
  "y": 490,
  "text": "Вкл",
  "prefix": "20[0]"
}
```

**Пример:**

```
┌──────────────────────┐
│  20[0]   [ Вкл ]     │
└──────────────────────┘
```

---

### 6. `title-input` — Поле ввода

```json
{
  "type": "title-input",
  "regAddress": 16,
  "regType": "f4",
  "x": 20,
  "y": 300,
  "text": "Ввод значения",
  "prefix": "Ток",
  "postfix": "А",
  "size": 5,
  "showSaveButton": true,
  "autoSave": false
}
```

**Пример:**

```
┌────────────────────────┐
│  Ввод значения         │
│  Ток  [ 1.23 ]  А  💾  │
└────────────────────────┘
```

---

### 7. `send-button` — Кнопка отправки

```json
{
  "type": "send-button",
  "regAddress": [0, 2, 4, 16, 18],
  "x": 20,
  "y": 486,
  "text": "Сохранить"
}
```

**Пример:**

```
┌──────────────────────┐
│  [ Сохранить ]       │
└──────────────────────┘
```

---

### 📝 Параметры блоков

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `type` | string | ✅ | Тип блока |
| `regAddress` | number/array | ✅ | Адрес регистра |
| `regType` | string | ✅ | Тип данных: `u2`, `s2`, `f4`, `b0`-`b15` |
| `x` | number | ✅ | Координата X (px) |
| `y` | number | ✅ | Координата Y (px) |
| `prefix` | string | ❌ | Текст перед значением |
| `postfix` | string | ❌ | Текст после значения |
| `text` | string | ❌ | Заголовок/текст блока |
| `size` | number | ❌ | Ширина поля ввода (в символах) |
| `showSaveButton` | boolean | ❌ | Показывать кнопку 💾 |
| `autoSave` | boolean | ❌ | Автосохранение при потере фокуса |

---

## 🌐 API

### GET `/api/modbus`

Получение сырых данных из буфера.

**Ответ:** бинарные данные (application/octet-stream)

---

### GET `/api/loadConfig?file=filename.json`

Загрузка конфигурационного файла.

**Параметры:**
- `file` — имя файла (обязательный)

**Ответ:** JSON

---

### POST `/api/registers/:regId`

Запись значения в регистр.

**Тело запроса:**
```json
{
  "state": 123.45,
  "registerType": "f4"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Регистр 16 обновлен",
  "registerType": "f4",
  "value": 123.45,
  "requestedValue": 123.45
}
```

---

### GET `/api/registers/:regId?type=f4`

Чтение значения регистра.

**Параметры:**
- `type` — тип данных (по умолчанию `u2`)

**Ответ:**
```json
{
  "regId": 16,
  "registerType": "f4",
  "value": 123.45
}
```

---

## 🛠️ Разработка

### Добавление нового типа блока

**Шаг 1:** Добавьте тип в `constants.js`:

```javascript
export const BLOCK_TYPES = {
    // ... существующие типы
    NEW_TYPE: 'new-type'
};
```

**Шаг 2:** Создайте фабричный метод в `blockRenderer.js`:

```javascript
_createNewType(block, data) {
    const { text = '' } = data;
    
    block.innerHTML = `
        <div class="content">
            <span class="title">${text}</span>
            <span class="value">Новое значение</span>
        </div>
    `;
    
    return block;
}
```

**Шаг 3:** Зарегистрируйте в `createBlock()`:

```javascript
case BLOCK_TYPES.NEW_TYPE:
    return this._createNewType(block, blockData);
```

---

### Добавление нового типа регистра

В `server/registerUtils.js`:

```javascript
const registerHandlers = {
    // ... существующие типы
    'newType': {
        read: (buffer, offset) => buffer.read...(),
        write: (buffer, offset, value) => buffer.write...(),
        validate: (value) => true/false
    }
};
```

---

## 🐛 Отладка

### 🖥️ В браузере

В консоли доступен объект `__app`:

```javascript
// Получить состояние приложения
__app.getState()

// Перезапустить приложение
__app.restart()

// Остановить обновление
__app.stop()
```

### 📊 Просмотр кэша

```javascript
// Просмотр зарегистрированных элементов
__app.updater.caches.inputs   // Все input'ы
__app.updater.caches.spans    // Все span'ы
__app.updater.caches.toggles  // Все toggle-кнопки
```

### 📝 Логирование

Включите отладочные логи, раскомментировав в `server/index.js`:

```javascript
// console.log = function () { };  // Закомментировать для включения
```

---

## 📝 Лицензия

**MIT License**

Copyright (c) 2024 visualHMI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

---

## 🔗 Полезные ссылки

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Documentation](https://nodejs.org/)
- [Modbus Protocol Specification](https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf)

---

**visualHMI** — Простой и мощный инструмент для управления Modbus-устройствами

---

<div align="center">
  <sub>Built with ❤️ using Node.js, Express и Vanilla JS</sub>
</div>
```

---