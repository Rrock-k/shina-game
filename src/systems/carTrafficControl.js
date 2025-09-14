// Модуль контроля движения машины с учетом светофоров
// Экспортирует:
// - CarTrafficController - класс для управления движением с учетом светофоров

import { getDirectionForSegment, Direction } from './trafficLights.js';

export class CarTrafficController {
  constructor() {
    this.isWaitingAtTrafficLight = false;
    this.waitingAtPosition = null;
    this.lastCheckedIntersection = null;
    this.intersectionThreshold = 50; // увеличили расстояние до перекрестка для остановки
  }

  /**
   * Проверяет, может ли машина продолжить движение к конкретному перекрестку
   * @param {Object} carPosition - текущая позиция машины {x, y}
   * @param {Object} targetIntersection - целевой перекресток {x, y}
   * @param {Map} intersectionMap - карта светофоров
   * @param {Array} roadPositions - позиции дорог {verticalRoadXs, horizontalRoadYs}
   * @returns {Object} - {canMove: boolean, shouldStop: boolean, stopPosition?: Object}
   */
  checkTrafficLights(carPosition, targetIntersection, intersectionMap, roadPositions) {
    // Определяем направление движения к перекрестку
    const dx = targetIntersection.x - carPosition.x;
    const dy = targetIntersection.y - carPosition.y;
    const direction = getDirectionForSegment(dx, dy);

    const intersectionKey = `${targetIntersection.x},${targetIntersection.y}`;
    const trafficLight = intersectionMap.get(intersectionKey);

    if (!trafficLight) {
      // Нет светофора на этом перекрестке - можем ехать
      this.clearWaitingState();
      return { canMove: true, shouldStop: false };
    }

    const isPassAllowed = trafficLight.isPassAllowed(direction);
    const distanceToIntersection = Math.hypot(
      carPosition.x - targetIntersection.x,
      carPosition.y - targetIntersection.y
    );

    // console.log(`🚦 Traffic check: distance=${distanceToIntersection.toFixed(1)}, direction=${direction}, allowed=${isPassAllowed}, intersection=${intersectionKey}, phase=${trafficLight.phase || 'unknown'}`);

    // Если уже ждем на этом перекрестке
    if (this.isWaitingAtTrafficLight && this.lastCheckedIntersection === intersectionKey) {
      if (isPassAllowed) {
        // Зеленый свет - можем ехать
        this.clearWaitingState();
        return { canMove: true, shouldStop: false };
      } else {
        // Все еще красный - продолжаем ждать
        return { canMove: false, shouldStop: true, stopPosition: this.waitingAtPosition };
      }
    }

    // Если не ждем и приближаемся к красному свету
    if (!isPassAllowed && !this.isWaitingAtTrafficLight) {
      // Красный свет - начинаем ждать
      const stopPosition = this.calculateStopPosition(carPosition, targetIntersection, direction);
      this.setWaitingState(stopPosition, intersectionKey);
      return { 
        canMove: false, 
        shouldStop: true, 
        stopPosition,
        intersection: targetIntersection,
        direction 
      };
    }

    // По умолчанию можем ехать (зеленый свет или не ждем)
    return { canMove: true, shouldStop: false };
  }

  /**
   * Находит следующий перекресток по направлению движения
   */
  findNextIntersection(carPosition, targetPosition, verticalRoadXs, horizontalRoadYs) {
    const dx = targetPosition.x - carPosition.x;
    const dy = targetPosition.y - carPosition.y;
    
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      return null; // Не двигаемся
    }

    // Определяем, движемся ли мы в основном горизонтально или вертикально
    const isHorizontalMovement = Math.abs(dx) > Math.abs(dy);
    let candidateIntersections = [];

