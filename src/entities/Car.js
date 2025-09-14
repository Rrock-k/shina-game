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
    
    // Устанавливаем начальную позицию
    if (options.initialPosition) {
      this.position = { ...options.initialPosition };
    }
    
    // Восстанавливаем сохраненное состояние
    if (this.savedState) {
      this.restoreSavedState();
    }
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
    this.currentRouteIndex = (this.currentRouteIndex + 1) % this.config.ROUTE_SCHEDULE.length;
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
    const {
      checkArrival,
      debugLog,
      debugLogAlways,
      carTrafficController,
      intersectionKeyToTL,
      getVerticalRoadXs,
      getHorizontalRoadYs,
      buildCarPath,
      updateLightBeams,
      debugInfo
    } = options;

    if (debugInfo) {
      debugInfo.frameCount++;
    }

    // Если игра на паузе, не обновляем машину
    if (this.pauseManager.isPaused()) {
      debugLog('🚗 Игра на паузе, машина не двигается');
      return;
    }

    // Если находимся в пункте назначения, не двигаемся
    if (this._isAtDestination) {
      debugLog('🚗 Машина в пункте назначения, не двигается');
      if (checkArrival) checkArrival(); // обновляем статус
      return;
    }

    const speed = this.config.BASE_CAR_SPEED * this.pauseManager.getSpeedMultiplier() * delta;
    debugLog('🚗 Состояние машины', {
      speed: speed.toFixed(2),
      delta: delta.toFixed(3),
      position: `(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`,
      rotation: `${(this.rotation * 180 / Math.PI).toFixed(1)}°`,
      segment: `${this.currentSegment}/${this.path.length - 1}`,
      isAtDestination: this._isAtDestination
    });

    // Проверяем, есть ли у нас путь
    if (this.path.length < 2) {
      console.log('No valid path, rebuilding...');
      if (buildCarPath) {
        this.setPath(buildCarPath());
      }
      return;
    }

    // Проверяем, что текущий сегмент существует
    if (this.currentSegment >= this.path.length) {
      console.log('Invalid segment, rebuilding path...');
      if (buildCarPath) {
        this.setPath(buildCarPath());
      }
      return;
    }

    // Убеждаемся, что currentSegment находится в допустимых пределах
    if (this.currentSegment >= this.path.length - 1) {
      // Достигли конца пути
      const finalX = this.path[this.path.length - 1].x;
      const finalY = this.path[this.path.length - 1].y;
      const carLength = 120;
      const offsetX = -carLength / 2 * Math.cos(this.rotation);
      const offsetY = -carLength / 2 * Math.sin(this.rotation);
      this.position = { x: finalX + offsetX, y: finalY + offsetY };
      if (checkArrival) checkArrival();
      return;
    }

    let p1 = this.path[this.currentSegment];
    let p2 = this.path[this.currentSegment + 1];
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let segLen = Math.hypot(dx, dy);

    // Если текущий сегмент имеет нулевую длину, переходим к следующему
    if (segLen < 0.1) {
      this.currentSegment++;
      this.progress = 0;
      return;
    }

    // 🚦 ПРОВЕРКА СВЕТОФОРА ПЕРЕД ПРИБЛИЖЕНИЕМ К ПЕРЕКРЕСТКУ 🚦
    if (carTrafficController && getVerticalRoadXs && getHorizontalRoadYs) {
      // Вычисляем реальную позицию передней части машины
      const carLength = 120;
      const offsetX = carLength / 2 * Math.cos(this.rotation);
      const offsetY = carLength / 2 * Math.sin(this.rotation);
      const currentPos = {
        x: this.position.x + offsetX,
        y: this.position.y + offsetY
      };
      const targetIntersection = { x: p2.x, y: p2.y }; // целевой перекресток
      const roadPositions = { 
        verticalRoadXs: getVerticalRoadXs(), 
        horizontalRoadYs: getHorizontalRoadYs() 
      };

      // Проверяем расстояние до целевого перекрестка
      const distanceToIntersection = Math.hypot(currentPos.x - targetIntersection.x, currentPos.y - targetIntersection.y);

      // ОТЛАДКА: показываем информацию о движении (только первые секунды)
      if (this.currentSegment === 0 && this.progress < 20) {
        console.log(`🚗 DEBUG: segment=${this.currentSegment}, progress=${this.progress.toFixed(1)}, distance=${distanceToIntersection.toFixed(1)}, carPos=(${this.position.x.toFixed(0)},${this.position.y.toFixed(0)}), frontPos=(${currentPos.x.toFixed(0)},${currentPos.y.toFixed(0)}) to=(${targetIntersection.x},${targetIntersection.y})`);
      }

      // Проверяем светофор только если:
      // 1. Находимся в зоне проверки (30-60 пикселей до перекрестка)
      // 2. И НЕ стоим прямо на перекрестке старта 
      if (distanceToIntersection <= 60 && distanceToIntersection > 15) { // зона проверки светофора
        const trafficCheck = carTrafficController.checkTrafficLights(
          currentPos,
          targetIntersection,
          intersectionKeyToTL,
          roadPositions
        );

        if (!trafficCheck.canMove) {
          // Красный свет - останавливаемся
          debugLogAlways(`🚦 Остановка перед красным светом на перекрестке (${targetIntersection.x}, ${targetIntersection.y}), distance=${distanceToIntersection.toFixed(1)}`);
          return; // не обновляем progress - машина стоит
        }
      }
    }

    // Обновляем прогресс по текущему сегменту
    this.progress += speed;
    debugLog('🚗 Движение по сегменту', {
      segment: this.currentSegment,
      progress: this.progress.toFixed(1),
      segLen: segLen.toFixed(1),
      speed: speed.toFixed(2)
    });

    // Проверяем, завершили ли мы текущий сегмент
    if (this.progress >= segLen) {
      debugLogAlways('🚗 Завершен сегмент', {
        segment: this.currentSegment,
        progress: this.progress.toFixed(1),
        segLen: segLen.toFixed(1)
      });

      // Переходим к следующему сегменту
      this.progress = this.progress - segLen; // остаток переносим
      this.currentSegment++;

      // Проверяем, не достигли ли мы конца пути
      if (this.currentSegment >= this.path.length - 1) {
        const finalX = this.path[this.path.length - 1].x;
        const finalY = this.path[this.path.length - 1].y;
        const carLength = 120;
        const offsetX = -carLength / 2 * Math.cos(this.rotation);
        const offsetY = -carLength / 2 * Math.sin(this.rotation);
        this.position = { x: finalX + offsetX, y: finalY + offsetY };
        if (checkArrival) checkArrival();
        return;
      }

      // Обновляем данные для нового сегмента
      p1 = this.path[this.currentSegment];
      p2 = this.path[this.currentSegment + 1];
      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      segLen = Math.hypot(dx, dy);
    }

    // Вычисляем текущую позицию на сегменте
    const t = segLen > 0 ? Math.min(1, this.progress / segLen) : 0;
    const newX = p1.x + dx * t;
    const newY = p1.y + dy * t;

    // Обновляем поворот машинки в направлении движения
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const targetRotation = Math.atan2(dy, dx);
      const oldRotation = this.rotation;
      this.rotation = targetRotation;

      // Обновляем лучи света при повороте
      if (updateLightBeams && typeof updateLightBeams === 'function') {
        updateLightBeams();
      }

      // Логируем поворот только если он значительный
      const rotationDiff = Math.abs(targetRotation - oldRotation);
      if (rotationDiff > 0.1) {
        debugLogAlways('🚗 Поворот машины', {
          oldRotation: (oldRotation * 180 / Math.PI).toFixed(1) + '°',
          newRotation: (targetRotation * 180 / Math.PI).toFixed(1) + '°',
          diff: (rotationDiff * 180 / Math.PI).toFixed(1) + '°'
        });
      }
    }

    // Устанавливаем машину так, чтобы передняя часть была в точке пути
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(this.rotation);
    const offsetY = -carLength / 2 * Math.sin(this.rotation);
    this.position = { x: newX + offsetX, y: newY + offsetY };

    // Обновляем визуальное представление если есть
    if (this.sprite) {
      this.sprite.position.set(this.position.x, this.position.y);
      this.sprite.rotation = this.rotation;
    }
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

    const currentDestination = this.config.ROUTE_SCHEDULE[this.currentRouteIndex];
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

    // Определяем следующий пункт назначения
    const nextRouteIndex = (this.currentRouteIndex + 1) % this.config.ROUTE_SCHEDULE.length;
    const nextDestination = this.config.ROUTE_SCHEDULE[nextRouteIndex];

    // Получаем центр следующего пункта назначения
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

    // Получаем игровое время из timeManager
    const gameTime = timeManager.getGameTime();
    const currentTime = gameTime.hours * 60 + gameTime.minutes;
    const currentDay = gameTime.day;

    // Инициализируем таймер если нужно
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

    // Проверяем, истек ли таймер пребывания
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

    const currentDest = this.config.ROUTE_SCHEDULE[this.currentRouteIndex];
    if (!currentDest) return;

    debugLogAlways(`🏠 Прибытие в ${currentDest.name} (обочина)`);

    // Сохраняем состояние машины для плавного продолжения движения
    this.savedState = this.saveStateForNextDestination(options);
    debugLogAlways(`💾 Сохранено состояние машины:`, this.savedState);

    this.setAtDestination(true);
    this.setStayTimer(currentDest.stayHours);
    
    // Получаем текущее игровое время
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
