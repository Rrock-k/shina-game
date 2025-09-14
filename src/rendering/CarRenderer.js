/**
 * CarRenderer - класс для отрисовки и анимации машины
 * Управляет визуальным представлением машины, её анимацией и позиционированием
 */
class CarRenderer {
  constructor(config, pauseManager) {
    this.config = config;
    this.pauseManager = pauseManager;
    
    // PIXI объекты
    this.car = null;
    this.avatar = null;
    
    // Состояние машины
    this.carPath = [];
    this.carSegment = 0;
    this.carProgress = 0;
    this._isAtDestination = false;
    this.stayTimer = 0;
    
    // Настройки движения - используем значение из конфига
    this.BASE_CAR_SPEED = config.BASE_CAR_SPEED || 11.7;
  }

  /**
   * Создает визуальное представление машины
   * @param {Object} options - Опции инициализации
   * @param {Array} options.carPath - Путь машины
   * @param {number} options.currentRouteIndex - Индекс текущего маршрута
   * @param {Object} options.savedCarState - Сохраненное состояние машины
   * @param {Function} options.buildCarPath - Функция построения пути
   * @param {Function} options.getDestinationCenter - Функция получения центра назначения
   * @param {Function} options.getNearestIntersectionIJ - Функция поиска ближайшего перекрестка
   * @param {Function} options.getIntersectionCoord - Функция получения координат перекрестка
   * @returns {PIXI.Container} Контейнер с машиной
   */
  createCar(options = {}) {
    this.car = new PIXI.Container();

    // Кузов машины
    const body = new PIXI.Graphics();
    body.beginFill(0xff8800).drawRect(-60, -30, 120, 60).endFill();
    this.car.addChild(body);

    // Радиатор (передняя решетка) - ВПЕРЕДИ
    const radiator = new PIXI.Graphics();
    radiator.beginFill(0x333333).drawRect(45, -25, 10, 50).endFill();
    // Горизонтальные полоски радиатора
    for (let i = 0; i < 5; i++) {
      const line = new PIXI.Graphics();
      line.lineStyle(2, 0x666666);
      line.moveTo(45, -20 + i * 10);
      line.lineTo(55, -20 + i * 10);
      radiator.addChild(line);
    }
    this.car.addChild(radiator);

    // Передние фары - ВПЕРЕДИ
    const leftHeadlight = new PIXI.Graphics();
    leftHeadlight.beginFill(0xffffaa).drawCircle(50, -20, 8).endFill();
    leftHeadlight.lineStyle(1, 0x333333);
    leftHeadlight.drawCircle(50, -20, 8);
    this.car.addChild(leftHeadlight);

    const rightHeadlight = new PIXI.Graphics();
    rightHeadlight.beginFill(0xffffaa).drawCircle(50, 20, 8).endFill();
    rightHeadlight.lineStyle(1, 0x333333);
    rightHeadlight.drawCircle(50, 20, 8);
    this.car.addChild(rightHeadlight);

    // Задние фары - СЗАДИ
    const leftTailLight = new PIXI.Graphics();
    leftTailLight.beginFill(0xff0000).drawCircle(-50, -20, 6).endFill();
    leftTailLight.lineStyle(1, 0x333333);
    leftTailLight.drawCircle(-50, -20, 6);
    this.car.addChild(leftTailLight);

    const rightTailLight = new PIXI.Graphics();
    rightTailLight.beginFill(0xff0000).drawCircle(-50, 20, 6).endFill();
    rightTailLight.lineStyle(1, 0x333333);
    rightTailLight.drawCircle(-50, 20, 6);
    this.car.addChild(rightTailLight);

    // Крыша машинки (квадратик по размеру аватарки)
    const roof = new PIXI.Graphics();
    roof.beginFill(0xcc6600).drawRect(-30, -30, 60, 60).endFill();
    roof.lineStyle(2, 0x333333);
    roof.drawRect(-30, -30, 60, 60);
    this.car.addChild(roof);

    // Аватарка Шины (исходный размер без скругления)
    this.avatar = PIXI.Sprite.from('/public/shina.jpeg');
    this.avatar.anchor.set(0.5);
    this.avatar.width = 60;
    this.avatar.height = 60;
    this.car.addChild(this.avatar);

    // Устанавливаем пивот машины в центр для упрощения расчетов
    // car.position будет указывать на центр машины
    this.car.pivot.set(0, 0); // пивот в центре
    this.car.position.set(0, 0); // начальная позиция

    // Инициализация состояния машины
    this._isAtDestination = false;
    this.stayTimer = 0;

    // Устанавливаем путь машины
    if (options.carPath) {
      this.setPath(options.carPath);
    }

    // Устанавливаем машину на первую точку пути (которая должна быть на дороге)
    if (this.carPath.length > 0) {
      // Используем сохраненное направление, если оно есть, иначе 0
      const initialRotation = (options.savedCarState && options.savedCarState.direction) || 0;
      this.car.rotation = initialRotation;
      if (this.avatar) {
        this.avatar.rotation = -initialRotation;
      }

      // Устанавливаем машину так, чтобы передняя часть была в точке пути
      const carLength = 120;
      const offsetX = -carLength / 2 * Math.cos(initialRotation);
      const offsetY = -carLength / 2 * Math.sin(initialRotation);
      this.car.position.set(this.carPath[0].x + offsetX, this.carPath[0].y + offsetY);
      console.log('Car starts at:', this.carPath[0], 'with rotation:', initialRotation);
    } else if (options.getDestinationCenter && options.getNearestIntersectionIJ && options.getIntersectionCoord) {
      // Fallback: устанавливаем на ближайшую дорогу к дому
      const housePos = options.getDestinationCenter('house');
      const houseIJ = options.getNearestIntersectionIJ(housePos.x, housePos.y);
      const roadPos = options.getIntersectionCoord(houseIJ.i, houseIJ.j);
      const initialRotation = (options.savedCarState && options.savedCarState.direction) || 0;
      this.car.rotation = initialRotation;
      if (this.avatar) {
        this.avatar.rotation = -initialRotation;
      }
      const carLength = 120;
      const offsetX = -carLength / 2 * Math.cos(initialRotation);
      const offsetY = -carLength / 2 * Math.sin(initialRotation);
      this.car.position.set(roadPos.x + offsetX, roadPos.y + offsetY);
      console.log('Car fallback position:', roadPos, 'with rotation:', initialRotation);
    }

    return this.car;
  }

