# Changelog

Все значимые изменения в проекте HMI.

---

## [Unreleased]

### Added
- **`node-card`** — новый тип блока: расширенный `empty-box` с иконкой, state-dot, поддержкой toggle и долгого тапа для попапов.
- **`popupService`** — глобальный сервис попапов (тренд, меню). Расширяемый через `register()`.
- **`confirmService`** — глобальный диалог подтверждения с Promise-API.
- **`blockRegistry`** — реестр типов блоков.
- **`BaseBlock`** — базовый класс для всех блоков.
- **`utils/format.js`** — `parseBlockFormat`, `applyFormat` (вынесены из `blockRenderer` и `modbusUpdater`).
- Документация `docs/` — architecture, blocks, services, markup, changelog.

### Changed
- **Архитектура блоков:** все 11 типов блоков перенесены в отдельные файлы `blocks/*Block.js`, наследующие `BaseBlock`.
- **Рендерер:** старый `blockRenderer.js` заменён на тонкий `renderer/blockRenderer.js`, работающий через `blockRegistry`.
- **Разметка:** переход на новую разметку (`.value`, `.node`, `.box-title`, `.toggle`, `.input`).
- **CSS:** единый `style.css` без патчей, старые селекторы удалены.
- **`app.js`:** контекст `ctx` — единая точка доступа ко всем сервисам.
- **`modbusUpdater`:** новый кэш `nodeCards` для node-card (не перетирает содержимое), защита `textContent` в toggle.

### Removed
- `public/js/blockRenderer.js` (старый)
- `public/js/pageManager.js` (мёртвый, импортировал несуществующий `EVENTS`)
- `public/js/scalingManager.js` (дублировал `_setupScaling` в `app.js`)
- Все правила CSS для старой разметки (`.content`, `.image-wrapper`, `.image-block`, `.empty-box-container`, `.empty-box-title`, `.input-value-field`, `.input-reset-btn`, `.input-save-btn`)

### Fixed
- `_createImage`: убрана опечатка `пше` после `new Function`.
- `toggleSpinOnClick`: правильное циклическое переключение режимов (было — все классы разом).
- `send-button`: `disabled` пересчитывается после отправки (было — оставался `false` безусловно).

---

## Этапы рефакторинга

### Этап A — перемещение модулей
Созданы подпапки `api/`, `core/`, `renderer/`, `blocks/`, `utils/`. Модули перемещены, импорты обновлены.

### Этап B — блоки на новой разметке
Все 11 типов блоков перенесены в отдельные файлы. Разметка переведена на `.value` / `.node` / `.toggle` / `.input`.

### Этап C — переключение `app.js`
`app.js` работает на новом `renderer/blockRenderer.js`. Старый `blockRenderer.js` удалён.

### Этап D — чистка и фиксы
- CSS сведён в единый файл без патчей.
- Удалены мёртвые файлы и правила.
- Точечные фиксы логики (`send-button`, `image`).

### Новое — `node-card` + сервисы
- `popupService`, `confirmService`.
- `NodeCardBlock` — расширенный `empty-box`.
- `node-card` заменил `empty-box` на странице `main`.

---

## Известные ограничения

- **Тренды** в `popupService` — заглушка с фейковыми данными. Реальные тренды — отдельная задача.
- **`send-button`** — `failedRegisters` собирается, но не используется в UX.
- **Биты `b16+`** — нет валидации, тихо дают неверный результат.
- **Сервер** — `modbusService.getData()` не учитывает `startRegister` (сейчас 0, но при изменении может разъехаться).
- **`ConfigService.cache`** не сбрасывается при правке `projectConfig.json` (нужен рестарт сервера).