// Менеджер режимов дня/ночи с поддержкой событий
export class DayNightManager {
  constructor(PIXI, config, worldRenderer, timeManager = null) {
    this.PIXI = PIXI;
    this.config = config;
    this.worldRenderer = worldRenderer; // Получаем WorldRenderer для доступа к слоям
    this.timeManager = timeManager;
    this.dayNightMode = 'auto'; // 'auto', 'day', 'night'
    this.isNightMode = false;
    this.cityNightOverlay = null;
    this.currentCityNightAlpha = 0;
    this.nightTransitionSpeed = 0.02;
    
    // Система событий
    this.listeners = new Map();
    
    this.loadSettings();
  }

  // Методы для работы с событиями
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data = null) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Ошибка в обработчике события ${event}:`, error);
      }
    });
  }

  // Загрузить настройки из localStorage
  loadSettings() {
    const savedMode = localStorage.getItem('shina-game-daynight-mode');
    if (savedMode && ['auto', 'day', 'night'].includes(savedMode)) {
      this.dayNightMode = savedMode;
      console.log(`🌅 Загружен режим дня/ночи: ${this.dayNightMode}`);
    }
  }

  // Сохранить настройки
  saveSettings() {
    localStorage.setItem('shina-game-daynight-mode', this.dayNightMode);
  }

  // Проверить, ночное ли время
  isNightTime(gameTime) {
    // Если режим принудительно установлен
    if (this.dayNightMode === 'night') return true;
    if (this.dayNightMode === 'day') return false;

    const sourceTime = gameTime || (this.timeManager ? this.timeManager.getGameTime() : null);
    if (!sourceTime) {
      console.warn('⚠️ DayNightManager: нет данных времени, предполагаем дневной режим');
      return false;
    }

    if (this.timeManager) {
      return this.timeManager.isNightTime(sourceTime);
    }

    // Автоматический режим - зависит от времени
    const hour = sourceTime.hours;
    // Ночь с 20:00 до 06:00
    return hour >= 20 || hour < 6;
  }

  // Создать оверлей для ночного режима
  createCityNightOverlay() {
    if (this.cityNightOverlay) return this.cityNightOverlay;

    console.log('🌙 Создаем ночной оверлей...');
    this.cityNightOverlay = new this.PIXI.Container();

    // Основной темно-синий оверлей
    const overlay = new this.PIXI.Graphics();
    overlay.beginFill(0x0d1b69, 0.8); // более темный синий
    overlay.drawRect(0, 0, this.config.WORLD_WIDTH, this.config.WORLD_HEIGHT);
    overlay.endFill();
    this.cityNightOverlay.addChild(overlay);

    // Добавляем градиент от темного к светлому снизу (имитация городского освещения)
    const gradient = new this.PIXI.Graphics();
    for (let i = 0; i < 20; i++) {
      const alpha = (1 - i / 20) * 0.3;
      gradient.beginFill(0x2c3e50, alpha);
      gradient.drawRect(0, this.config.WORLD_HEIGHT - i * 10, this.config.WORLD_WIDTH, 10);
      gradient.endFill();
    }
    this.cityNightOverlay.addChild(gradient);

    this.cityNightOverlay.alpha = 0;
    this.cityNightOverlay.zIndex = 400; // поверх городских слоев, но под машиной и светофорами

    return this.cityNightOverlay;
  }

  // Обновить ночной режим
  updateNightMode(gameTime) {
    const effectiveTime = gameTime || (this.timeManager ? this.timeManager.getGameTime() : null);
    const shouldBeNight = this.isNightTime(effectiveTime);

    if (shouldBeNight !== this.isNightMode) {
      this.isNightMode = shouldBeNight;
      const timeForLog = effectiveTime || {};
      const hourStr = typeof timeForLog.hours === 'number'
        ? Math.floor(timeForLog.hours).toString().padStart(2, '0')
        : '??';
      const minuteStr = typeof timeForLog.minutes === 'number'
        ? Math.floor(timeForLog.minutes).toString().padStart(2, '0')
        : '??';
      console.log(`🌙 ${this.isNightMode ? 'Включен' : 'Выключен'} ночной режим (${hourStr}:${minuteStr})`);
      
      // Эмитим событие изменения режима дня/ночи
      this.emit('modeChange', {
        isNightMode: this.isNightMode,
        gameTime: effectiveTime,
        mode: this.isNightMode ? 'night' : 'day'
      });
    }

    if (!this.cityNightOverlay) {
      this.createCityNightOverlay();
    }

    if (!this.cityNightOverlay) {
      console.warn('⚠️ DayNightManager: не удалось создать ночной оверлей');
      return;
    }

    const overlayAttached = this.worldRenderer
      ? this.worldRenderer.attachOverlayBeforeDecor(this.cityNightOverlay)
      : false;

    if (!overlayAttached) {
      console.warn('⚠️ DayNightManager: не удалось разместить ночной оверлей');
      return;
    }

    if (!this.isOverlayReady()) {
      console.warn('⚠️ cityNightOverlay не создан или не добавлен в сцену');
      return;
    }

    // Плавно изменяем прозрачность городского оверлея
    const targetAlpha = this.isNightMode ? 0.7 : 0;
    const alphaDiff = targetAlpha - this.currentCityNightAlpha;

    if (Math.abs(alphaDiff) > 0.001) {
      this.currentCityNightAlpha += alphaDiff * this.nightTransitionSpeed;
      this.currentCityNightAlpha = Math.max(0, Math.min(1, this.currentCityNightAlpha));
      this.cityNightOverlay.alpha = this.currentCityNightAlpha;
      
      // Эмитим событие изменения альфы
      this.emit('alphaChange', {
        alpha: this.currentCityNightAlpha,
        isNightMode: this.isNightMode,
        targetAlpha: targetAlpha
      });
    }
  }

  // Переключить режим дня/ночи
  toggleDayNightMode() {
    const modes = ['auto', 'day', 'night'];
    const currentIndex = modes.indexOf(this.dayNightMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.dayNightMode = modes[nextIndex];
    this.saveSettings();
    
    console.log(`🌅 Режим дня/ночи изменен на: ${this.dayNightMode}`);
    this.updateDayNightModeText();
    
    // Эмитим событие изменения режима
    this.emit('modeToggle', {
      dayNightMode: this.dayNightMode,
      previousMode: modes[currentIndex]
    });
  }

  // Обновить текст режима дня/ночи в меню
  updateDayNightModeText() {
    const dayNightTextElement = document.getElementById('daynight-mode-text');
    if (dayNightTextElement) {
      const modeTexts = {
        'auto': 'Автоматический',
        'day': 'День',
        'night': 'Ночь'
      };
      dayNightTextElement.textContent = modeTexts[this.dayNightMode];
    }
  }

  // Получить текущий режим
  getCurrentMode() {
    return this.dayNightMode;
  }

  // Проверить, активен ли ночной режим
  isNightModeActive() {
    return this.isNightMode;
  }

  // Получить оверлей ночного режима
  getNightOverlay() {
    return this.cityNightOverlay;
  }

  // Проверить, что оверлей создан и добавлен в сцену
  isOverlayReady() {
    return this.cityNightOverlay && this.cityNightOverlay.parent;
  }

  // Установить скорость перехода
  setTransitionSpeed(speed) {
    this.nightTransitionSpeed = speed;
  }

  // Применить ночной цветовой фильтр
  applyNightColorFilter() {
    if (!this.isNightMode) return;

    // Применяем приглушение цветов ко всем слоям
    const nightTint = 0x4a4a6a; // приглушенный синеватый оттенок
    const nightAlpha = 0.3; // степень приглушения

    // Применяем фильтр к основным слоям через worldRenderer
    if (this.worldRenderer) {
      const roadsLayer = this.worldRenderer.getRoadsLayer();
      const lotsLayer = this.worldRenderer.getLotsLayer();
      const zonesLayer = this.worldRenderer.getZonesLayer();
      const labelsLayer = this.worldRenderer.getLabelsLayer();
      
      if (roadsLayer) {
        roadsLayer.tint = nightTint;
        roadsLayer.alpha = 1 - nightAlpha;
      }
      if (lotsLayer) {
        lotsLayer.tint = nightTint;
        lotsLayer.alpha = 1 - nightAlpha;
      }
      if (zonesLayer) {
        zonesLayer.tint = nightTint;
        zonesLayer.alpha = 1 - nightAlpha;
      }
      if (labelsLayer) {
        labelsLayer.tint = nightTint;
        labelsLayer.alpha = 1 - nightAlpha;
      }
    }
  }

  // Сбросить дневной цветовой фильтр
  resetDayColorFilter() {
    // Сбрасываем фильтры для дневного режима через worldRenderer
    if (this.worldRenderer) {
      const roadsLayer = this.worldRenderer.getRoadsLayer();
      const lotsLayer = this.worldRenderer.getLotsLayer();
      const zonesLayer = this.worldRenderer.getZonesLayer();
      const labelsLayer = this.worldRenderer.getLabelsLayer();
      
      if (roadsLayer) {
        roadsLayer.tint = 0xffffff;
        roadsLayer.alpha = 1;
      }
      if (lotsLayer) {
        lotsLayer.tint = 0xffffff;
        lotsLayer.alpha = 1;
      }
      if (zonesLayer) {
        zonesLayer.tint = 0xffffff;
        zonesLayer.alpha = 1;
      }
      if (labelsLayer) {
        labelsLayer.tint = 0xffffff;
        labelsLayer.alpha = 1;
      }
    }
  }

  // Добавить источник света в слой освещения
  addLightSource(lightObject) {
    if (this.worldRenderer) {
      const lightingLayer = this.worldRenderer.getLightingLayer();
      if (lightingLayer) {
        lightingLayer.addChild(lightObject);
        console.log('💡 Источник света добавлен в слой освещения');
      }
    }
  }

  // Удалить источник света из слоя освещения
  removeLightSource(lightObject) {
    if (this.worldRenderer) {
      const lightingLayer = this.worldRenderer.getLightingLayer();
      if (lightingLayer && lightObject.parent) {
        lightObject.parent.removeChild(lightObject);
        console.log('💡 Источник света удален из слоя освещения');
      }
    }
  }
}
