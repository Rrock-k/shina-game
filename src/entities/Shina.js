/**
 * Класс персонажа Шина - основная сущность для игровой механики
 * Управляет состояниями доступности, взаимодействием с друзьями и игровой логикой
 */
export class Shina {
  constructor(config, options = {}) {
    this.config = config;
    
    // Основные свойства персонажа
    this.name = 'Шина';
    this.position = { x: 0, y: 0 };
    this.isVisible = true;
    
    // Состояния доступности
    this.currentState = 'available'; // 'available', 'atWork', 'sleeping', 'driving'
    this.stateHistory = [];
    
    // Временные параметры состояний
    this.stateStartTime = Date.now();
    this.stateDuration = 0; // 0 означает неопределенное время
    
    // Рабочий график
    this.workSchedule = {
      startHour: 9,    // 9:00
      endHour: 18,     // 18:00
      workDays: [1, 2, 3, 4, 5] // Понедельник - Пятница
    };
    
    // График сна
    this.sleepSchedule = {
      sleepHour: 23,   // 23:00
      wakeHour: 7,     // 7:00
      sleepDays: [0, 1, 2, 3, 4, 5, 6] // Все дни недели
    };
    
    
    // Callback функции
    this.onStateChange = null;
    this.onAvailabilityChange = null;
    this.onMessageReceived = null;
    
    // Инициализация с переданными опциями
    this.init(options);
  }

  /**
   * Инициализация персонажа
   * @param {Object} options - опции инициализации
   */
  init(options = {}) {
    this.position = { ...options.position } || { x: 0, y: 0 };
    this.currentState = options.initialState || 'available';
    this.isVisible = options.isVisible !== undefined ? options.isVisible : true;
    
    this.onStateChange = options.onStateChange || null;
    this.onAvailabilityChange = options.onAvailabilityChange || null;
    this.onMessageReceived = options.onMessageReceived || null;
    
    this.stateStartTime = Date.now();
    
    // Добавляем начальное состояние в историю
    this.stateHistory.push({
      state: this.currentState,
      startTime: this.stateStartTime,
      duration: 0
    });
  }

  /**
   * Установить позицию персонажа
   * @param {Object} position - объект с координатами {x, y}
   */
  setPosition(position) {
    this.position = { ...position };
  }

  /**
   * Получить позицию персонажа
   * @returns {Object} объект с координатами {x, y}
   */
  getPosition() {
    return { ...this.position };
  }

  /**
   * Установить текущее состояние
   * @param {string} state - новое состояние
   * @param {Object} options - опции смены состояния
   */
  setState(state, options = {}) {
    if (this.currentState === state) return;

    const oldState = this.currentState;
    const stateChangeTime = Date.now();
    
    // Завершаем предыдущее состояние
    if (this.stateHistory.length > 0) {
      const lastState = this.stateHistory[this.stateHistory.length - 1];
      lastState.duration = stateChangeTime - lastState.startTime;
    }
    
    this.currentState = state;
    this.stateStartTime = stateChangeTime;
    this.stateDuration = options.duration || 0;
    
    // Добавляем новое состояние в историю
    this.stateHistory.push({
      state: this.currentState,
      startTime: this.stateStartTime,
      duration: 0
    });
    
    
    // Вызываем callback
    if (this.onStateChange) {
      this.onStateChange(oldState, this.currentState, this);
    }
    
    if (this.onAvailabilityChange) {
      this.onAvailabilityChange(this.isAvailable(), this);
    }
  }

  /**
   * Получить текущее состояние
   * @returns {string} текущее состояние
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Проверить, доступен ли персонаж
   * @returns {boolean} true если доступен
   */
  isAvailable() {
    return this.currentState === 'available';
  }

  /**
   * Проверить, на работе ли персонаж
   * @returns {boolean} true если на работе
   */
  isAtWork() {
    return this.currentState === 'atWork';
  }

  /**
   * Проверить, спит ли персонаж
   * @returns {boolean} true если спит
   */
  isSleeping() {
    return this.currentState === 'sleeping';
  }

  /**
   * Проверить, едет ли персонаж
   * @returns {boolean} true если едет
   */
  isDriving() {
    return this.currentState === 'driving';
  }

