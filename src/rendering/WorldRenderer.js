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
   */
  render() {
    // Очищаем слои перед отрисовкой
    if (this.layers.grid) this.layers.grid.removeChildren();
    if (this.layers.border) this.layers.border.removeChildren();
    if (this.layers.roads) this.layers.roads.removeChildren();
    
    // Отрисовываем базовые элементы
    if (this.layers.grid) this.drawGrid(this.layers.grid);
    if (this.layers.roads) this.drawRoads(this.layers.roads);
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
}
