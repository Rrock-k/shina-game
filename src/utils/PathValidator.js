/**
 * Валидатор путей для игры "Карта Шины"
 * Содержит все методы валидации построенных путей и связанных объектов
 */

export class PathValidator {
  constructor(verticalRoadXs, horizontalRoadYs) {
    this.verticalRoadXs = verticalRoadXs;
    this.horizontalRoadYs = horizontalRoadYs;
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

  /**
   * Валидация построенного пути
   * @param {Array} path - массив точек пути
   * @param {string} context - контекст для отладки
   * @returns {Object} - результат валидации {isValid: boolean, errors: string[]}
   */
  validatePath(path, context = 'unknown') {
    const errors = [];
    
    // Проверка базовых условий
    if (!path || !Array.isArray(path)) {
      errors.push(`Путь должен быть массивом, получен: ${typeof path}`);
      return { isValid: false, errors };
    }
    
    if (path.length === 0) {
      errors.push('Путь не может быть пустым');
      return { isValid: false, errors };
    }
    
    // Путь с одной точкой допустим в некоторых случаях (например, когда машина уже на месте)
    if (path.length === 1) {
      console.warn(`⚠️ Путь содержит только одну точку (${context}):`, path[0]);
    }
    
    // Проверка структуры точек
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
        errors.push(`Точка ${i} должна иметь числовые координаты x, y. Получено: ${JSON.stringify(point)}`);
      }
      
      if (isNaN(point.x) || isNaN(point.y)) {
        errors.push(`Точка ${i} содержит NaN координаты: (${point.x}, ${point.y})`);
      }
      
      if (!isFinite(point.x) || !isFinite(point.y)) {
        errors.push(`Точка ${i} содержит бесконечные координаты: (${point.x}, ${point.y})`);
      }
    }
    
    // Проверка на диагональное движение (запрещено)
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const dx = Math.abs(next.x - current.x);
      const dy = Math.abs(next.y - current.y);
      
      // Если есть значительное движение и по X и по Y одновременно, это диагональное движение
      // Учитываем небольшие погрешности округления (до 5 пикселей)
      if (dx > 5 && dy > 5) {
        errors.push(`Обнаружено диагональное движение между точками ${i} и ${i + 1}: (${current.x}, ${current.y}) -> (${next.x}, ${next.y})`);
      }
    }
    
    // Проверка на слишком длинные сегменты (возможная ошибка)
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      const distance = Math.hypot(next.x - current.x, next.y - current.y);
      
      if (distance > 600) { // Максимальная разумная длина сегмента (увеличено для реальных дорог)
        errors.push(`Слишком длинный сегмент между точками ${i} и ${i + 1}: ${distance.toFixed(1)} пикселей`);
      }
    }
    
    // Проверка на дублирующиеся точки
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];
      if (Math.abs(current.x - next.x) < 0.1 && Math.abs(current.y - next.y) < 0.1) {
        errors.push(`Дублирующиеся точки ${i} и ${i + 1}: (${current.x}, ${current.y})`);
      }
    }
    
    const isValid = errors.length === 0;
    
    if (!isValid) {
      console.warn(`❌ Валидация пути (${context}) не пройдена:`, errors);
    }
    
    return { isValid, errors };
  }
  
  /**
   * Валидация перекрестка
   * @param {Object} intersection - объект перекрестка {i, j}
   * @returns {Object} - результат валидации {isValid: boolean, errors: string[]}
   */
  validateIntersection(intersection) {
    const errors = [];
    
    if (!intersection || typeof intersection.i !== 'number' || typeof intersection.j !== 'number') {
      errors.push('Перекресток должен иметь числовые индексы i, j');
      return { isValid: false, errors };
    }
    
    if (intersection.i < 0 || intersection.i >= this.verticalRoadXs.length) {
      errors.push(`Индекс i (${intersection.i}) выходит за границы вертикальных дорог (0-${this.verticalRoadXs.length - 1})`);
    }
    
    if (intersection.j < 0 || intersection.j >= this.horizontalRoadYs.length) {
      errors.push(`Индекс j (${intersection.j}) выходит за границы горизонтальных дорог (0-${this.horizontalRoadYs.length - 1})`);
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Валидация точки остановки у здания
   * @param {Object} buildingStop - объект с точкой остановки и перекрестком
   * @returns {Object} - результат валидации {isValid: boolean, errors: string[]}
   */
  validateBuildingStop(buildingStop) {
    const errors = [];
    
    if (!buildingStop || !buildingStop.stop || !buildingStop.nearestIJ) {
      errors.push('Точка остановки должна содержать stop и nearestIJ');
      return { isValid: false, errors };
    }
    
    // Валидация точки остановки
    const stop = buildingStop.stop;
    if (typeof stop.x !== 'number' || typeof stop.y !== 'number') {
      errors.push('Точка остановки должна иметь числовые координаты');
    }
    
    // Валидация ближайшего перекрестка
    const intersectionValidation = this.validateIntersection(buildingStop.nearestIJ);
    if (!intersectionValidation.isValid) {
      errors.push(...intersectionValidation.errors.map(e => `nearestIJ: ${e}`));
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Фильтрация дублирующихся точек в пути
   * @param {Array} path - массив точек пути
   * @returns {Array} - отфильтрованный путь без дублирующихся точек
   */
  filterDuplicatePoints(path) {
    if (!path || path.length <= 1) {
      return path;
    }

    const filteredPath = [];
    for (let i = 0; i < path.length; i++) {
      const current = path[i];
      const next = path[i + 1];
      
      // Добавляем точку, если она не дублирует следующую
      if (!next || Math.abs(current.x - next.x) > 0.1 || Math.abs(current.y - next.y) > 0.1) {
        filteredPath.push(current);
      }
    }
    
    // Если после фильтрации путь стал слишком коротким, оставляем оригинальный
    return filteredPath.length >= 2 ? filteredPath : path;
  }

  /**
   * Проверка промежуточной точки на диагональное движение
   * @param {Object} currentPos - текущая позиция
   * @param {Object} intermediatePoint - промежуточная точка
   * @param {Object} nextPos - следующая позиция
   * @returns {boolean} - true если промежуточная точка создает диагональное движение
   */
  wouldCreateDiagonalMovement(currentPos, intermediatePoint, nextPos) {
    const dx1 = Math.abs(intermediatePoint.x - currentPos.x);
    const dy1 = Math.abs(intermediatePoint.y - currentPos.y);
    const dx2 = Math.abs(nextPos.x - intermediatePoint.x);
    const dy2 = Math.abs(nextPos.y - intermediatePoint.y);
    
    return (dx1 > 5 && dy1 > 5) || (dx2 > 5 && dy2 > 5);
  }
}
