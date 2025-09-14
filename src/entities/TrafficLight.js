/**
 * Класс светофора - сущность для управления светофором на перекрестке
 * Управляет состоянием светофора, переключением фаз и визуальным представлением
 */
export class TrafficLight {
  constructor(config, options = {}) {
    this.config = config;
    
    // Позиция светофора
    this.position = { x: 0, y: 0 };
    
    // Состояние светофора
    this.currentPhase = 'red'; // 'red', 'yellow', 'green'
    this.direction = 'EW'; // 'EW' (восток-запад) или 'NS' (север-юг)
    
    // Временные параметры
    this.cycleTime = 10000; // общий цикл в миллисекундах
    this.redTime = 4000;    // время красного света
    this.yellowTime = 1000; // время желтого света
    this.greenTime = 5000;  // время зеленого света
    
    // Состояние цикла
    this.cycleStartTime = 0;
    this.startDelay = 0;
    this.isActive = true;
    
    // Поддержка задержки запуска для зеленой волны
    this.delayElapsedMs = 0; // сколько времени прошло с момента создания
    this.isDelayActive = false; // активна ли сейчас задержка
    
    // Визуальное представление
    this.sprite = null;
    this.lamps = {
      red: null,
      yellow: null,
      green: null
    };
    
    // Callback функции
    this.onPhaseChange = null;
    this.onStateChange = null;
    
    // Инициализация с переданными опциями
    this.init(options);
  }

  /**
   * Инициализация светофора
   * @param {Object} options - опции инициализации
   */
  init(options = {}) {
    this.position = { ...options.position } || { x: 0, y: 0 };
    this.direction = options.direction || 'EW';
    this.cycleTime = options.cycleTime || this.cycleTime;
    this.redTime = options.redTime || this.redTime;
    this.yellowTime = options.yellowTime || this.yellowTime;
    this.greenTime = options.greenTime || this.greenTime;
    this.startDelay = options.startDelay || 0;
    this.isActive = options.isActive !== undefined ? options.isActive : true;
    
    // Устанавливаем callback функции
    this.onPhaseChange = options.onPhaseChange || null;
    this.onStateChange = options.onStateChange || null;
    
    // Инициализируем время начала цикла
    this.cycleStartTime = Date.now() - this.startDelay;
  }

  /**
   * Установить позицию светофора
   * @param {Object} position - объект с координатами {x, y}
   */
  setPosition(position) {
    this.position = { ...position };
    this.updateVisualPosition();
  }

  /**
   * Получить позицию светофора
   * @returns {Object} объект с координатами {x, y}
   */
  getPosition() {
    return { ...this.position };
  }

  /**
   * Установить направление светофора
   * @param {string} direction - направление ('EW' или 'NS')
   */
  setDirection(direction) {
    this.direction = direction;
    this.updateVisualDirection();
  }

  /**
   * Получить направление светофора
   * @returns {string} направление
   */
  getDirection() {
    return this.direction;
  }

  /**
   * Установить время цикла
   * @param {number} cycleTime - время цикла в миллисекундах
   */
  setCycleTime(cycleTime) {
    this.cycleTime = cycleTime;
  }

  /**
   * Установить задержку запуска
   * @param {number} delay - задержка в миллисекундах
   */
  setStartDelay(delay) {
    this.startDelay = delay;
    this.delayElapsedMs = 0;
    this.isDelayActive = delay > 0;
    
    // Сброс светофора в начальное состояние
    this.currentPhase = 'red';
    this.cycleStartTime = Date.now();
  }

  /**
   * Получить текущую фазу
   * @returns {string} текущая фаза
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * Установить фазу
   * @param {string} phase - фаза ('red', 'yellow', 'green')
   */
  setPhase(phase) {
    if (this.currentPhase !== phase) {
      this.currentPhase = phase;
      this.updateVisualPhase();
      
      if (this.onPhaseChange) {
        this.onPhaseChange(phase, this);
      }
    }
  }

  /**
   * Проверить, можно ли ехать
   * @returns {boolean} true если можно ехать
   */
  canMove() {
    return this.currentPhase === 'green' && this.isActive;
  }

  /**
   * Проверить, активен ли светофор
   * @returns {boolean} true если активен
   */
  isActive() {
    return this.isActive;
  }