  /**
   * Обновляет позицию и анимацию машины
   * @param {number} delta - Время с последнего кадра
   * @param {Object} options - Опции обновления
   * @param {Function} options.checkArrival - Функция проверки прибытия
   * @param {Function} options.debugLog - Функция отладочного логирования
   * @param {Function} options.debugLogAlways - Функция отладочного логирования (всегда)
   * @param {Object} options.carTrafficController - Контроллер светофоров
   * @param {Object} options.intersectionKeyToTL - Карта светофоров
   * @param {Function} options.getVerticalRoadXs - Функция получения вертикальных дорог
   * @param {Function} options.getHorizontalRoadYs - Функция получения горизонтальных дорог
   * @param {Function} options.buildCarPath - Функция построения пути
   * @param {Function} options.updateLightBeams - Функция обновления лучей света
   * @param {Object} options.debugInfo - Объект отладочной информации
   */
  updateCar(delta, options = {}) {
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
      checkArrival(); // обновляем статус
      return;
    }

    const speed = this.BASE_CAR_SPEED * this.pauseManager.getSpeedMultiplier() * delta;
    debugLog('🚗 Состояние машины', {
      speed: speed.toFixed(2),
      delta: delta.toFixed(3),
      position: `(${this.car.position.x.toFixed(1)}, ${this.car.position.y.toFixed(1)})`,
      rotation: `${(this.car.rotation * 180 / Math.PI).toFixed(1)}°`,
      segment: `${this.carSegment}/${this.carPath.length - 1}`,
      isAtDestination: this._isAtDestination
    });

