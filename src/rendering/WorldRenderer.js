/**
 * WorldRenderer - отрисовка игрового мира
 * Часть 4.1.1: Базовая структура и отрисовка сетки
 */

import { CONFIG } from '../config/gameConfig.js';

export class WorldRenderer {
  constructor(config, pixiApp) {
    this.config = config;
    this.app = pixiApp;
    this.layers = {};
  }

  /**
   * Инициализация рендерера
   * Использует существующие слои из world контейнера
   * @param {PIXI.Container} world - основной контейнер мира
   * @param {Object} existingLayers - существующие слои
   */
  init(world, existingLayers) {
    this.world = world;
    this.layers = existingLayers;
  }

  /**
   * Отрисовка сетки мира
   * @param {PIXI.Container} layer - слой для отрисовки
   */
  drawGrid(layer) {
    const g = new PIXI.Graphics();
    g.lineStyle(1, this.config.COLORS.grid, 0.15);
    
    // Вертикальные линии
    for (let i = 0; i <= this.config.WORLD_WIDTH; i += this.config.GRID_STEP) {
      g.moveTo(i, 0);
      g.lineTo(i, this.config.WORLD_HEIGHT);
    }
    
    // Горизонтальные линии
    for (let i = 0; i <= this.config.WORLD_HEIGHT; i += this.config.GRID_STEP) {
      g.moveTo(0, i);
      g.lineTo(this.config.WORLD_WIDTH, i);
    }
    
    layer.addChild(g);
  }

  /**
   * Отрисовка границ мира
   * @param {PIXI.Container} layer - слой для отрисовки
   */
  drawWorldBorder(layer) {
    const g = new PIXI.Graphics();
    g.lineStyle(8, this.config.COLORS.border, 1.0, 0);
    g.drawRect(0, 0, this.config.WORLD_WIDTH, this.config.WORLD_HEIGHT);
    layer.addChild(g);
  }

  /**
   * Расчет позиций дорог
   * @returns {Object} объект с позициями дорог
   */
  getRoadPositions() {
    const margin = this.config.ROAD_MARGIN;
    const horizontalPositions = [];
    const verticalPositions = [];
    const availableHeight = this.config.WORLD_HEIGHT - 2 * margin;
    
    for (let i = 0; i < 4; i++) {
      const y = margin + (availableHeight / (4 - 1)) * i;
      horizontalPositions.push(y);
    }
    
    const availableWidth = this.config.WORLD_WIDTH - 2 * margin;
    for (let i = 0; i < 7; i++) {
      const x = margin + (availableWidth / (7 - 1)) * i;
      verticalPositions.push(x);
    }
    
    const maxVerticalPos = verticalPositions[verticalPositions.length - 1];

    // Отладочная информация о позициях дорог
    console.log('Horizontal roads (Y coordinates):', horizontalPositions);
    console.log('Vertical roads (X coordinates):', verticalPositions);

    return { horizontalPositions, verticalPositions, maxVerticalPos };
  }

