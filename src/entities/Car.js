import { MovementController } from '../systems/MovementController.js';

/**
 * Класс машины - основная сущность для движения по карте
 * Управляет позицией, маршрутом, состоянием и взаимодействием с системами
 */
export class Car {
  constructor(config, pauseManager) {
    this.config = config;
    this.pauseManager = pauseManager;
    
    // Основные свойства машины
    this.position = { x: 0, y: 0 };
    this.rotation = 0;
    this.speed = 0;
    this.isMoving = false;
    
    // Маршрут и навигация
    this.path = [];
    this.currentSegment = 0;
    this.progress = 0;
    this._isAtDestination = false;
    this.stayTimer = 0;
    
    // Состояние для плавного продолжения движения
    this.savedState = null;
    
    // Текущий маршрут
    this.currentRouteIndex = 0;
    
    // Визуальное представление (будет установлено извне)
    this.sprite = null;
    this.avatar = null;
    
    // Системы взаимодействия
    this.trafficController = null;
    
    // Состояние фар
    this.headlightsOn = false;
    
    // Callback функции (будут установлены извне)
    this.onArrival = null;
    this.onStateChange = null;
    
    // Контроллер движения
    this.movementController = new MovementController(this, config);

    // Доступ к расписанию (может быть переопределен извне)
    this.scheduleAccess = {
      getTaskByIndex: null,
      getTaskCount: null
    };
  }

  /**
   * Инициализация машины
   * @param {Object} options - параметры инициализации
   */
  init(options = {}) {
    this.currentRouteIndex = options.currentRouteIndex || 0;
    this.savedState = options.savedState || null;
    this.onArrival = options.onArrival || null;
    this.onStateChange = options.onStateChange || null;
    
    if (options.initialPosition) {
      this.position = { ...options.initialPosition };
    }
    
    // Восстанавливаем сохраненное состояние
    if (this.savedState) {
      this.restoreSavedState();
    }
  }

  /**
   * Установить функции доступа к расписанию
   * @param {Object} access
   * @param {Function} access.getTaskByIndex
   * @param {Function} access.getTaskCount
   */
  setScheduleAccess(access = {}) {
    this.scheduleAccess.getTaskByIndex = access.getTaskByIndex || null;
    this.scheduleAccess.getTaskCount = access.getTaskCount || null;
  }

  /**
   * Получить задачу маршрута по индексу
   * @param {number} index
   * @returns {Object|null}
   */
  _getRouteTask(index) {
    if (this.scheduleAccess.getTaskByIndex) {
      return this.scheduleAccess.getTaskByIndex(index);
    }
    if (this.config?.ROUTE_SCHEDULE) {
      return this.config.ROUTE_SCHEDULE[index] || null;
    }
    return null;
  }

  /**
   * Получить количество задач в маршруте
   * @returns {number}
   */
  _getRouteCount() {
    if (this.scheduleAccess.getTaskCount) {
      return this.scheduleAccess.getTaskCount();
    }
    if (this.config?.ROUTE_SCHEDULE) {
      return this.config.ROUTE_SCHEDULE.length;
    }
    return 0;
  }

  /**
   * Установить путь движения
   * @param {Array} path - массив точек пути
   */
  setPath(path) {
    this.path = [...path];
    this.currentSegment = 0;
    this.progress = 0;
    this._isAtDestination = false;
    
    if (this.path.length > 0) {
      this.position = { ...this.path[0] };
    }
  }

  /**
   * Получить текущий путь
   * @returns {Array} массив точек пути
   */
  getPath() {
    return [...this.path];
  }

  /**
   * Получить текущий сегмент
   * @returns {number} индекс текущего сегмента
   */
  getCurrentSegment() {
    return this.currentSegment;
  }

  /**
   * Получить прогресс по текущему сегменту
   * @returns {number} прогресс от 0 до 1
   */
  getProgress() {
    return this.progress;
  }

  /**
   * Проверить, находится ли машина в пункте назначения
   * @returns {boolean} true если в пункте назначения
   */
  isAtDestination() {
    return this._isAtDestination;
  }

