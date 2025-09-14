/**
 * Контроллер движения машины
 * Управляет логикой перемещения машины по пути
 */
export class MovementController {
  constructor(carEntity, config = {}) {
    this.car = carEntity;
    this.config = {
      BASE_CAR_SPEED: 200,
      ...config
    };
    
    // Кэш для оптимизации производительности
    // ВАЖНО: Кэш работает только при полной замене пути (новый массив).
    // Если путь мутирует (добавляются/удаляются точки), кэш НЕ будет сброшен!
    this._segmentCache = new Map(); // кэш длин сегментов
    this._lastPathHash = null; // хэш последнего пути для инвалидации кэша
  }


  /**
   * Получить длину сегмента с кэшированием
   * @param {number} segmentIndex - индекс сегмента
   * @param {Object} p1 - первая точка
   * @param {Object} p2 - вторая точка
   * @returns {number} - длина сегмента
   * @private
   */
  _getSegmentLength(segmentIndex, p1, p2) {
    const cacheKey = `${segmentIndex}_${p1.x}_${p1.y}_${p2.x}_${p2.y}`;
    
    if (this._segmentCache.has(cacheKey)) {
      return this._segmentCache.get(cacheKey);
    }
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    
    this._segmentCache.set(cacheKey, length);
    return length;
  }

  /**
   * Инвалидировать кэш при изменении пути
   * @private
   */
  _invalidateCache() {
    this._segmentCache.clear();
    this._lastPathHash = null;
  }

  /**
   * Обновление движения машины (вызывается каждый кадр)
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
    if (this.car.pauseManager.isPaused()) {
      debugLog('🚗 Игра на паузе, машина не двигается');
      return;
    }

    // Если находимся в пункте назначения, не двигаемся
    if (this.car._isAtDestination) {
      debugLog('🚗 Машина в пункте назначения, не двигается');
      if (checkArrival) checkArrival(); // обновляем статус
      return;
    }

    const speed = this.config.BASE_CAR_SPEED * this.car.pauseManager.getSpeedMultiplier() * delta;
    debugLog('🚗 Состояние машины', {
      speed: speed.toFixed(2),
      delta: delta.toFixed(3),
      position: `(${this.car.position.x.toFixed(1)}, ${this.car.position.y.toFixed(1)})`,
      rotation: `${(this.car.rotation * 180 / Math.PI).toFixed(1)}°`,
      segment: `${this.car.currentSegment}/${this.car.path.length - 1}`,
      isAtDestination: this.car._isAtDestination
    });

    if (this.car.path.length < 2) {
      console.log('No valid path, rebuilding...');
      if (buildCarPath) {
        this.car.setPath(buildCarPath());
      }
      return;
    }

    if (this.car.currentSegment >= this.car.path.length) {
      console.log('Invalid segment, rebuilding path...');
      if (buildCarPath) {
        this.car.setPath(buildCarPath());
      }
      return;
    }

    // Убеждаемся, что currentSegment находится в допустимых пределах
    if (this.car.currentSegment >= this.car.path.length - 1) {
      // Достигли конца пути
      this._finishPath();
      if (checkArrival) checkArrival();
      return;
    }

    const currentPathHash = this.car.path ? this.car.path.length + '_' + this.car.path[0]?.x + '_' + this.car.path[0]?.y : 'null';
    if (this._lastPathHash !== currentPathHash) {
      this._invalidateCache();
      this._lastPathHash = currentPathHash;
    }

    let p1 = this.car.path[this.car.currentSegment];
    let p2 = this.car.path[this.car.currentSegment + 1];
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let segLen = this._getSegmentLength(this.car.currentSegment, p1, p2);

    // Если текущий сегмент имеет нулевую длину, переходим к следующему
    if (segLen < 0.1) {
      this.car.currentSegment++;
      this.car.progress = 0;
      return;
    }

    // 🚦 ПРОВЕРКА СВЕТОФОРА ПЕРЕД ПРИБЛИЖЕНИЕМ К ПЕРЕКРЕСТКУ 🚦
    if (carTrafficController && getVerticalRoadXs && getHorizontalRoadYs) {
      const canMove = this._checkTrafficLights(p1, p2, {
        carTrafficController,
        intersectionKeyToTL,
        getVerticalRoadXs,
        getHorizontalRoadYs,
        debugLogAlways
      });

      if (!canMove) {
        return; // не обновляем progress - машина стоит
      }
    }

    // Обновляем прогресс по текущему сегменту
    this.car.progress += speed;
    debugLog('🚗 Движение по сегменту', {
      segment: this.car.currentSegment,
      progress: this.car.progress.toFixed(1),
      segLen: segLen.toFixed(1),
      speed: speed.toFixed(2)
    });

    if (this.car.progress >= segLen) {
      debugLogAlways('🚗 Завершен сегмент', {
        segment: this.car.currentSegment,
        progress: this.car.progress.toFixed(1),
        segLen: segLen.toFixed(1)
      });

      // Переходим к следующему сегменту
      this.car.progress = this.car.progress - segLen; // остаток переносим
      this.car.currentSegment++;

      if (this.car.currentSegment >= this.car.path.length - 1) {
        this._finishPath();
        if (checkArrival) checkArrival();
        return;
      }

      // Обновляем данные для нового сегмента
      p1 = this.car.path[this.car.currentSegment];
      p2 = this.car.path[this.car.currentSegment + 1];
      dx = p2.x - p1.x;
      dy = p2.y - p1.y;
      segLen = this._getSegmentLength(this.car.currentSegment, p1, p2);
    }

    // Вычисляем текущую позицию на сегменте
    const t = segLen > 0 ? Math.min(1, this.car.progress / segLen) : 0;
    const newX = p1.x + dx * t;
    const newY = p1.y + dy * t;

    // Обновляем поворот машинки в направлении движения
    this._updateRotation(dx, dy, updateLightBeams, debugLogAlways);

    this._updatePosition(newX, newY);
  }

  /**
   * Завершение пути - установка финальной позиции
   * @private
   */
  _finishPath() {
    const finalX = this.car.path[this.car.path.length - 1].x;
    const finalY = this.car.path[this.car.path.length - 1].y;
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(this.car.rotation);
    const offsetY = -carLength / 2 * Math.sin(this.car.rotation);
    this.car.position = { x: finalX + offsetX, y: finalY + offsetY };
  }