  /**
   * Активировать светофор
   */
  activate() {
    this.isActive = true;
    this.cycleStartTime = Date.now() - this.startDelay;
    
    if (this.onStateChange) {
      this.onStateChange('activated', this);
    }
  }

  /**
   * Деактивировать светофор
   */
  deactivate() {
    this.isActive = false;
    this.setPhase('red');
    
    if (this.onStateChange) {
      this.onStateChange('deactivated', this);
    }
  }

  /**
   * Обновление светофора (вызывается каждый кадр)
   * @param {number} delta - время с последнего кадра
   */
  update(delta) {
    if (!this.isActive) return;

    // Если активна задержка запуска, ждем ее завершения
    if (this.isDelayActive) {
      this.delayElapsedMs += delta;
      if (this.delayElapsedMs >= this.startDelay) {
        this.isDelayActive = false;
        // Начинаем нормальную работу светофора
        this.cycleStartTime = Date.now();
        this.updateVisualPhase();
      }
      return; // не обновляем фазы во время задержки
    }

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) % this.cycleTime;
    
    // Определяем текущую фазу на основе прошедшего времени
    let newPhase = 'red';
    
    if (elapsedTime < this.redTime) {
      newPhase = 'red';
    } else if (elapsedTime < this.redTime + this.yellowTime) {
      newPhase = 'yellow';
    } else if (elapsedTime < this.redTime + this.yellowTime + this.greenTime) {
      newPhase = 'green';
    }
    
