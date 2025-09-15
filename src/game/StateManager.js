/**
 * StateManager - централизованное управление состоянием игры
 * 
 * Этот класс отвечает за хранение и управление всем состоянием игрового процесса:
 * - Текущий индекс маршрута
 * - Сохраненное состояние машины
 * - Таймеры пребывания в локациях
 * 
 * Обеспечивает "Единый Источник Истины" (SSoT) для состояния игры.
 */
class StateManager {
    constructor() {
        // Состояние маршрута
        this.currentRouteIndex = 0;
        
        // Сохраненное состояние машины для следующей поездки
        this.savedCarState = null;
        
        // Таймеры пребывания в локациях
        this.lastStayTimerUpdate = 0;
        this.lastStayTimerDay = 0;
    }

    // === Методы для управления currentRouteIndex ===
    
    /**
     * Получить текущий индекс маршрута
     * @returns {number} Текущий индекс маршрута
     */
    getCurrentRouteIndex() {
        return this.currentRouteIndex;
    }

    /**
     * Установить текущий индекс маршрута
     * @param {number} index - Новый индекс маршрута
     */
    setCurrentRouteIndex(index) {
        this.currentRouteIndex = index;
    }

    /**
     * Перейти к следующему маршруту
     */
    nextRoute() {
        this.currentRouteIndex++;
    }

    /**
     * Сбросить маршрут к началу
     */
    resetRoute() {
        this.currentRouteIndex = 0;
    }

    // === Методы для управления savedCarState ===
    
    /**
     * Получить сохраненное состояние машины
     * @returns {Object|null} Сохраненное состояние машины или null
     */
    getSavedCarState() {
        return this.savedCarState;
    }

    /**
     * Установить сохраненное состояние машины
     * @param {Object|null} state - Состояние машины для сохранения
     */
    setSavedCarState(state) {
        this.savedCarState = state;
    }

    /**
     * Очистить сохраненное состояние машины
     */
    clearSavedCarState() {
        this.savedCarState = null;
    }

    // === Методы для управления stayTimer ===
    
    /**
     * Получить время последнего обновления таймера пребывания
     * @returns {number} Время последнего обновления
     */
    getLastStayTimerUpdate() {
        return this.lastStayTimerUpdate;
    }

    /**
     * Установить время последнего обновления таймера пребывания
     * @param {number} time - Время обновления
     */
    setLastStayTimerUpdate(time) {
        this.lastStayTimerUpdate = time;
    }

    /**
     * Получить день последнего обновления таймера пребывания
     * @returns {number} День последнего обновления
     */
    getLastStayTimerDay() {
        return this.lastStayTimerDay;
    }

    /**
     * Установить день последнего обновления таймера пребывания
     * @param {number} day - День обновления
     */
    setLastStayTimerDay(day) {
        this.lastStayTimerDay = day;
    }

    // === Утилитарные методы ===
    
    /**
     * Получить полное состояние для отладки
     * @returns {Object} Объект с полным состоянием
     */
    getFullState() {
        return {
            currentRouteIndex: this.currentRouteIndex,
            savedCarState: this.savedCarState,
            lastStayTimerUpdate: this.lastStayTimerUpdate,
            lastStayTimerDay: this.lastStayTimerDay
        };
    }

    /**
     * Сбросить все состояние к начальному
     */
    reset() {
        this.currentRouteIndex = 0;
        this.savedCarState = null;
        this.lastStayTimerUpdate = 0;
        this.lastStayTimerDay = 0;
    }
}

export default StateManager;
