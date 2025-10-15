/**
 * Система построения путей для игры "Карта Шины"
 * Инкапсулирует всю логику построения маршрутов движения машины
 */

import { 
  indexOfClosest, 
  getIntersectionCoord, 
  getNearestIntersectionIJ, 
  computeBuildingStop, 
  buildIntersectionPath, 
  buildGraphPathToBuilding 
} from '../utils/geometry.js';
import { PathValidator } from '../utils/PathValidator.js';

export class PathBuilder {
  constructor(verticalRoadXs, horizontalRoadYs, config = null) {
    this.verticalRoadXs = verticalRoadXs;
    this.horizontalRoadYs = horizontalRoadYs;
    this.config = config;
    this.validator = new PathValidator(verticalRoadXs, horizontalRoadYs);
    this.routeResolver = null;
    
    // Оптимизация: отключаем валидацию в production режиме
    if (config && config.disableValidation) {
      this.validator.validationEnabled = false;
    }
  }

  /**
   * Установить функцию получения задач маршрута
   * @param {Function} routeResolver - функция (index) => task
   */
  setRouteResolver(routeResolver) {
    this.routeResolver = routeResolver;
  }

  _getRouteTask(index) {
    if (typeof this.routeResolver === 'function') {
      return this.routeResolver(index);
    }
    return this.config?.ROUTE_SCHEDULE?.[index] || null;
  }

