// Простое панорамирование для всех устройств
// Поддерживает мышь и touch события

class PanningController {
  constructor() {
    this.isPanning = false;
    this.lastX = 0;
    this.lastY = 0;
    
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
        this.isPanning = true;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (this.isPanning && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.lastX;
        const deltaY = e.touches[0].clientY - this.lastY;
        window.scrollBy(-deltaX, -deltaY);
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
        e.preventDefault(); // Предотвращаем стандартные жесты браузера
      }
    });

    document.addEventListener('touchend', () => {
      this.isPanning = false;
    });
  }

  // Метод для отключения панорамирования
  disable() {
    this.isPanning = false;
  }

  // Метод для включения панорамирования
  enable() {
    // Панорамирование всегда включено после инициализации
  }
}

// Экспортируем класс
export { PanningController };
