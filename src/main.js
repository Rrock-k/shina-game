
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
import { Shina } from './entities/Shina.js';
// Утилиты
import { PathBuilder } from './systems/PathBuilder.js';
import { randInt } from './utils/math.js';
// Главный класс игры
import Game from './game/Game.js';

// globals
let world, gridLayer, roadsLayer, lotsLayer, zonesLayer, labelsLayer, intersectionsLayer, decorLayer, trafficLightsLayer, borderLayer, uiLayer, lightingLayer, car;
let carPath = [], carSegment = 0, carProgress = 0;
let avatar;
let carTrafficController;
let pathBuilder;
let buildingAvatars = new Map(); // карта зданий -> маленькие аватарки

// Менеджеры
let timeManager, pauseManager, dayNightManager, journalManager, worldRenderer, carRenderer, uiRenderer;

// Новые сущности
let carEntity, shinaEntity;

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

// Обновление таймера пребывания в здании
let lastStayTimerUpdate = 0;
let lastStayTimerDay = 0;

function updateStayTimer() {
  if (carEntity && carEntity.isAtDestination()) {
    const gameTime = timeManager.getGameTime();
    const currentTime = gameTime.hours * 60 + gameTime.minutes; // время в минутах
    const currentDay = gameTime.day; // день месяца
    
    // Обновляем таймер только при изменении времени
    if (currentTime !== lastStayTimerUpdate || currentDay !== lastStayTimerDay) {
      let timeDiff;
      
      // Если день изменился, это переход через полночь
      if (currentDay !== lastStayTimerDay) {
        // Время с последнего обновления до полуночи + время с полуночи до текущего момента
        timeDiff = (24 * 60 - lastStayTimerUpdate) + currentTime;
        console.log(`🌙 Переход через полночь: ${timeDiff} минут`);
      } else {
        timeDiff = currentTime - lastStayTimerUpdate;
      }
      
      const newStayTimer = carEntity.getStayTimer() - timeDiff / 60; // переводим в игровые часы
      carEntity.setStayTimer(newStayTimer);
      lastStayTimerUpdate = currentTime;
      lastStayTimerDay = currentDay;
      
      if (newStayTimer <= 0) {
        // Время пребывания закончилось, едем к следующему пункту
        console.log('🚗 Время пребывания закончилось, продолжаем движение');
        nextDestination();
      }
    }
  }
}

// Инициализация новых сущностей
function initEntities() {
  carEntity = new Car(CONFIG, pauseManager);
  
  // Делаем carEntity глобально доступным для UI
  window.carEntity = carEntity;
  carEntity.init({
    currentRouteIndex: currentRouteIndex,
    savedState: savedCarState,
    onArrival: (destination) => {
      console.log(`🚗 Машина прибыла в ${destination.name}`);
      checkArrival();
    },
    onStateChange: (event, data) => {
      console.log(`🚗 Машина: ${event}`, data);
    }
  });

  // Связываем carEntity с carRenderer
  if (carRenderer) {
    const carSprite = carRenderer.getCar();
    const avatar = carRenderer.getAvatar();
    
    if (carSprite) {
      carEntity.setSprite(carSprite);
    }
    if (avatar) {
      carEntity.setAvatar(avatar);
    }
    
    if (carSprite) {
      carEntity.setPosition({ x: carSprite.position.x, y: carSprite.position.y });
      carEntity.setRotation(carSprite.rotation);
    }
  }

  shinaEntity = new Shina(CONFIG);
  shinaEntity.init({
    position: { x: 0, y: 0 },
    initialState: 'atWork', // Шина дома в начале игры
    onStateChange: (oldState, newState, shina) => {
      console.log(`👤 Шина изменила состояние: ${oldState} → ${newState}`);
    },
    onAvailabilityChange: (isAvailable, shina) => {
      console.log(`👤 Шина ${isAvailable ? 'доступна' : 'недоступна'}`);
    },
    onMessageReceived: (message, shina) => {
      console.log(`💬 Шина получила сообщение:`, message);
    }
  });

}