  /**
   * Отрисовка пунктирной линии
   * @param {PIXI.Graphics} g - графический объект
   * @param {Array} points - массив точек
   * @param {number} dash - длина штриха
   * @param {number} gap - длина промежутка
   */
  drawDashedPath(g, points, dash, gap) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i], p2 = points[i + 1];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      let t = 0;
      while (t <= len) {
        const from = t;
        const to = Math.min(t + dash, len);
        const sx = p1.x + dx * (from / len);
        const sy = p1.y + dy * (from / len);
        const ex = p1.x + dx * (to / len);
        const ey = p1.y + dy * (to / len);
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        t += dash + gap;
      }
    }
  }

  /**
   * Отрисовка дорог
   * @param {PIXI.Container} layer - слой для отрисовки
   */
  drawRoads(layer) {
    const { horizontalPositions, verticalPositions, maxVerticalPos } = this.getRoadPositions();
    
    // Сохраняем позиции дорог для использования в других функциях
    this.horizontalRoadYs = horizontalPositions;
    this.verticalRoadXs = verticalPositions;

    // Рисуем горизонтальные дороги
    horizontalPositions.forEach(y => {
      const h = [{ x: verticalPositions[0], y: y }, { x: maxVerticalPos, y: y }];
      const roadH = new PIXI.Graphics();
      roadH.lineStyle(this.config.ROAD_WIDTH, this.config.COLORS.road, 1);
      roadH.moveTo(h[0].x, h[0].y);
      roadH.lineTo(h[1].x, h[1].y);
      layer.addChild(roadH);
      
      const dashH = new PIXI.Graphics();
      dashH.lineStyle(this.config.ROAD_LINE_WIDTH, this.config.COLORS.roadLine, 1);
      this.drawDashedPath(dashH, h, this.config.DASH_LENGTH, this.config.DASH_GAP);
      layer.addChild(dashH);
    });

    // Рисуем вертикальные дороги
    verticalPositions.forEach(x => {
      let v;
      if (x === maxVerticalPos) {
        v = [{ x: x, y: 0 }, { x: x, y: this.config.WORLD_HEIGHT }];
      } else {
        v = [{ x: x, y: horizontalPositions[0] }, { x: x, y: horizontalPositions[horizontalPositions.length - 1] }];
      }
      
      const roadV = new PIXI.Graphics();
      roadV.lineStyle(this.config.ROAD_WIDTH, this.config.COLORS.road, 1);
      roadV.moveTo(v[0].x, v[0].y);
      roadV.lineTo(v[1].x, v[1].y);
      layer.addChild(roadV);
      
      const dashV = new PIXI.Graphics();
      dashV.lineStyle(this.config.ROAD_LINE_WIDTH, this.config.COLORS.roadLine, 1);
      this.drawDashedPath(dashV, v, this.config.DASH_LENGTH, this.config.DASH_GAP);
      layer.addChild(dashV);
    });
  }

  /**
   * Основной метод отрисовки мира
   * Вызывает все функции отрисовки в правильном порядке
   * @param {Map} zoneGeometry - карта геометрии зон
   */
  render(zoneGeometry) {
    // Очищаем слои перед отрисовкой
    if (this.layers.grid) this.layers.grid.removeChildren();
    if (this.layers.border) this.layers.border.removeChildren();
    if (this.layers.roads) this.layers.roads.removeChildren();
    if (this.layers.lots) this.layers.lots.removeChildren();
    if (this.layers.zones) this.layers.zones.removeChildren();
    
    // Отрисовываем базовые элементы
    if (this.layers.grid) this.drawGrid(this.layers.grid);
    if (this.layers.roads) this.drawRoads(this.layers.roads);
    if (this.layers.lots) this.drawLots(this.layers.lots);
    if (this.layers.zones && zoneGeometry) this.drawZones(this.layers.zones, zoneGeometry);
    if (this.layers.border) this.drawWorldBorder(this.layers.border);
  }

  /**
   * Получить слой по имени
   * @param {string} layerName - имя слоя
   * @returns {PIXI.Container} слой
   */
  getLayer(layerName) {
    return this.layers[layerName];
  }

  /**
   * Добавить слой
   * @param {string} layerName - имя слоя
   * @param {PIXI.Container} layer - слой
   */
  addLayer(layerName, layer) {
    this.layers[layerName] = layer;
    if (this.world) {
      this.world.addChild(layer);
    } else {
      this.app.stage.addChild(layer);
    }
  }

  /**
   * Получить позиции горизонтальных дорог
   * @returns {Array} массив Y координат горизонтальных дорог
   */
  getHorizontalRoadYs() {
    return this.horizontalRoadYs || [];
  }

  /**
   * Получить позиции вертикальных дорог
   * @returns {Array} массив X координат вертикальных дорог
   */
  getVerticalRoadXs() {
    return this.verticalRoadXs || [];
  }

  /**
   * Генерация случайного целого числа
   * @param {number} min - минимальное значение
   * @param {number} max - максимальное значение
   * @returns {number} случайное число
   */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Генерация слотов зданий
   * @param {number} maxSlots - максимальное количество слотов
   * @returns {Array} массив размеров слотов
   */
  generateBuildingSlots(maxSlots) {
    const sizes = [];
    const target = this.randInt(Math.max(3, Math.floor(maxSlots / 2)), maxSlots);
    let used = 0;
    while (used < target) {
      const remaining = target - used;
      const maxTake = Math.min(remaining, this.config.LOTS.MAX_MULTI_SLOT);
      const roll = Math.random();
      let take = 1;
      if (maxTake >= 3 && roll < 0.18) take = 3;
      else if (maxTake >= 2 && roll < 0.55) take = 2;
      sizes.push(take);
      used += take;
    }
    return sizes;
  }

  /**
   * Отрисовка лотов
   * @param {PIXI.Container} layer - слой для отрисовки
   */
  drawLots(layer) {
    const horizontalRoadYs = this.getHorizontalRoadYs();
    const verticalRoadXs = this.getVerticalRoadXs();
    if (!horizontalRoadYs.length || !verticalRoadXs.length) return;
    
    const roadHalf = this.config.ROAD_WIDTH / 2;
    const cols = 2; // по горизонтали
    const rows = 3; // по вертикали
    const gap = this.config.LOTS.GAP;
    const padding = this.config.LOTS.PADDING;

    for (let j = 0; j < horizontalRoadYs.length - 1; j++) {
      const yTop = horizontalRoadYs[j] + roadHalf;
      const yBottom = horizontalRoadYs[j + 1] - roadHalf;
      const blockHeight = Math.max(0, yBottom - yTop);
      const innerHeight = Math.max(0, blockHeight - padding * 2);
      if (innerHeight <= 0) continue;
      const totalGapsV = gap * (rows - 1);
      const lotHeight = (innerHeight - totalGapsV) / rows;

      for (let i = 0; i < verticalRoadXs.length - 1; i++) {
        const xLeft = verticalRoadXs[i] + roadHalf;
        const xRight = verticalRoadXs[i + 1] - roadHalf;
        const blockWidth = Math.max(0, xRight - xLeft);
        const innerWidth = Math.max(0, blockWidth - padding * 2);
        if (innerWidth <= 0) continue;
        const totalGapsH = gap * (cols - 1);
        const lotWidth = (innerWidth - totalGapsH) / cols;

        const startX = xLeft + padding;
        const startY = yTop + padding;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const rx = startX + c * (lotWidth + gap);
            const ry = startY + r * (lotHeight + gap);
            const g = new PIXI.Graphics();
            g.lineStyle(1, this.config.COLORS.lotBorder, 0.9);
            g.beginFill(this.config.COLORS.lotFill, this.config.LOTS.FILL_ALPHA);
            g.drawRect(rx, ry, lotWidth, lotHeight);
            g.endFill();
            layer.addChild(g);
          }
        }
      }
    }
  }

  /**
   * Отрисовка прямоугольной зоны
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @param {number} w - ширина
   * @param {number} h - высота
   * @param {number} color - цвет
   * @param {PIXI.Container} layer - слой для отрисовки
   * @returns {PIXI.Graphics} созданный графический объект
   */
  drawZoneRect(x, y, w, h, color, layer) {
    const g = new PIXI.Graphics();
    g.lineStyle(2, 0x333333, 0.9);
    g.beginFill(color, 1.0);
    g.drawRect(x, y, w, h);
    g.endFill();
    layer.addChild(g);
    return g;
  }

  /**
   * Создание текстовой метки с переносом
   * @param {string} textValue - текст
   * @param {number} fontSize - размер шрифта
   * @param {number} maxWidth - максимальная ширина
   * @returns {PIXI.Text} текстовый объект
   */
  createWrappedLabel(textValue, fontSize, maxWidth) {
    const style = new PIXI.TextStyle({
      fontFamily: 'sans-serif',
      fontSize,
      fill: 0x000000,
      wordWrap: true,
      wordWrapWidth: maxWidth,
      breakWords: true,
      align: 'center',
      stroke: 0xffffff,
      strokeThickness: 4
    });
    const label = new PIXI.Text(textValue, style);
    label.anchor.set(0.5);
    return label;
  }

  /**
   * Отрисовка метки
   * @param {string} textValue - текст
   * @param {number} x - X координата
   * @param {number} y - Y координата
   * @param {number} maxWidth - максимальная ширина
   * @param {PIXI.Container} layer - слой для отрисовки
   */
  drawLabel(textValue, x, y, maxWidth, layer) {
    const label = this.createWrappedLabel(textValue, this.config.BASE_FONT, Math.max(60, maxWidth * 0.9));
    label.position.set(x, y);
    layer.addChild(label);
  }

  /**
   * Отрисовка зоны из ячеек
   * @param {string} name - имя зоны
   * @param {string} colorKey - ключ цвета
   * @param {PIXI.Container} layer - слой для отрисовки
   * @param {Map} zoneGeometry - карта геометрии зон
   */
  drawZoneFromCells(name, colorKey, layer, zoneGeometry) {
    const horizontalRoadYs = this.getHorizontalRoadYs();
    const verticalRoadXs = this.getVerticalRoadXs();
    const roadHalf = this.config.ROAD_WIDTH / 2;
    const cols = 2;
    const rows = 3;
    const gap = this.config.LOTS.GAP;
    const padding = this.config.LOTS.PADDING;
    const zoneLayout = this.config.ZONE_LAYOUT;
    const blocksAcross = verticalRoadXs.length - 1;
    const blocksDown = horizontalRoadYs.length - 1;

    const getBlockRect = (bi, bj) => {
      const yTop = horizontalRoadYs[bj] + roadHalf;
      const yBottom = horizontalRoadYs[bj + 1] - roadHalf;
      const xLeft = verticalRoadXs[bi] + roadHalf;
      const xRight = verticalRoadXs[bi + 1] - roadHalf;
      const blockWidth = Math.max(0, xRight - xLeft);
      const blockHeight = Math.max(0, yBottom - yTop);
      const innerWidth = Math.max(0, blockWidth - padding * 2);
      const innerHeight = Math.max(0, blockHeight - padding * 2);
      const totalGapsH = gap * (cols - 1);
      const totalGapsV = gap * (rows - 1);
      const lotWidth = (innerWidth - totalGapsH) / cols;
      const lotHeight = (innerHeight - totalGapsV) / rows;
      const startX = xLeft + padding;
      const startY = yTop + padding;
      return { startX, startY, lotWidth, lotHeight };
    };

    const conf = zoneLayout[name];
    if (!conf) return;
    const bi = conf.block.i;
    const bj = conf.block.j;
    if (bi < 0 || bj < 0 || bi >= blocksAcross || bj >= blocksDown) return;
    const { startX, startY, lotWidth, lotHeight } = getBlockRect(bi, bj);

    // Для института рисуем Г-образно, иначе — объединённый прямоугольник
    if (name === 'institute') {
      // Ячейки по конфигу в координатах сетки лотов
      const cells = conf.cells.map(([c, r]) => ({ c, r }));

      // Вспомогательная: группировать последовательные числа
      const groupConsecutive = (arr) => {
        const groups = [];
        let start = null, prev = null;
        arr.forEach(v => {
          if (start === null) { start = v; prev = v; return; }
          if (v === prev + 1) { prev = v; return; }
          groups.push([start, prev]);
          start = v; prev = v;
        });
        if (start !== null) groups.push([start, prev]);
        return groups;
      };

      // Горизонтальные полосы: по каждому ряду объединяем соседние колонки и ЗАПОЛНЯЕМ внутренние гэпы
      const rowsUsed = Array.from(new Set(cells.map(x => x.r))).sort((a, b) => a - b);
      rowsUsed.forEach(r => {
        const colsHere = cells.filter(x => x.r === r).map(x => x.c).sort((a, b) => a - b);
        const seqs = groupConsecutive(colsHere);
        seqs.forEach(([c0, c1]) => {
          const x = startX + c0 * (lotWidth + gap);
          const y = startY + r * (lotHeight + gap);
          const w = (c1 - c0 + 1) * lotWidth + (c1 - c0) * gap; // перекрываем горизонтальные гэпы
          const h = lotHeight;
          this.drawZoneRect(x, y, w, h, this.config.COLORS[colorKey], layer);
        });
      });

      // Вертикальные полосы: по каждой колонке объединяем соседние ряды и ЗАПОЛНЯЕМ вертикальные гэпы
      const colsUsed = Array.from(new Set(cells.map(x => x.c))).sort((a, b) => a - b);
      colsUsed.forEach(c => {
        const rowsHere = cells.filter(x => x.c === c).map(x => x.r).sort((a, b) => a - b);
        const seqs = groupConsecutive(rowsHere);
        seqs.forEach(([r0, r1]) => {
          const x = startX + c * (lotWidth + gap);
          const y = startY + r0 * (lotHeight + gap);
          const w = lotWidth;
          const h = (r1 - r0 + 1) * lotHeight + (r1 - r0) * gap; // перекрываем вертикальные гэпы
          this.drawZoneRect(x, y, w, h, this.config.COLORS[colorKey], layer);
        });
      });

      // Вычисляем границы Г-образной зоны
      const minX = Math.min(...cells.map(({ c }) => startX + c * (lotWidth + gap)));
      const maxX = Math.max(...cells.map(({ c }) => startX + c * (lotWidth + gap) + lotWidth));
      const minY = Math.min(...cells.map(({ r }) => startY + r * (lotHeight + gap)));
      const maxY = Math.max(...cells.map(({ r }) => startY + r * (lotHeight + gap) + lotHeight));

      // Подпись в центре тяжести фигуры (среднее центров занятых ячеек)
      const centers = cells.map(({ c, r }) => ({
        cx: startX + c * (lotWidth + gap) + lotWidth / 2,
        cy: startY + r * (lotHeight + gap) + lotHeight / 2
      }));
      const cgx = centers.reduce((s, p) => s + p.cx, 0) / centers.length;
      const cgy = centers.reduce((s, p) => s + p.cy, 0) / centers.length;
      // Ширина для переноса: охватывающая ширина фигуры
      this.drawLabel(this.config.ZONES[name].label, cgx, cgy, maxX - minX, layer);

      // Сохраняем геометрию зоны (центр и bbox)
      const zoneData = {
        type: 'composite',
        center: { x: cgx, y: cgy },
        bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
      };
      zoneGeometry.set(name, zoneData);
      console.log(`🏛️ Сохранена геометрия зоны ${name}:`, zoneData);
      return;
    }

    // Общее объединение для прямоугольных зон
    let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity;
    conf.cells.forEach(([c, r]) => {
      minC = Math.min(minC, c);
      minR = Math.min(minR, r);
      maxC = Math.max(maxC, c);
      maxR = Math.max(maxR, r);
    });
    const x = startX + minC * (lotWidth + gap);
    const y = startY + minR * (lotHeight + gap);
    const w = (maxC - minC + 1) * lotWidth + (maxC - minC) * gap;
    const h = (maxR - minR + 1) * lotHeight + (maxR - minR) * gap;
    this.drawZoneRect(x, y, w, h, this.config.COLORS[colorKey], layer);
    const cx = x + w / 2;
    const cy = y + h / 2;
    this.drawLabel(this.config.ZONES[name].label, cx, cy, w, layer);
    // Сохраняем геометрию зоны
    zoneGeometry.set(name, { type: 'rect', center: { x: cx, y: cy }, bounds: { x, y, w, h } });
  }

  /**
   * Отрисовка зон
   * @param {PIXI.Container} layer - слой для отрисовки
   * @param {Map} zoneGeometry - карта геометрии зон
   */
  drawZones(layer, zoneGeometry) {
    const horizontalRoadYs = this.getHorizontalRoadYs();
    const verticalRoadXs = this.getVerticalRoadXs();
    if (!horizontalRoadYs.length || !verticalRoadXs.length) return;

    this.drawZoneFromCells('house', 'house', layer, zoneGeometry);
    this.drawZoneFromCells('relatives', 'relatives', layer, zoneGeometry);
    this.drawZoneFromCells('work', 'work', layer, zoneGeometry);
    this.drawZoneFromCells('box', 'box', layer, zoneGeometry);
    this.drawZoneFromCells('institute', 'institute', layer, zoneGeometry);
    
    // Для круга сохранить центр и радиус (только если не была установлена Г-образная зона)
    const inst = this.config.ZONES.institute;
    if (inst?.type === 'circle' && !zoneGeometry.has('institute')) {
      zoneGeometry.set('institute', { type: 'circle', center: { x: inst.x, y: inst.y }, bounds: { x: inst.x, y: inst.y, r: inst.r } });
    }
  }
}
