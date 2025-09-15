
import { initTrafficLightsForIntersection, getDirectionForSegment, Direction, TrafficLightCoordinator, keyForIntersection } from './systems/trafficLights.js';
import { CarTrafficController } from './systems/carTrafficControl.js';
import { PanningController } from './systems/panning.js';
import { CONFIG } from './config/gameConfig.js';
import { TimeManager } from './game/TimeManager.js';
import { PauseManager } from './game/PauseManager.js';
import { DayNightManager } from './game/DayNightManager.js';
import { JournalManager } from './game/JournalManager.js';
import { WorldRenderer } from './rendering/WorldRenderer.js';
import { CarRenderer } from './rendering/CarRenderer.js';
import { UIRenderer } from './rendering/UIRenderer.js';
// Новые сущности
import { Car } from './entities/Car.js';
// Утилиты
import { PathBuilder } from './systems/PathBuilder.js';
import { randInt } from './utils/math.js';
// Главный класс игры
import Game from './game/Game.js';

// globals - УДАЛЕНЫ: теперь используются свойства game

// Менеджеры
let carRenderer;

// Новые сущности теперь в game.game.carEntity и game.game.shinaEntity

// ДЕБАГ МОД
let DEBUG_MODE = true; // теперь можно изменять
let debugInfo = {
  frameCount: 0,
  lastLogTime: 0,
  logInterval: 1000 // логировать каждую секунду
};


function debugLog (message, data = null) {
  if (!DEBUG_MODE) return;
  const now = Date.now();
  if (now - debugInfo.lastLogTime > debugInfo.logInterval) {
    console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
    debugInfo.lastLogTime = now;
  }
}

function debugLogAlways (message, data = null) {
  if (!DEBUG_MODE) return;
  console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
}

// Обновление таймера пребывания в здании теперь в Game.js


// Инициализация новых сущностей теперь в Game.js


// Обновление сущностей теперь в Game.js

// Геометрия зон теперь в game.zoneGeometry

let currentRouteIndex = 0;
let stayTimer = 0; // таймер пребывания в текущем месте
let savedCarState = null; // сохраненное состояние машины при входе в здание
// Хранилище светофоров по ключу перекрёстка
const intersectionKeyToTL = new Map();
// Координатор зеленой волны светофоров
const trafficCoordinator = new TrafficLightCoordinator(45); // скорость машин ~45 км/ч

// 🚦 КОНФИГУРАЦИЯ СВЕТОФОРОВ 🚦
// Массив буквенно-цифровых координат перекрестков, где должны быть светофоры
// Формат: 'A1', 'B2', 'C3' и т.д. (буква = столбец дороги, цифра = ряд дороги)
// Можно легко редактировать этот массив для изменения расположения светофоров!
const TRAFFIC_LIGHTS_CONFIG = [
  'A2',              // левый столбец (въезд в город) - убран A3
  'B2',              // второй столбец - убран B4
  'C3',              // третий столбец - убран C1
  'D2', 'D4',        // четвертый столбец
  'E1',              // пятый столбец - убран E3
  'F2', 'F4',        // шестой столбец
  'G1', 'G3', 'G4'   // правый столбец (выезд из города) - убран G2
];

// Определяем мобильное устройство в начале
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Создаем экземпляр игры
const game = new Game();

// Делаем необходимые переменные глобально доступными для Game.js (временно)
window.CONFIG = CONFIG;
window.debugLog = debugLog;
window.debugLogAlways = debugLogAlways;
window.debugInfo = debugInfo;
window.currentRouteIndex = currentRouteIndex;
window.savedCarState = savedCarState;
window.zoneGeometry = game.zoneGeometry;

// Получаем менеджеры из экземпляра игры
const timeManager = game.timeManager;
const pauseManager = game.pauseManager;
const journalManager = game.journalManager;
const dayNightManager = game.dayNightManager;

let panningController;

// Получаем рендереры из экземпляра игры
let worldRenderer = game.worldRenderer;
let uiRenderer = game.uiRenderer;

setupWorld();

uiRenderer.init();

// Обновляем текст режима дня/ночи и паузы в меню после инициализации
setTimeout(() => {
  dayNightManager.updateDayNightModeText();
  pauseManager.updatePauseModeText();
}, 100);

const carData = game._createCar(currentRouteIndex, savedCarState, intersectionKeyToTL, uiRenderer, debugLogAlways);
carRenderer = carData.carRenderer;
layout();
window.addEventListener('resize', () => {
  // Убираем изменение размера canvas - оставляем фиксированный размер
  layout();

  // Если включен полноэкранный режим, обновляем его при изменении размера окна
  if (typeof panningController !== 'undefined' && panningController && panningController.isFullscreenMode()) {
    panningController.toggleFullscreen(); // выключаем
    panningController.toggleFullscreen(); // включаем с новыми размерами
  }
});



// Функция для парсинга буквенно-цифровых координат в индексы
function parseIntersectionCoordinate (coord) {
  const letter = coord.charAt(0);
  const number = parseInt(coord.slice(1));
  const i = letter.charCodeAt(0) - 65; // A=0, B=1, C=2...
  const j = number - 1; // 1=0, 2=1, 3=2...
  return { i, j };
}