    if (isHorizontalMovement) {
      // Горизонтальное движение - ищем перекрестки на той же дороге (Y) впереди
      const currentRoadY = this.findNearestRoadY(carPosition.y, horizontalRoadYs);
      
      for (const roadX of verticalRoadXs) {
        const isAhead = (dx > 0 && roadX > carPosition.x) || (dx < 0 && roadX < carPosition.x);
        
        if (isAhead) {
          const distance = Math.abs(roadX - carPosition.x);
          candidateIntersections.push({ x: roadX, y: currentRoadY, distance });
        }
      }
    } else {
      // Вертикальное движение - ищем перекрестки на той же дороге (X) впереди
      const currentRoadX = this.findNearestRoadX(carPosition.x, verticalRoadXs);
      
      for (const roadY of horizontalRoadYs) {
        const isAhead = (dy > 0 && roadY > carPosition.y) || (dy < 0 && roadY < carPosition.y);
        
        if (isAhead) {
          const distance = Math.abs(roadY - carPosition.y);
          candidateIntersections.push({ x: currentRoadX, y: roadY, distance });
        }
      }
    }

    // Возвращаем ближайший перекресток
    if (candidateIntersections.length === 0) return null;
    
    candidateIntersections.sort((a, b) => a.distance - b.distance);
    return candidateIntersections[0];
  }

  /**
   * Находит ближайшую горизонтальную дорогу (Y координата)
   */
  findNearestRoadY(y, horizontalRoadYs) {
    let nearestY = horizontalRoadYs[0];
    let minDistance = Math.abs(y - nearestY);
    
    for (const roadY of horizontalRoadYs) {
      const distance = Math.abs(y - roadY);
      if (distance < minDistance) {
        minDistance = distance;
        nearestY = roadY;
      }
    }
    
    return nearestY;
  }

  /**
   * Находит ближайшую вертикальную дорогу (X координата)
   */
  findNearestRoadX(x, verticalRoadXs) {
    let nearestX = verticalRoadXs[0];
    let minDistance = Math.abs(x - nearestX);
    
    for (const roadX of verticalRoadXs) {
      const distance = Math.abs(x - roadX);
      if (distance < minDistance) {
        minDistance = distance;
        nearestX = roadX;
      }
    }
    
    return nearestX;
  }

  /**
   * Рассчитывает позицию остановки перед перекрестком
   */
  calculateStopPosition(carPosition, intersection, direction) {
    const stopDistance = 35; // расстояние до линии остановки
    const carLength = 120; // длина машины
    
    const dx = intersection.x - carPosition.x;
    const dy = intersection.y - carPosition.y;
    const distance = Math.hypot(dx, dy);
    
    // Учитываем, что carPosition теперь указывает на переднюю часть машины
    // Нужно остановиться так, чтобы передняя часть была на расстоянии stopDistance от перекрестка
    const totalStopDistance = stopDistance;
    
    if (distance <= totalStopDistance) {
      // Уже очень близко к перекрестку
      return { x: carPosition.x, y: carPosition.y };
    }
    
    // Позиция остановки на расстоянии totalStopDistance от перекрестка
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    return {
      x: intersection.x - normalizedDx * totalStopDistance,
      y: intersection.y - normalizedDy * totalStopDistance
    };
  }

  /**
   * Устанавливает состояние ожидания на светофоре
   */
  setWaitingState(position, intersectionKey) {
    this.isWaitingAtTrafficLight = true;
    this.waitingAtPosition = { x: position.x, y: position.y };
    this.lastCheckedIntersection = intersectionKey;
    console.log(`Car waiting at traffic light: ${intersectionKey}, position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`);
  }

  /**
   * Очищает состояние ожидания
   */
  clearWaitingState() {
    if (this.isWaitingAtTrafficLight) {
      console.log(`Car resuming movement from: ${this.lastCheckedIntersection}`);
    }
    this.isWaitingAtTrafficLight = false;
    this.waitingAtPosition = null;
    this.lastCheckedIntersection = null;
  }

  /**
   * Проверяет, ждет ли машина на светофоре
   */
  isWaiting() {
    return this.isWaitingAtTrafficLight;
  }

  /**
   * Получает позицию ожидания
   */
  getWaitingPosition() {
    return this.waitingAtPosition;
  }
}