    // Проверяем, есть ли у нас путь
    if (this.carPath.length < 2) {
      console.log('No valid path, rebuilding...');
      if (buildCarPath) {
        this.setPath(buildCarPath());
      }
      return;
    }

    // Проверяем, что текущий сегмент существует
    if (this.carSegment >= this.carPath.length) {
      console.log('Invalid segment, rebuilding path...');
      if (buildCarPath) {
        this.setPath(buildCarPath());
      }
      return;
    }

    // Убеждаемся, что carSegment находится в допустимых пределах
    if (this.carSegment >= this.carPath.length - 1) {
      // Достигли конца пути
      const finalX = this.carPath[this.carPath.length - 1].x;
      const finalY = this.carPath[this.carPath.length - 1].y;
      const carLength = 120;
      const offsetX = -carLength / 2 * Math.cos(this.car.rotation);
      const offsetY = -carLength / 2 * Math.sin(this.car.rotation);
      this.car.position.set(finalX + offsetX, finalY + offsetY);
      checkArrival();
      return;
    }

    let p1 = this.carPath[this.carSegment];
    let p2 = this.carPath[this.carSegment + 1];
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let segLen = Math.hypot(dx, dy);

    // Если текущий сегмент имеет нулевую длину, переходим к следующему
    if (segLen < 0.1) {
      this.carSegment++;
      this.carProgress = 0;
      return;
    }