// Проверка, есть ли светофор на данном перекрестке
function shouldHaveTrafficLight (i, j) {
  const coord = String.fromCharCode(65 + i) + (j + 1);
  return TRAFFIC_LIGHTS_CONFIG.includes(coord);
}


function setupWorld () {
  // Получаем слои из экземпляра игры - теперь используем напрямую через game
  const world = game.world;
  const gridLayer = game.gridLayer;
  const roadsLayer = game.roadsLayer;
  const lotsLayer = game.lotsLayer;
  const zonesLayer = game.zonesLayer;
  const labelsLayer = game.labelsLayer;
  const intersectionsLayer = game.intersectionsLayer;
  const decorLayer = game.decorLayer;
  const trafficLightsLayer = game.trafficLightsLayer;
  const borderLayer = game.borderLayer;
  const lightingLayer = game.lightingLayer;
  const uiLayer = game.uiLayer;

  // Инициализируем WorldRenderer с слоями
  worldRenderer.init(world, {
    grid: gridLayer,
    roads: roadsLayer,
    lots: lotsLayer,
    zones: zonesLayer,
    intersections: intersectionsLayer,
    trafficLights: trafficLightsLayer,
    labels: labelsLayer,
    decor: decorLayer,
    border: borderLayer
  });

  // Добавляем слои в правильном порядке (снизу вверх)
  world.addChild(gridLayer);
  world.addChild(roadsLayer);
  world.addChild(intersectionsLayer);
  world.addChild(lotsLayer);
  world.addChild(zonesLayer);
  world.addChild(labelsLayer);
  world.addChild(borderLayer);

  // Используем WorldRenderer для отрисовки базовых элементов
  worldRenderer.render(game.zoneGeometry);
  // Светофоры создаются в отдельном слое (пока что в trafficLightsLayer)
  createTrafficLightsForAllIntersections(game.trafficLightsLayer);

  // Пропускаем создание оверлея здесь, так как dayNightManager еще не инициализирован
  // Оверлей будет создан позже в updateNightMode

  // Добавляем decorLayer (машина) - будет добавлен поверх оверлея
  world.addChild(decorLayer);

  // Добавляем светофоры - будут добавлены поверх оверлея
  world.addChild(trafficLightsLayer);

  // Добавляем слой освещения ПЕРЕД UI (но после ночного оверлея)
  lightingLayer.zIndex = 1000; // поверх ночного оверлея
  game.app.stage.addChild(lightingLayer);

  uiLayer.zIndex = 2000; // поверх всего
  game.app.stage.addChild(uiLayer);

  const pauseButton = document.getElementById('pause-button');
  const speedButton = document.getElementById('speed-button');
  const zoomButton = document.getElementById('zoom-button');
  const zoomInButton = document.getElementById('zoom-in-button');
  const zoomOutButton = document.getElementById('zoom-out-button');

  // Настраиваем кнопку паузы
  pauseButton.addEventListener('click', () => {
    pauseManager.togglePause();
    game.timeManager.setPaused(pauseManager.isPaused());
    pauseManager.showSpeedNotification(pauseManager.isPaused() ? 'ПАУЗА' : 'ВОЗОБНОВЛЕНО');
  });

  // Настраиваем кнопку скорости
  speedButton.addEventListener('click', () => {
    const currentSpeed = pauseManager.getSpeedMultiplier();
    let newSpeed;
    
    // Цикл: x1 → x2 → x5 → x1
    if (currentSpeed === 1) {
      newSpeed = 2;
    } else if (currentSpeed === 2) {
      newSpeed = 5;
    } else {
      newSpeed = 1;
    }
    
    pauseManager.setSpeedBoosted(newSpeed > 1);
    pauseManager.setSpeedMultiplier(newSpeed);
    game.timeManager.setSpeedMultiplier(newSpeed);

    // Обновляем внешний вид кнопки
    speedButton.textContent = `x${newSpeed}`;
    speedButton.classList.toggle('boosted', newSpeed > 1);

    // Логируем изменение
    console.log(`⚡ СКОРОСТЬ ИГРЫ: x${newSpeed} ${newSpeed > 1 ? 'УСКОРЕНО' : 'НОРМАЛЬНАЯ'}`);

    // Показываем уведомление
    pauseManager.showSpeedNotification(`СКОРОСТЬ x${newSpeed}`);
  });

  const initialSpeed = pauseManager.getSpeedMultiplier();
  speedButton.textContent = `x${initialSpeed}`;
  speedButton.classList.toggle('boosted', initialSpeed > 1);

  // Настраиваем кнопку масштабирования
  zoomButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.toggleZoom();
      uiRenderer.updateZoomButton();
    }
  });

  // Настраиваем кнопки увеличения/уменьшения масштаба
  zoomInButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.zoomIn();
      uiRenderer.updateZoomButton();
    }
  });

  zoomOutButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.zoomOut();
      uiRenderer.updateZoomButton();
    }
  });


  panningController = new PanningController();
  panningController.setWorld(game.world);
  panningController.setOnZoomChange((scale) => {
    if (uiRenderer) {
      uiRenderer.updateZoomButton();
    }
  });
  panningController.setOnFullscreenChange((isFullscreen) => {
    if (uiRenderer) {
      uiRenderer.updateZoomButton();
    }
  });

  // На мобильных устройствах кнопки масштабирования скрыты

  // Лёгкая задержка, чтобы зона успела отрисоваться, затем построим первый путь
  setTimeout(() => {
    // перестроим путь, когда геометрия зон уже известна
    if (game.carEntity) {
      const newPath = window.pathBuilder.buildCarPath(game.carEntity, currentRouteIndex, savedCarState, game._getDestinationCenter.bind(game), debugLogAlways);
      game.carEntity.setPath(newPath);
    }
  }, 0);
}


