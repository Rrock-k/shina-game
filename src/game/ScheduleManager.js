/**
 * ScheduleManager — управляет последовательностью задач/локаций Шины.
 * Пока что базируется на статичном CONFIG.ROUTE_SCHEDULE, но предоставляет
 * API для динамического расписания и отслеживания статусов задач.
 */
export class ScheduleManager {
  constructor(config, timeManager = null, options = {}) {
    this.config = config;
    this.timeManager = timeManager;
    this.options = {
      dayStartHour: options.dayStartHour ?? 6,
      dayStartMinute: options.dayStartMinute ?? 0
    };

    this.tasks = [];
    this.currentTaskIndex = 0;
    this.baseDate = null;

    this.initializeFromTemplate();
  }

  /**
   * Инициализировать расписание из статического шаблона.
   * @param {Object|null} gameTimeOverride - объект времени {year, month, day, hours, minutes}
   */
  initializeFromTemplate(gameTimeOverride = null) {
    const template = this.config?.ROUTE_SCHEDULE || [];

    if (!template.length) {
      this.tasks = [];
      this.currentTaskIndex = 0;
      return;
    }

    const baseGameTime = gameTimeOverride || (this.timeManager ? this.timeManager.getGameTime() : null);
    const baseDate = baseGameTime
      ? this._toDate(baseGameTime.year, baseGameTime.month, baseGameTime.day, baseGameTime.hours, baseGameTime.minutes)
      : this._toDate(2025, 8, 7, this.options.dayStartHour, this.options.dayStartMinute);

    this.baseDate = baseDate;

    let pointer = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      this.options.dayStartHour,
      this.options.dayStartMinute,
      0,
      0
    );

    this.tasks = template.map((item, index) => {
      const plannedStart = new Date(pointer.getTime());
      const stayMillis = (item.stayHours || 0) * 60 * 60 * 1000;
      const plannedEnd = new Date(plannedStart.getTime() + stayMillis);
      pointer = new Date(plannedEnd.getTime());

      return {
        id: item.id || `${item.location}-${index}`,
        order: index,
        name: item.name,
        location: item.location,
        duration: item.stayHours || 0,
        stayHours: item.stayHours || 0,
        startTime: plannedStart,
        endTime: plannedEnd,
        actualStartTime: null,
        actualEndTime: null,
        status: index === 0 ? 'ACTIVE' : 'PENDING'
      };
    });

    this.currentTaskIndex = 0;
  }

  /**
   * Пересчитать базовую дату (например после смены дня)
   * @param {Object} gameTime - объект времени
   */
  updateBaseDate(gameTime) {
    if (!gameTime) return;
    this.baseDate = this._toDate(gameTime.year, gameTime.month, gameTime.day, gameTime.hours, gameTime.minutes);
  }

  /**
   * Получить общее количество задач
   */
  getTaskCount() {
    return this.tasks.length;
  }

  /**
   * Получить задачу по индексу
   * @param {number} index
   * @returns {Object|null}
   */
  getTaskByIndex(index) {
    if (index == null) return null;
    return this.tasks[index] || null;
  }

  /**
   * Получить следующую позицию
   * @param {number} currentIndex
   * @returns {number}
   */
  getNextIndex(currentIndex) {
    const count = this.getTaskCount();
    if (!count) return 0;
    const index = (currentIndex + 1) % count;
    return index;
  }

  /**
   * Установить текущий индекс (без изменения статусов).
   * Используется для синхронизации со StateManager.
   * @param {number} index
   */
  setCurrentTaskIndex(index) {
    if (typeof index !== 'number') return;
    this.currentTaskIndex = Math.max(0, Math.min(index, Math.max(0, this.getTaskCount() - 1)));
  }

  /**
   * Пометить задачу как активную (прибыли в локацию)
   * @param {number} index
   * @param {Date|null} startDate
   */
  startTask(index, startDate = null) {
    const task = this.getTaskByIndex(index);
    if (!task) return;

    this.currentTaskIndex = index;

    this.tasks.forEach((item, i) => {
      if (i === index) {
        item.status = 'ACTIVE';
        if (startDate) {
          item.actualStartTime = startDate;
          item.startTime = startDate;
        } else if (!item.actualStartTime) {
          item.actualStartTime = this._now();
        }
        item.actualEndTime = null;
      } else if (i < index && item.status !== 'CANCELLED') {
        item.status = 'COMPLETED';
      } else if (i > index && item.status === 'COMPLETED') {
        item.status = 'PENDING';
      }
    });
  }

  /**
   * Пометить задачу как завершенную (уезжаем из локации)
   * @param {number} index
   * @param {Date|null} endDate
   */
  completeTask(index, endDate = null) {
    const task = this.getTaskByIndex(index);
    if (!task) return;

    task.status = 'COMPLETED';
    if (endDate) {
      task.actualEndTime = endDate;
      task.endTime = endDate;
    } else if (!task.actualEndTime) {
      task.actualEndTime = this._now();
    }
  }

  /**
   * Получить текущую задачу (состояние ACTIVE)
   * @param {Date|null} referenceDate
   * @param {string|null} locationKey
   */
  getCurrentTask(referenceDate = null, locationKey = null) {
    if (!this.tasks.length) return null;

    if (locationKey) {
      const byLocation = this.tasks.find(task => task.location === locationKey);
      if (byLocation) {
        return byLocation;
      }
    }

    const activeTask = this.tasks.find(task => task.status === 'ACTIVE');
    if (activeTask) {
      return activeTask;
    }

    if (referenceDate) {
      const refTime = referenceDate.getTime();
      const byTime = this.tasks.find(task => task.startTime <= referenceDate && task.endTime >= referenceDate);
      if (byTime) return byTime;

      const closestPast = this.tasks
        .filter(task => task.endTime && task.endTime.getTime() <= refTime)
        .pop();
      if (closestPast) return closestPast;
    }

    return null;
  }

  /**
   * Получить ближайшую предстоящую задачу (статус PENDING)
   */
  getUpcomingTask() {
    return this.tasks.find(task => task.status === 'PENDING') || null;
  }

  /**
   * Получить все задачи (в исходном порядке)
   */
  getAllTasks() {
    return [...this.tasks];
  }

  /**
   * Получить задачу по локации
   * @param {string} locationKey
   */
  getTaskByLocation(locationKey) {
    if (!locationKey) return null;
    return this.tasks.find(task => task.location === locationKey) || null;
  }

  /**
   * Получить первую задачу как fallback
   */
  getFallbackTask() {
    return this.tasks[0] || null;
  }

  /**
   * Текущее время (Date) для внутренних нужд
   * @returns {Date}
   */
  _now() {
    if (this.timeManager && typeof this.timeManager.getGameTime === 'function') {
      const gameTime = this.timeManager.getGameTime();
      return this._toDate(gameTime.year, gameTime.month, gameTime.day, gameTime.hours, gameTime.minutes);
    }
    return new Date();
  }

  /**
   * Собрать Date из составляющих
   */
  _toDate(year, month, day, hours = 0, minutes = 0) {
    return new Date(year, month, day, Math.floor(hours), Math.floor(minutes), 0, 0);
  }
}

export default ScheduleManager;