  /**
   * Установить состояние "в пункте назначения"
   * @param {boolean} value - новое состояние
   */
  setAtDestination(value) {
    this._isAtDestination = value;
  }

  /**
   * Получить таймер пребывания
   * @returns {number} время в часах
   */
  getStayTimer() {
    return this.stayTimer;
  }

  /**
   * Установить таймер пребывания
   * @param {number} hours - время в часах
   */
  setStayTimer(hours) {
    this.stayTimer = hours;
  }

  /**
   * Получить текущую позицию
   * @returns {Object} объект с координатами {x, y}
   */
  getPosition() {
    return { ...this.position };
  }

  /**
   * Установить позицию
   * @param {Object} position - объект с координатами {x, y}
   */
  setPosition(position) {
    this.position = { ...position };
  }

  /**
   * Получить текущий поворот
   * @returns {number} угол поворота в радианах
   */
  getRotation() {
    return this.rotation;
  }

  /**
   * Установить поворот
   * @param {number} rotation - угол поворота в радианах
   */
  setRotation(rotation) {
    this.rotation = rotation;
  }

  /**
   * Получить текущий маршрут
   * @returns {number} индекс текущего маршрута
   */
  getCurrentRouteIndex() {
    return this.currentRouteIndex;
  }

  /**
   * Установить текущий маршрут
   * @param {number} index - индекс маршрута
   */
  setCurrentRouteIndex(index) {
    this.currentRouteIndex = index;
  }

  /**
   * Перейти к следующему маршруту
   */
  nextRoute() {
    const total = this._getRouteCount();
    if (total === 0) return;
    this.currentRouteIndex = (this.currentRouteIndex + 1) % total;
  }

  /**
   * Сохранить текущее состояние для плавного продолжения
   * @returns {Object} сохраненное состояние
   */
  saveState() {
    return {
      position: { ...this.position },
      rotation: this.rotation,
      currentRouteIndex: this.currentRouteIndex,
      currentSegment: this.currentSegment,
      progress: this.progress,
      timestamp: Date.now()
    };
  }

  /**
   * Восстановить сохраненное состояние
   */
  restoreSavedState() {
    if (!this.savedState) return;
    
    this.position = { ...this.savedState.currentPosition };
    this.rotation = this.savedState.direction;
    
    console.log(`🔄 Восстановлено состояние машины:`, {
      position: this.position,
      rotation: this.rotation,
      nextIntersection: this.savedState.nextIntersection,
      nextDestination: this.savedState.nextDestination?.name
    });
  }

  /**
   * Очистить сохраненное состояние
   */
  clearSavedState() {
    this.savedState = null;
  }

  /**
   * Установить контроллер светофоров
   * @param {Object} controller - контроллер светофоров
   */
  setTrafficController(controller) {
    this.trafficController = controller;
  }

  /**
   * Установить визуальное представление (PIXI объект)
   * @param {PIXI.Container} sprite - PIXI контейнер машины
   */
  setSprite(sprite) {
    this.sprite = sprite;
  }

  /**
   * Получить визуальное представление
   * @returns {PIXI.Container} PIXI контейнер машины
   */
  getSprite() {
    return this.sprite;
  }

  /**
   * Установить аватарку
   * @param {PIXI.Sprite} avatar - спрайт аватарки
   */
  setAvatar(avatar) {
    this.avatar = avatar;
  }

