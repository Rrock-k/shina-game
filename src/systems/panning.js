// Улучшенное панорамирование и зум с правильным центром зумирования
// Поддерживает мышь и touch события с корректным центром между пальцами

class PanningController {
  constructor() {
    this.world = null; // PIXI контейнер для трансформаций
    this.isPanning = false;
    this.isZooming = false;
    this.lastX = 0;
    this.lastY = 0;
    
    // Текущие значения (отображаемые)
    this.currentScale = 1;
    this.currentX = 0;
    this.currentY = 0;
    
    // Целевые значения (к которым стремимся)
    this.targetScale = 1;
    this.targetX = 0;
    this.targetY = 0;
    
    // Для зума двумя пальцами
    this.initialDistance = 0;
    this.initialScale = 1;
    this.initialCenter = { x: 0, y: 0 };
    this.initialWorldPos = { x: 0, y: 0 };
    
    // Ограничения
    this.minScale = 0.1;
    this.maxScale = 10;
    
    // Параметры сглаживания
    this.zoomSmoothing = 0.15; // Скорость приближения к целевому масштабу (0.1 = медленно, 0.3 = быстро)
    this.panSmoothing = 0.2;   // Скорость приближения к целевой позиции
    this.isAnimating = false;   // Флаг анимации
    
    // Состояние меню
    this.isMenuOpen = false;
    
    // Callbacks
    this.onZoomChange = null;
    this.onFullscreenChange = null;
    
    this.init();
  }

  setWorld(world) {
    this.world = world;
  }

  setOnZoomChange(callback) {
    this.onZoomChange = callback;
  }

  setOnFullscreenChange(callback) {
    this.onFullscreenChange = callback;
  }

  // Методы для управления состоянием меню
  setMenuOpen(isOpen) {
    this.isMenuOpen = isOpen;
    if (isOpen) {
      // При открытии меню останавливаем все жесты
      this.isPanning = false;
      this.isZooming = false;
    }
  }

  isMenuOpen() {
    return this.isMenuOpen;
  }

  // Запуск системы анимации
  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  // Остановка системы анимации
  stopAnimation() {
    this.isAnimating = false;
  }

