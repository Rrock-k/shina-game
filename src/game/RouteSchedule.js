/**
 * RouteSchedule - управление расписанием маршрутов
 * 
 * Этот класс отвечает за управление расписанием поездок Шины:
 * - Хранение списка задач/локаций
 * - Управление текущей задачей
 * - Добавление/удаление задач
 * - Переход к следующей задаче
 */
export class RouteSchedule {
    constructor() {
        // Изначальное расписание из конфига
        this.schedule = [
            { location: 'house', name: 'Дом', stayHours: 2 },
            { location: 'institute', name: 'Институт', stayHours: 2 },
            { location: 'work', name: 'Работа', stayHours: 5 },
            { location: 'relatives', name: 'Родственники', stayHours: 1.5 },
            { location: 'box', name: 'Бокс', stayHours: 1 },
        ];
        
        this.currentTaskIndex = 0;
    }

    /**
     * Получить текущую задачу
     * @returns {Object|null} Текущая задача или null если список пуст
     */
    getCurrentTask() {
        if (this.schedule.length === 0) {
            return null;
        }
        return this.schedule[this.currentTaskIndex];
    }

    /**
     * Получить все задачи
     * @returns {Array} Массив всех задач
     */
    getAllTasks() {
        return [...this.schedule];
    }

    /**
     * Перейти к следующей задаче
     */
    nextTask() {
        if (this.schedule.length === 0) {
            return;
        }
        this.currentTaskIndex = (this.currentTaskIndex + 1) % this.schedule.length;
    }

    /**
     * Установить текущую задачу по индексу
     * @param {number} index Индекс задачи
     */
    setCurrentTaskIndex(index) {
        if (index >= 0 && index < this.schedule.length) {
            this.currentTaskIndex = index;
        }
    }

    /**
     * Получить текущий индекс задачи
     * @returns {number} Текущий индекс
     */
    getCurrentTaskIndex() {
        return this.currentTaskIndex;
    }

    /**
     * Добавить задачу в конец списка
     * @param {Object} task Задача для добавления
     */
    addTask(task) {
        this.schedule.push(task);
    }

    /**
     * Добавить задачу в начало списка (высокий приоритет)
     * @param {Object} task Задача для добавления
     */
    addHighPriorityTask(task) {
        this.schedule.unshift(task);
        // Если мы добавили задачу в начало, нужно увеличить текущий индекс
        if (this.currentTaskIndex > 0) {
            this.currentTaskIndex++;
        }
    }

    /**
     * Удалить задачу по индексу
     * @param {number} index Индекс задачи для удаления
     */
    removeTask(index) {
        if (index >= 0 && index < this.schedule.length) {
            this.schedule.splice(index, 1);
            
            // Корректируем текущий индекс
            if (this.currentTaskIndex >= this.schedule.length) {
                this.currentTaskIndex = 0;
            } else if (this.currentTaskIndex > index) {
                this.currentTaskIndex--;
            }
        }
    }

    /**
     * Удалить текущую задачу
     */
    removeCurrentTask() {
        this.removeTask(this.currentTaskIndex);
    }

    /**
     * Очистить все задачи
     */
    clearAllTasks() {
        this.schedule = [];
        this.currentTaskIndex = 0;
    }

    /**
     * Получить количество задач
     * @returns {number} Количество задач в расписании
     */
    getTaskCount() {
        return this.schedule.length;
    }

    /**
     * Проверить, есть ли задачи
     * @returns {boolean} true если есть задачи, false если список пуст
     */
    hasTasks() {
        return this.schedule.length > 0;
    }

    /**
     * Получить задачу по индексу
     * @param {number} index Индекс задачи
     * @returns {Object|null} Задача или null если индекс неверный
     */
    getTaskByIndex(index) {
        if (index >= 0 && index < this.schedule.length) {
            return this.schedule[index];
        }
        return null;
    }

    /**
     * Найти задачу по локации
     * @param {string} location Название локации
     * @returns {number} Индекс задачи или -1 если не найдена
     */
    findTaskByLocation(location) {
        return this.schedule.findIndex(task => task.location === location);
    }

    /**
     * Заменить весь расписание новым
     * @param {Array} newSchedule Новое расписание
     */
    setSchedule(newSchedule) {
        this.schedule = [...newSchedule];
        this.currentTaskIndex = 0;
    }
}