// Обновление сущностей
function updateEntities(delta) {
  // Обновляем машину
  if (carEntity) {
    carEntity.update(delta, {
      checkArrival: checkArrival,
      debugLog: debugLog,
      debugLogAlways: debugLogAlways,
      carTrafficController: carTrafficController,
      intersectionKeyToTL: intersectionKeyToTL,
      getVerticalRoadXs: getVerticalRoadXs,
      getHorizontalRoadYs: getHorizontalRoadYs,
      buildCarPath: () => pathBuilder.buildCarPath(carEntity, currentRouteIndex, savedCarState, getDestinationCenter, debugLogAlways),
      updateLightBeams: undefined,
      debugInfo: debugInfo
    });
  }

  // Обновляем Шину
  if (shinaEntity) {
    shinaEntity.update({
      timeManager: timeManager,
      debugLog: debugLog
    });
  }

  intersectionKeyToTL.forEach((trafficLight, key) => {
  });
}

// Геометрия зон, вычисленная при отрисовке
const zoneGeometry = new Map(); // key -> { center:{x,y}, bounds:{x,y,w,h} | {x,y,r}, type }

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

timeManager = new TimeManager();
pauseManager = new PauseManager();
journalManager = new JournalManager(timeManager);

journalManager.setLocationStartTime('Дом');

// Синхронизируем менеджеры
timeManager.setSpeedMultiplier(pauseManager.getSpeedMultiplier());
timeManager.setPaused(pauseManager.isPaused());

let panningController;

setupWorld();

dayNightManager = new DayNightManager(PIXI, CONFIG);

uiRenderer = new UIRenderer(CONFIG, timeManager, pauseManager, dayNightManager, panningController, journalManager);

uiRenderer.init();

// Обновляем текст режима дня/ночи и паузы в меню после инициализации
setTimeout(() => {
  dayNightManager.updateDayNightModeText();
  pauseManager.updatePauseModeText();
}, 100);

createCar();
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
  // Получаем слои из экземпляра игры
  world = game.world;
  gridLayer = game.gridLayer;
  roadsLayer = game.roadsLayer;
  lotsLayer = game.lotsLayer;
  zonesLayer = game.zonesLayer;
  labelsLayer = game.labelsLayer;
  intersectionsLayer = game.intersectionsLayer;
  decorLayer = game.decorLayer;
  trafficLightsLayer = game.trafficLightsLayer;
  borderLayer = game.borderLayer;
  lightingLayer = game.lightingLayer;
  uiLayer = game.uiLayer;

  worldRenderer = new WorldRenderer(CONFIG, game.app);
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
  worldRenderer.render(zoneGeometry);
  // Светофоры создаются в отдельном слое (пока что в trafficLightsLayer)
  createTrafficLightsForAllIntersections(trafficLightsLayer);

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
    timeManager.setPaused(pauseManager.isPaused());
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
    timeManager.setSpeedMultiplier(newSpeed);

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
  panningController.setWorld(world);
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
    if (carEntity) {
      const newPath = pathBuilder.buildCarPath(carEntity, currentRouteIndex, savedCarState, getDestinationCenter, debugLogAlways);
      carEntity.setPath(newPath);
    }
  }, 0);
}


// Функции-обертки для получения позиций дорог из WorldRenderer
function getHorizontalRoadYs() {
  return worldRenderer ? worldRenderer.getHorizontalRoadYs() : [];
}

function getVerticalRoadXs() {
  return worldRenderer ? worldRenderer.getVerticalRoadXs() : [];
}


function createTrafficLightsForAllIntersections (layer) {
  intersectionKeyToTL.clear();
  const { maxVerticalPos } = worldRenderer ? worldRenderer.getRoadPositions() : { maxVerticalPos: 0 };
  const horizontalRoadYs = getHorizontalRoadYs();
  const verticalRoadXs = getVerticalRoadXs();

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
    world.scale.set(scale);
    world.pivot.set(0, 0);
    world.position.set(
      (w - CONFIG.WORLD_WIDTH * scale) / 2,
      (h - CONFIG.WORLD_HEIGHT * scale) / 2
    );
  }

  labelsLayer.children.forEach(label => {
    label.scale.set(1 / scale);
  });

  // Светофоры теперь внутри world, поэтому синхронизация не нужна
  
  initEntities();
}

// ======= Новая логика движения по графу перекрёстков и зданий =======
// Вспомогательные функции индексации и координат перекрёстков




