/**
 * UIRenderer - класс для управления UI элементами
 * Обрабатывает меню, уведомления, дисплеи и кнопки
 */
export class UIRenderer {
  constructor(
    config,
    timeManager,
    pauseManager,
    dayNightManager,
    panningController,
    journalManager,
    carEntity,
    scheduleManager = null,
    stateManager = null
  ) {
    this.config = config;
    this.timeManager = timeManager;
    this.pauseManager = pauseManager;
    this.dayNightManager = dayNightManager;
    this.panningController = panningController;
    this.journalManager = journalManager;
    this.carEntity = carEntity;
    this.scheduleManager = scheduleManager;
    this.stateManager = stateManager;
    
    // UI элементы
    this.datetimeDisplay = null;
    this.routeDisplay = null;
    this.zoomButton = null;
    this.zoomInButton = null;
    this.zoomOutButton = null;
    this.speedButton = null;
    
    // Состояние
    this.isInitialized = false;
    this.currentRouteIndex = 0; // сохраним для фолбэка на статическое расписание
    this.fallbackRoute = this.config?.ROUTE_SCHEDULE?.[0] || null;
    this.journalUpdateInterval = null;
    this.currentMenuState = 'main'; // 'main', 'journal', 'schedule', 'help', 'about'
    this.modalStack = []; // Стек для навигации по модальным окнам
    this.scheduleOverlayVisible = false; // Состояние оверлея расписания
  }

  /**
   * Инициализация UI элементов
   */
  init() {
    if (this.isInitialized) return;
    
    this.datetimeDisplay = document.getElementById('game-datetime');
    this.routeDisplay = document.getElementById('route-info');
    this.zoomButton = document.getElementById('zoom-button');
    this.zoomInButton = document.getElementById('zoom-in-button');
    this.zoomOutButton = document.getElementById('zoom-out-button');
    this.speedButton = document.getElementById('speed-button');
    
    this.initMenu();
    this.initKeyboardShortcuts();
    this.initDayNightEvents();
    
    this.updateRouteDisplay();
    this.updateDateTimeDisplay();
    
    this.updateMenuTitle();
    
    this.isInitialized = true;
  }

  /**
   * Инициализация подписок на события DayNightManager
   */
  initDayNightEvents() {
    if (!this.dayNightManager) return;

    // Подписываемся на изменение режима дня/ночи
    this.dayNightManager.on('modeChange', (data) => {
      console.log('🌙 UIRenderer: получено событие modeChange', data);
      // Здесь можно добавить дополнительную логику обновления UI
    });

    // Подписываемся на переключение режима
    this.dayNightManager.on('modeToggle', (data) => {
      console.log('🌅 UIRenderer: получено событие modeToggle', data);
      // Здесь можно добавить дополнительную логику обновления UI
    });

    // Подписываемся на изменение альфы
    this.dayNightManager.on('alphaChange', (data) => {
      console.log('🎨 UIRenderer: получено событие alphaChange', data);
      // Здесь можно добавить дополнительную логику обновления UI
    });
  }

