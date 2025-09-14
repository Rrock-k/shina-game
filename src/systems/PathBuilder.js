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

export class PathBuilder {
  constructor(verticalRoadXs, horizontalRoadYs) {
    this.verticalRoadXs = verticalRoadXs;
    this.horizontalRoadYs = horizontalRoadYs;
  }

  /**
   * Построить путь от перекрестка к зданию
   * @param {Object} startIJ - начальный перекресток {i, j}
   * @param {Object} buildingPos - позиция здания {x, y}
   * @returns {Array} - массив точек пути включая точку остановки у здания
   */
  buildPathToBuilding(startIJ, buildingPos) {
    return buildGraphPathToBuilding(
      startIJ, 
      buildingPos, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
  }

  /**
   * Построить путь только по перекресткам (BFS)
   * @param {Object} fromIJ - начальный перекресток {i, j}
   * @param {Object} toIJ - конечный перекресток {i, j}
   * @returns {Array} - массив координат перекрестков {x, y}
   */
  buildIntersectionPath(fromIJ, toIJ) {
    return buildIntersectionPath(
      fromIJ, 
      toIJ, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
  }

  /**
   * Вычислить точку остановки у здания
   * @param {Object} buildingPos - позиция здания {x, y}
   * @returns {Object} - объект с точкой остановки и информацией о ближайшем перекрестке
   */
  computeBuildingStop(buildingPos) {
    return computeBuildingStop(
      buildingPos, 
      this.verticalRoadXs, 
      this.horizontalRoadYs
    );
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
   * Обновить конфигурацию дорог
   * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
   * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
   */
  updateRoads(verticalRoadXs, horizontalRoadYs) {
    this.verticalRoadXs = verticalRoadXs;
    this.horizontalRoadYs = horizontalRoadYs;
  }
}