function getDestinationCenter (locationKey) {
  const z = zoneGeometry.get(locationKey);
  if (z && z.center) return z.center;
  // fallback: из статического конфига
  const def = CONFIG.ZONES[locationKey];
  const verticalRoadXs = getVerticalRoadXs();
  const horizontalRoadYs = getHorizontalRoadYs();
  if (!def) return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
  if (def.type === 'rect') return { x: def.x + def.w / 2, y: def.y + def.h / 2 };
  if (def.type === 'circle') return { x: def.x, y: def.y };
  return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
}

// Построить полный маршрут с учётом ограничений: только I->I и I->B/B->I

function createCar () {
  carRenderer = new CarRenderer(CONFIG, pauseManager);
  
  car = carRenderer.createCar({
    carPath: [],
    currentRouteIndex: currentRouteIndex,
    savedCarState: savedCarState,
    getDestinationCenter: getDestinationCenter
  });
  
  avatar = carRenderer.getAvatar();
  
  carTrafficController = new CarTrafficController();

  const verticalRoadXs = getVerticalRoadXs();
  const horizontalRoadYs = getHorizontalRoadYs();
  console.log('🔧 Инициализация PathBuilder:', {
    verticalRoads: verticalRoadXs.length,
    horizontalRoads: horizontalRoadYs.length,
    verticalRoadXs: verticalRoadXs.slice(0, 5), // первые 5 для примера
    horizontalRoadYs: horizontalRoadYs.slice(0, 5) // первые 5 для примера
  });
  pathBuilder = new PathBuilder(verticalRoadXs, horizontalRoadYs, CONFIG);

  // Начинаем с дома
  currentRouteIndex = 0; // дом
  stayTimer = CONFIG.ROUTE_SCHEDULE[0].stayHours; // устанавливаем таймер для дома
  
  // Обновляем индекс маршрута в UIRenderer
  if (uiRenderer) {
    uiRenderer.setCurrentRouteIndex(currentRouteIndex);
  }

  // Не начинаем поездку сразу - она начнется при выходе из здания

  carPath = pathBuilder.buildCarPath(carEntity, currentRouteIndex, savedCarState, getDestinationCenter, debugLogAlways);
  
  // Если carEntity уже создан, обновляем его путь
  if (carEntity) {
    carEntity.setPath(carPath);
    carEntity.setAtDestination(true);
    carEntity.setStayTimer(CONFIG.ROUTE_SCHEDULE[0].stayHours);
  }
  
  const gameTime = timeManager.getGameTime();
  lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes;
  lastStayTimerDay = gameTime.day;

  decorLayer.addChild(car);
  game.app.ticker.add(updateCar);
  game.app.ticker.add(() => {
    timeManager.update();
    if (uiRenderer) {
      uiRenderer.updateDateTimeDisplay();
    }
    const gameTime = timeManager.getGameTime();
    dayNightManager.updateNightMode(gameTime);
    updateStayTimer();
    
    // Обновляем UI с текущим состоянием машины
    if (uiRenderer) {
      uiRenderer.updateRouteDisplay(carEntity ? carEntity.isAtDestination() : false);
      // Обновляем весь UI (включая журнал)
      uiRenderer.update();
    }
  });

  uiRenderer.updateRouteDisplay(carEntity ? carEntity.isAtDestination() : false);
}

function updateGameTime () {
  // Обновляем время через TimeManager
  timeManager.setPaused(pauseManager.isPaused());
  timeManager.setSpeedMultiplier(pauseManager.getSpeedMultiplier());
  timeManager.update();

  // Обновляем дисплей даты и времени
  updateDateTimeDisplay();

  // Обновляем ночной режим
  const gameTime = timeManager.getGameTime();
  dayNightManager.updateNightMode(gameTime);

  // Применяем или сбрасываем цветовые фильтры
  if (dayNightManager.isNightModeActive()) {
    dayNightManager.applyNightColorFilter();
  } else {
    dayNightManager.resetDayColorFilter();
  }

  // Если находимся в пункте назначения, уменьшаем таймер ожидания
  if (carEntity && carEntity.isAtDestination()) {
    const gameTime = timeManager.getGameTime();
    const currentTime = gameTime.hours * 60 + gameTime.minutes;
    const currentDay = gameTime.day;
    
    // Обновляем таймер пребывания
    updateStayTimer();
  }
}