  /**
   * Инициализация меню-бургера
   */
  initMenu() {
    const burgerButton = document.getElementById('burger-button');
    const unifiedModal = document.getElementById('unified-modal');
    const modalClose = document.getElementById('modal-close');
    const modalBackBtn = document.getElementById('modal-back-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    // Функция для обновления состояния панорамирования
    const updatePanningState = () => {
      const isMenuOpen = unifiedModal.classList.contains('active');
      if (this.panningController) {
        this.panningController.setMenuOpen(isMenuOpen);
      }
    };

    // Открытие/закрытие меню по клику на бургер
    burgerButton.addEventListener('click', () => {
      this.toggleUnifiedModal();
      updatePanningState();
    });

    // Закрытие меню по клику на крестик
    modalClose.addEventListener('click', () => {
      this.closeUnifiedModal();
      updatePanningState();
    });

    // Закрытие меню по клику на фон
    unifiedModal.addEventListener('click', (e) => {
      if (e.target === unifiedModal) {
        this.closeUnifiedModal();
        updatePanningState();
      }
    });

    // Закрытие меню по нажатию Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && unifiedModal.classList.contains('active')) {
        this.closeUnifiedModal();
        updatePanningState();
      }
    });

    // Обработчик для кнопки "Назад"
    if (modalBackBtn) {
      modalBackBtn.addEventListener('click', () => {
        this.goBack();
      });
    }

    // Обработчики для пунктов меню
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        const itemId = item.id;
        this.handleMenuClick(itemId);
      });
    });
  }

  /**
   * Переключение единого модального окна
   */
  toggleUnifiedModal() {
    const unifiedModal = document.getElementById('unified-modal');
    const burgerButton = document.getElementById('burger-button');
    
    if (unifiedModal.classList.contains('active')) {
      this.closeUnifiedModal();
    } else {
      this.openUnifiedModal();
    }
  }

  /**
   * Открытие единого модального окна
   */
  openUnifiedModal() {
    const unifiedModal = document.getElementById('unified-modal');
    const burgerButton = document.getElementById('burger-button');
    
    unifiedModal.classList.add('active');
    burgerButton.classList.add('active');
    
    // Сбрасываем состояние на главное меню
    this.currentMenuState = 'main';
    this.modalStack = [];
    this.showContentPage('main-menu-content');
    this.updateMenuTitle();
    this.updateBackButton();
  }

  /**
   * Закрытие единого модального окна
   */
  closeUnifiedModal() {
    const unifiedModal = document.getElementById('unified-modal');
    const burgerButton = document.getElementById('burger-button');
    
    unifiedModal.classList.remove('active');
    burgerButton.classList.remove('active');
    
    // Сбрасываем состояние
    this.currentMenuState = 'main';
    this.modalStack = [];
  }

  /**
   * Обработка клика по пункту меню
   */
  handleMenuClick(itemId) {
    switch (itemId) {
      case 'menu-pause':
        // Переключаем паузу
        this.pauseManager.togglePause();
        this.timeManager.setPaused(this.pauseManager.isPaused());
        this.updatePauseModeDisplay();
        break;
      case 'menu-speed':
        // Переключаем скорость
        if (this.speedButton) {
          this.speedButton.click();
        }
        this.updateSpeedDisplay();
        break;
      case 'menu-daynight':
        // Переключаем режим дня/ночи
        this.dayNightManager.toggleDayNightMode();
        this.updateDayNightModeDisplay();
        break;
      case 'menu-car-lights':
        // Переключаем фары машины
        if (this.carEntity && typeof this.carEntity.toggleHeadlights === 'function') {
          this.carEntity.toggleHeadlights();
          this.updateCarLightsDisplay();
        }
        break;
      case 'menu-schedule':
        // Переходим к расписанию
        this.navigateToContent('schedule', 'Расписание');
        break;
      case 'menu-journal':
        // Переходим к журналу
        this.navigateToContent('journal', 'Журнал поездок');
        break;
      case 'menu-help':
        // Переходим к помощи
        this.navigateToContent('help', 'Помощь');
        break;
      case 'menu-about':
        // Переходим к "О игре"
        this.navigateToContent('about', 'О игре');
        break;
    }
  }

  /**
   * Навигация к контенту
   */
  navigateToContent(contentType, title) {
    // Добавляем текущее состояние в стек
    this.modalStack.push(this.currentMenuState);
    
    // Обновляем состояние
    this.currentMenuState = contentType;
    
    // Показываем соответствующий контент
    this.showContentPage(`${contentType}-content`);
    
    // Обновляем заголовок и кнопку "Назад"
    this.updateMenuTitle();
    this.updateBackButton();
    
    // Обновляем данные контента
    this.updateContentData(contentType);
  }

  /**
   * Возврат назад
   */
  goBack() {
    if (this.modalStack.length > 0) {
      const previousState = this.modalStack.pop();
      this.currentMenuState = previousState;
      
      if (previousState === 'main') {
        this.showContentPage('main-menu-content');
      } else {
        this.showContentPage(`${previousState}-content`);
      }
      
      this.updateMenuTitle();
      this.updateBackButton();
    } else {
      // Если стек пуст, закрываем модальное окно
      this.closeUnifiedModal();
    }
  }

  /**
   * Показ страницы контента
   */
  showContentPage(pageId) {
    // Скрываем все страницы
    const allPages = document.querySelectorAll('.modal-content-page');
    allPages.forEach(page => {
      page.classList.remove('active');
      page.style.display = 'none';
    });
    
    // Показываем нужную страницу
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.style.display = 'block';
      targetPage.classList.add('active');
    }
  }

  /**
   * Обновление кнопки "Назад"
   */
  updateBackButton() {
    const backBtn = document.getElementById('modal-back-btn');
    if (backBtn) {
      backBtn.style.display = this.modalStack.length > 0 ? 'block' : 'none';
    }
  }

  /**
   * Обновление данных контента
   */
  updateContentData(contentType) {
    switch (contentType) {
      case 'journal':
        this.updateJournalDisplay();
        break;
      case 'schedule':
        this.updateScheduleDisplay();
        break;
      case 'help':
      case 'about':
        // Контент статичный, обновления не требуются
        break;
    }
  }

  /**
   * Инициализация горячих клавиш
   */
  initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      );
      
      if (isInputField) return;
      
      // Обработка горячих клавиш
      switch (e.key) {
        case 'j':
        case 'J':
        case 'о':  // русская раскладка
        case 'О':
          e.preventDefault();
          // Открываем модальное окно и переходим к журналу
          if (!document.getElementById('unified-modal').classList.contains('active')) {
            this.openUnifiedModal();
            this.navigateToContent('journal', 'Журнал поездок');
          } else if (this.currentMenuState !== 'journal') {
            // Если модальное окно уже открыто, но мы не в журнале, переходим к журналу
            this.navigateToContent('journal', 'Журнал поездок');
          } else {
            // Если уже в журнале, закрываем модальное окно (toggle поведение)
            this.closeUnifiedModal();
          }
          break;
        case 'k':
        case 'K':
        case 'л':  // русская раскладка
        case 'Л':
          e.preventDefault();
          // Переключаем отображение расписания внутри game-container
          this.toggleScheduleOverlay();
          break;
        // Здесь можно добавить другие горячие клавиши в будущем
      }
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

    const prefixSpan = this.routeDisplay.querySelector('.route-prefix');
    const destinationSpan = this.routeDisplay.querySelector('.route-destination');

    let prefixText = isAtDestination ? 'В пункте:' : 'В пути в:';
    let destinationText = this._getFallbackRouteName();

    if (this.scheduleManager) {
      const now = this._getGameDate();
      const currentLocationKey = this.stateManager ? this.stateManager.getCurrentLocation() : null;

      const activeTask = this.scheduleManager.getCurrentTask(
        now,
        isAtDestination ? currentLocationKey : null
      );

      if (isAtDestination) {
        destinationText =
          activeTask?.name ||
          this._getLocationLabel(currentLocationKey) ||
          destinationText;
      } else {
        const enRouteTask =
          (activeTask && activeTask.status === 'ACTIVE') ?
            activeTask :
            this.scheduleManager.getUpcomingTask();

        destinationText =
          enRouteTask?.name ||
          this._getLocationLabel(enRouteTask?.location) ||
          destinationText;
      }
    }

    prefixSpan.textContent = prefixText;
    destinationSpan.textContent = destinationText;
  }

  /**
   * Обновление отображения скорости в меню
   */
  updateSpeedDisplay() {
    const speedDisplay = document.getElementById('speed-display');
    if (!speedDisplay || !this.pauseManager) return;
    
    const speedMultiplier = this.pauseManager.getSpeedMultiplier();
    speedDisplay.textContent = `x${speedMultiplier}`;
  }

  /**
   * Обновление отображения состояния фар в меню
   */
  updateCarLightsDisplay() {
    const lightsStatus = document.getElementById('car-lights-status');
    if (!lightsStatus) return;
    
    let headlightsOn = false;
    if (this.carEntity && typeof this.carEntity.areHeadlightsOn === 'function') {
      headlightsOn = this.carEntity.areHeadlightsOn();
    }
    
    lightsStatus.textContent = headlightsOn ? 'ВКЛ' : 'ВЫКЛ';
  }

  /**
   * Обновление отображения состояния паузы в меню
   */
  updatePauseModeDisplay() {
    const pauseModeText = document.getElementById('pause-mode-text');
    if (!pauseModeText || !this.pauseManager) return;
    
    pauseModeText.textContent = this.pauseManager.isPaused() ? 'Включена' : 'Выключена';
  }

  /**
   * Обновление отображения режима дня/ночи в меню
   */
  updateDayNightModeDisplay() {
    const dayNightModeText = document.getElementById('daynight-mode-text');
    if (!dayNightModeText || !this.dayNightManager) return;
    
    const modeTexts = {
      'auto': 'Авто',
      'day': 'День',
      'night': 'Ночь'
    };
    
    const currentMode = this.dayNightManager.getCurrentMode();
    dayNightModeText.textContent = modeTexts[currentMode] || 'Авто';
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
    const routeList = this.config?.ROUTE_SCHEDULE || [];
    this.fallbackRoute = routeList[index] || this.fallbackRoute;
  }

  /**
   * Обновить заголовок меню
   */
  updateMenuTitle() {
    const modalTitle = document.querySelector('.modal-title');
    if (!modalTitle) return;

    switch (this.currentMenuState) {
      case 'main':
        modalTitle.textContent = 'Меню игры';
        break;
      case 'journal':
        modalTitle.textContent = 'Журнал поездок';
        break;
      case 'schedule':
        modalTitle.textContent = 'Расписание';
        break;
      case 'help':
        modalTitle.textContent = 'Помощь';
        break;
      case 'about':
        modalTitle.textContent = 'О игре';
        break;
      default:
        modalTitle.textContent = 'Меню игры';
    }
  }




  /**
   * Создать модальное окно журнала
   */
  createJournalModal() {
    const journalModal = document.createElement('div');
    journalModal.id = 'journal-modal';
    journalModal.className = 'modal-overlay';
    journalModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <button class="modal-back-btn" id="journal-back-btn">&lt;</button>
          <h2 class="modal-title">Журнал поездок</h2>
          <button class="modal-close" id="journal-close-btn">&times;</button>
        </div>
        <div class="journal-content">
          <div class="trip-list" id="journal-trip-list">
            <!-- Записи журнала будут добавлены динамически -->
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(journalModal);
    
    // Обработчики событий
    const backBtn = document.getElementById('journal-back-btn');
    const closeBtn = document.getElementById('journal-close-btn');
    
    backBtn.addEventListener('click', () => this.hideJournal());
    closeBtn.addEventListener('click', () => this.hideJournal());
    
    // Закрытие по клику на фон
    journalModal.addEventListener('click', (e) => {
      if (e.target === journalModal) {
        this.hideJournal();
      }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && journalModal.classList.contains('active')) {
        this.hideJournal();
      }
    });
  }

  /**
   * Создать модальное окно расписания
   */
  createScheduleModal() {
    const scheduleModal = document.createElement('div');
    scheduleModal.id = 'schedule-modal';
    scheduleModal.className = 'modal-overlay';
    scheduleModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <button class="modal-back-btn" id="schedule-back-btn">&lt;</button>
          <h2 class="modal-title">Расписание</h2>
          <button class="modal-close" id="schedule-close-btn">&times;</button>
        </div>
        <div class="schedule-content">
          <div class="schedule-list" id="schedule-list">
            <!-- Элементы расписания будут добавлены динамически -->
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(scheduleModal);
    
    // Обработчики событий
    const backBtn = document.getElementById('schedule-back-btn');
    const closeBtn = document.getElementById('schedule-close-btn');
    
    backBtn.addEventListener('click', () => this.hideSchedule());
    closeBtn.addEventListener('click', () => this.hideSchedule());
    
    // Закрытие по клику на фон
    scheduleModal.addEventListener('click', (e) => {
      if (e.target === scheduleModal) {
        this.hideSchedule();
      }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && scheduleModal.classList.contains('active')) {
        this.hideSchedule();
      }
    });
  }

  /**
   * Создать модальное окно помощи
   */
  createHelpModal() {
    const helpModal = document.createElement('div');
    helpModal.id = 'help-modal';
    helpModal.className = 'modal-overlay';
    helpModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <button class="modal-back-btn" id="help-back-btn">&lt;</button>
          <h2 class="modal-title">Помощь</h2>
          <button class="modal-close" id="help-close-btn">&times;</button>
        </div>
        <div class="help-content">
          <div class="help-text">
            <h3>Управление игрой</h3>
            <p><strong>Мышь:</strong> панорамирование карты</p>
            <p><strong>Колесо мыши:</strong> масштабирование</p>
            <p><strong>На мобильных:</strong> касание для панорамирования, два пальца для масштабирования</p>
            
            <h3>Режимы дня/ночи</h3>
            <p>Можно переключать: автоматический, только день, только ночь</p>
            <p>Все источники света отображаются поверх ночного режима</p>
            
            <h3>Скорость игры</h3>
            <p>Переключайте скорость: x1, x2, x5</p>
            
            <h3>Фары машины</h3>
            <p>Включайте/выключайте фары по необходимости</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Обработчики событий
    const backBtn = document.getElementById('help-back-btn');
    const closeBtn = document.getElementById('help-close-btn');
    
    backBtn.addEventListener('click', () => this.hideHelp());
    closeBtn.addEventListener('click', () => this.hideHelp());
    
    // Закрытие по клику на фон
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        this.hideHelp();
      }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpModal.classList.contains('active')) {
        this.hideHelp();
      }
    });
  }

  /**
   * Создать модальное окно "О игре"
   */
  createAboutModal() {
    const aboutModal = document.createElement('div');
    aboutModal.id = 'about-modal';
    aboutModal.className = 'modal-overlay';
    aboutModal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <button class="modal-back-btn" id="about-back-btn">&lt;</button>
          <h2 class="modal-title">О игре</h2>
          <button class="modal-close" id="about-close-btn">&times;</button>
        </div>
        <div class="about-content">
          <div class="about-text">
            <h3>Карта Шины</h3>
            <p>Симулятор движения по городу с системой светофоров и маршрутизацией.</p>
            
            <h3>Особенности</h3>
            <ul>
              <li>Реалистичная система светофоров</li>
              <li>Динамическое управление скоростью</li>
              <li>Режимы дня и ночи</li>
              <li>Система фар автомобиля</li>
              <li>Журнал поездок</li>
              <li>Расписание маршрутов</li>
            </ul>
            
            <h3>Технологии</h3>
            <p>Игра создана с использованием PIXI.js для рендеринга и современного JavaScript.</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(aboutModal);
    
    // Обработчики событий
    const backBtn = document.getElementById('about-back-btn');
    const closeBtn = document.getElementById('about-close-btn');
    
    backBtn.addEventListener('click', () => this.hideAbout());
    closeBtn.addEventListener('click', () => this.hideAbout());
    
    // Закрытие по клику на фон
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        this.hideAbout();
      }
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aboutModal.classList.contains('active')) {
        this.hideAbout();
      }
    });
  }

  /**
   * Показать журнал
   */
  showJournal() {
    let journalModal = document.getElementById('journal-modal');
    if (!journalModal) {
      this.createJournalModal();
      journalModal = document.getElementById('journal-modal');
    }
    
    journalModal.classList.add('active');
    this.updateJournalDisplay();
    
    // Запускаем обновление в реальном времени
    if (this.journalUpdateInterval) {
      clearInterval(this.journalUpdateInterval);
    }
    this.journalUpdateInterval = setInterval(() => {
      this.updateJournalDisplay();
    }, 1000);
  }

  /**
   * Скрыть журнал
   */
  hideJournal() {
    const journalModal = document.getElementById('journal-modal');
    if (!journalModal) return;
    
    journalModal.classList.remove('active');
    
    // Возвращаем меню в основное состояние
    this.currentMenuState = 'main';
    this.updateMenuTitle();
    
    // Останавливаем обновление
    if (this.journalUpdateInterval) {
      clearInterval(this.journalUpdateInterval);
      this.journalUpdateInterval = null;
    }
  }

  /**
   * Показать расписание
   */
  showSchedule() {
    let scheduleModal = document.getElementById('schedule-modal');
    if (!scheduleModal) {
      this.createScheduleModal();
      scheduleModal = document.getElementById('schedule-modal');
    }
    
    scheduleModal.classList.add('active');
    this.updateScheduleDisplay();
  }

  /**
   * Скрыть расписание
   */
  hideSchedule() {
    const scheduleModal = document.getElementById('schedule-modal');
    if (!scheduleModal) return;
    
    scheduleModal.classList.remove('active');
    
    // Возвращаем меню в основное состояние
    this.currentMenuState = 'main';
    this.updateMenuTitle();
  }

  /**
   * Показать помощь
   */
  showHelp() {
    let helpModal = document.getElementById('help-modal');
    if (!helpModal) {
      this.createHelpModal();
      helpModal = document.getElementById('help-modal');
    }
    
    helpModal.classList.add('active');
  }

  /**
   * Скрыть помощь
   */
  hideHelp() {
    const helpModal = document.getElementById('help-modal');
    if (!helpModal) return;
    
    helpModal.classList.remove('active');
    
    // Возвращаем меню в основное состояние
    this.currentMenuState = 'main';
    this.updateMenuTitle();
  }

  /**
   * Показать "О игре"
   */
  showAbout() {
    let aboutModal = document.getElementById('about-modal');
    if (!aboutModal) {
      this.createAboutModal();
      aboutModal = document.getElementById('about-modal');
    }
    
    aboutModal.classList.add('active');
  }

  /**
   * Скрыть "О игре"
   */
  hideAbout() {
    const aboutModal = document.getElementById('about-modal');
    if (!aboutModal) return;
    
    aboutModal.classList.remove('active');
    
    // Возвращаем меню в основное состояние
    this.currentMenuState = 'main';
    this.updateMenuTitle();
  }

  /**
   * Обновить отображение расписания
   */
  updateScheduleDisplay() {
    const scheduleList = document.getElementById('schedule-list');
    if (!scheduleList) return;

    if (!this.scheduleManager) {
      scheduleList.innerHTML = '<div class="no-schedule">Планировщик расписания недоступен</div>';
      return;
    }

    const tasks = this.scheduleManager.getAllTasks();
    if (tasks.length === 0) {
      scheduleList.innerHTML = '<div class="no-schedule">Расписание пусто</div>';
      return;
    }

    const html = tasks.map((task) => {
      const isCurrent = task.status === 'ACTIVE';
      const isUpcoming = task.status === 'PENDING';
      const isCompleted = task.status === 'COMPLETED';
      const isCancelled = task.status === 'CANCELLED';

      let statusText = '';
      let itemClass = 'schedule-item';

      if (isCurrent) {
        statusText = ' (текущая)';
        itemClass += ' current';
      } else if (isUpcoming) {
        statusText = ' (предстоящая)';
        itemClass += ' upcoming';
      } else if (isCompleted) {
        statusText = ' (завершена)';
        itemClass += ' completed';
      } else if (isCancelled) {
        statusText = ' (отменена)';
        itemClass += ' cancelled';
      }

      const startTime = task.startTime ? task.startTime.toTimeString().slice(0, 5) : '--:--';
      const endTime = task.endTime ? task.endTime.toTimeString().slice(0, 5) : '--:--';
      const locationLabel = this._getLocationLabel(task.location) || 'Без локации';
      const duration = task.duration ? `${task.duration}ч` : '';

      return `
        <div class="${itemClass}">
          <div class="schedule-time">${startTime} - ${endTime}</div>
          <div class="schedule-destination">${task.name}${statusText}</div>
          <div class="schedule-location">${locationLabel}</div>
          <div class="schedule-duration">${duration}</div>
        </div>
      `;
    }).join('');

    scheduleList.innerHTML = html;
  }

  /**
   * Обновить отображение журнала
   */
  updateJournalDisplay() {
    if (!this.journalManager) return;

    const tripList = document.getElementById('journal-entries');
    if (!tripList) return;

    const journal = this.journalManager.getJournal();
    const currentTrip = this.journalManager.getCurrentTrip();
    
    let html = '';
    
    // Добавляем записи журнала (самые новые внизу)
    journal.forEach(entry => {
      if (entry.type === 'road') {
        // Завершенная дорога - показываем время в пути
        const timeDisplay = entry.duration;
        html += `
          <div class="journal-entry">
            <div class="journal-entry-text">🚗 Дорога -> ${entry.destination} ${timeDisplay}</div>
          </div>
        `;
      } else if (entry.type === 'work') {
        // Работа в месте - показываем название места и время от предыдущей записи
        let timeDisplay;
        if (entry.isActive) {
          // Для активной записи показываем текущее время пребывания
          const currentTime = this.timeManager.formatTime();
          timeDisplay = this.calculateCurrentTripDuration(entry.absoluteTime, currentTime);
        } else {
          // Для завершенной записи показываем сохраненное время пребывания
          timeDisplay = entry.duration;
        }
        const entryClass = entry.isActive ? 'journal-entry current' : 'journal-entry';
        html += `
          <div class="${entryClass}">
            <div class="journal-entry-text">${entry.destination}: ${timeDisplay}</div>
          </div>
        `;
      }
    });
    
    // Добавляем текущую поездку в конец, если есть
    if (currentTrip) {
      const currentTime = this.timeManager.formatTime();
      const currentDuration = this.calculateCurrentTripDuration(currentTrip.startTime, currentTime);
      
      html += `
        <div class="journal-entry current">
          <div class="journal-entry-text">🚗 Дорога -> ${currentTrip.destination} ${currentDuration}</div>
        </div>
      `;
    }
    
    if (html === '') {
      html = '<div class="no-trips">Записей пока нет</div>';
    }
    
    // Просто обновляем содержимое
    tripList.innerHTML = html;
  }

  /**
   * Вычислить продолжительность текущей поездки
   * @param {string} startTime - время начала (HH:MM)
   * @param {string} currentTime - текущее время (HH:MM)
   * @returns {string} отформатированная продолжительность
   */
  calculateCurrentTripDuration(startTime, currentTime) {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    let durationMinutes = currentTotalMinutes - startTotalMinutes;
    
    // Учитываем переход через день
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    return this.formatDuration(durationMinutes);
  }

  /**
   * Форматировать продолжительность
   * @param {number} minutes - минуты
   * @returns {string} отформатированная продолжительность
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    } else {
      return `${mins}м`;
    }
  }

  /**
   * Форматировать продолжительность для поездок (только минуты)
   * @param {string} duration - продолжительность в формате "Xч Yм" или "Xм"
   * @returns {string} отформатированная продолжительность только в минутах
   */
  formatDurationForRoad(duration) {
    // Если уже в формате "Xм", возвращаем как есть
    if (duration.endsWith('м') && !duration.includes('ч')) {
      return duration;
    }
    
    // Парсим формат "Xч Yм" и конвертируем в минуты
    const match = duration.match(/(\d+)ч\s*(\d+)м/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const totalMinutes = hours * 60 + minutes;
      return `${totalMinutes}м`;
    }
    
    // Если не удалось распарсить, возвращаем как есть
    return duration;
  }

  /**
   * Обновление всех UI элементов
   * @param {boolean} isAtDestination - находится ли машина в пункте назначения
   */
  update(isAtDestination = false) {
    this.updateDateTimeDisplay();
    this.updateRouteDisplay(isAtDestination);
    this.updateZoomButton();
    this.updateSpeedDisplay();
    this.updateCarLightsDisplay();
    this.updatePauseModeDisplay();
    this.updateDayNightModeDisplay();
    
    // Обновляем журнал, если он открыт в едином модальном окне
    const unifiedModal = document.getElementById('unified-modal');
    if (unifiedModal && unifiedModal.classList.contains('active') && this.currentMenuState === 'journal') {
      this.updateJournalDisplay();
    }
    
    // Обновляем расписание, если оно открыто в едином модальном окне
    if (unifiedModal && unifiedModal.classList.contains('active') && this.currentMenuState === 'schedule') {
      this.updateScheduleDisplay();
    }
    
    // Обновляем оверлей расписания, если он видим
    if (this.scheduleOverlayVisible) {
      this.updateScheduleOverlay();
    }
  }

  /**
   * Переключение отображения оверлея расписания
   */
  toggleScheduleOverlay() {
    if (this.scheduleOverlayVisible) {
      this.hideScheduleOverlay();
    } else {
      this.showScheduleOverlay();
    }
  }

  /**
   * Показать оверлей расписания внутри game-container
   */
  showScheduleOverlay() {
    // Создаем оверлей, если его еще нет
    let overlay = document.getElementById('schedule-overlay');
    if (!overlay) {
      overlay = this.createScheduleOverlay();
    }
    
    overlay.style.display = 'block';
    this.scheduleOverlayVisible = true;
    this.updateScheduleOverlay();
  }

  /**
   * Скрыть оверлей расписания
   */
  hideScheduleOverlay() {
    const overlay = document.getElementById('schedule-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    this.scheduleOverlayVisible = false;
  }

  /**
   * Создать оверлей расписания внутри game-container
   */
  createScheduleOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'schedule-overlay';
    overlay.className = 'schedule-overlay';
    overlay.innerHTML = `
      <div class="schedule-overlay-content">
        <div class="schedule-overlay-header">
          <h3>📅 Расписание маршрута</h3>
        </div>
        <div class="schedule-overlay-body">
          <div class="schedule-overlay-list" id="schedule-overlay-list">
            <!-- Элементы расписания будут добавлены динамически -->
          </div>
        </div>
        <div class="schedule-overlay-footer">
          <div class="schedule-overlay-hint">Нажмите K или Escape для закрытия</div>
        </div>
      </div>
    `;
    
    // Добавляем в game-container вместо document.body
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }
    
    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.scheduleOverlayVisible) {
        this.hideScheduleOverlay();
      }
    });
    
    return overlay;
  }

  /**
   * Обновить содержимое оверлея расписания
   */
  updateScheduleOverlay() {
    const scheduleList = document.getElementById('schedule-overlay-list');
    if (!scheduleList) return;

    if (!this.scheduleManager) {
      scheduleList.innerHTML = '<div class="schedule-overlay-empty">Планировщик расписания недоступен</div>';
      return;
    }

    const tasks = this.scheduleManager.getAllTasks();
    if (tasks.length === 0) {
      scheduleList.innerHTML = '<div class="schedule-overlay-empty">Расписание пусто</div>';
      return;
    }

    scheduleList.innerHTML = tasks.map((task, index) => {
      const isCurrent = task.status === 'ACTIVE';
      const isUpcoming = task.status === 'PENDING';
      const isCompleted = task.status === 'COMPLETED';
      const isCancelled = task.status === 'CANCELLED';

      let statusClass = '';
      let statusText = '';

      if (isCurrent) {
        statusClass = 'current';
        statusText = ' (текущая)';
      } else if (isUpcoming) {
        statusClass = 'upcoming';
        statusText = ' (предстоящая)';
      } else if (isCompleted) {
        statusClass = 'completed';
        statusText = ' (завершена)';
      } else if (isCancelled) {
        statusClass = 'cancelled';
        statusText = ' (отменена)';
      }

      const locationLabel = this._getLocationLabel(task.location) || 'Без локации';
      const duration = task.duration ? `${task.duration}ч` : '—';

      return `
        <div class="schedule-overlay-item ${statusClass}">
          <div class="schedule-overlay-item-number">${index + 1}</div>
          <div class="schedule-overlay-item-content">
            <div class="schedule-overlay-item-name">${task.name}${statusText}</div>
            <div class="schedule-overlay-item-location">${locationLabel}</div>
            <div class="schedule-overlay-item-duration">Время: ${duration}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  _getGameDate() {
    if (!this.timeManager || typeof this.timeManager.getGameTime !== 'function') {
      return new Date();
    }
    const gameTime = this.timeManager.getGameTime();
    return new Date(
      gameTime.year,
      gameTime.month,
      gameTime.day,
      Math.floor(gameTime.hours),
      Math.floor(gameTime.minutes),
      0,
      0
    );
  }

  _getLocationLabel(locationKey) {
    if (!locationKey) return null;
    const zone = this.config?.ZONES?.[locationKey];
    return zone?.label || null;
  }

  _getFallbackRouteName() {
    if (this.fallbackRoute?.name) {
      return this.fallbackRoute.name;
    }
    const fallbackLocation = this.fallbackRoute?.location;
    return this._getLocationLabel(fallbackLocation) || '—';
  }

}