  /**
   * Обновление персонажа (вызывается каждый кадр)
   * @param {Object} options - опции для обновления
   */
  update(options = {}) {
    const {
      timeManager,
      debugLog
    } = options;

    if (!timeManager) return;

    const gameTime = timeManager.getGameTime();
    const currentHour = gameTime.hours;
    const currentDay = gameTime.dayOfWeek; // 0 = воскресенье, 1 = понедельник, и т.д.

    // Определяем состояние на основе времени
    const newState = this.determineStateFromTime(currentHour, currentDay);
    
    if (newState !== this.currentState) {
      this.setState(newState);
    }
  }

  /**
   * Определить состояние на основе времени
   * @param {number} hour - текущий час
   * @param {number} dayOfWeek - день недели (0-6)
   * @returns {string} состояние
   */
  determineStateFromTime(hour, dayOfWeek) {
    const isWorkDay = this.workSchedule.workDays.includes(dayOfWeek);
    
    if (isWorkDay && hour >= this.workSchedule.startHour && hour < this.workSchedule.endHour) {
      return 'atWork';
    }
    
    if (hour >= this.sleepSchedule.sleepHour || hour < this.sleepSchedule.wakeHour) {
      return 'sleeping';
    }
    
    // В остальное время доступен
    return 'available';
  }

  /**
   * Установить состояние "еду"
   * @param {Object} options - опции для состояния
   */
  setDrivingState(options = {}) {
    this.setState('driving', {
      duration: options.duration || 0
    });
  }

  /**
   * Выйти из состояния "еду"
   */
  exitDrivingState(options = {}) {
    if (this.currentState !== 'driving') return;

    const { timeManager, gameTime } = options;

    let sourceTime = gameTime || null;
    if (!sourceTime && timeManager) {
      sourceTime = timeManager.getGameTime();
    }

    if (!sourceTime) {
      console.warn('⚠️ Shina.exitDrivingState: нет игрового времени, используем системное');
      const now = new Date();
      sourceTime = {
        hours: now.getHours(),
        dayOfWeek: now.getDay()
      };
    }

    const hour = typeof sourceTime.hours === 'number'
      ? sourceTime.hours
      : sourceTime instanceof Date
        ? sourceTime.getHours()
        : new Date().getHours();

    const dayOfWeek = typeof sourceTime.dayOfWeek === 'number'
      ? sourceTime.dayOfWeek
      : sourceTime instanceof Date
        ? sourceTime.getDay()
        : new Date().getDay();
    const newState = this.determineStateFromTime(hour, dayOfWeek);
    this.setState(newState);
  }

  /**
   * Получить сообщение от друга
   * @param {Object} message - сообщение
   */
  receiveMessage(message) {
    if (this.onMessageReceived) {
      this.onMessageReceived(message, this);
    }
  }

  /**
   * Отправить сообщение другу
   * @param {Object} friend - друг
   * @param {Object} message - сообщение
   */
  sendMessage(friend, message) {
    if (friend && friend.receiveMessage) {
      friend.receiveMessage(message);
    }
  }

  /**
   * Список друзей
   */
  friends = new Map();

  /**
   * Добавить друга
   * @param {Object} friend - друг
   */
  addFriend(friend) {
    if (friend && friend.name) {
      this.friends.set(friend.name, friend);
    }
  }

  /**
   * Удалить друга
   * @param {string} friendName - имя друга
   */
  removeFriend(friendName) {
    this.friends.delete(friendName);
  }

  /**
   * Получить друга по имени
   * @param {string} friendName - имя друга
   * @returns {Object|null} друг или null
   */
  getFriend(friendName) {
    return this.friends.get(friendName) || null;
  }

  /**
   * Получить список всех друзей
   * @returns {Array} массив друзей
   */
  getAllFriends() {
    return Array.from(this.friends.values());
  }

  /**
   * Получить доступных друзей
   * @returns {Array} массив доступных друзей
   */
  getAvailableFriends() {
    return this.getAllFriends().filter(friend => 
      friend.isAvailable && friend.isAvailable()
    );
  }

  /**
   * Отправить сообщение всем доступным друзьям
   * @param {Object} message - сообщение
   */
  broadcastMessage(message) {
    const availableFriends = this.getAvailableFriends();
    availableFriends.forEach(friend => {
      this.sendMessage(friend, message);
    });
  }

  /**
   * Получить уведомление о изменении состояния друга
   * @param {Object} friend - друг
   * @param {string} oldState - старое состояние
   * @param {string} newState - новое состояние
   */
  onFriendStateChange(friend, oldState, newState) {
    console.log(`👥 ${friend.name} изменил состояние: ${oldState} → ${newState}`);
    
    // Можно добавить логику для уведомлений
    if (newState === 'available' && this.isAvailable()) {
      console.log(`💬 ${friend.name} теперь доступен для общения!`);
    }
  }

