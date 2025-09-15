// Модуль светофора для перекрёстка
// Экспортирует:
// - Direction: { EW, NS }
// - initTrafficLightsForIntersection({ PIXI, app, layer, x, y, roadWidth, lampRadius, cycle })
// - keyForIntersection(x, y)
// - getDirectionForSegment(dx, dy)
// - TrafficLightCoordinator - координатор зеленой волны

export const Direction = { EW: 'EW', NS: 'NS' };

// Глобальный координатор зеленой волны
export class TrafficLightCoordinator {
  constructor(averageCarSpeed = 60) { // км/ч
    this.lights = new Map(); // ключ перекрестка -> светофор
    // Преобразуем км/ч в пиксели/мс (уменьшенный масштаб для игры)
    // Делаем скорость больше для более коротких задержек
    this.carSpeedPixelsPerMs = (averageCarSpeed * 1000 / 3600) / 10; // пиксели за миллисекунду
    this.waveOrigin = { x: 0, y: 0 }; // точка начала зеленой волны
    this.cycleStartTime = Date.now();
  }

  setWaveOrigin(x, y) {
    this.waveOrigin = { x, y };
    this.restartWave();
  }

  addTrafficLight(key, trafficLight, x, y) {
    this.lights.set(key, { trafficLight, x, y });
  }

  removeTrafficLight(key) {
    this.lights.delete(key);
  }

  // Рассчитать задержку для перекрестка на основе расстояния от источника волны
  calculateDelayForIntersection(x, y) {
    const dx = x - this.waveOrigin.x;
    const dy = y - this.waveOrigin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance / this.carSpeedPixelsPerMs; // задержка в миллисекундах
  }

  // Перезапустить волну
  restartWave() {
    const now = Date.now();
    this.cycleStartTime = now;
    
    for (const [key, { trafficLight, x, y }] of this.lights) {
      const delay = this.calculateDelayForIntersection(x, y);
      trafficLight.setStartDelay(delay);
    }
  }

  destroy() {
    this.lights.clear();
  }
}

export function keyForIntersection (x, y) {
  return `${x},${y}`;
}

export function getDirectionForSegment (dx, dy) {
  return Math.abs(dx) >= Math.abs(dy) ? Direction.EW : Direction.NS;
}

export function initTrafficLightsForIntersection ({ PIXI, app, layer, x, y, roadWidth = 48, lampRadius = 8, cycle = { green: 667, yellow: 200 }, roadConnections = { north: true, south: true, east: true, west: true }, pauseManager }) {
  const tl = new TrafficLight({ PIXI, app, layer, x, y, roadWidth, lampRadius, cycle, roadConnections, pauseManager });
  return tl;
}

export class TrafficLight {
  constructor ({ x, y, roadWidth, cycle, roadConnections, pauseManager }) {
    this.position = { x, y };
    this.roadWidth = roadWidth;
    this.cycle = { green: cycle.green, yellow: cycle.yellow };
    this.roadConnections = roadConnections;
    this.pauseManager = pauseManager;

    // Фазы: NS_GREEN -> NS_YELLOW -> EW_GREEN -> EW_YELLOW -> повтор
    this.phase = 'NS_GREEN';
    this.elapsedMs = 0;
    this.phaseDurationMs = this.cycle.green;
    
    // Поддержка задержки запуска для зеленой волны
    this.startDelayMs = 0; // задержка перед началом работы
    this.delayElapsedMs = 0; // сколько времени прошло с момента создания
    this.isDelayActive = false; // активна ли сейчас задержка
  }

  destroy () {
    // Логический класс не требует очистки PIXI-объектов
  }

  // Установить задержку запуска для зеленой волны
  setStartDelay(delayMs) {
    this.startDelayMs = delayMs;
    this.delayElapsedMs = 0;
    this.isDelayActive = delayMs > 0;
    
    // Сброс светофора в начальное состояние
    this.phase = 'NS_GREEN';
    this.elapsedMs = 0;
    this.phaseDurationMs = this.cycle.green;
  }

  isPassAllowed (direction) {
    // Разрешено ехать при зелёном и жёлтом. Запрещено только на красный.
    if (direction === Direction.NS) return this.phase.startsWith('NS_');
    if (direction === Direction.EW) return this.phase.startsWith('EW_');
    return true;
  }

  getState () {
    return {
      position: this.position,
      phase: this.phase,
      isDelayActive: this.isDelayActive,
      roadConnections: this.roadConnections,
      roadWidth: this.roadWidth
    };
  }

  update (delta) {
    // Если активна задержка запуска, ждем ее завершения
    if (this.isDelayActive) {
      this.delayElapsedMs += delta;
      if (this.delayElapsedMs >= this.startDelayMs) {
        this.isDelayActive = false;
        // Начинаем нормальную работу светофора
        this.elapsedMs = 0;
      }
      return; // не обновляем фазы во время задержки
    }

    if (this.pauseManager && this.pauseManager.isPaused()) {
      return; // не обновляем фазы во время паузы
    }

    this.elapsedMs += delta;
    if (this.elapsedMs >= this.phaseDurationMs) {
      const oldPhase = this.phase;
      this.elapsedMs = 0;
      this.#advancePhase();
    }
  }

  #advancePhase () {
    if (this.phase === 'NS_GREEN') {
      this.phase = 'NS_YELLOW';
      this.phaseDurationMs = this.cycle.yellow;
      return;
    }
    if (this.phase === 'NS_YELLOW') {
      this.phase = 'EW_GREEN';
      this.phaseDurationMs = this.cycle.green;
      return;
    }
    if (this.phase === 'EW_GREEN') {
      this.phase = 'EW_YELLOW';
      this.phaseDurationMs = this.cycle.yellow;
      return;
    }
    // EW_YELLOW -> NS_GREEN
    this.phase = 'NS_GREEN';
    this.phaseDurationMs = this.cycle.green;
  }

}


