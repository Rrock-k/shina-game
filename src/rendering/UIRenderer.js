/**
 * UIRenderer - класс для управления UI элементами
 * Обрабатывает меню, уведомления, дисплеи и кнопки
 */
export class UIRenderer {
  constructor(config, timeManager, pauseManager, dayNightManager, panningController) {
    this.config = config;
    this.timeManager = timeManager;
    this.pauseManager = pauseManager;
    this.dayNightManager = dayNightManager;
    this.panningController = panningController;
    
    // UI элементы
    this.datetimeDisplay = null;
    this.routeDisplay = null;
    this.zoomButton = null;
    this.zoomInButton = null;
    this.zoomOutButton = null;
    this.speedButton = null;
    
    // Состояние
    this.isInitialized = false;
    this.currentRouteIndex = 0;
  }

  /**
   * Инициализация UI элементов
   */
  init() {
    if (this.isInitialized) return;
    
    // Получаем ссылки на UI элементы
    this.datetimeDisplay = document.getElementById('game-datetime');
    this.routeDisplay = document.getElementById('route-info');
    this.zoomButton = document.getElementById('zoom-button');
    this.zoomInButton = document.getElementById('zoom-in-button');
    this.zoomOutButton = document.getElementById('zoom-out-button');
    this.speedButton = document.getElementById('speed-button');
    
    // Инициализируем меню
    this.initMenu();
    
    // Инициализируем дисплеи
    this.updateRouteDisplay();
    this.updateDateTimeDisplay();
    
    this.isInitialized = true;
  }

  /**
   * Инициализация меню-бургера
   */
  initMenu() {
    const burgerButton = document.getElementById('burger-button');
    const menuModal = document.getElementById('menu-modal');
    const modalClose = document.getElementById('modal-close');
    const menuItems = document.querySelectorAll('.menu-item');

    // Функция для обновления состояния панорамирования
    const updatePanningState = () => {
      const isMenuOpen = menuModal.classList.contains('active');
      if (this.panningController) {
        this.panningController.setMenuOpen(isMenuOpen);
      }
    };

    // Открытие/закрытие меню по клику на бургер
    burgerButton.addEventListener('click', () => {
      menuModal.classList.toggle('active');
      burgerButton.classList.toggle('active');
      updatePanningState();
    });

    // Закрытие меню по клику на крестик
    modalClose.addEventListener('click', () => {
      menuModal.classList.remove('active');
      burgerButton.classList.remove('active');
      updatePanningState();
    });

    // Закрытие меню по клику на фон
    menuModal.addEventListener('click', (e) => {
      if (e.target === menuModal) {
        menuModal.classList.remove('active');
        burgerButton.classList.remove('active');
        updatePanningState();
      }
    });

    // Закрытие меню по нажатию Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuModal.classList.contains('active')) {
        menuModal.classList.remove('active');
        burgerButton.classList.remove('active');
        updatePanningState();
      }
    });

    // Обработчики для пунктов меню
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const itemId = item.id;

        // Выполняем действие в зависимости от выбранного пункта
        switch (itemId) {
          case 'menu-pause':
            // Переключаем паузу
            this.pauseManager.togglePause();
            this.timeManager.setPaused(this.pauseManager.isPaused());
            break;
          case 'menu-speed':
            // Переключаем скорость
            if (this.speedButton) {
              this.speedButton.click();
            }
            this.showMenuNotification('⚡ Скорость переключена');
            break;
          case 'menu-daynight':
            // Переключаем режим дня/ночи (не закрываем меню)
            this.dayNightManager.toggleDayNightMode();
            break;
          case 'menu-route':
            this.showMenuNotification('🗺️ Информация о маршруте', 'Текущий маршрут: ' + this.config.ROUTE_SCHEDULE[0].name);
            // Закрываем меню
            menuModal.classList.remove('active');
            burgerButton.classList.remove('active');
            updatePanningState();
            break;
          case 'menu-settings':
            this.showMenuNotification('⚙️ Настройки', 'Настройки игры будут добавлены в следующих версиях');
            // Закрываем меню
            menuModal.classList.remove('active');
            burgerButton.classList.remove('active');
            updatePanningState();
            break;
          case 'menu-help':
            this.showMenuNotification('❓ Помощь', 'Используйте мышь для панорамирования, колесо мыши для масштабирования. На мобильных: касание для панорамирования, два пальца для масштабирования. Режим дня/ночи можно переключать: автоматический, только день, только ночь. Все источники света отображаются поверх ночного режима.');
            // Закрываем меню
            menuModal.classList.remove('active');
            burgerButton.classList.remove('active');
            updatePanningState();
            break;
          case 'menu-about':
            this.showMenuNotification('ℹ️ О игре', 'Карта Шины - симулятор движения по городу с системой светофоров и маршрутизацией.');
            // Закрываем меню
            menuModal.classList.remove('active');
            burgerButton.classList.remove('active');
            updatePanningState();
            break;
        }
      });
    });
  }

  /**
   * Показать уведомление из меню
   */
  showMenuNotification(title, message = '') {
    const notification = document.createElement('div');
    notification.innerHTML = `<strong>${title}</strong>${message ? '<br>' + message : ''}`;
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #3498db, #2980b9);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: bold;
      z-index: 1001;
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
      text-align: center;
      max-width: 300px;
      animation: slideDown 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Убираем уведомление через 3 секунды
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideDown 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * Обновление дисплея маршрута
   * @param {boolean} isAtDestination - находится ли машина в пункте назначения
   */
  updateRouteDisplay(isAtDestination = false) {
    if (!this.routeDisplay) return; // защита от вызова до инициализации
    const currentDest = this.config.ROUTE_SCHEDULE[this.currentRouteIndex];
    const prefixSpan = this.routeDisplay.querySelector('.route-prefix');
    const destinationSpan = this.routeDisplay.querySelector('.route-destination');
    
    if (isAtDestination) {
      prefixSpan.textContent = 'В пункте:';
      destinationSpan.textContent = currentDest.name;
    } else {
      prefixSpan.textContent = 'В пути в:';
      destinationSpan.textContent = currentDest.name;
    }
  }

  /**
   * Обновление отображения времени
   */
  updateDateTimeDisplay() {
    if (this.datetimeDisplay) {
      this.datetimeDisplay.innerHTML = this.timeManager.formatDateTime();
    }
  }

  /**
   * Обновление кнопки масштабирования
   */
  updateZoomButton() {
    if (typeof this.panningController !== 'undefined' && this.panningController) {
      const isFullscreen = this.panningController.isFullscreenMode();
      if (isFullscreen) {
        this.zoomButton.textContent = 'Обычный размер';
        this.zoomButton.classList.add('boosted');
      } else {
        const scale = this.panningController.getCurrentScale();
        this.zoomButton.textContent = `Полный экран`;
        this.zoomButton.classList.toggle('boosted', scale > 1.1);
      }

      // Обновляем состояние кнопок масштабирования
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const scale = this.panningController.getCurrentScale();
        this.zoomInButton.disabled = scale >= 10;
        this.zoomOutButton.disabled = scale <= 0.1;
      }
    }
  }

  /**
   * Установка текущего индекса маршрута
   */
  setCurrentRouteIndex(index) {
    this.currentRouteIndex = index;
  }

  /**
   * Обновление всех UI элементов
   * @param {boolean} isAtDestination - находится ли машина в пункте назначения
   */
  update(isAtDestination = false) {
    this.updateDateTimeDisplay();
    this.updateRouteDisplay(isAtDestination);
    this.updateZoomButton();
  }
}