  /**
   * Построить путь от перекрестка к зданию
   * @param {Object} startIJ - начальный перекресток {i, j}
   * @param {Object} buildingPos - позиция здания {x, y}
   * @returns {Array} - массив точек пути включая точку остановки у здания
   */
  buildPathToBuilding(startIJ, buildingPos) {
    // Валидация входных параметров
    const startValidation = this.validator.validateIntersection(startIJ);
    if (!startValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации начального перекрестка:', startValidation.errors);
    }
    
    if (!buildingPos || typeof buildingPos.x !== 'number' || typeof buildingPos.y !== 'number') {
      console.warn('⚠️ Предупреждение валидации позиции здания:', buildingPos);
      return [];
    }
    
    const path = buildGraphPathToBuilding(
      startIJ, 
      buildingPos, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
    
    // Валидация построенного пути
    const pathValidation = this.validator.validatePath(path, 'buildPathToBuilding');
    if (!pathValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации построенного пути:', pathValidation.errors);
    }
    
    return path;
  }

  /**
   * Построить путь только по перекресткам (BFS)
   * @param {Object} fromIJ - начальный перекресток {i, j}
   * @param {Object} toIJ - конечный перекресток {i, j}
   * @returns {Array} - массив координат перекрестков {x, y}
   */
  buildIntersectionPath(fromIJ, toIJ) {
    // Валидация входных параметров
    const fromValidation = this.validator.validateIntersection(fromIJ);
    if (!fromValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации начального перекрестка:', fromValidation.errors);
    }
    
    const toValidation = this.validator.validateIntersection(toIJ);
    if (!toValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации конечного перекрестка:', toValidation.errors);
    }
    
    const path = buildIntersectionPath(
      fromIJ, 
      toIJ, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
    
    // Валидация построенного пути
    const pathValidation = this.validator.validatePath(path, 'buildIntersectionPath');
    if (!pathValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации пути по перекресткам:', pathValidation.errors);
    }
    
    return path;
  }

  /**
   * Вычислить точку остановки у здания
   * @param {Object} buildingPos - позиция здания {x, y}
   * @returns {Object} - объект с точкой остановки и информацией о ближайшем перекрестке
   */
  computeBuildingStop(buildingPos) {
    if (!buildingPos || typeof buildingPos.x !== 'number' || typeof buildingPos.y !== 'number') {
      console.warn('⚠️ Предупреждение валидации позиции здания:', buildingPos);
      return null;
    }
    
    const buildingStop = computeBuildingStop(
      buildingPos, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
    
    // Валидация результата
    const validation = this.validator.validateBuildingStop(buildingStop);
    if (!validation.isValid) {
      console.warn('⚠️ Предупреждение валидации точки остановки у здания:', validation.errors);
    }
    
    return buildingStop;
  }

  /**
   * Найти ближайший перекресток к заданной точке
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @returns {Object} - объект с индексами {i, j}
   */
  getNearestIntersectionIJ(x, y) {
    return getNearestIntersectionIJ(x, y, this.verticalRoadXs, this.horizontalRoadYs);
  }

  /**
   * Получить координаты перекрестка по индексам
   * @param {number} i - индекс вертикальной дороги
   * @param {number} j - индекс горизонтальной дороги
   * @returns {Object} - объект с координатами {x, y}
   */
  getIntersectionCoord(i, j) {
    return getIntersectionCoord(i, j, this.verticalRoadXs, this.horizontalRoadYs);
  }

  /**
   * Построить полный путь для машины с учетом текущего состояния
   * @param {Object} carEntity - объект машины
   * @param {number} currentRouteIndex - текущий индекс маршрута
   * @param {Object} savedCarState - сохраненное состояние машины
   * @param {Function} getDestinationCenter - функция получения центра назначения
   * @param {Function} debugLogAlways - функция отладки
   * @returns {Array} - массив точек пути
   */
  buildCarPath(carEntity, currentRouteIndex, savedCarState, getDestinationCenter, debugLogAlways) {
    const currentDestination = this._getRouteTask(currentRouteIndex);
    if (!currentDestination) return [];

    // Определяем стартовый перекрёсток
    let startIJ;
    if (carEntity && carEntity.getPosition() && (carEntity.getPosition().x !== 0 || carEntity.getPosition().y !== 0)) {
      // Машина имеет позицию (не (0,0)) - начинаем с текущей позиции
      const carPos = carEntity.getPosition();
      startIJ = this.getNearestIntersectionIJ(carPos.x, carPos.y);
    } else {
      // Машина в позиции (0,0) или не существует - начинаем с дома (первый запуск)
      const housePos = getDestinationCenter('house');
      startIJ = this.getNearestIntersectionIJ(housePos.x, housePos.y);
    }

    const destCenter = getDestinationCenter(currentDestination.location);
    const graphPath = this.buildPathToBuilding(startIJ, destCenter);

    // Строим путь в зависимости от текущего состояния машины
    const startIntersection = this.getIntersectionCoord(startIJ.i, startIJ.j);
    let path;
    
    if (carEntity && carEntity.getPosition() && (carEntity.getPosition().x !== 0 || carEntity.getPosition().y !== 0)) {
      const carPos = carEntity.getPosition();
      const needsPrefix = Math.abs(carPos.x - startIntersection.x) > 1 || Math.abs(carPos.y - startIntersection.y) > 1;
      
      if (needsPrefix) {
        // Машина не на перекрестке, добавляем путь от текущей позиции к перекрестку
        path = [{ x: carPos.x, y: carPos.y }, startIntersection, ...graphPath];
      } else {
        // Машина уже на перекрестке
        path = [startIntersection, ...graphPath];
      }
    } else {
      // Машина не существует или это первый запуск, начинаем с перекрестка
      path = [startIntersection, ...graphPath];
    }

    // Если у нас есть сохраненное состояние и мы начинаем с текущей позиции машины,
    // добавляем промежуточную точку в направлении движения для плавного старта
    const needsPrefix = carEntity && carEntity.getPosition() && (Math.abs(carEntity.getPosition().x - startIntersection.x) > 1 || Math.abs(carEntity.getPosition().y - startIntersection.y) > 1);
    if (needsPrefix && savedCarState && savedCarState.direction !== 0 && path.length >= 2) {
      const currentPos = path[0];
      const nextPos = path[1];
      const dx = nextPos.x - currentPos.x;
      const dy = nextPos.y - currentPos.y;
      const currentLength = Math.hypot(dx, dy);

      // Вычисляем угол текущего сегмента
      const currentSegmentAngle = Math.atan2(dy, dx);
      const angleDifference = Math.abs(currentSegmentAngle - savedCarState.direction);

      // Если углы сильно отличаются (больше 30 градусов), добавляем промежуточную точку
      if (angleDifference > Math.PI / 6 || currentLength < 50) {
        const directionX = Math.cos(savedCarState.direction);
        const directionY = Math.sin(savedCarState.direction);

        // Вычисляем оптимальное расстояние для промежуточной точки
        const intermediateDistance = Math.min(60, currentLength * 0.3);
        const intermediatePoint = {
          x: currentPos.x + directionX * intermediateDistance,
          y: currentPos.y + directionY * intermediateDistance
        };

        if (!this.validator.wouldCreateDiagonalMovement(currentPos, intermediatePoint, nextPos)) {
          path.splice(1, 0, intermediatePoint);
          if (debugLogAlways) {
            debugLogAlways(`🔄 Добавлена промежуточная точка для плавного старта: угол разности ${(angleDifference * 180 / Math.PI).toFixed(1)}°, длина сегмента ${currentLength.toFixed(1)}, расстояние ${intermediateDistance.toFixed(1)}`);
          }
        } else if (debugLogAlways) {
          const dx1 = Math.abs(intermediatePoint.x - currentPos.x);
          const dy1 = Math.abs(intermediatePoint.y - currentPos.y);
          const dx2 = Math.abs(nextPos.x - intermediatePoint.x);
          const dy2 = Math.abs(nextPos.y - intermediatePoint.y);
          debugLogAlways(`⚠️ Пропущена промежуточная точка из-за диагонального движения: dx1=${dx1.toFixed(1)}, dy1=${dy1.toFixed(1)}, dx2=${dx2.toFixed(1)}, dy2=${dy2.toFixed(1)}`);
        }
      }
    }

    // Фильтрация дублирующихся точек
    const finalPath = this.validator.filterDuplicatePoints(path);

    // Валидация финального пути
    const finalPathValidation = this.validator.validatePath(finalPath, `buildCarPath-${currentDestination.name}`);
    if (!finalPathValidation.isValid) {
      console.warn('⚠️ Предупреждение валидации финального пути машины:', finalPathValidation.errors);
      // Продолжаем работу даже при предупреждениях валидации
    }

    if (debugLogAlways) {
      debugLogAlways(`🗺️ Graph path to ${currentDestination.name}:`, finalPath.map(p => p && p.x !== undefined && p.y !== undefined ? `(${p.x.toFixed(0)},${p.y.toFixed(0)})` : '(undefined)').join(' -> '));
      debugLogAlways(`🚗 Car will start from segment 0: (${finalPath[0]?.x?.toFixed(0) || 'N/A'},${finalPath[0]?.y?.toFixed(0) || 'N/A'}) to (${finalPath[1]?.x?.toFixed(0) || 'N/A'},${finalPath[1]?.y?.toFixed(0) || 'N/A'})`);

      // Дополнительная отладочная информация о сохраненном состоянии
      if (savedCarState) {
        debugLogAlways(`💾 Используется сохраненное состояние:`, {
          hasNextIntersection: !!savedCarState.nextIntersection,
          nextIntersection: savedCarState.nextIntersection,
          direction: savedCarState.direction,
          directionDegrees: (savedCarState.direction * 180 / Math.PI).toFixed(1),
          nextDestination: savedCarState.nextDestination?.name,
          currentPosition: savedCarState.currentPosition
        });
      }
    }

    return finalPath;
  }

  
  /**
   * Обновить конфигурацию дорог
   * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
   * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
   */
  updateRoads(verticalRoadXs, horizontalRoadYs) {
    this.verticalRoadXs = verticalRoadXs;
    this.horizontalRoadYs = horizontalRoadYs;
    this.validator.updateRoads(verticalRoadXs, horizontalRoadYs);
  }
}