  /**
   * Проверить, есть ли уведомления от друзей
   * @returns {Array} массив уведомлений
   */
  getNotifications() {
    const notifications = [];
    
    this.friends.forEach(friend => {
      if (friend.lastStateChange && friend.lastStateChange > this.lastNotificationCheck) {
        notifications.push({
          type: 'state_change',
          friend: friend.name,
          message: `${friend.name} изменил состояние на ${friend.currentState}`
        });
      }
    });
    
    return notifications;
  }

  /**
   * Время последней проверки уведомлений
   */
  lastNotificationCheck = Date.now();

  /**
   * Обновить время последней проверки уведомлений
   */
  updateNotificationCheck() {
    this.lastNotificationCheck = Date.now();
  }

  /**
   * Получить статистику общения с друзьями
   * @returns {Object} статистика общения
   */
  getCommunicationStats() {
    const stats = {
      totalFriends: this.friends.size,
      availableFriends: this.getAvailableFriends().length,
      messagesSent: 0,
      messagesReceived: 0,
      lastActivity: this.lastNotificationCheck
    };
    
    // Подсчитываем сообщения (если есть система подсчета)
    this.friends.forEach(friend => {
      if (friend.messagesSent) stats.messagesSent += friend.messagesSent;
      if (friend.messagesReceived) stats.messagesReceived += friend.messagesReceived;
    });
    
    return stats;
  }

  /**
   * Создать группу друзей
   * @param {string} groupName - название группы
   * @param {Array} friendNames - имена друзей
   */
  createFriendGroup(groupName, friendNames) {
    const group = {
      name: groupName,
      members: friendNames.filter(name => this.friends.has(name)),
      createdAt: Date.now()
    };
    
    this.friendGroups = this.friendGroups || new Map();
    this.friendGroups.set(groupName, group);
  }

  /**
   * Отправить сообщение группе друзей
   * @param {string} groupName - название группы
   * @param {Object} message - сообщение
   */
  sendMessageToGroup(groupName, message) {
    if (!this.friendGroups || !this.friendGroups.has(groupName)) {
      console.warn(`Группа ${groupName} не найдена`);
      return;
    }
    
    const group = this.friendGroups.get(groupName);
    group.members.forEach(friendName => {
      const friend = this.getFriend(friendName);
      if (friend) {
        this.sendMessage(friend, message);
      }
    });
  }


  /**
   * Установить callback для изменения состояния
   * @param {Function} callback - функция обратного вызова
   */
  setOnStateChange(callback) {
    this.onStateChange = callback;
  }

  /**
   * Установить callback для изменения доступности
   * @param {Function} callback - функция обратного вызова
   */
  setOnAvailabilityChange(callback) {
    this.onAvailabilityChange = callback;
  }

  /**
   * Установить callback для получения сообщений
   * @param {Function} callback - функция обратного вызова
   */
  setOnMessageReceived(callback) {
    this.onMessageReceived = callback;
  }

  /**
   * Установить рабочий график
   * @param {Object} schedule - объект с расписанием работы
   */
  setWorkSchedule(schedule) {
    this.workSchedule = { ...this.workSchedule, ...schedule };
  }

  /**
   * Установить график сна
   * @param {Object} schedule - объект с расписанием сна
   */
  setSleepSchedule(schedule) {
    this.sleepSchedule = { ...this.sleepSchedule, ...schedule };
  }

  /**
   * Получить время до следующего изменения состояния
   * @param {Object} options - опции для расчета
   * @returns {Object} объект с информацией о времени
   */
  getTimeToNextStateChange(options = {}) {
    const {
      timeManager
    } = options;

    if (!timeManager) {
      return { hours: 0, minutes: 0, state: this.currentState };
    }

    const gameTime = timeManager.getGameTime();
    const currentHour = gameTime.hours;
    const currentDay = gameTime.dayOfWeek;

    let nextChangeTime = null;
    let nextState = this.currentState;

    const possibleStates = ['available', 'atWork', 'sleeping'];
    
    for (const state of possibleStates) {
      if (state === this.currentState) continue;
      
      const changeTime = this.getTimeToState(state, currentHour, currentDay);
      if (changeTime && (!nextChangeTime || changeTime < nextChangeTime)) {
        nextChangeTime = changeTime;
        nextState = state;
      }
    }

    if (!nextChangeTime) {
      return { hours: 0, minutes: 0, state: this.currentState };
    }

    const hours = Math.floor(nextChangeTime / 60);
    const minutes = nextChangeTime % 60;

    return { hours, minutes, state: nextState };
  }