// Переход к следующему пункту маршрута
function nextDestination () {
  debugLogAlways(`🔄 Переход к следующему пункту назначения`);

  // Завершаем пребывание в текущем месте
  const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  if (journalManager && currentDest) {
    journalManager.endLocationStay(currentDest.name);
  }

  // Скрываем аватарку в текущем здании
  hideBuildingAvatar();

  currentRouteIndex = (currentRouteIndex + 1) % CONFIG.ROUTE_SCHEDULE.length;
  
  // Обновляем индекс маршрута в UIRenderer
  if (uiRenderer) {
    uiRenderer.setCurrentRouteIndex(currentRouteIndex);
  }
  
  // Синхронизируем с carEntity
  if (carEntity) {
    carEntity.setCurrentRouteIndex(currentRouteIndex);
    carEntity.setAtDestination(false);
    carEntity.setStayTimer(0);
    
    // Обновляем путь к новому пункту назначения
    const newPath = pathBuilder.buildCarPath(carEntity, currentRouteIndex, savedCarState, getDestinationCenter, debugLogAlways);
    carEntity.setPath(newPath);
  }

  // Начинаем новую дорогу в журнале при выходе из здания
  const newDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  if (journalManager && newDest) {
    journalManager.startTrip(newDest.name, newDest.location);
  }

  uiRenderer.updateRouteDisplay(carEntity ? carEntity.isAtDestination() : false);
}

