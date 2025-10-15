import { WEEKDAY_TEMPLATES, WEEKEND_TEMPLATES } from '../config/scheduleTemplates.js';

export class ScheduleManager {
  constructor(config, timeManager = null, options = {}) {
    this.config = config;
    this.timeManager = timeManager;
    this.options = {
      dayStartHour: options.dayStartHour ?? 6,
      dayStartMinute: options.dayStartMinute ?? 0,
      lateHour: options.lateHour ?? 22
    };

    this.templates = options.scheduleTemplates || {
      weekday: WEEKDAY_TEMPLATES,
      weekend: WEEKEND_TEMPLATES
    };
    this.randomFn = typeof options.random === 'function' ? options.random : Math.random;

    this.tasks = [];
    this.currentTaskIndex = 0;
    this.baseDate = null;
    this.currentWeekKey = null;

    if (this._hasTemplateVariants()) {
      this.generateWeeklySchedule();
    } else {
      this.initializeFromStaticTemplate();
    }
  }

  /**
   * Проверить, доступны ли шаблоны расписания
   * @returns {boolean}
   */
  _hasTemplateVariants() {
    const weekdayCount = Array.isArray(this.templates?.weekday) ? this.templates.weekday.length : 0;
    const weekendCount = Array.isArray(this.templates?.weekend) ? this.templates.weekend.length : 0;
    return weekdayCount > 0 && weekendCount > 0;
  }

  /**
   * Инициализировать расписание из статичного конфига (fallback).
   * @param {Object|null} gameTimeOverride - объект времени {year, month, day, hours, minutes}
   */
  initializeFromStaticTemplate(gameTimeOverride = null) {
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
      const dayLabel = this._formatDayLabel(plannedStart);

      return {
        id: item.id || `${item.location}-${index}`,
        order: index,
        name: item.name,
        location: item.location,
        duration: item.stayHours || 0,
        stayHours: item.stayHours || 0,
        startTime: plannedStart,
        endTime: plannedEnd,
        dayLabel,
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
   * Сгенерировать расписание на неделю с использованием шаблонов.
   * @param {Object|null} gameTimeOverride
   */
  generateWeeklySchedule(gameTimeOverride = null) {
    const referenceGameTime = gameTimeOverride || (this.timeManager ? this.timeManager.getGameTime() : null);
    const now = referenceGameTime
      ? this._toDate(
          referenceGameTime.year,
          referenceGameTime.month,
          referenceGameTime.day,
          referenceGameTime.hours,
          referenceGameTime.minutes
        )
      : new Date();

    const weekStart = this._getWeekStart(now);
    const weekKey = this._getWeekKey(weekStart);
    this.currentWeekKey = weekKey;
    this.baseDate = new Date(weekStart.getTime());

    const { tasks } = this._buildWeeklyTasks(weekStart);
    this.tasks = tasks;

    this._prepareInitialStatuses(now);
    this.currentTaskIndex = this.getActiveTaskIndex();
  }

  /**
   * Получить индекс активной задачи
   * @returns {number}
   */
  getActiveTaskIndex() {
    const activeIndex = this.tasks.findIndex(task => task.status === 'ACTIVE');
    if (activeIndex >= 0) {
      return activeIndex;
    }
    const pendingIndex = this.tasks.findIndex(task => task.status === 'PENDING');
    return pendingIndex >= 0 ? pendingIndex : 0;
  }

  /**
   * Обновление состояния расписания (вызывается из игрового цикла)
   * @param {Object|null} gameTime
   */
  update(gameTime = null) {
    if (!this.tasks.length) return;

    const nowGameTime = gameTime || (this.timeManager ? this.timeManager.getGameTime() : null);
    if (!nowGameTime) return;

    const now = this._toDate(
      nowGameTime.year,
      nowGameTime.month,
      nowGameTime.day,
      nowGameTime.hours,
      nowGameTime.minutes
    );

    const currentWeekKey = this._getWeekKey(now);
    if (this._hasTemplateVariants() && currentWeekKey !== this.currentWeekKey) {
      this.generateWeeklySchedule(nowGameTime);
      return;
    }

    this._unlockDayTasks(now);
    this._cancelLateTasks(now);
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
    const now = this._now();

    for (let i = currentIndex + 1; i < count; i += 1) {
      const task = this.tasks[i];
      if (this._canVisitTask(task, now)) {
        return i;
      }
    }

    for (let i = 0; i < count; i += 1) {
      const task = this.tasks[i];
      if (this._canVisitTask(task, now)) {
        return i;
      }
    }

    return currentIndex;
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
   * Выполнить отмену оставшихся задач дня, когда уже поздно
   * @param {Date} now
   */
  _cancelLateTasks(now) {
    const lateCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), this.options.lateHour, 0, 0, 0);
    if (now < lateCutoff) return;

    const targetDay = this._formatDayKey(now);

    this.tasks.forEach((task, index) => {
      if (task.location === 'house') return;
      if (task.dayKey !== targetDay) return;

      const isPlannedLate = task.startTime >= lateCutoff;
      const isActiveAndLate = task.status === 'ACTIVE' && now >= lateCutoff;
      const isPendingLate = task.status === 'PENDING' && now >= lateCutoff;

      if (!isPlannedLate && !isActiveAndLate && !isPendingLate) {
        return;
      }

      task.status = 'CANCELLED';
      task.actualStartTime = null;
      task.actualEndTime = null;

      if (index === this.currentTaskIndex) {
        const nextIndex = this.getNextIndex(index);
        if (nextIndex !== index) {
          this.currentTaskIndex = nextIndex;
        }
      }
    });
  }

  /**
   * Разблокировать задачи текущего дня
   * @param {Date} now
   */
  _unlockDayTasks(now) {
    const targetDay = this._formatDayKey(now);
    let activeFound = false;

    this.tasks.forEach((task, index) => {
      if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
        return;
      }

      if (task.startTime <= now && task.endTime >= now && !activeFound) {
        task.status = 'ACTIVE';
        this.currentTaskIndex = index;
        activeFound = true;
      } else if (task.startTime < now && task.endTime < now && task.status !== 'ACTIVE') {
        task.status = 'COMPLETED';
      } else if (task.status === 'PENDING' && task.dayKey === targetDay && task.startTime <= now && !activeFound) {
        task.status = 'ACTIVE';
        this.currentTaskIndex = index;
        activeFound = true;
      }
    });
  }

