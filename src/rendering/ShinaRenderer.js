/**
 * ShinaRenderer - класс для отрисовки персонажа Шина
 * Управляет визуальным представлением Шины, её анимацией и позиционированием
 */
class ShinaRenderer {
  constructor(config, pauseManager) {
    this.config = config;
    this.pauseManager = pauseManager;
    
    // PIXI объекты
    this.sprite = null;
    this.avatar = null;
  }

  /**
   * Создает визуальное представление Шины
   * @param {Object} options - Опции инициализации
   * @returns {PIXI.Container} Контейнер с Шиной
   */
  create(options = {}) {
    this.sprite = new PIXI.Container();

    // Основной спрайт Шины (пока простой круг)
    const body = new PIXI.Graphics();
    body.beginFill(0xff69b4).drawCircle(0, 0, 25).endFill();
    body.lineStyle(2, 0x333333);
    body.drawCircle(0, 0, 25);
    this.sprite.addChild(body);

    // Аватарка Шины
    this.avatar = PIXI.Sprite.from('/public/shina.jpeg');
    this.avatar.anchor.set(0.5);
    this.avatar.width = 40;
    this.avatar.height = 40;
    this.sprite.addChild(this.avatar);

    // Начальная позиция
    this.sprite.position.set(0, 0);

    return this.sprite;
  }

  /**
   * Обновляет визуальное представление Шины на основе данных для рендеринга
   * @param {Object} shinaViewState - объект с данными для рендеринга {position, isVisible, currentState}
   */
  updateVisuals(shinaViewState) {
    if (!this.sprite) return;

    // Обновляем позицию Шины
    this.sprite.position.set(shinaViewState.position.x, shinaViewState.position.y);
    
    // Обновляем видимость в зависимости от состояния
    this.sprite.visible = shinaViewState.isVisible && shinaViewState.currentState !== 'driving';
    
    // Обновляем видимость аватарки
    if (this.avatar) {
      this.avatar.visible = shinaViewState.isVisible && shinaViewState.currentState !== 'driving';
    }
  }

  /**
   * Получает текущий спрайт Шины
   * @returns {PIXI.Container} Контейнер с Шиной
   */
  getSprite() {
    return this.sprite;
  }

  /**
   * Получает аватарку
   * @returns {PIXI.Sprite} Спрайт аватарки
   */
  getAvatar() {
    return this.avatar;
  }

  /**
   * Устанавливает позицию Шины
   * @param {number} x - X координата
   * @param {number} y - Y координата
   */
  setPosition(x, y) {
    if (this.sprite) {
      this.sprite.position.set(x, y);
    }
  }

  /**
   * Показывает/скрывает Шину
   * @param {boolean} visible - Видимость Шины
   */
  setVisible(visible) {
    if (this.sprite) {
      this.sprite.visible = visible;
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
export { ShinaRenderer };