  /**
   * Переключить состояние фар
   */
  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    if (this.onStateChange) {
      this.onStateChange('headlights_toggled', { headlightsOn: this.headlightsOn });
    }
    return this.headlightsOn;
  }

  /**
   * Получить состояние фар
   * @returns {boolean} включены ли фары
   */
  areHeadlightsOn() {
    return this.headlightsOn;
  }

  /**
   * Установить состояние фар
   * @param {boolean} on - включить или выключить фары
   */
  setHeadlights(on) {
    this.headlightsOn = on;
    if (this.onStateChange) {
      this.onStateChange('headlights_changed', { headlightsOn: this.headlightsOn });
    }
  }

  /**
   * Получить аватарку
   * @returns {PIXI.Sprite} спрайт аватарки
   */
  getAvatar() {
    return this.avatar;
  }

  /**
   * Обновление машины (вызывается каждый кадр)
   * @param {number} delta - время с последнего кадра
   * @param {Object} options - дополнительные опции для обновления
   */
  update(delta, options = {}) {
    // Делегируем всю логику движения в MovementController
    this.movementController.update(delta, options);
  }

  /**
   * Построить путь к текущему пункту назначения
   * @param {Object} options - опции для построения пути
   * @returns {Array} массив точек пути
   */
  buildPathToDestination(options = {}) {
    const {
      getDestinationCenter,
      getNearestIntersectionIJ,
      getIntersectionCoord,
      buildGraphPathToBuilding,
      debugLog,
      debugLogAlways
    } = options;

    const currentDestination = this._getRouteTask(this.currentRouteIndex);
    if (!currentDestination) return [];

    // Определяем стартовый перекрёсток
    let startIJ;
    if (this.position.x !== 0 || this.position.y !== 0) {
      startIJ = getNearestIntersectionIJ(this.position.x, this.position.y, options.verticalRoadXs, options.horizontalRoadYs);
    } else {
      const housePos = getDestinationCenter('house');
      startIJ = getNearestIntersectionIJ(housePos.x, housePos.y, options.verticalRoadXs, options.horizontalRoadYs);
    }

    const destCenter = getDestinationCenter(currentDestination.location);
    const graphPath = buildGraphPathToBuilding(startIJ, destCenter, options.verticalRoadXs, options.horizontalRoadYs);

    // Если машина не стоит ровно на перекрёстке старта, добавляем первый короткий сегмент до перекрёстка
    const startIntersection = getIntersectionCoord(startIJ.i, startIJ.j, options.verticalRoadXs, options.horizontalRoadYs);
    const needsPrefix = Math.abs(this.position.x - startIntersection.x) > 1 || Math.abs(this.position.y - startIntersection.y) > 1;
    const path = needsPrefix ? [{ x: this.position.x, y: this.position.y }, startIntersection, ...graphPath] : graphPath;

    // Если у нас есть сохраненное состояние и мы начинаем с текущей позиции машины,
    // добавляем промежуточную точку в направлении движения для плавного старта
    if (needsPrefix && this.savedState && this.savedState.direction !== 0 && path.length >= 2) {
      const currentPos = path[0];
      const nextPos = path[1];
      const dx = nextPos.x - currentPos.x;
      const dy = nextPos.y - currentPos.y;
      const currentLength = Math.hypot(dx, dy);

      // Вычисляем угол текущего сегмента
      const currentSegmentAngle = Math.atan2(dy, dx);
      const angleDifference = Math.abs(currentSegmentAngle - this.savedState.direction);

      // Если углы сильно отличаются (больше 30 градусов), добавляем промежуточную точку
      if (angleDifference > Math.PI / 6 || currentLength < 50) {
        const directionX = Math.cos(this.savedState.direction);
        const directionY = Math.sin(this.savedState.direction);

        // Вычисляем оптимальное расстояние для промежуточной точки
        const intermediateDistance = Math.min(60, currentLength * 0.3);
        const intermediatePoint = {
          x: currentPos.x + directionX * intermediateDistance,
          y: currentPos.y + directionY * intermediateDistance
        };

        path.splice(1, 0, intermediatePoint);
        debugLogAlways(`🔄 Добавлена промежуточная точка для плавного старта: угол разности ${(angleDifference * 180 / Math.PI).toFixed(1)}°, длина сегмента ${currentLength.toFixed(1)}, расстояние ${intermediateDistance.toFixed(1)}`);
      }
    }

    console.log(`🗺️ Graph path to ${currentDestination.name}:`, path.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(' -> '));
    console.log(`🚗 Car will start from segment 0: (${path[0]?.x?.toFixed(0) || 'N/A'},${path[0]?.y?.toFixed(0) || 'N/A'}) to (${path[1]?.x?.toFixed(0) || 'N/A'},${path[1]?.y?.toFixed(0) || 'N/A'})`);

    // Дополнительная отладочная информация о сохраненном состоянии
    if (this.savedState) {
      console.log(`💾 Используется сохраненное состояние:`, {
        hasNextIntersection: !!this.savedState.nextIntersection,
        nextIntersection: this.savedState.nextIntersection,
        direction: this.savedState.direction,
        directionDegrees: (this.savedState.direction * 180 / Math.PI).toFixed(1),
        nextDestination: this.savedState.nextDestination?.name,
        currentPosition: this.savedState.currentPosition
      });
    }

    return path;
  }

  /**
   * Сохранить состояние для плавного продолжения движения к следующему пункту
   * @param {Object} options - опции для сохранения состояния
   * @returns {Object} сохраненное состояние
   */
  saveStateForNextDestination(options = {}) {
    const {
      getDestinationCenter,
      getNearestIntersectionIJ,
      buildGraphPathToBuilding,
      getIntersectionCoord
    } = options;

    const routeCount = this._getRouteCount();
    if (routeCount === 0) {
      return null;
    }

    // Определяем следующий пункт назначения
    const nextRouteIndex = (this.currentRouteIndex + 1) % routeCount;
    const nextDestination = this._getRouteTask(nextRouteIndex);

    if (!nextDestination) {
      return null;
    }

    const nextDestCenter = getDestinationCenter(nextDestination.location);

    // Строим путь к следующему пункту назначения, чтобы найти первый перекресток
    const currentIJ = getNearestIntersectionIJ(this.position.x, this.position.y, options.verticalRoadXs, options.horizontalRoadYs);
    const nextPath = buildGraphPathToBuilding(currentIJ, nextDestCenter, options.verticalRoadXs, options.horizontalRoadYs);

    // Находим первый перекресток на пути к следующему пункту назначения
    let nextIntersection = null;
    let direction = 0;

    if (nextPath.length >= 2) {
      nextIntersection = nextPath[0];
      const dx = nextPath[1].x - nextPath[0].x;
      const dy = nextPath[1].y - nextPath[0].y;
      direction = Math.atan2(dy, dx);
    } else if (nextPath.length === 1) {
      // Если путь состоит только из одной точки (пункт назначения)
      const dx = nextDestCenter.x - this.position.x;
      const dy = nextDestCenter.y - this.position.y;
      direction = Math.atan2(dy, dx);
    }

    return {
      nextRouteIndex: nextRouteIndex,
      nextDestination: nextDestination,
      nextDestCenter: nextDestCenter,
      nextIntersection: nextIntersection,
      direction: direction,
      currentPosition: { x: this.position.x, y: this.position.y }
    };
  }

  /**
   * Перейти к следующему пункту назначения
   * @param {Object} options - опции для перехода
   */
  goToNextDestination(options = {}) {
    const {
      getDestinationCenter,
      getNearestIntersectionIJ,
      buildGraphPathToBuilding,
      getIntersectionCoord,
      debugLogAlways
    } = options;

    // Переходим к следующему маршруту
    this.nextRoute();

    // Сбрасываем состояние прибытия
    this.setAtDestination(false);
    this.setStayTimer(0);

    // Восстанавливаем сохраненное состояние машины
    if (this.savedState) {
      this.setRotation(this.savedState.direction);

      if (this.savedState.nextIntersection) {
        console.log(`🔄 Восстановлено направление к перекрестку: ${this.savedState.direction.toFixed(3)} радиан (${(this.savedState.direction * 180 / Math.PI).toFixed(1)}°) к перекрестку (${this.savedState.nextIntersection.x}, ${this.savedState.nextIntersection.y})`);
      } else {
        console.log(`🔄 Восстановлено направление к пункту назначения: ${this.savedState.direction.toFixed(3)} радиан (${(this.savedState.direction * 180 / Math.PI).toFixed(1)}°) к ${this.savedState.nextDestination.name} (${this.savedState.nextDestCenter.x}, ${this.savedState.nextDestCenter.y})`);
      }

      // Очищаем сохраненное состояние после использования
      this.clearSavedState();
    }

    // Обновляем путь к новому пункту назначения
    const newPath = this.buildPathToDestination(options);
    this.setPath(newPath);
  }

  /**
   * Обновить таймер пребывания в здании
   * @param {Object} options - опции для обновления таймера
   */
  updateStayTimer(options = {}) {
    const {
      timeManager,
      debugLogAlways
    } = options;

    if (!this._isAtDestination) return;

    const gameTime = timeManager.getGameTime();
    const currentTime = gameTime.hours * 60 + gameTime.minutes;
    const currentDay = gameTime.day;

    if (this.stayTimer > 0) {
      // Вычисляем разность времени в игровых минутах
      const timeDiff = currentTime - (options.lastStayTimerUpdate || currentTime);
      
      // Если день изменился, сбрасываем таймер
      if (currentDay !== (options.lastStayTimerDay || currentDay)) {
        this.stayTimer = 0;
        debugLogAlways(`🕐 Новый день, таймер пребывания сброшен`);
      } else {
        const newStayTimer = this.stayTimer - timeDiff / 60; // переводим в игровые часы
        this.stayTimer = Math.max(0, newStayTimer);
      }
    }

    if (this.stayTimer <= 0 && this._isAtDestination) {
      debugLogAlways(`⏰ Время пребывания истекло, переходим к следующему пункту назначения`);
      this.goToNextDestination(options);
    }
  }

  /**
   * Прибыть в пункт назначения
   * @param {Object} options - опции для прибытия
   */
  arriveAtDestination(options = {}) {
    const {
      timeManager,
      debugLogAlways,
      showBuildingAvatar
    } = options;

    const currentDest = this._getRouteTask(this.currentRouteIndex);
    if (!currentDest) return;

    debugLogAlways(`🏠 Прибытие в ${currentDest.name} (обочина)`);

    // Сохраняем состояние машины для плавного продолжения движения
    this.savedState = this.saveStateForNextDestination(options);
    debugLogAlways(`💾 Сохранено состояние машины:`, this.savedState);

    this.setAtDestination(true);
    this.setStayTimer(currentDest.stayHours);
    
    const gameTime = timeManager.getGameTime();
    const lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes;
    const lastStayTimerDay = gameTime.day;

    // Показываем маленькую аватарку в здании
    if (showBuildingAvatar) {
      showBuildingAvatar(currentDest.location);
    }

    // Скрываем аватарку из машинки
    if (this.avatar) {
      this.avatar.visible = false;
    }

    // Обновляем UI
    if (this.onStateChange) {
      this.onStateChange('arrived', {
        destination: currentDest,
        stayTimer: this.stayTimer
      });
    }
  }

  /**
   * Установить callback для изменения состояния
   * @param {Function} callback - функция обратного вызова
   */
  setOnStateChange(callback) {
    this.onStateChange = callback;
  }

  /**
   * Установить callback для прибытия
   * @param {Function} callback - функция обратного вызова
   */
  setOnArrival(callback) {
    this.onArrival = callback;
  }

  /**
   * Получить данные для визуального представления (View Model)
   * @returns {Object} объект с данными для рендеринга
   */
  getViewState() {
    return {
      position: this.position,
      rotation: this.rotation,
      headlightsOn: this.headlightsOn
    };
  }

  /**
   * Получить информацию о машине для отладки
   * @returns {Object} объект с информацией о состоянии
   */
  getDebugInfo() {
    return {
      position: this.position,
      rotation: this.rotation,
      speed: this.speed,
      isMoving: this.isMoving,
      pathLength: this.path.length,
      currentSegment: this.currentSegment,
      progress: this.progress,
      isAtDestination: this._isAtDestination,
      stayTimer: this.stayTimer,
      currentRouteIndex: this.currentRouteIndex,
      hasSavedState: !!this.savedState
    };
  }
}