  /**
   * Проверить, можно ли посещать задачу в текущий момент
   * @param {Object|null} task
   * @param {Date} now
   * @returns {boolean}
   */
  _canVisitTask(task, now) {
    if (!task) return false;
    if (task.status !== 'PENDING' && task.status !== 'ACTIVE') return false;
    if (!task.startTime) return task.status !== 'CANCELLED';

    const sameDay = this._formatDayKey(task.startTime) === this._formatDayKey(now);
    return sameDay || task.startTime <= now;
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

  /**
   * Построить расписание на неделю относительно начала недели
   * @param {Date} weekStart
   * @returns {{tasks: Array}}
   */
  _buildWeeklyTasks(weekStart) {
    const tasks = [];
    let globalOrder = 0;

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const dayDate = new Date(weekStart.getTime());
      dayDate.setDate(weekStart.getDate() + dayOffset);
      dayDate.setHours(this.options.dayStartHour, this.options.dayStartMinute, 0, 0);

      const isWeekend = dayOffset >= 5;
      const dayTemplates = isWeekend ? this.templates.weekend : this.templates.weekday;
      const template = this._selectTemplate(dayTemplates, dayDate, isWeekend ? 'weekend' : 'weekday');
      const dayKey = this._formatDayKey(dayDate);
      const dayLabel = this._formatDayLabel(dayDate);

      let pointer = new Date(dayDate.getTime());

      template.tasks.forEach((taskConfig, idx) => {
        const startTime = new Date(pointer.getTime());
        const stayMillis = (taskConfig.stayHours || 0) * 60 * 60 * 1000;
        const endTime = new Date(startTime.getTime() + stayMillis);
        pointer = new Date(endTime.getTime());

        tasks.push({
          id: `${dayKey}-${template.id}-${idx}`,
          order: globalOrder,
          dayIndex: dayOffset,
          dayKey,
          dayLabel,
          templateId: template.id,
          templateTitle: template.title,
          name: taskConfig.name,
          location: taskConfig.location,
          duration: taskConfig.stayHours || 0,
          stayHours: taskConfig.stayHours || 0,
          startTime,
          endTime,
          isWeekend,
          actualStartTime: null,
          actualEndTime: null,
          status: 'PENDING'
        });

        globalOrder += 1;
      });
    }

    return { tasks };
  }

  /**
   * Выбрать шаблон дня (опционально детерминированно)
   * @param {Array} templates
   * @param {Date} dayDate
   * @param {string} type
   * @returns {Object}
   */
  _selectTemplate(templates, dayDate, type) {
    if (!templates || !templates.length) {
      return {
        id: `${type}-default`,
        title: 'Базовый день',
        tasks: this.config?.ROUTE_SCHEDULE || []
      };
    }

    const seedIndex = Math.abs(this._hash(`${dayDate.toISOString()}-${type}-${templates.length}`)) % templates.length;
    const randomOffset = Math.floor(this.randomFn() * templates.length);
    const index = (seedIndex + randomOffset) % templates.length;
    return templates[index];
  }

  /**
   * Подготовить статусы задач в соответствии с текущим временем
   * @param {Date} now
   */
  _prepareInitialStatuses(now) {
    let activeSet = false;

    this.tasks.forEach((task, index) => {
      if (task.endTime <= now) {
        task.status = 'COMPLETED';
      } else if (!activeSet && task.startTime <= now && task.endTime > now) {
        task.status = 'ACTIVE';
        this.currentTaskIndex = index;
        activeSet = true;
      } else {
        task.status = 'PENDING';
      }
    });

    if (!activeSet && this.tasks.length) {
      this.tasks[0].status = 'ACTIVE';
      this.currentTaskIndex = 0;
    }
  }

  /**
   * Получить начало недели (понедельник) для указанной даты
   * @param {Date} date
   * @returns {Date}
   */
  _getWeekStart(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), this.options.dayStartHour, this.options.dayStartMinute, 0, 0);
    const day = result.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // переводим воскресенье в прошлый понедельник
    result.setDate(result.getDate() + diff);
    result.setHours(this.options.dayStartHour, this.options.dayStartMinute, 0, 0);
    return result;
  }

  /**
   * Сформировать ключ недели
   * @param {Date} date
   * @returns {string}
   */
  _getWeekKey(date) {
    const weekStart = this._getWeekStart(date);
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    return `${year}-W-${month}-${day}`;
  }

  /**
   * Отформатировать день для вывода
   * @param {Date} date
   * @returns {string}
   */
  _formatDayLabel(date) {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName} ${day}.${month}`;
  }

  /**
   * Ключ для идентификации дня
   * @param {Date} date
   * @returns {string}
   */
  _formatDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Простая хеш-функция для стабилизации выбора
   * @param {string} str
   * @returns {number}
   */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export default ScheduleManager;