// Сохраняем состояние машины для плавного продолжения движения к следующему пункту
function saveCarStateForNextDestination () {
  // Определяем следующий пункт назначения
  const nextRouteIndex = (currentRouteIndex + 1) % CONFIG.ROUTE_SCHEDULE.length;
  const nextDestination = CONFIG.ROUTE_SCHEDULE[nextRouteIndex];

  if (!nextDestination) return null;

  const nextDestCenter = getDestinationCenter(nextDestination.location);

  // Строим путь к следующему пункту назначения, чтобы найти первый перекресток
  const currentPos = carRenderer ? carRenderer.getCar().position : { x: 0, y: 0 };
  const currentIJ = pathBuilder.getNearestIntersectionIJ(currentPos.x, currentPos.y);
  const nextPath = pathBuilder.buildPathToBuilding(currentIJ, nextDestCenter);

  // Находим первый перекресток в пути (не точку остановки у здания)
  let nextIntersection = null;
  if (nextPath.length >= 2) {
    // Берем предпоследнюю точку (последняя - это остановка у здания)
    nextIntersection = nextPath[nextPath.length - 2];
  } else if (nextPath.length === 1) {
    // Если путь состоит только из одной точки, используем ее
    nextIntersection = nextPath[0];
  }

  // Если не нашли перекресток, используем направление к центру назначения как fallback
  let direction;
  if (nextIntersection) {
    const dx = nextIntersection.x - currentPos.x;
    const dy = nextIntersection.y - currentPos.y;
    direction = Math.atan2(dy, dx);
    debugLogAlways(`🎯 Следующий перекресток: (${nextIntersection.x}, ${nextIntersection.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
  } else {
    const dx = nextDestCenter.x - currentPos.x;
    const dy = nextDestCenter.y - currentPos.y;
    direction = Math.atan2(dy, dx);
    debugLogAlways(`🎯 Fallback к центру назначения: (${nextDestCenter.x}, ${nextDestCenter.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
  }

  return {
    nextDestination: nextDestination,
    nextDestCenter: nextDestCenter,
    nextIntersection: nextIntersection,
    direction: direction,
    currentPosition: { x: car.position.x, y: car.position.y }
  };
}

// Фиксируем прибытие: вызывается только при достижении последней точки пути (обочины)
function checkArrival () {
  const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  if (carEntity && !carEntity.isAtDestination()) {
    debugLogAlways(`🏠 Прибытие в ${currentDest.name} (обочина)`);

    // Завершаем дорогу в журнале при входе в здание
    if (journalManager && currentDest) {
      journalManager.endTrip(currentDest.name);
      journalManager.setLocationStartTime(currentDest.name);
    }

    // Сохраняем состояние машины для плавного продолжения движения
    savedCarState = saveCarStateForNextDestination();
    debugLogAlways(`💾 Сохранено состояние машины:`, savedCarState);

    // Синхронизируем с carEntity
    if (carEntity) {
      carEntity.setAtDestination(true);
      carEntity.setStayTimer(currentDest.stayHours);
    }
    
    const gameTime = timeManager.getGameTime();
    lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes; // инициализируем таймер
    lastStayTimerDay = gameTime.day; // инициализируем день
    uiRenderer.updateRouteDisplay(carEntity ? carEntity.isAtDestination() : false);
    // Показываем маленькую аватарку в здании
    showBuildingAvatar(currentDest.location);
  }
}

// Показать маленькую аватарку в здании
function showBuildingAvatar (locationKey) {
  const buildingCenter = getDestinationCenter(locationKey);
  if (!buildingCenter) return;

  // Скрываем аватарку из машинки
  if (carRenderer) {
    carRenderer.setAvatarVisible(false);
  }

  const avatarContainer = new PIXI.Container();

  // Квадратный фон (исходный размер без скругления)
  const background = new PIXI.Graphics();
  background.beginFill(0xffffff, 0.9);
  background.lineStyle(2, 0x333333);
  background.drawRect(-30, -30, 60, 60);
  background.endFill();
  avatarContainer.addChild(background);

  // Аватарка Шины (исходный размер без скругления)
  const buildingAvatar = PIXI.Sprite.from('/public/shina.jpeg');
  buildingAvatar.anchor.set(0.5);
  buildingAvatar.width = 60;
  buildingAvatar.height = 60;
  avatarContainer.addChild(buildingAvatar);

  // Позиционируем в правом нижнем углу здания
  const zone = zoneGeometry.get(locationKey);
  if (zone && zone.bounds) {
    if (zone.type === 'circle') {
      // Для круглых зон (институт) - позиционируем справа от центра
      avatarContainer.position.set(
        zone.bounds.x + zone.bounds.r - 30,
        zone.bounds.y + zone.bounds.r - 30
      );
    } else {
      // Для прямоугольных зон
      avatarContainer.position.set(
        zone.bounds.x + zone.bounds.w - 30,
        zone.bounds.y + zone.bounds.h - 30
      );
    }
  } else {
    // Fallback: используем центр здания
    avatarContainer.position.set(
      buildingCenter.x + 150,
      buildingCenter.y + 150
    );
  }

  decorLayer.addChild(avatarContainer);
  buildingAvatars.set(locationKey, avatarContainer);

  console.log(`🏠 Показана аватарка в здании ${locationKey}`, {
    zone: zone,
    buildingCenter: buildingCenter,
    position: avatarContainer.position
  });
}

// Скрыть аватарку в здании
function hideBuildingAvatar () {
  const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  const avatarContainer = buildingAvatars.get(currentDest.location);
  if (avatarContainer && avatarContainer.parent) {
    avatarContainer.parent.removeChild(avatarContainer);
    buildingAvatars.delete(currentDest.location);
    console.log(`🏠 Скрыта аватарка в здании ${currentDest.location}`);
  }

  // Показываем аватарку обратно в машинке
  if (carRenderer) {
    carRenderer.setAvatarVisible(true);
  }
}

function updateCar (delta) {
  // Обновляем новые сущности
  updateEntities(delta);
  
  // Синхронизируем carEntity с carRenderer для визуального представления
  if (carEntity && carRenderer) {
    // Обновляем визуальное представление
    carRenderer.updateVisuals(carEntity);
    
    // Синхронизируем глобальные переменные с carEntity
    carPath = carEntity.getPath();
    carSegment = carEntity.getCurrentSegment();
    carProgress = carEntity.getProgress();
    stayTimer = carEntity.getStayTimer();
  }
  
  // Обновляем UI
  if (uiRenderer) {
    uiRenderer.updateRouteDisplay(carEntity ? carEntity.isAtDestination() : false);
  }
}


// Настраиваем игровую область для панорамирования
const gameContainer = document.querySelector('.game-container');
gameContainer.style.width = '1200px';
gameContainer.style.height = '800px';
gameContainer.style.overflow = 'auto';

