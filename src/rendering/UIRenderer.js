/**
 * UIRenderer - класс для управления UI элементами
 * Обрабатывает меню, уведомления, дисплеи и кнопки
 */
export class UIRenderer {
  constructor(config, timeManager, pauseManager, dayNightManager, panningController, journalManager) {
    this.config = config;
    this.timeManager = timeManager;
    this.pauseManager = pauseManager;
    this.dayNightManager = dayNightManager;
    this.panningController = panningController;
    this.journalManager = journalManager;
    
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
    this.journalUpdateInterval = null;
    this.currentMenuState = 'main'; // 'main', 'journal'
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
    
    // Инициализируем заголовок меню
    this.updateMenuTitle();
    
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

    // Обработчик для кнопки "Назад" в заголовке
    const modalBackBtn = document.getElementById('modal-back-btn');
    if (modalBackBtn) {
      modalBackBtn.addEventListener('click', () => {
        // Возвращаем меню в основное состояние
        this.currentMenuState = 'main';
        this.updateMenuTitle();
        
        menuModal.classList.remove('active');
        burgerButton.classList.remove('active');
        updatePanningState();
      });
    }

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
          case 'menu-journal':
            // Переключаем отображение журнала
            this.toggleJournal();
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
      default:
        modalTitle.textContent = 'Меню игры';
    }
  }



  /**
   * Переключить отображение журнала
   */
  toggleJournal() {
    // Изменяем состояние меню на журнал
    this.currentMenuState = 'journal';
    this.updateMenuTitle();
    
    let journalModal = document.getElementById('journal-modal');
    if (!journalModal) {
      this.createJournalModal();
      journalModal = document.getElementById('journal-modal');
    }
    
    if (journalModal.classList.contains('active')) {
      this.hideJournal();
    } else {
      this.showJournal();
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
   * Обновить отображение журнала
   */
  updateJournalDisplay() {
    if (!this.journalManager) return;

    const tripList = document.getElementById('journal-trip-list');
    if (!tripList) return;

    const journal = this.journalManager.getJournal();
    const currentTrip = this.journalManager.getCurrentTrip();
    
    // Проверяем, есть ли новые записи
    const currentJournalLength = tripList.children.length;
    const newJournalLength = journal.length + (currentTrip ? 1 : 0);
    
    let html = '';
    
    // Добавляем записи журнала (самые новые внизу)
    journal.forEach(entry => {
      if (entry.type === 'road') {
        // Завершенная дорога
        html += `
          <div class="trip-item">
            <div class="trip-destination">Работа ${entry.startTime}-${entry.endTime}</div>
            <div class="trip-duration">${entry.duration}</div>
          </div>
        `;
      } else if (entry.type === 'departure') {
        // Завершение пребывания в месте
        html += `
          <div class="trip-item departure">
            <div class="trip-destination">${entry.destination} ${entry.startTime}-${entry.endTime}</div>
            <div class="trip-duration">${entry.duration}</div>
          </div>
        `;
      }
    });
    
    // Добавляем текущую поездку в конец, если есть
    if (currentTrip) {
      const currentTime = this.timeManager.formatTime();
      const currentDuration = this.calculateCurrentTripDuration(currentTrip.startTime, currentTime);
      
      html += `
        <div class="trip-item current">
          <div class="trip-destination">Работа ${currentTrip.startTime}-${currentTime}</div>
          <div class="trip-duration">${currentDuration}</div>
        </div>
      `;
    }
    
    if (html === '') {
      html = '<div class="no-trips">Записей пока нет</div>';
    }
    
    // Если есть новые записи, добавляем анимацию
    if (newJournalLength > currentJournalLength) {
      // Сначала обновляем содержимое
      tripList.innerHTML = html;
      
      // Затем анимируем новые элементы
      const newItems = Array.from(tripList.children).slice(-(newJournalLength - currentJournalLength));
      newItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          item.style.transition = 'all 0.5s ease-out';
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        }, index * 100); // Задержка для каждого элемента
      });
    } else {
      // Просто обновляем содержимое без анимации
      tripList.innerHTML = html;
    }
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
   * Обновление всех UI элементов
   * @param {boolean} isAtDestination - находится ли машина в пункте назначения
   */
  update(isAtDestination = false) {
    this.updateDateTimeDisplay();
    this.updateRouteDisplay(isAtDestination);
    this.updateZoomButton();
    
    // Обновляем журнал, если он открыт
    const journalModal = document.getElementById('journal-modal');
    if (journalModal && journalModal.classList.contains('active')) {
      this.updateJournalDisplay();
    }
  }
}