  // Основной цикл анимации
  animate() {
    if (!this.isAnimating) return;

    let hasChanges = false;

    // Плавное приближение масштаба к целевому
    const scaleDiff = this.targetScale - this.currentScale;
    if (Math.abs(scaleDiff) > 0.001) {
      this.currentScale += scaleDiff * this.zoomSmoothing;
      hasChanges = true;
    }

    // Плавное приближение позиции к целевой
    const xDiff = this.targetX - this.currentX;
    const yDiff = this.targetY - this.currentY;
    if (Math.abs(xDiff) > 0.1 || Math.abs(yDiff) > 0.1) {
      this.currentX += xDiff * this.panSmoothing;
      this.currentY += yDiff * this.panSmoothing;
      hasChanges = true;
    }

    // Применяем изменения к миру
    if (hasChanges) {
      this.updateWorldTransform();
    }

    // Продолжаем анимацию, если есть изменения или активны жесты
    if (hasChanges || this.isPanning || this.isZooming) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isAnimating = false;
    }
  }

  init() {
    // Обработчики мыши
    document.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'CANVAS' && !this.isMenuOpen) {
        this.isPanning = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning && this.world && !this.isMenuOpen) {
        const deltaX = e.clientX - this.lastX;
        const deltaY = e.clientY - this.lastY;
        
        // Обновляем целевую позицию для плавного панорамирования
        this.targetX += deltaX;
        this.targetY += deltaY;
        this.startAnimation();
        
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault();
      }
    });

    document.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Обработчики touch
    document.addEventListener('touchstart', (e) => {
      if (e.target.tagName === 'CANVAS' && !this.isMenuOpen) {
        if (e.touches.length === 1) {
          // Одиночное касание - панорамирование
          this.isPanning = true;
          this.isZooming = false;
          this.lastX = e.touches[0].clientX;
          this.lastY = e.touches[0].clientY;
          console.log('👆 Начато панорамирование');
        } else if (e.touches.length === 2) {
          // Двойное касание - масштабирование + панорамирование
          this.isZooming = true;
          this.isPanning = false;
          
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          
          // Вычисляем начальное расстояние между пальцами
          this.initialDistance = this.getDistance(touch1, touch2);
          this.initialScale = this.currentScale;
          
          // Вычисляем центр между пальцами
          this.initialCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
          
          // Сохраняем текущую позицию мира
          this.initialWorldPos = {
            x: this.currentX,
            y: this.currentY
          };
          
          console.log('🤏 Начато масштабирование с центром между пальцами');
          e.preventDefault();
        }
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (e.target.tagName === 'CANVAS' && !this.isMenuOpen) {
        if (this.isPanning && e.touches.length === 1) {
          // Панорамирование одним пальцем
          const deltaX = e.touches[0].clientX - this.lastX;
          const deltaY = e.touches[0].clientY - this.lastY;
          
          // Обновляем целевую позицию для плавного панорамирования
          this.targetX += deltaX;
          this.targetY += deltaY;
          this.startAnimation();
          
          this.lastX = e.touches[0].clientX;
          this.lastY = e.touches[0].clientY;
          e.preventDefault();
        } else if (this.isZooming && e.touches.length === 2) {
          // Масштабирование двумя пальцами
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          
          // Вычисляем текущее расстояние между пальцами
          const currentDistance = this.getDistance(touch1, touch2);
          const scale = currentDistance / this.initialDistance;
          const newScale = this.initialScale * scale;
          
          this.targetScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
          
          // Вычисляем текущий центр между пальцами
          const currentCenter = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
          
          // Вычисляем смещение центра
          const centerDeltaX = currentCenter.x - this.initialCenter.x;
          const centerDeltaY = currentCenter.y - this.initialCenter.y;
          
          // Обновляем целевую позицию с учетом смещения центра
          this.updateTargetPositionWithCenter(
            this.targetScale,
            this.initialCenter,
            centerDeltaX,
            centerDeltaY
          );
          
          this.startAnimation();
          e.preventDefault();
        }
      }
    });

    // Обработчик для завершения жестов
    document.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isPanning = false;
        this.isZooming = false;
        // Анимация продолжит работать, пока не достигнет целевых значений
      } else if (e.touches.length === 1 && this.isZooming && !this.isMenuOpen) {
        // Переключаемся с зума на панорамирование
        this.isZooming = false;
        this.isPanning = true;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    });

    // Обработчик для отмены масштабирования (двойной тап)
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      if (e.touches.length === 0 && !this.isMenuOpen) {
        const now = Date.now();
        if (now - lastTap < 300) {
          // Двойной тап - сбрасываем масштаб
          this.resetZoom();
        }
        lastTap = now;
      }
    });
  }

  // Вспомогательная функция для вычисления расстояния между двумя точками
  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Обновляем целевую позицию с учетом смещения центра зумирования
  updateTargetPositionWithCenter(scale, initialCenter, centerDeltaX, centerDeltaY) {
    if (!this.world) return;
    
    // Вычисляем коэффициент масштабирования
    const scaleFactor = scale / this.initialScale;
    
    // Вычисляем новую целевую позицию с учетом смещения центра
    const newTargetX = this.initialWorldPos.x + centerDeltaX - (initialCenter.x * (scaleFactor - 1));
    const newTargetY = this.initialWorldPos.y + centerDeltaY - (initialCenter.y * (scaleFactor - 1));
    
    this.targetX = newTargetX;
    this.targetY = newTargetY;
  }

  // Обновляем трансформацию PIXI контейнера
  updateWorldTransform() {
    if (!this.world) return;
    
    this.world.scale.set(this.currentScale);
    this.world.position.set(this.currentX, this.currentY);
    
    // Вызываем callback для обновления UI при изменении масштаба
    if (this.onZoomChange) {
      this.onZoomChange(this.currentScale);
    }
  }

  // Метод для отключения панорамирования
  disable() {
    this.isPanning = false;
    this.isZooming = false;
  }

  // Метод для включения панорамирования
  enable() {
    // Панорамирование всегда включено после инициализации
  }

  // Метод для сброса масштаба
  resetZoom() {
    this.targetScale = 1;
    this.targetX = 0;
    this.targetY = 0;
    this.isZooming = false;
    this.isPanning = false;
    
    this.startAnimation();
    
    console.log('🔄 Масштаб сброшен, панорамирование восстановлено');
  }

  // Метод для получения текущего масштаба
  getCurrentScale() {
    return this.currentScale;
  }

  // Метод для увеличения масштаба
  zoomIn() {
    const newScale = Math.min(this.maxScale, this.currentScale * 1.2);
    this.targetScale = newScale;
    this.startAnimation();
  }

  // Метод для уменьшения масштаба
  zoomOut() {
    const newScale = Math.max(this.minScale, this.currentScale / 1.2);
    this.targetScale = newScale;
    this.startAnimation();
  }

  // Метод для переключения зума
  toggleZoom() {
    if (this.currentScale > 1.1) {
      this.resetZoom();
    } else {
      this.targetScale = 2;
      this.startAnimation();
    }
  }

  // Метод для проверки полноэкранного режима
  isFullscreenMode() {
    return this.currentScale > 1.1;
  }

  // Метод для переключения полноэкранного режима
  toggleFullscreen() {
    if (this.isFullscreenMode()) {
      this.resetZoom();
    } else {
      this.targetScale = 2;
      this.startAnimation();
      
      if (this.onFullscreenChange) {
        this.onFullscreenChange(true);
      }
    }
  }
}

// Экспортируем класс
export { PanningController };