  /**
   * Проверка светофоров перед перекрестком
   * @param {Object} p1 - начальная точка сегмента
   * @param {Object} p2 - конечная точка сегмента
   * @param {Object} options - опции для проверки
   * @returns {boolean} можно ли двигаться
   * @private
   */
  _checkTrafficLights(p1, p2, options) {
    const {
      carTrafficController,
      intersectionKeyToTL,
      getVerticalRoadXs,
      getHorizontalRoadYs,
      debugLogAlways
    } = options;

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

    const distanceToIntersection = Math.hypot(currentPos.x - targetIntersection.x, currentPos.y - targetIntersection.y);

    // ОТЛАДКА: показываем информацию о движении (только первые секунды)
    if (this.car.currentSegment === 0 && this.car.progress < 20) {
      console.log(`🚗 DEBUG: segment=${this.car.currentSegment}, progress=${this.car.progress.toFixed(1)}, distance=${distanceToIntersection.toFixed(1)}, carPos=(${this.car.position.x.toFixed(0)},${this.car.position.y.toFixed(0)}), frontPos=(${currentPos.x.toFixed(0)},${currentPos.y.toFixed(0)}) to=(${targetIntersection.x},${targetIntersection.y})`);
    }

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
        return false; // не обновляем progress - машина стоит
      }
    }

    return true;
  }

  /**
   * Обновление поворота машины
   * @param {number} dx - изменение по X
   * @param {number} dy - изменение по Y
   * @param {Function} updateLightBeams - функция обновления лучей света
   * @param {Function} debugLogAlways - функция отладки
   * @private
   */
  _updateRotation(dx, dy, updateLightBeams, debugLogAlways) {
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const targetRotation = Math.atan2(dy, dx);
      const oldRotation = this.car.rotation;
      this.car.rotation = targetRotation;

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
  }

  /**
   * Обновление позиции машины
   * @param {number} newX - новая X координата
   * @param {number} newY - новая Y координата
   * @private
   */
  _updatePosition(newX, newY) {
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(this.car.rotation);
    const offsetY = -carLength / 2 * Math.sin(this.car.rotation);
    this.car.position = { x: newX + offsetX, y: newY + offsetY };

    // Обновляем визуальное представление если есть
    if (this.car.sprite) {
      this.car.sprite.position.set(this.car.position.x, this.car.position.y);
      this.car.sprite.rotation = this.car.rotation;
    }
  }
}
