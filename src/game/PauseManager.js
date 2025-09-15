// Менеджер паузы и скорости игры
export class PauseManager {
  constructor() {
    this.isGamePaused = false;
    this.speedMultiplier = 1; // множитель скорости (1 = нормальная, 5 = ускоренная)
    this.isSpeedBoosted = false; // включено ли ускорение по умолчанию
    
    // Удалено: больше не используем глобальную переменную window.isGamePaused
    
    this.loadSettings();
  }

  // Загрузить настройки из localStorage
  loadSettings() {
    this.loadSpeedSettings();
  }

  // Сохранить настройки скорости
  saveSpeedSettings() {
    localStorage.setItem('shina-game-speed-boosted', this.isSpeedBoosted.toString());
    localStorage.setItem('shina-game-speed-multiplier', this.speedMultiplier.toString());
  }

  // Загрузить настройки скорости
  loadSpeedSettings() {
    const savedBoosted = localStorage.getItem('shina-game-speed-boosted');
    const savedMultiplier = localStorage.getItem('shina-game-speed-multiplier');

    if (savedBoosted !== null) {
      this.isSpeedBoosted = savedBoosted === 'true';
    }

    if (savedMultiplier !== null) {
      this.speedMultiplier = parseInt(savedMultiplier);
    }
  }

  // Поставить игру на паузу
  pauseGame() {
    this.isGamePaused = true;
    // Удалено: больше не используем глобальную переменную window.isGamePaused
    console.log('⏸️ Игра поставлена на паузу');
    this.updatePauseButton();
    this.updatePauseModeText();
  }

  // Возобновить игру
  resumeGame() {
    this.isGamePaused = false;
    // Удалено: больше не используем глобальную переменную window.isGamePaused
    console.log('▶️ Игра возобновлена');
    this.updatePauseButton();
    this.updatePauseModeText();
  }

  // Переключить паузу
  togglePause() {
    if (this.isGamePaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  // Обновить кнопку паузы
  updatePauseButton() {
    const pauseButton = document.getElementById('pause-button');
    if (pauseButton) {
      pauseButton.textContent = this.isGamePaused ? '▶️' : '⏸️';
      pauseButton.classList.toggle('paused', this.isGamePaused);
    }
  }

  // Обновить текст паузы в меню
  updatePauseModeText() {
    const pauseTextElement = document.getElementById('pause-mode-text');
    if (pauseTextElement) {
      pauseTextElement.textContent = this.isGamePaused ? 'Включена' : 'Выключена';
    }
  }

  // Установить множитель скорости
  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = multiplier;
    this.saveSpeedSettings();
  }

  // Получить множитель скорости
  getSpeedMultiplier() {
    return this.speedMultiplier;
  }

  // Установить состояние ускорения
  setSpeedBoosted(boosted) {
    this.isSpeedBoosted = boosted;
    this.saveSpeedSettings();
  }

  // Получить состояние ускорения
  isSpeedBoostedEnabled() {
    return this.isSpeedBoosted;
  }

  // Проверить, на паузе ли игра
  isPaused() {
    return this.isGamePaused;
  }

  // Показать уведомление о скорости
  showSpeedNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      font-size: 16px;
      z-index: 1000;
      pointer-events: none;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 2 секунды
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }
}
