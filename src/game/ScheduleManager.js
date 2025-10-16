import { WEEKDAY_TEMPLATES, WEEKEND_TEMPLATES } from '../config/scheduleTemplates.js';

const STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  IDLE: 'IDLE'
};

/**
 * ScheduleManager управляет задачами на текущий день.
 * - Генерирует дела утром на основе шаблонов (будни/выходные)
 * - Поддерживает fallback "домой", но не показывает его в UI
 * - Позволяет игре получать следующую задачу или вернуть Шину домой
 */
export class ScheduleManager {
  constructor(config, timeManager = null, options = {}) {
    this.config = config;
    this.timeManager = timeManager;
    this.options = {
      dayStartHour: options.dayStartHour ?? 8,
      dayStartMinute: options.dayStartMinute ?? 0,
      lateHour: options.lateHour ?? 22
    };

    this.randomFn = typeof options.random === 'function' ? options.random : Math.random;
    this.templates = options.scheduleTemplates || {
      weekday: WEEKDAY_TEMPLATES,
      weekend: WEEKEND_TEMPLATES
    };

    this.tasks = [];
    this.currentTaskIndex = null;
    this.currentDayKey = null;
    this.homeTask = this._createHomeTask();

    this.generateTodaySchedule();
  }

  /**
   * Обновить состояние расписания (вызывается каждый кадр)
   * @param {Object|null} gameTime
   */
  update(gameTime = null) {
    const now = this._resolveDate(gameTime);
    this.generateTodaySchedule(gameTime);
    this._prepareStatuses(now);
    this._cancelLateTasks(now);
    this._prepareStatuses(now);
  }

  /**
   * Сгенерировать дела на текущий день (если день сменился)
   * @param {Object|null} gameTimeOverride
   */
  generateTodaySchedule(gameTimeOverride = null) {
    const now = this._resolveDate(gameTimeOverride);
    const dayKey = this._formatDayKey(now);
    if (this.currentDayKey === dayKey) {
      return;
    }

    this.currentDayKey = dayKey;

    const dayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      this.options.dayStartHour,
      this.options.dayStartMinute,
      0,
      0
    );

    const template = this._selectTemplate(now);
    this.tasks = this._buildTasksFromTemplate(template, dayStart);
    this.homeTask = this._createHomeTask(dayStart);

    this.tasks.forEach(task => {
      task.status = STATUS.PENDING;
      task.actualStartTime = null;
      task.actualEndTime = null;
    });

    this.homeTask.status = this.tasks.length ? STATUS.IDLE : STATUS.ACTIVE;
    this.homeTask.actualStartTime = null;
    this.homeTask.actualEndTime = null;

