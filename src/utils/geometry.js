/**
 * Геометрические утилиты для игры "Карта Шины"
 * Содержит функции для работы с координатами, расстояниями и путями
 */

/**
 * Найти индекс ближайшего элемента в массиве к заданному значению
 * @param {number[]} arr - массив чисел
 * @param {number} value - искомое значение
 * @returns {number} - индекс ближайшего элемента
 */
export function indexOfClosest(arr, value) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(arr[i] - value);
    if (d < bestDist) { 
      bestDist = d; 
      bestIdx = i; 
    }
  }
  return bestIdx;
}

/**
 * Получить координаты перекрестка по индексам
 * @param {number} i - индекс вертикальной дороги
 * @param {number} j - индекс горизонтальной дороги
 * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
 * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
 * @returns {Object} - объект с координатами {x, y}
 */
export function getIntersectionCoord(i, j, verticalRoadXs, horizontalRoadYs) {
  return { 
    x: verticalRoadXs[i], 
    y: horizontalRoadYs[j] 
  };
}

/**
 * Найти ближайший перекресток к заданной точке
 * @param {number} x - X координата
 * @param {number} y - Y координата
 * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
 * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
 * @returns {Object} - объект с индексами {i, j}
 */
export function getNearestIntersectionIJ(x, y, verticalRoadXs, horizontalRoadYs) {
  return { 
    i: indexOfClosest(verticalRoadXs, x), 
    j: indexOfClosest(horizontalRoadYs, y) 
  };
}

/**
 * Рассчитать точку остановки у здания
 * @param {Object} buildingPos - позиция здания {x, y}
 * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
 * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
 * @returns {Object} - объект с точкой остановки и информацией о ближайшем перекрестке
 */
export function computeBuildingStop(buildingPos, verticalRoadXs, horizontalRoadYs) {
  const nearestVXIndex = indexOfClosest(verticalRoadXs, buildingPos.x);
  const nearestVx = verticalRoadXs[nearestVXIndex];
  const distToV = Math.abs(buildingPos.x - nearestVx);

  const nearestHYIndex = indexOfClosest(horizontalRoadYs, buildingPos.y);
  const nearestHy = horizontalRoadYs[nearestHYIndex];
  const distToH = Math.abs(buildingPos.y - nearestHy);

  // Выбираем более близкую дорогу
  if (distToV <= distToH) {
    // Остановка на вертикальной дороге: X фиксирован, Y — проекция центра здания
    const stopY = Math.max(
      horizontalRoadYs[0], 
      Math.min(horizontalRoadYs[horizontalRoadYs.length - 1], buildingPos.y)
    );
    const j = indexOfClosest(horizontalRoadYs, stopY);
    return { 
      stop: { x: nearestVx, y: stopY }, 
      nearestIJ: { i: nearestVXIndex, j }, 
      orientation: 'vertical' 
    };
  } else {
    // Остановка на горизонтальной дороге: Y фиксирован, X — проекция центра здания
    const stopX = Math.max(
      verticalRoadXs[0], 
      Math.min(verticalRoadXs[verticalRoadXs.length - 1], buildingPos.x)
    );
    const i = indexOfClosest(verticalRoadXs, stopX);
    return { 
      stop: { x: stopX, y: nearestHy }, 
      nearestIJ: { i, j: nearestHYIndex }, 
      orientation: 'horizontal' 
    };
  }
}

/**
 * Поиск пути по сетке перекрестков (BFS) от одного перекрестка к другому
 * @param {Object} fromIJ - начальный перекресток {i, j}
 * @param {Object} toIJ - конечный перекресток {i, j}
 * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
 * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
 * @returns {Array} - массив координат перекрестков {x, y}
 */
export function buildIntersectionPath(fromIJ, toIJ, verticalRoadXs, horizontalRoadYs) {
  const cols = verticalRoadXs.length;
  const rows = horizontalRoadYs.length;
  const key = (i, j) => `${i},${j}`;
  const queue = [];
  const visited = new Set();
  const parent = new Map();
  
  queue.push(fromIJ);
  visited.add(key(fromIJ.i, fromIJ.j));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  while (queue.length) {
    const cur = queue.shift();
    if (cur.i === toIJ.i && cur.j === toIJ.j) break;
    
    for (const [dx, dy] of dirs) {
      const ni = cur.i + dx;
      const nj = cur.j + dy;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      
      const k = key(ni, nj);
      if (visited.has(k)) continue;
      
      visited.add(k);
      parent.set(k, key(cur.i, cur.j));
      queue.push({ i: ni, j: nj });
    }
  }
  
  // Восстановление пути
  const pathIJ = [];
  let ck = key(toIJ.i, toIJ.j);
  if (!visited.has(ck)) {
    // на всякий случай — если путь не найден, остаёмся на месте
    return [getIntersectionCoord(fromIJ.i, fromIJ.j, verticalRoadXs, horizontalRoadYs)];
  }
  
  while (ck) {
    const [si, sj] = ck.split(',').map(Number);
    pathIJ.push({ i: si, j: sj });
    ck = parent.get(ck) || null;
  }
  pathIJ.reverse();
  
  // Преобразуем в массив точек ({x,y})
  return pathIJ.map(({ i, j }) => getIntersectionCoord(i, j, verticalRoadXs, horizontalRoadYs));
}

/**
 * Построить путь от перекрестка к зданию
 * @param {Object} startIJ - начальный перекресток {i, j}
 * @param {Object} buildingPos - позиция здания {x, y}
 * @param {number[]} verticalRoadXs - массив X координат вертикальных дорог
 * @param {number[]} horizontalRoadYs - массив Y координат горизонтальных дорог
 * @returns {Array} - массив точек пути включая точку остановки у здания
 */
export function buildGraphPathToBuilding(startIJ, buildingPos, verticalRoadXs, horizontalRoadYs) {
  const { stop, nearestIJ } = computeBuildingStop(buildingPos, verticalRoadXs, horizontalRoadYs);
  const nodes = buildIntersectionPath(startIJ, nearestIJ, verticalRoadXs, horizontalRoadYs);
  // Добавляем финальную точку остановки у здания
  nodes.push(stop);
  return nodes;
}

/**
 * Вычислить расстояние между двумя точками
 * @param {Object} point1 - первая точка {x, y}
 * @param {Object} point2 - вторая точка {x, y}
 * @returns {number} - расстояние между точками
 */
export function distanceBetweenPoints(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Проверить, находится ли точка внутри прямоугольника
 * @param {Object} point - точка {x, y}
 * @param {Object} rect - прямоугольник {x, y, width, height}
 * @returns {boolean} - true если точка внутри прямоугольника
 */
export function isPointInRect(point, rect) {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width && 
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
}

/**
 * Проверить, находится ли точка внутри круга
 * @param {Object} point - точка {x, y}
 * @param {Object} circle - круг {x, y, radius}
 * @returns {boolean} - true если точка внутри круга
 */
export function isPointInCircle(point, circle) {
  const distance = distanceBetweenPoints(point, { x: circle.x, y: circle.y });
  return distance <= circle.radius;
}