    // Обновляем фазу если она изменилась
    if (newPhase !== this.currentPhase) {
      this.setPhase(newPhase);
    }
  }

  /**
   * Проверить, разрешен ли проезд в данном направлении
   * @param {string} direction - направление ('EW' или 'NS')
   * @returns {boolean} true если проезд разрешен
   */
  isPassAllowed(direction) {
    if (!this.isActive) return false;
    
    // Для упрощенной модели: зеленый свет разрешает проезд в любом направлении
    // В реальной реализации здесь была бы более сложная логика
    return this.currentPhase === 'green' || this.currentPhase === 'yellow';
  }

  /**
   * Получить время до следующего изменения фазы
   * @returns {number} время в миллисекундах
   */
  getTimeToNextPhase() {
    if (!this.isActive) return 0;

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) % this.cycleTime;
    
    let timeToNext = 0;
    
    if (elapsedTime < this.redTime) {
      timeToNext = this.redTime - elapsedTime;
    } else if (elapsedTime < this.redTime + this.yellowTime) {
      timeToNext = (this.redTime + this.yellowTime) - elapsedTime;
    } else if (elapsedTime < this.redTime + this.yellowTime + this.greenTime) {
      timeToNext = (this.redTime + this.yellowTime + this.greenTime) - elapsedTime;
    } else {
      timeToNext = this.cycleTime - elapsedTime;
    }
    
    return timeToNext;
  }

  /**
   * Получить прогресс текущей фазы (0-1)
   * @returns {number} прогресс от 0 до 1
   */
  getPhaseProgress() {
    if (!this.isActive) return 0;

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) % this.cycleTime;
    
    let phaseStart = 0;
    let phaseDuration = 0;
    
    if (elapsedTime < this.redTime) {
      phaseStart = 0;
      phaseDuration = this.redTime;
    } else if (elapsedTime < this.redTime + this.yellowTime) {
      phaseStart = this.redTime;
      phaseDuration = this.yellowTime;
    } else if (elapsedTime < this.redTime + this.yellowTime + this.greenTime) {
      phaseStart = this.redTime + this.yellowTime;
      phaseDuration = this.greenTime;
    } else {
      phaseStart = this.redTime + this.yellowTime + this.greenTime;
      phaseDuration = this.cycleTime - phaseStart;
    }
    
    const phaseElapsed = elapsedTime - phaseStart;
    return Math.min(1, phaseElapsed / phaseDuration);
  }

  /**
   * Синхронизировать с другим светофором (для зеленой волны)
   * @param {TrafficLight} otherLight - другой светофор
   * @param {number} delay - задержка в миллисекундах
   */
  syncWith(otherLight, delay = 0) {
    this.cycleStartTime = otherLight.cycleStartTime + delay;
    this.startDelay = delay;
  }

  /**
   * Сбросить цикл светофора
   */
  resetCycle() {
    this.cycleStartTime = Date.now() - this.startDelay;
    this.setPhase('red');
  }

  /**
   * Установить визуальное представление
   * @param {PIXI.Container} sprite - PIXI контейнер светофора
   */
  setSprite(sprite) {
    this.sprite = sprite;
    this.updateVisualPosition();
    this.updateVisualDirection();
    this.updateVisualPhase();
  }

  /**
   * Получить визуальное представление
   * @returns {PIXI.Container} PIXI контейнер светофора
   */
  getSprite() {
    return this.sprite;
  }

  /**
   * Установить лампы светофора
   * @param {Object} lamps - объект с лампами {red, yellow, green}
   */
  setLamps(lamps) {
    this.lamps = { ...lamps };
    this.updateVisualPhase();
  }

  /**
   * Обновить позицию визуального представления
   */
  updateVisualPosition() {
    if (this.sprite) {
      this.sprite.position.set(this.position.x, this.position.y);
    }
  }

  /**
   * Обновить направление визуального представления
   */
  updateVisualDirection() {
    if (this.sprite) {
      // Поворачиваем светофор в зависимости от направления
      if (this.direction === 'NS') {
        this.sprite.rotation = Math.PI / 2; // 90 градусов
      } else {
        this.sprite.rotation = 0; // 0 градусов
      }
    }
  }

  /**
   * Обновить визуальное представление фазы
   */
  updateVisualPhase() {
    if (!this.sprite) return;

    // Если есть головы светофора, используем их для обновления
    if (this.heads) {
      this.updateAllHeads();
      return;
    }

    // Иначе используем простую логику с лампами
    Object.values(this.lamps).forEach(lamp => {
      if (lamp) lamp.visible = false;
    });

    // Во время задержки показываем красный свет
    const phaseToShow = this.isDelayActive ? 'red' : this.currentPhase;
    const activeLamp = this.lamps[phaseToShow];
    if (activeLamp) {
      activeLamp.visible = true;
    }
  }

  /**
   * Создать визуальное представление светофора
   * @param {Object} options - опции для создания
   * @returns {PIXI.Container} PIXI контейнер светофора
   */
  createVisual(options = {}) {
    const {
      PIXI,
      roadWidth = 48,
      lampRadius = 8,
      roadConnections = { north: true, south: true, east: true, west: true }
    } = options;

    if (!PIXI) {
      console.warn('PIXI не предоставлен для создания визуального представления светофора');
      return null;
    }

    const root = new PIXI.Container();
    root.position.set(this.position.x, this.position.y);

    const offset = roadWidth * 1.2;
    const heads = {};

    // Создаем головы светофора для каждого направления
    if (roadConnections.north) {
      const headN = this.createTrafficLightHead(PIXI, 'horizontal', lampRadius);
      headN.container.position.set(0, -offset);
      root.addChild(headN.container);
      heads.N = headN;
    }

    if (roadConnections.south) {
      const headS = this.createTrafficLightHead(PIXI, 'horizontal', lampRadius);
      headS.container.position.set(0, offset);
      root.addChild(headS.container);
      heads.S = headS;
    }

    if (roadConnections.west) {
      const headW = this.createTrafficLightHead(PIXI, 'vertical', lampRadius);
      headW.container.position.set(-offset, 0);
      root.addChild(headW.container);
      heads.W = headW;
    }

    if (roadConnections.east) {
      const headE = this.createTrafficLightHead(PIXI, 'vertical', lampRadius);
      headE.container.position.set(offset, 0);
      root.addChild(headE.container);
      heads.E = headE;
    }

    // Сохраняем ссылки на головы
    this.heads = heads;
    this.sprite = root;

    // Обновляем визуальное представление
    this.updateVisualPhase();

    return root;
  }

  /**
   * Создать голову светофора
   * @param {Object} PIXI - PIXI объект
   * @param {string} orientation - ориентация ('vertical' или 'horizontal')
   * @param {number} lampRadius - радиус лампы
   * @returns {Object} объект с головой светофора
   */
  createTrafficLightHead(PIXI, orientation, lampRadius) {
    const container = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    
    const isVertical = orientation === 'vertical';
    const bodyWidth = isVertical ? 22 : 54;
    const bodyHeight = isVertical ? 54 : 22;
    
    // Корпус светофора
    graphics.beginFill(0x111111)
      .drawRoundedRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight, 4)
      .endFill();
    
    container.addChild(graphics);

    // Создаем лампы
    const red = new PIXI.Graphics();
    const yellow = new PIXI.Graphics();
    const green = new PIXI.Graphics();

    if (isVertical) {
      // Вертикальное расположение ламп
      red.beginFill(0xff0000).drawCircle(0, -16, lampRadius).endFill();
      yellow.beginFill(0xffff00).drawCircle(0, 0, lampRadius).endFill();
      green.beginFill(0x00ff00).drawCircle(0, 16, lampRadius).endFill();
    } else {
      // Горизонтальное расположение ламп
      red.beginFill(0xff0000).drawCircle(-16, 0, lampRadius).endFill();
      yellow.beginFill(0xffff00).drawCircle(0, 0, lampRadius).endFill();
      green.beginFill(0x00ff00).drawCircle(16, 0, lampRadius).endFill();
    }

    container.addChild(red, yellow, green);

    return {
      container,
      red,
      yellow,
      green,
      orientation
    };
  }

  /**
   * Обновить визуальное представление всех голов светофора
   */
  updateAllHeads() {
    if (!this.heads) return;

    const setHeadState = (head, state) => {
      if (!head) return;
      
      head.red.alpha = state === 'red' ? 1 : 0.2;
      head.yellow.alpha = state === 'yellow' ? 1 : 0.2;
      head.green.alpha = state === 'green' ? 1 : 0.2;
    };

    // Во время задержки все светофоры показывают красный
    if (this.isDelayActive) {
      if (this.heads.N) setHeadState(this.heads.N, 'red');
      if (this.heads.S) setHeadState(this.heads.S, 'red');
      if (this.heads.W) setHeadState(this.heads.W, 'red');
      if (this.heads.E) setHeadState(this.heads.E, 'red');
      return;
    }

    // Определяем состояние для каждого направления
    let nsState = 'red';
    let ewState = 'red';

    if (this.currentPhase === 'green') {
      // Зеленый свет для всех направлений (упрощенная модель)
      nsState = 'green';
      ewState = 'green';
    } else if (this.currentPhase === 'yellow') {
      // Желтый свет для всех направлений
      nsState = 'yellow';
      ewState = 'yellow';
    }

    // Обновляем головы в зависимости от направления
    if (this.direction === 'NS') {
      // NS направление активно
      if (this.heads.N) setHeadState(this.heads.N, nsState);
      if (this.heads.S) setHeadState(this.heads.S, nsState);
      if (this.heads.W) setHeadState(this.heads.W, 'red');
      if (this.heads.E) setHeadState(this.heads.E, 'red');
    } else {
      // EW направление активно
      if (this.heads.N) setHeadState(this.heads.N, 'red');
      if (this.heads.S) setHeadState(this.heads.S, 'red');
      if (this.heads.W) setHeadState(this.heads.W, ewState);
      if (this.heads.E) setHeadState(this.heads.E, ewState);
    }
  }

  /**
   * Установить callback для изменения фазы
   * @param {Function} callback - функция обратного вызова
   */
  setOnPhaseChange(callback) {
    this.onPhaseChange = callback;
  }

  /**
   * Установить callback для изменения состояния
   * @param {Function} callback - функция обратного вызова
   */
  setOnStateChange(callback) {
    this.onStateChange = callback;
  }

  /**
   * Получить информацию о светофоре для отладки
   * @returns {Object} объект с информацией о состоянии
   */
  getDebugInfo() {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.cycleStartTime) % this.cycleTime;
    
    return {
      position: this.position,
      direction: this.direction,
      currentPhase: this.currentPhase,
      isActive: this.isActive,
      cycleTime: this.cycleTime,
      elapsedTime: elapsedTime,
      redTime: this.redTime,
      yellowTime: this.yellowTime,
      greenTime: this.greenTime,
      startDelay: this.startDelay
    };
  }
}
