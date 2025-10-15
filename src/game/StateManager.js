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
        this.currentLocation = null;
        
        // Сохраненное состояние машины для следующей поездки
        this.savedCarState = null;
        
        // Таймеры пребывания в локациях
        this.lastStayTimerUpdate = 0;
        this.lastStayTimerDay = 0;
        this.stayStartTimeAbs = null; // Абсолютное игровое время начала пребывания
        this.stayTotalDuration = 0;   // Полная длительность пребывания в часах
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
     * Получить текущую локацию
     * @returns {string|null}
     */
    getCurrentLocation() {
        return this.currentLocation;
    }

    /**
     * Установить текущую локацию
     * @param {string|null} locationKey
     */
    setCurrentLocation(locationKey) {
        this.currentLocation = locationKey || null;
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
        this.currentLocation = null;
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

    /**
     * Получить абсолютное время начала пребывания
     * @returns {Object|null} Объект с игровым временем начала пребывания
     */
    getStayStartTimeAbs() {
        return this.stayStartTimeAbs;
    }

    /**
     * Установить абсолютное время начала пребывания
     * @param {Object} gameTime - Объект с игровым временем {hours, minutes, day}
     */
    setStayStartTimeAbs(gameTime) {
        this.stayStartTimeAbs = { ...gameTime };
    }

    /**
     * Очистить абсолютное время начала пребывания
     */
    clearStayStartTimeAbs() {
        this.stayStartTimeAbs = null;
    }

    /**
     * Получить полную длительность пребывания
     * @returns {number} Полная длительность пребывания в часах
     */
    getStayTotalDuration() {
        return this.stayTotalDuration;
    }

    /**
     * Установить полную длительность пребывания
     * @param {number} duration - Длительность пребывания в часах
     */
    setStayTotalDuration(duration) {
        this.stayTotalDuration = duration;
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
            lastStayTimerDay: this.lastStayTimerDay,
            stayStartTimeAbs: this.stayStartTimeAbs,
            stayTotalDuration: this.stayTotalDuration
        };
    }

    /**
     * Обновляет таймер пребывания в здании на основе абсолютного времени
     * @param {Object} gameTime - Объект с игровым временем {hours, minutes, day}
     * @param {number} currentStayDuration - Текущая продолжительность пребывания (не используется в новой логике)
     * @returns {number} Новая продолжительность пребывания
     */
    updateStayTimer(gameTime, currentStayDuration) {
        // Если нет сохраненного времени начала пребывания, используем старую логику
        if (!this.stayStartTimeAbs) {
            console.warn('⚠️ stayStartTimeAbs не установлено, используем старую логику');
            return this._updateStayTimerLegacy(gameTime, currentStayDuration);
        }
        
        // Если не установлена полная длительность, используем старую логику
        if (!this.stayTotalDuration) {
            console.warn('⚠️ stayTotalDuration не установлено, используем старую логику');
            return this._updateStayTimerLegacy(gameTime, currentStayDuration);
        }
        
        const currentTime = gameTime.hours * 60 + gameTime.minutes; // текущее время в минутах
        const currentDay = gameTime.day; // текущий день
        
        const startTime = this.stayStartTimeAbs.hours * 60 + this.stayStartTimeAbs.minutes; // время начала в минутах
        const startDay = this.stayStartTimeAbs.day; // день начала
        
        let timeDiff;
        
        // Если день изменился, это переход через полночь
        if (currentDay !== startDay) {
            // Время с начала пребывания до полуночи + время с полуночи до текущего момента
            timeDiff = (24 * 60 - startTime) + currentTime;
            console.log(`🌙 Переход через полночь: ${timeDiff} минут с начала пребывания`);
        } else {
            timeDiff = currentTime - startTime;
        }
        
        // ИСПРАВЛЕННАЯ ЛОГИКА: Вычитаем прошедшее время из ИЗНАЧАЛЬНОЙ полной длительности
        const newStayTimer = this.stayTotalDuration - timeDiff / 60; // переводим в игровые часы
        
        // Убедимся, что таймер не уходит в минус
        return Math.max(0, newStayTimer);
    }
    
    /**
     * Старая логика обновления таймера (для обратной совместимости)
     * @param {Object} gameTime - Объект с игровым временем {hours, minutes, day}
     * @param {number} currentStayDuration - Текущая продолжительность пребывания
     * @returns {number} Новая продолжительность пребывания
     */
    _updateStayTimerLegacy(gameTime, currentStayDuration) {
        const currentTime = gameTime.hours * 60 + gameTime.minutes; // время в минутах
        const currentDay = gameTime.day; // день месяца
        
        // Инициализируем переменные для отслеживания времени
        if (this.lastStayTimerUpdate === 0) {
            this.lastStayTimerUpdate = currentTime;
            this.lastStayTimerDay = currentDay;
            return currentStayDuration;
        }
        
        // Обновляем таймер только при изменении времени
        if (currentTime !== this.lastStayTimerUpdate || currentDay !== this.lastStayTimerDay) {
            let timeDiff;
            
            // Если день изменился, это переход через полночь
            if (currentDay !== this.lastStayTimerDay) {
                // Время с последнего обновления до полуночи + время с полуночи до текущего момента
                timeDiff = (24 * 60 - this.lastStayTimerUpdate) + currentTime;
                console.log(`🌙 Переход через полночь: ${timeDiff} минут`);
            } else {
                timeDiff = currentTime - this.lastStayTimerUpdate;
            }
            
            const newStayTimer = currentStayDuration - timeDiff / 60; // переводим в игровые часы
            this.lastStayTimerUpdate = currentTime;
            this.lastStayTimerDay = currentDay;
            
            return newStayTimer;
        }
        
        return currentStayDuration;
    }

    /**
     * Сбросить все состояние к начальному
     */
    reset() {
        this.currentRouteIndex = 0;
        this.currentLocation = null;
        this.savedCarState = null;
        this.lastStayTimerUpdate = 0;
        this.lastStayTimerDay = 0;
        this.stayStartTimeAbs = null;
        this.stayTotalDuration = 0;
    }
}

export default StateManager;
