// Простое панорамирование для всех устройств
// Поддерживает мышь и touch события

class PanningController {
  constructor() {
    this.isPanning = false;
    this.lastX = 0;
    this.lastY = 0;
    this.isZooming = false;
    this.initialDistance = 0;
    this.initialScale = 1;
    this.currentScale = 1;
    this.zoomCenter = { x: 0, y: 0 };
    
    this.init();
  }

  init() {
    // Обработчики мыши
    document.addEventListener('mousedown', (e) => {
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.lastX;
        const deltaY = e.clientY - this.lastY;
        window.scrollBy(-deltaX, -deltaY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault(); // Предотвращаем выделение текста
      }
    });

    document.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Обработчики touch
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Одиночное касание - панорамирование
        this.isPanning = true;
        this.isZooming = false;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
        console.log('👆 Начато панорамирование');
      } else if (e.touches.length === 2) {
        // Двойное касание - масштабирование
        this.isZooming = true;
        this.isPanning = false;
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        this.initialDistance = this.getDistance(touch1, touch2);
        this.initialScale = this.currentScale;
        
        // Центр масштабирования
        this.zoomCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        
        console.log('🤏 Начато масштабирование');
        e.preventDefault();
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isPanning && e.touches.length === 1) {
        // Панорамирование
        const deltaX = e.touches[0].clientX - this.lastX;
        const deltaY = e.touches[0].clientY - this.lastY;
        window.scrollBy(-deltaX, -deltaY);
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
        e.preventDefault();
      } else if (this.isZooming && e.touches.length === 2) {
        // Масштабирование
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        
        const currentDistance = this.getDistance(touch1, touch2);
        const scale = currentDistance / this.initialDistance;
        this.currentScale = this.initialScale * scale;
        
        // Ограничиваем масштабирование
        this.currentScale = Math.max(0.5, Math.min(3, this.currentScale));
        
        // Применяем масштабирование к canvas
        const canvas = document.querySelector('canvas');
        if (canvas) {
          canvas.style.transform = `scale(${this.currentScale})`;
          canvas.style.transformOrigin = `${this.zoomCenter.x}px ${this.zoomCenter.y}px`;
        }
        
        e.preventDefault();
      }
    });

    // Обработчик для отмены масштабирования (двойной тап)
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        // Сбрасываем состояния при отпускании всех пальцев
        this.isPanning = false;
        this.isZooming = false;
        
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
    this.currentScale = 1;
    this.isZooming = false;
    this.isPanning = false;
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.transform = 'scale(1)';
      canvas.style.transformOrigin = 'center center';
    }
    console.log('🔄 Масштаб сброшен, панорамирование восстановлено');
  }

  // Метод для получения текущего масштаба
  getCurrentScale() {
    return this.currentScale;
  }
}

// Экспортируем класс
export { PanningController };