    this.currentTaskIndex = this.tasks.length ? 0 : this.getHomeIndex();
    this._prepareStatuses(now);
  }

  /**
   * Получить общее количество "индексов" (дела + дом)
   */
  getTaskCount() {
    return this.tasks.length + 1; // +1 для fallback "домой"
  }

  /**
   * Индекс fallback "домой"
   * @returns {number}
   */
  getHomeIndex() {
    return this.tasks.length;
  }

  /**
   * Получить задачу по индексу (включая дом)
   */
  getTaskByIndex(index) {
    if (index == null) return null;
    if (index < 0) return null;
    if (index < this.tasks.length) {
      return this.tasks[index] || null;
    }
    if (index === this.getHomeIndex()) {
      return this.homeTask;
    }
    return null;
  }

  /**
   * Установить текущий индекс задачи
   * @param {number|null} index
   */
  setCurrentTaskIndex(index) {
    if (index == null) {
      this.currentTaskIndex = this.getHomeIndex();
      return;
    }

    const clamped = Math.max(0, Math.min(index, this.getHomeIndex()));
    this.currentTaskIndex = clamped;
  }

  /**
   * Получить текущий активный индекс
   */
  getActiveTaskIndex() {
    if (this.currentTaskIndex != null) {
      return this.currentTaskIndex;
    }

    const activeIndex = this.tasks.findIndex(task => task.status === STATUS.ACTIVE);
    if (activeIndex >= 0) {
      this.currentTaskIndex = activeIndex;
      return activeIndex;
    }

    if (this.homeTask.status === STATUS.ACTIVE) {
      this.currentTaskIndex = this.getHomeIndex();
      return this.currentTaskIndex;
    }

    const pendingIndex = this.tasks.findIndex(task => task.status === STATUS.PENDING);
    if (pendingIndex >= 0) {
      this.currentTaskIndex = pendingIndex;
      return pendingIndex;
    }

    this.currentTaskIndex = this.getHomeIndex();
    return this.currentTaskIndex;
  }

  /**
   * Получить следующую задачу после текущей
   * @param {number|null} currentIndex
   * @returns {number}
   */
  getNextIndex(currentIndex, referenceTime = null) {
    const homeIndex = this.getHomeIndex();
    const now = this._resolveDate(referenceTime);
    const nowMs = now ? now.getTime() : Date.now();

    if (currentIndex == null) {
      const firstAvailable = this.tasks.findIndex(task => {
        if (task.status === STATUS.COMPLETED || task.status === STATUS.CANCELLED) return false;
        if (task.startTime && task.startTime.getTime() > nowMs) return false;
        return true;
      });
      return firstAvailable >= 0 ? firstAvailable : homeIndex;
    }

    if (currentIndex >= homeIndex) {
      const nextActive = this.tasks.findIndex(task => {
        if (task.status === STATUS.COMPLETED || task.status === STATUS.CANCELLED) return false;
        if (task.startTime && task.startTime.getTime() > nowMs) return false;
        return true;
      });
      return nextActive >= 0 ? nextActive : homeIndex;
    }

    for (let i = currentIndex + 1; i < this.tasks.length; i += 1) {
      const task = this.tasks[i];
      if (task.status !== STATUS.COMPLETED && task.status !== STATUS.CANCELLED) {
        if (task.startTime && task.startTime.getTime() > nowMs) {
          return homeIndex;
        }
        return i;
      }
    }

    return homeIndex;
  }

  /**
   * Пометить задачу как активную
   */
  startTask(index, startDate = null) {
    if (index == null) return;
    const homeIndex = this.getHomeIndex();

    if (index === homeIndex) {
      this.homeTask.status = STATUS.ACTIVE;
      this.homeTask.actualStartTime = startDate || this._now();
      this.currentTaskIndex = homeIndex;
      return;
    }

    const task = this.getTaskByIndex(index);
    if (!task) return;

    this.currentTaskIndex = index;
    this.homeTask.status = STATUS.IDLE;

    this.tasks.forEach((item, i) => {
      if (i === index) {
        item.status = STATUS.ACTIVE;
        item.actualStartTime = startDate || item.actualStartTime || this._now();
        item.actualEndTime = null;
      } else if (i < index && item.status !== STATUS.CANCELLED) {
        item.status = STATUS.COMPLETED;
      } else if (i > index && item.status === STATUS.COMPLETED) {
        item.status = STATUS.PENDING;
      }
    });
  }

  /**
   * Пометить задачу как завершённую
   */
  completeTask(index, endDate = null) {
    if (index == null) return;
    const homeIndex = this.getHomeIndex();

    if (index === homeIndex) {
      this.homeTask.status = STATUS.COMPLETED;
      this.homeTask.actualEndTime = endDate || this._now();
      return;
    }

    const task = this.getTaskByIndex(index);
    if (!task) return;

    task.status = STATUS.COMPLETED;
    task.actualEndTime = endDate || this._now();

    const hasPendingTasks = this.tasks.some(item => item.status === STATUS.PENDING);
    if (!hasPendingTasks) {
      this.homeTask.status = STATUS.PENDING;
    }
  }

  /**
   * Получить текущее активное дело (если нужно)
   */
  getCurrentTask() {
    const index = this.getActiveTaskIndex();
    return this.getTaskByIndex(index);
  }

  /**
   * Получить предстоящее дело
   */
  getUpcomingTask() {
    return this.tasks.find(task => task.status === STATUS.PENDING) || null;
  }

  /**
   * Получить все дела для отображения (без fallback "домой")
   */
  getAllTasks() {
    return this.tasks.map(task => ({ ...task }));
  }

  /**
   * Fallback-задача
   */
  getFallbackTask() {
    return { ...this.homeTask };
  }

  /**
   * Получить backup при пустом дне
   */
  getReturnHomeTask() {
    return this.homeTask;
  }

  /**
   * Помечает задачу как отменённую
   */
  cancelTask(index) {
    const task = this.getTaskByIndex(index);
    if (!task || task === this.homeTask) return;

    task.status = STATUS.CANCELLED;
    task.actualStartTime = null;
    task.actualEndTime = null;
  }

  /**
   * Снять все статусы (используется при смене дня)
   */
  resetStatuses() {
    this.tasks.forEach(task => {
      task.status = STATUS.PENDING;
      task.actualStartTime = null;
      task.actualEndTime = null;
    });
    this.homeTask.status = this.tasks.length ? STATUS.IDLE : STATUS.ACTIVE;
    this.homeTask.actualStartTime = null;
    this.homeTask.actualEndTime = null;
    this.currentTaskIndex = this.tasks.length ? 0 : this.getHomeIndex();
  }

  /**
   * Внутренний helper: создать fallback "домой"
   */
  _createHomeTask(dayStart = null) {
    const start = dayStart || this._now();
    return {
      id: `home-${this._formatDayKey(start)}`,
      order: this.tasks.length,
      name: 'Дом',
      location: 'house',
      duration: 0,
      stayHours: 0,
      startTime: new Date(start.getTime()),
      endTime: new Date(start.getTime()),
      dayKey: this._formatDayKey(start),
      dayLabel: this._formatDayLabel(start),
      status: STATUS.IDLE,
      hidden: true,
      actualStartTime: null,
      actualEndTime: null
    };
  }

  /**
   * Построить задачи из шаблона
   */
  _buildTasksFromTemplate(template, dayStart) {
    if (!template || !Array.isArray(template.tasks) || !template.tasks.length) {
      return [];
    }

    const tasks = [];
    let pointer = new Date(dayStart.getTime());

    template.tasks.forEach((taskConfig, index) => {
      const start = new Date(pointer.getTime());
      const stayMillis = Math.max(taskConfig.stayHours || 0, 0) * 60 * 60 * 1000;
      const end = new Date(start.getTime() + stayMillis);
      pointer = new Date(end.getTime());

      tasks.push({
        id: `${template.id}-${index}`,
        order: index,
        templateId: template.id,
        templateTitle: template.title,
        name: taskConfig.name,
        location: taskConfig.location,
        duration: taskConfig.stayHours || 0,
        stayHours: taskConfig.stayHours || 0,
        startTime: start,
        endTime: end,
        dayKey: this._formatDayKey(start),
        dayLabel: this._formatDayLabel(start),
        status: STATUS.PENDING,
        actualStartTime: null,
        actualEndTime: null
      });
    });

    return tasks;
  }

  /**
   * Выбор подходящего шаблона
   */
  _selectTemplate(date) {
    const isWeekend = [0, 6].includes(date.getDay());
    const pool = isWeekend ? this.templates.weekend : this.templates.weekday;
    if (!pool || !pool.length) {
      return null;
    }
    const index = Math.floor(this.randomFn() * pool.length);
    return pool[index];
  }

  /**
   * Подготовка статусов в зависимости от текущего времени
   */
  _prepareStatuses(now) {
    if (!now) return;

    const nowMs = now.getTime();
    let activeSet = false;

    this.tasks.forEach((task, index) => {
      if (task.status === STATUS.CANCELLED || task.status === STATUS.COMPLETED) {
        return;
      }

      const startMs = task.startTime ? task.startTime.getTime() : null;
      if (task.status === STATUS.ACTIVE) {
        this.currentTaskIndex = index;
        activeSet = true;
        return;
      }

      if (startMs && startMs <= nowMs && !activeSet) {
        task.status = STATUS.ACTIVE;
        this.currentTaskIndex = index;
        activeSet = true;
      } else {
        task.status = STATUS.PENDING;
      }
    });

    if (!activeSet) {
      this.homeTask.status = STATUS.ACTIVE;
      this.currentTaskIndex = this.getHomeIndex();
    } else {
      this.homeTask.status = STATUS.IDLE;
    }
  }

  /**
   * Отменить оставшиеся дела, если уже поздно
   */
  _cancelLateTasks(now) {
    if (!this.tasks.length) return;

    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      this.options.lateHour,
      0,
      0,
      0
    );

    if (now < cutoff) return;

    let cancelledAny = false;

    this.tasks.forEach((task, index) => {
      if (task.status === STATUS.COMPLETED || task.status === STATUS.CANCELLED) return;

      task.status = STATUS.CANCELLED;
      task.actualStartTime = null;
      task.actualEndTime = null;
      cancelledAny = true;

      if (index === this.currentTaskIndex) {
        this.currentTaskIndex = this.getHomeIndex();
      }
    });

    if (cancelledAny) {
      this.homeTask.status = STATUS.ACTIVE;
      this.homeTask.actualStartTime = now;
      this.homeTask.actualEndTime = null;
      this.currentTaskIndex = this.getHomeIndex();
    }
  }

  /**
   * Конвертация игрового времени в Date
   */
  _resolveDate(gameTime = null) {
    if (gameTime) {
      const source = Array.isArray(gameTime) ? gameTime[0] : gameTime;
      if (source && typeof source === 'object' && 'year' in source) {
        return this._toDate(
          source.year,
          source.month,
          source.day,
          source.hours ?? this.options.dayStartHour,
          source.minutes ?? this.options.dayStartMinute
        );
      }
    }

    if (this.timeManager && typeof this.timeManager.getGameTime === 'function') {
      const time = this.timeManager.getGameTime();
      return this._toDate(time.year, time.month, time.day, time.hours, time.minutes);
    }

    return this._now();
  }

  /**
   * Создать Date из компонентов
   */
  _toDate(year, month, day, hours = 0, minutes = 0) {
    return new Date(year, month, day, Math.floor(hours), Math.floor(minutes), 0, 0);
  }

  /**
   * Текущее Date
   */
  _now() {
    return new Date();
  }

  /**
   * Формат ключа дня
   */
  _formatDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Формат подписи дня
   */
  _formatDayLabel(date) {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const dayName = days[date.getDay()] || '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayName} ${day}.${month}`;
  }
}

export default ScheduleManager;
