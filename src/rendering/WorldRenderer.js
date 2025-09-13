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
   * Основной метод отрисовки мира
   * Вызывает все функции отрисовки в правильном порядке
   */
  render() {
    // Очищаем слои перед отрисовкой
    if (this.layers.grid) this.layers.grid.removeChildren();
    if (this.layers.border) this.layers.border.removeChildren();
    
    // Отрисовываем базовые элементы
    if (this.layers.grid) this.drawGrid(this.layers.grid);
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
}