// Функции-обертки для получения позиций дорог из WorldRenderer


function createTrafficLightsForAllIntersections (layer) {
  intersectionKeyToTL.clear();
  const { maxVerticalPos } = worldRenderer ? worldRenderer.getRoadPositions() : { maxVerticalPos: 0 };
  const horizontalRoadYs = game.worldRenderer ? game.worldRenderer.getHorizontalRoadYs() : [];
  const verticalRoadXs = game.worldRenderer ? game.worldRenderer.getVerticalRoadXs() : [];

  for (let j = 0; j < horizontalRoadYs.length; j++) {
    for (let i = 0; i < verticalRoadXs.length; i++) {
      const x = verticalRoadXs[i];
      const y = horizontalRoadYs[j];

      if (!shouldHaveTrafficLight(i, j)) {
        continue; // пропускаем этот перекресток
      }

      // Определяем, какие дороги есть в каждом направлении
      const roadConnections = {
        north: j > 0 || (x === maxVerticalPos), // дорога на север: внутренний ряд ИЛИ правая дорога (выезд за город)
        south: j < horizontalRoadYs.length - 1 || (x === maxVerticalPos), // дорога на юг: внутренний ряд ИЛИ правая дорога (выезд за город)
        west: i > 0, // есть дорога на запад, если не крайний левый столбец
        east: i < verticalRoadXs.length - 1 // есть дорога на восток, если не крайний правый столбец
      };

      const tl = initTrafficLightsForIntersection({
        PIXI,
        app: game.app,
        layer,
        x,
        y,
        roadWidth: CONFIG.ROAD_WIDTH,
        lampRadius: 9,
        cycle: { green: 750, yellow: 200 },
        roadConnections
      });
      const key = `${x},${y}`;
      intersectionKeyToTL.set(key, tl);

      // Регистрируем светофор в координаторе зеленой волны
      trafficCoordinator.addTrafficLight(key, tl, x, y);
    }
  }

  if (verticalRoadXs.length > 0 && horizontalRoadYs.length > 0) {
    trafficCoordinator.setWaveOrigin(verticalRoadXs[0], horizontalRoadYs[0]);
  }
}

// Функция drawDashedPath перенесена в WorldRenderer



function layout () {
  const w = 1200;
  const h = 800;
  const scale = Math.min(w / CONFIG.WORLD_WIDTH, h / CONFIG.WORLD_HEIGHT);

  if (!panningController || panningController.getCurrentScale() === 1) {
    game.world.scale.set(scale);
    game.world.pivot.set(0, 0);
    game.world.position.set(
      (w - CONFIG.WORLD_WIDTH * scale) / 2,
      (h - CONFIG.WORLD_HEIGHT * scale) / 2
    );
  }

  game.labelsLayer.children.forEach(label => {
    label.scale.set(1 / scale);
  });

  // Светофоры теперь внутри world, поэтому синхронизация не нужна
  
  game._initEntities(currentRouteIndex, savedCarState, carRenderer);
}

// ======= Новая логика движения по графу перекрёстков и зданий =======
// Вспомогательные функции индексации и координат перекрёстков





// Построить полный маршрут с учётом ограничений: только I->I и I->B/B->I

// Создание машины теперь в Game.js







function updateCar (delta) {
  // Обновляем новые сущности
  game.updateEntities(delta);
  
  // Синхронизируем game.carEntity с carRenderer для визуального представления
  if (game.carEntity && carRenderer) {
    // Обновляем визуальное представление
    carRenderer.updateVisuals(game.carEntity);
    
    // Синхронизируем локальные переменные с game.carEntity (глобальные переменные удалены)
    const carPath = game.carEntity.getPath();
    const carSegment = game.carEntity.getCurrentSegment();
    const carProgress = game.carEntity.getProgress();
    const stayTimer = game.carEntity.getStayTimer();
  }
  
  // Обновляем UI
  if (uiRenderer) {
    uiRenderer.updateRouteDisplay(game.carEntity ? game.carEntity.isAtDestination() : false);
  }
}


// Настраиваем игровую область для панорамирования
const gameContainer = document.querySelector('.game-container');
gameContainer.style.width = '1200px';
gameContainer.style.height = '800px';
gameContainer.style.overflow = 'auto';

// Запускаем игровой цикл
game.start();

