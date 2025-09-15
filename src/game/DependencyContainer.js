/**
 * Контейнер зависимостей для централизованного управления сервисами
 * Устраняет необходимость в глобальных переменных window.*
 */
class DependencyContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    /**
     * Регистрирует сервис в контейнере
     * @param {string} name - имя сервиса
     * @param {Function|Object} service - сервис или фабрика
     * @param {boolean} singleton - создавать ли как синглтон
     */
    register(name, service, singleton = true) {
        this.services.set(name, { service, singleton });
    }

    /**
     * Получает сервис из контейнера
     * @param {string} name - имя сервиса
     * @returns {*} экземпляр сервиса
     */
    get(name) {
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Сервис '${name}' не зарегистрирован`);
        }

        const { service, singleton } = serviceConfig;

        if (singleton) {
            if (!this.singletons.has(name)) {
                const instance = typeof service === 'function' ? service() : service;
                this.singletons.set(name, instance);
            }
            return this.singletons.get(name);
        } else {
            return typeof service === 'function' ? service() : service;
        }
    }

    /**
     * Проверяет, зарегистрирован ли сервис
     * @param {string} name - имя сервиса
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Очищает все сервисы (для тестов)
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
    }
}

export default DependencyContainer;
