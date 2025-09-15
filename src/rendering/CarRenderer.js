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
  }

  /**
   * Создает визуальное представление машины
   * @param {Object} options - Опции инициализации
   * @param {Object} options.savedCarState - Сохраненное состояние машины (для начального поворота)
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

    // car.position будет указывать на центр машины
    this.car.pivot.set(0, 0); // пивот в центре
    this.car.position.set(0, 0); // начальная позиция

    const initialRotation = (options.savedCarState && options.savedCarState.direction) || 0;
    this.car.rotation = initialRotation;
    if (this.avatar) {
      this.avatar.rotation = -initialRotation;
    }

    return this.car;
  }

  /**
   * Обновляет визуальное представление машины на основе данных для рендеринга
   * @param {Object} carViewState - объект с данными для рендеринга {position, rotation, headlightsOn}
   */
  updateVisuals(carViewState) {
    if (!this.car) return;

    // Обновляем позицию машины
    this.car.position.set(carViewState.position.x, carViewState.position.y);
    
    // Обновляем поворот машины
    this.car.rotation = carViewState.rotation;
    
    // Обновляем поворот аватарки (противоположный повороту машины)
    if (this.avatar) {
      this.avatar.rotation = -carViewState.rotation;
    }
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

}

// Экспорт для использования в других модулях
export { CarRenderer };