  /**
   * Получить время до определенного состояния
   * @param {string} targetState - целевое состояние
   * @param {number} currentHour - текущий час
   * @param {number} currentDay - текущий день недели
   * @returns {number|null} время в минутах или null
   */
  getTimeToState(targetState, currentHour, currentDay) {
    const currentTime = currentHour * 60; // в минутах

    switch (targetState) {
      case 'atWork':
        if (this.workSchedule.workDays.includes(currentDay)) {
          const workStart = this.workSchedule.startHour * 60;
          if (currentTime < workStart) {
            return workStart - currentTime;
          }
        }
        break;

      case 'sleeping':
        const sleepStart = this.sleepSchedule.sleepHour * 60;
        if (currentTime < sleepStart) {
          return sleepStart - currentTime;
        }
        break;

      case 'available':
        if (this.workSchedule.workDays.includes(currentDay)) {
          const workEnd = this.workSchedule.endHour * 60;
          if (currentTime < workEnd) {
            return workEnd - currentTime;
          }
        }
        const wakeTime = this.sleepSchedule.wakeHour * 60;
        if (currentTime < wakeTime) {
          return wakeTime - currentTime;
        }
        break;
    }

    return null;
  }

  /**
   * Получить статистику состояний за период
   * @param {number} days - количество дней
   * @returns {Object} статистика состояний
   */
  getStateStatistics(days = 7) {
    const stats = {
      available: 0,
      atWork: 0,
      sleeping: 0,
      driving: 0
    };

    // Простой расчет на основе расписания
    const totalMinutes = days * 24 * 60;
    const workMinutes = this.workSchedule.workDays.length * (this.workSchedule.endHour - this.workSchedule.startHour) * 60;
    const sleepMinutes = days * (24 - this.sleepSchedule.wakeHour + this.sleepSchedule.sleepHour) * 60;
    const availableMinutes = totalMinutes - workMinutes - sleepMinutes;

    stats.atWork = workMinutes;
    stats.sleeping = sleepMinutes;
    stats.available = Math.max(0, availableMinutes);

    return stats;
  }

  /**
   * Проверить, можно ли отправить сообщение
   * @returns {boolean} true если можно отправить сообщение
   */
  canReceiveMessages() {
    return this.currentState === 'available' || this.currentState === 'atWork';
  }

  /**
   * Получить статус доступности для друзей
   * @returns {Object} объект со статусом
   */
  getAvailabilityStatus() {
    return {
      isAvailable: this.isAvailable(),
      currentState: this.currentState,
      canReceiveMessages: this.canReceiveMessages(),
      timeToNextChange: this.getTimeToNextStateChange(),
      lastSeen: this.stateStartTime
    };
  }

  /**
   * Принудительно установить состояние (для тестирования)
   * @param {string} state - состояние
   * @param {Object} options - опции
   */
  forceState(state, options = {}) {
    this.setState(state, {
      duration: options.duration || 0,
      force: true
    });
  }

  /**
   * Сбросить к состоянию по времени
   * @param {Object} options - опции
   */
  resetToTimeBasedState(options = {}) {
    const {
      timeManager
    } = options;

    if (!timeManager) return;

    const gameTime = timeManager.getGameTime();
    const newState = this.determineStateFromTime(gameTime.hours, gameTime.dayOfWeek);
    this.setState(newState);
  }

  /**
   * Получить данные для визуального представления (View Model)
   * @returns {Object} объект с данными для рендеринга
   */
  getViewState() {
    return {
      position: this.position,
      isVisible: this.isVisible,
      currentState: this.currentState
    };
  }

  /**
   * Получить информацию о персонаже для отладки
   * @returns {Object} объект с информацией о состоянии
   */
  getDebugInfo() {
    return {
      name: this.name,
      position: this.position,
      currentState: this.currentState,
      isAvailable: this.isAvailable(),
      stateStartTime: this.stateStartTime,
      stateDuration: this.stateDuration,
      stateHistory: this.stateHistory,
      workSchedule: this.workSchedule,
      sleepSchedule: this.sleepSchedule,
      canReceiveMessages: this.canReceiveMessages(),
      availabilityStatus: this.getAvailabilityStatus()
    };
  }
}
