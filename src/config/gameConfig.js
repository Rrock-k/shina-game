// Конфигурация игры "Карта Шины"
export const CONFIG = {
  WORLD_WIDTH: 3000,
  WORLD_HEIGHT: 2000,
  GRID_STEP: 100,
  ROAD_SPACING_H: 450,  // шаг между вертикальными дорогами (7 дорог)
  ROAD_SPACING_V: 567,  // шаг между горизонтальными дорогами (4 дороги)
  ROAD_MARGIN: 150,
  ROAD_WIDTH: 48,
  ROAD_LINE_WIDTH: 12,
  DASH_LENGTH: 60,
  DASH_GAP: 60,
  COLORS: {
    grid: 0xffffff,
    border: 0xff0000,
    road: 0x666666,
    roadLine: 0xffffff,
    house: 0xffe0e0,
    work: 0xe0e8ff,
    box: 0xfff2cc,
    relatives: 0xe0ffe0,
    institute: 0xd0f0ff,
    lotFill: 0xf1e9d2,
    lotBorder: 0x777777,
  },
  LOTS: {
    SLOTS_PER_BLOCK: 6,
    GAP: 10,
    PADDING: 20,
    MAX_MULTI_SLOT: 3,
    MIN_LOT_HEIGHT: 60,
    FILL_ALPHA: 0.9
  },
  ZONE_LAYOUT: {
    // индексы блоков: 0..(кол-во-1) слева-направо и сверху-вниз
    house: { block: { i: 0, j: 0 }, cells: [[0, 0]] },           // 1x1
    relatives: { block: { i: 5, j: 0 }, cells: [[1, 0]] },       // 1x1
    work: { block: { i: 3, j: 1 }, cells: [[0, 1], [1, 1]] },    // 2x1 (две колонки в одном ряду)
    box: { block: { i: 1, j: 2 }, cells: [[0, 1], [0, 2]] },     // 1x2 (две строки в одном столбце)
    institute: { block: { i: 5, j: 2 }, cells: [[0, 0], [1, 0], [1, 1]] } // Г-образно 3 ячейки
  },
  ZONES: {
    house: { type: 'rect', x: 200, y: 200, w: 440, h: 750, label: 'Дом Шины' },
    relatives: { type: 'rect', x: 1300, y: 200, w: 440, h: 750, label: 'Родственники' },
    work: { type: 'rect', x: 1840, y: 1100, w: 440, h: 700, label: 'Работа' },
    box: { type: 'rect', x: 200, y: 1100, w: 440, h: 700, label: 'Бокс' },
    institute: { type: 'circle', x: 2550, y: 1425, r: 200, label: 'Институт', alpha: 0.6 },
  },
  TRAFFIC_LIGHTS: [
    { x: 600, y: 1283 },
    { x: 1050, y: 1283 },
    { x: 1500, y: 1283 },
    { x: 1950, y: 1283 }
  ],
  CAR_PATH: [
    { x: 600, y: 1283 },
    { x: 1050, y: 1283 },
    { x: 1500, y: 1283 },
    { x: 1950, y: 1283 }
  ],
  BASE_FONT: 32,
  BASE_CAR_SPEED: 11.7, // Базовая скорость машины
  ROUTE_SCHEDULE: [
    { location: 'house', name: 'Дом', stayHours: 2 },
    { location: 'institute', name: 'Институт', stayHours: 2 },
    { location: 'work', name: 'Работа', stayHours: 5 },
    { location: 'relatives', name: 'Родственники', stayHours: 1.5 },
    { location: 'box', name: 'Бокс', stayHours: 1 },
  ]
};

// Дополнительные константы
export const BASE_CAR_SPEED = 11.7; // Базовая скорость машины