    // 🚦 ПРОВЕРКА СВЕТОФОРА ПЕРЕД ПРИБЛИЖЕНИЕМ К ПЕРЕКРЕСТКУ 🚦
    if (carTrafficController && getVerticalRoadXs && getHorizontalRoadYs) {
      // Вычисляем реальную позицию передней части машины
      const carLength = 120;
      const offsetX = carLength / 2 * Math.cos(this.car.rotation);
      const offsetY = carLength / 2 * Math.sin(this.car.rotation);
      const currentPos = {
        x: this.car.position.x + offsetX,
        y: this.car.position.y + offsetY
      };
      const targetIntersection = { x: p2.x, y: p2.y }; // целевой перекресток
      const roadPositions = { 
        verticalRoadXs: getVerticalRoadXs(), 
        horizontalRoadYs: getHorizontalRoadYs() 
      };

      // Проверяем расстояние до целевого перекрестка
      const distanceToIntersection = Math.hypot(currentPos.x - targetIntersection.x, currentPos.y - targetIntersection.y);

      // ОТЛАДКА: показываем информацию о движении (только первые секунды)
      if (this.carSegment === 0 && this.carProgress < 20) {
        console.log(`🚗 DEBUG: segment=${this.carSegment}, progress=${this.carProgress.toFixed(1)}, distance=${distanceToIntersection.toFixed(1)}, carPos=(${this.car.position.x.toFixed(0)},${this.car.position.y.toFixed(0)}), frontPos=(${currentPos.x.toFixed(0)},${currentPos.y.toFixed(0)}) to=(${targetIntersection.x},${targetIntersection.y})`);
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
          return; // не обновляем carProgress - машина стоит
        }
      }
    }

    // Обновляем прогресс по текущему сегменту
    this.carProgress += speed;
    debugLog('🚗 Движение по сегменту', {
      segment: this.carSegment,
      progress: this.carProgress.toFixed(1),
      segLen: segLen.toFixed(1),
      speed: speed.toFixed(2)
    });

    // Проверяем, завершили ли мы текущий сегмент
    if (this.carProgress >= segLen) {
      debugLogAlways('🚗 Завершен сегмент', {
        segment: this.carSegment,
        progress: this.carProgress.toFixed(1),
        segLen: segLen.toFixed(1)
      });

      // Переходим к следующему сегменту
      this.carProgress = this.carProgress - segLen; // остаток переносим
      this.carSegment++;

      // Проверяем, не достигли ли мы конца пути
      if (this.carSegment >= this.carPath.length - 1) {
        const finalX = this.carPath[this.carPath.length - 1].x;
        const finalY = this.carPath[this.carPath.length - 1].y;
        const carLength = 120;
        const offsetX = -carLength / 2 * Math.cos(this.car.rotation);
        const offsetY = -carLength / 2 * Math.sin(this.car.rotation);
        this.car.position.set(finalX + offsetX, finalY + offsetY);
        checkArrival();
        return;
      }

      // Обновляем данные для нового сегмента
      p1 = this.carPath[this.carSegment];
      p2 = this.carPath[this.carSegment + 1];
      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      segLen = Math.hypot(dx, dy);
    }

    // Вычисляем текущую позицию на сегменте
    const t = segLen > 0 ? Math.min(1, this.carProgress / segLen) : 0;
    const newX = p1.x + dx * t;
    const newY = p1.y + dy * t;

    // Обновляем поворот машинки в направлении движения
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const targetRotation = Math.atan2(dy, dx);
      const oldRotation = this.car.rotation;
      this.car.rotation = targetRotation;
      if (this.avatar) {
        this.avatar.rotation = -targetRotation;
      }

      // Обновляем лучи света при повороте
      if (this.car.leftLightBeam && this.car.rightLightBeam && updateLightBeams && typeof updateLightBeams === 'function') {
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
    const offsetX = -carLength / 2 * Math.cos(this.car.rotation);
    const offsetY = -carLength / 2 * Math.sin(this.car.rotation);
    this.car.position.set(newX + offsetX, newY + offsetY);
  }

  /**
   * Устанавливает путь для машины
   * @param {Array} path - Массив точек пути
   */
  setPath(path) {
    this.carPath = path;
    this.carSegment = 0;
    this.carProgress = 0;
  }

  /**
   * Получает текущую машину
   * @returns {PIXI.Container} Контейнер с машиной
   */
  getCar() {
    return this.car;
  }

  /**
   * Получает аватарку
   * @returns {PIXI.Sprite} Спрайт аватарки
   */
  getAvatar() {
    return this.avatar;
  }

  /**
   * Устанавливает позицию машины
   * @param {number} x - X координата
   * @param {number} y - Y координата
   */
  setPosition(x, y) {
    if (this.car) {
      this.car.position.set(x, y);
    }
  }

  /**
   * Устанавливает поворот машины
   * @param {number} rotation - Угол поворота в радианах
   */
  setRotation(rotation) {
    if (this.car) {
      this.car.rotation = rotation;
    }
  }

  /**
   * Показывает/скрывает аватарку
   * @param {boolean} visible - Видимость аватарки
   */
  setAvatarVisible(visible) {
    if (this.avatar) {
      this.avatar.visible = visible;
    }
  }

  /**
   * Устанавливает состояние прибытия
   * @param {boolean} isAtDestination - Находится ли машина в пункте назначения
   */
  setAtDestination(isAtDestination) {
    this._isAtDestination = isAtDestination;
  }

  /**
   * Получает состояние прибытия
   * @returns {boolean} Находится ли машина в пункте назначения
   */
  isAtDestination() {
    return this._isAtDestination;
  }

  /**
   * Получает текущий сегмент пути
   * @returns {number} Индекс текущего сегмента
   */
  getCurrentSegment() {
    return this.carSegment;
  }

  /**
   * Получает прогресс по текущему сегменту
   * @returns {number} Прогресс по сегменту
   */
  getProgress() {
    return this.carProgress;
  }

  /**
   * Получает текущий путь
   * @returns {Array} Массив точек пути
   */
  getPath() {
    return this.carPath;
  }

  /**
   * Устанавливает таймер ожидания
   * @param {number} timer - Время ожидания
   */
  setStayTimer(timer) {
    this.stayTimer = timer;
  }

  /**
   * Получает таймер ожидания
   * @returns {number} Время ожидания
   */
  getStayTimer() {
    return this.stayTimer;
  }

  /**
   * Обновляет таймер ожидания
   * @param {number} delta - Время с последнего кадра
   */
  updateStayTimer(delta) {
    this.stayTimer += delta;
  }
}

// Экспорт для использования в других модулях
export { CarRenderer };
