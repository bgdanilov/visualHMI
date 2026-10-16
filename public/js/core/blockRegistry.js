// public/js/core/blockRegistry.js

const registry = new Map();

export const blockRegistry = {
    register(type, Cls) {
        if (registry.has(type)) {
            console.warn(`⚠️ Тип "${type}" уже зарегистрирован, перезаписываем`);
        }
        registry.set(type, Cls);
    },
    get(type) {
        return registry.get(type) || null;
    },
    has(type) {
        return registry.has(type);
    },
    types() {
        return Array.from(registry.keys());
    }
};