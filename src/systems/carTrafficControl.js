// Модуль контроля движения машины с учетом светофоров
// Экспортирует:
// - CarTrafficController - класс для управления движением с учетом светофоров

import { getDirectionForSegment, Direction } from './trafficLights.js';

export class CarTrafficController {
  constructor() {
    this.isWaitingAtTrafficLight = false;
    this.waitingAtPosition = null;
    this.lastCheckedIntersection = null;
    this.intersectionThreshold = 50; // расстояние до перекрестка для остановки
    // ИЗМЕНЕНО: Уменьшено расстояние для более реалистичной остановки.
    this.minStopDistance = 35; // минимальное расстояние остановки от перекрестка.
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

    // Округляем координаты для точного совпадения с ключами светофоров
    const roundedX = Math.round(targetIntersection.x);
    const roundedY = Math.round(targetIntersection.y);
    const intersectionKey = `${roundedX},${roundedY}`;
    
    // Ищем светофор
    let trafficLight = intersectionMap.get(intersectionKey);
    
    // Если не нашли, попробуем найти с небольшим допуском
    if (!trafficLight) {
      const tolerance = 1;
      for (const [key, lightData] of intersectionMap) {
        const [keyX, keyY] = key.split(',').map(Number);
        if (Math.abs(keyX - roundedX) <= tolerance && Math.abs(keyY - roundedY) <= tolerance) {
          trafficLight = lightData;
          break;
        }
      }
    }

    if (!trafficLight) {
      // Нет светофора на этом перекрестке - можем ехать
      this.clearWaitingState();
      return { canMove: true, shouldStop: false };
    }

    // Извлекаем объект логики из новой структуры {logic, renderer}
    const trafficLightLogic = trafficLight.logic || trafficLight;
    const isPassAllowed = trafficLightLogic.isPassAllowed(direction);

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

    // Если не ждем и красный свет
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

    // Зеленый свет - можем ехать
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
          // Округляем координаты для точного совпадения с ключами светофоров
          const roundedX = Math.round(roadX);
          const roundedY = Math.round(currentRoadY);
          candidateIntersections.push({ x: roundedX, y: roundedY, distance });
        }
      }
    } else {
      // Вертикальное движение - ищем перекрестки на той же дороге (X) впереди
      const currentRoadX = this.findNearestRoadX(carPosition.x, verticalRoadXs);
      
      for (const roadY of horizontalRoadYs) {
        const isAhead = (dy > 0 && roadY > carPosition.y) || (dy < 0 && roadY < carPosition.y);
        
        if (isAhead) {
          const distance = Math.abs(roadY - carPosition.y);
          // Округляем координаты для точного совпадения с ключами светофоров
          const roundedX = Math.round(currentRoadX);
          const roundedY = Math.round(roadY);
          candidateIntersections.push({ x: roundedX, y: roundedY, distance });
        }
      }
    }

    // Возвращаем ближайший перекресток
    if (candidateIntersections.length === 0) {
      return null;
    }
    
    candidateIntersections.sort((a, b) => a.distance - b.distance);
    return candidateIntersections[0];
  }

  /**
   * Находит ближайшую горизонтальную дорогу (Y координата)
   */
  findNearestRoadY(y, horizontalRoadYs) {
    if (horizontalRoadYs.length === 0) return y;
    
    let nearestY = horizontalRoadYs[0];
    let minDistance = Math.abs(y - nearestY);
    
    for (const roadY of horizontalRoadYs) {
      const distance = Math.abs(y - roadY);
      if (distance < minDistance) {
        minDistance = distance;
        nearestY = roadY;
      }
    }
    
    // ИСПРАВЛЕНИЕ: Если машина слишком далеко от любой дороги, возвращаем исходную координату
    if (minDistance > 100) {
      console.log(`🔍 findNearestRoadY: Машина слишком далеко от дорог (distance=${minDistance.toFixed(1)}), используем исходную Y=${y}`);
      return y;
    }
    
    return nearestY;
  }

  /**
   * Находит ближайшую вертикальную дорогу (X координата)
   */
  findNearestRoadX(x, verticalRoadXs) {
    if (verticalRoadXs.length === 0) return x;
    
    let nearestX = verticalRoadXs[0];
    let minDistance = Math.abs(x - nearestX);
    
    for (const roadX of verticalRoadXs) {
      const distance = Math.abs(x - roadX);
      if (distance < minDistance) {
        minDistance = distance;
        nearestX = roadX;
      }
    }
    
    // ИСПРАВЛЕНИЕ: Если машина слишком далеко от любой дороги, возвращаем исходную координату
    if (minDistance > 100) {
      console.log(`🔍 findNearestRoadX: Машина слишком далеко от дорог (distance=${minDistance.toFixed(1)}), используем исходную X=${x}`);
      return x;
    }
    
    return nearestX;
  }

  /**
   * ИСПРАВЛЕНО: Рассчитывает позицию остановки перед перекрестком.
   * Логика упрощена для большей ясности и надежности.
   */
  calculateStopPosition(carPosition, intersection, direction) {
    const stopDistance = this.minStopDistance; // Используем уменьшенное значение
    const carLength = 120; // Длина машины

    // carPosition - это позиция ПЕРЕДНЕЙ части машины.
    // Функция должна вернуть позицию ЦЕНТРА машины.
    
    let stopLineX = intersection.x;
    let stopLineY = intersection.y;

    // Определяем положение стоп-линии в зависимости от направления движения.
    if (direction === Direction.EW) {
        // Движение по горизонтали
        if (carPosition.x < intersection.x) {
            // Подъезжаем с запада (слева), стоп-линия слева от перекрестка
            stopLineX = intersection.x - stopDistance;
        } else {
            // Подъезжаем с востока (справа), стоп-линия справа от перекрестка
            stopLineX = intersection.x + stopDistance;
        }
    } else { // Direction.NS
        // Движение по вертикали
        if (carPosition.y < intersection.y) {
            // Подъезжаем с севера (сверху), стоп-линия сверху от перекрестка
            stopLineY = intersection.y - stopDistance;
        } else {
            // Подъезжаем с юга (снизу), стоп-линия снизу от перекрестка
            stopLineY = intersection.y + stopDistance;
        }
    }

    // `stopLineX`, `stopLineY` - это целевая позиция для ПЕРЕДНЕЙ части машины.
    // Теперь вычислим позицию ЦЕНТРА машины.
    // Вектор ориентации машины (от центра к переду) примерно равен вектору от машины к перекрестку.
    const dx = intersection.x - carPosition.x;
    const dy = intersection.y - carPosition.y;
    const distance = Math.hypot(dx, dy);
    
    // Нормализованный вектор направления (ориентация машины)
    const normDx = distance > 0 ? dx / distance : 0;
    const normDy = distance > 0 ? dy / distance : 0;

    // Центр машины находится на полкорпуса позади ее передней части.
    const centerX = stopLineX - normDx * (carLength / 2);
    const centerY = stopLineY - normDy * (carLength / 2);

    return { x: centerX, y: centerY };
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
