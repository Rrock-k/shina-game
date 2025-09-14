
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
import { indexOfClosest, getIntersectionCoord, getNearestIntersectionIJ, computeBuildingStop, buildIntersectionPath, buildGraphPathToBuilding } from './utils/geometry.js';
import { randInt } from './utils/math.js';

// globals
let app, world, gridLayer, roadsLayer, lotsLayer, zonesLayer, labelsLayer, intersectionsLayer, decorLayer, trafficLightsLayer, borderLayer, uiLayer, lightingLayer, car;
let carPath = [], carSegment = 0, carProgress = 0;
let avatar;
let carTrafficController;
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


// Дебаг-функция для логирования
function debugLog (message, data = null) {
  if (!DEBUG_MODE) return;
  const now = Date.now();
  if (now - debugInfo.lastLogTime > debugInfo.logInterval) {
    console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
    debugInfo.lastLogTime = now;
  }
}

// Дебаг-функция для постоянного логирования
function debugLogAlways (message, data = null) {
  if (!DEBUG_MODE) return;
  console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
}

// Обновление таймера пребывания в здании
let lastStayTimerUpdate = 0;
let lastStayTimerDay = 0;

function updateStayTimer() {
  if (carRenderer && carRenderer.isAtDestination()) {
    // Получаем игровое время из timeManager
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
      
      const newStayTimer = carRenderer.getStayTimer() - timeDiff / 60; // переводим в игровые часы
      carRenderer.setStayTimer(newStayTimer);
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
  // Создаем сущность машины
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
    
    // Устанавливаем начальную позицию из carRenderer
    if (carSprite) {
      carEntity.setPosition({ x: carSprite.position.x, y: carSprite.position.y });
      carEntity.setRotation(carSprite.rotation);
    }
  }

  // Создаем сущность Шины
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
      buildCarPath: buildCarPath,
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

setupApp();

// Инициализируем менеджеры
timeManager = new TimeManager();
pauseManager = new PauseManager();
journalManager = new JournalManager(timeManager);

// Устанавливаем время начала пребывания дома сразу после создания JournalManager
journalManager.setLocationStartTime('Дом');

// Синхронизируем менеджеры
timeManager.setSpeedMultiplier(pauseManager.getSpeedMultiplier());
timeManager.setPaused(pauseManager.isPaused());

// Создаем panningController раньше, чтобы он был доступен в setupWorld
let panningController;

setupWorld();

// Инициализируем dayNightManager после создания PIXI приложения
dayNightManager = new DayNightManager(PIXI, CONFIG);

// Инициализируем UIRenderer
uiRenderer = new UIRenderer(CONFIG, timeManager, pauseManager, dayNightManager, panningController, journalManager);

// Инициализируем UI
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

function setupApp () {
  app = new PIXI.Application({
    width: 1200,
    height: 800,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    backgroundColor: 0x3a6f3e
  });
  // Добавляем canvas в игровую область
  const gameContainer = document.querySelector('.game-container');
  gameContainer.appendChild(app.view);
  // Включаем систему событий для всей сцены
  app.stage.eventMode = 'static';
  app.stage.hitArea = new PIXI.Rectangle(0, 0, 1200, 800);
}

function setupWorld () {
  world = new PIXI.Container();
  app.stage.addChild(world);
  
  gridLayer = new PIXI.Container();
  roadsLayer = new PIXI.Container();
  lotsLayer = new PIXI.Container();
  zonesLayer = new PIXI.Container();
  labelsLayer = new PIXI.Container();
  intersectionsLayer = new PIXI.Container();
  decorLayer = new PIXI.Container();
  trafficLightsLayer = new PIXI.Container(); // слой для светофоров (поверх машин)
  borderLayer = new PIXI.Container();
  lightingLayer = new PIXI.Container(); // слой для всех источников света (поверх ночного оверлея)

  // Делаем world и слои глобально доступными для dayNightManager
  window.world = world;
  window.decorLayer = decorLayer;
  window.trafficLightsLayer = trafficLightsLayer;

  // Инициализируем WorldRenderer
  worldRenderer = new WorldRenderer(CONFIG, app);
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

  // Создаем и добавляем городской ночной оверлей (ПЕРЕД машиной)
  // Пропускаем создание оверлея здесь, так как dayNightManager еще не инициализирован
  // Оверлей будет создан позже в updateNightMode

  // Добавляем decorLayer (машина) - будет добавлен поверх оверлея
  world.addChild(decorLayer);

  // Добавляем светофоры - будут добавлены поверх оверлея
  world.addChild(trafficLightsLayer);

  uiLayer = new PIXI.Container();

  // Добавляем слой освещения ПЕРЕД UI (но после ночного оверлея)
  lightingLayer.zIndex = 1000; // поверх ночного оверлея
  app.stage.addChild(lightingLayer);

  uiLayer.zIndex = 2000; // поверх всего
  app.stage.addChild(uiLayer);

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

  // Инициализируем кнопку
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


  // Инициализируем panningController
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
    if (carRenderer) {
      const newPath = buildCarPath();
      carRenderer.setPath(newPath);
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

      // Проверяем, должен ли быть светофор на этом перекрестке
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
        app,
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

  // Устанавливаем точку начала зеленой волны в левом верхнем углу
  if (verticalRoadXs.length > 0 && horizontalRoadYs.length > 0) {
    trafficCoordinator.setWaveOrigin(verticalRoadXs[0], horizontalRoadYs[0]);
  }
}

// Функция drawDashedPath перенесена в WorldRenderer



function layout () {
  const w = 1200;
  const h = 800;
  const scale = Math.min(w / CONFIG.WORLD_WIDTH, h / CONFIG.WORLD_HEIGHT);

  // Только устанавливаем базовый масштаб, если panningController не активен
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
  
  // Инициализируем новые сущности
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
function buildCarPath () {
  const currentDestination = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  if (!currentDestination) return [];

  const verticalRoadXs = getVerticalRoadXs();
  const horizontalRoadYs = getHorizontalRoadYs();

  // Определяем стартовый перекрёсток
  let startIJ;
  if (carRenderer && carRenderer.getCar() && currentRouteIndex !== 0) {
    // Если машина уже существует И это не первый запуск (не дом), начинаем с её текущей позиции
    const carPos = carRenderer.getCar().position;
    startIJ = getNearestIntersectionIJ(carPos.x, carPos.y, verticalRoadXs, horizontalRoadYs);
  } else {
    // Иначе начинаем с дома (первый запуск или нет машины)
    const housePos = getDestinationCenter('house');
    startIJ = getNearestIntersectionIJ(housePos.x, housePos.y, verticalRoadXs, horizontalRoadYs);
  }

  const destCenter = getDestinationCenter(currentDestination.location);
  const graphPath = buildGraphPathToBuilding(startIJ, destCenter, verticalRoadXs, horizontalRoadYs);

  // Строим путь в зависимости от текущего состояния машины
  const startIntersection = getIntersectionCoord(startIJ.i, startIJ.j, verticalRoadXs, horizontalRoadYs);
  let path;
  
  if (carRenderer && carRenderer.getCar() && currentRouteIndex !== 0) {
    // Если машина уже существует И это не первый запуск, проверяем, нужно ли добавить префикс
    const carPos = carRenderer.getCar().position;
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
  const needsPrefix = currentDestination.location !== 'house' && carRenderer && (Math.abs(carRenderer.getCar().position.x - startIntersection.x) > 1 || Math.abs(carRenderer.getCar().position.y - startIntersection.y) > 1);
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

      path.splice(1, 0, intermediatePoint);
      debugLogAlways(`🔄 Добавлена промежуточная точка для плавного старта: угол разности ${(angleDifference * 180 / Math.PI).toFixed(1)}°, длина сегмента ${currentLength.toFixed(1)}, расстояние ${intermediateDistance.toFixed(1)}`);
    }
  }

  console.log(`🗺️ Graph path to ${currentDestination.name}:`, path.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(' -> '));
  console.log(`🚗 Car will start from segment 0: (${path[0]?.x?.toFixed(0) || 'N/A'},${path[0]?.y?.toFixed(0) || 'N/A'}) to (${path[1]?.x?.toFixed(0) || 'N/A'},${path[1]?.y?.toFixed(0) || 'N/A'})`);

  // Дополнительная отладочная информация о сохраненном состоянии
  if (savedCarState) {
    console.log(`💾 Используется сохраненное состояние:`, {
      hasNextIntersection: !!savedCarState.nextIntersection,
      nextIntersection: savedCarState.nextIntersection,
      direction: savedCarState.direction,
      directionDegrees: (savedCarState.direction * 180 / Math.PI).toFixed(1),
      nextDestination: savedCarState.nextDestination?.name,
      currentPosition: savedCarState.currentPosition
    });
  }

  return path;
}

function createCar () {
  // Создаем CarRenderer
  carRenderer = new CarRenderer(CONFIG, pauseManager);
  
  // Создаем машину с помощью CarRenderer (без пути пока)
  car = carRenderer.createCar({
    carPath: [],
    currentRouteIndex: currentRouteIndex,
    savedCarState: savedCarState,
    getDestinationCenter: getDestinationCenter
  });
  
  // Получаем аватарку из CarRenderer
  avatar = carRenderer.getAvatar();
  
  // Инициализируем контроллер светофоров
  carTrafficController = new CarTrafficController();

  // Начинаем с дома
  currentRouteIndex = 0; // дом
  stayTimer = CONFIG.ROUTE_SCHEDULE[0].stayHours; // устанавливаем таймер для дома
  
  // Обновляем индекс маршрута в UIRenderer
  if (uiRenderer) {
    uiRenderer.setCurrentRouteIndex(currentRouteIndex);
  }

  // Не начинаем поездку сразу - она начнется при выходе из здания

  // Теперь строим путь и устанавливаем его
  carPath = buildCarPath();
  carRenderer.setPath(carPath);
  
  // Если carEntity уже создан, обновляем его путь
  if (carEntity) {
    carEntity.setPath(carPath);
    // Устанавливаем, что машина уже в пункте назначения (дома)
    carEntity.setAtDestination(true);
    carEntity.setStayTimer(CONFIG.ROUTE_SCHEDULE[0].stayHours);
  }
  
  // Устанавливаем, что машина уже в пункте назначения (дома)
  carRenderer.setAtDestination(true);
  carRenderer.setStayTimer(CONFIG.ROUTE_SCHEDULE[0].stayHours);
  
  // Инициализируем таймер пребывания
  const gameTime = timeManager.getGameTime();
  lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes;
  lastStayTimerDay = gameTime.day;

  decorLayer.addChild(car);
  app.ticker.add(updateCar);
  app.ticker.add(() => {
    timeManager.update();
    if (uiRenderer) {
      uiRenderer.updateDateTimeDisplay();
    }
    const gameTime = timeManager.getGameTime();
    dayNightManager.updateNightMode(gameTime);
    updateStayTimer();
    
    // Обновляем UI с текущим состоянием машины
    if (uiRenderer) {
      uiRenderer.updateRouteDisplay(carRenderer ? carRenderer.isAtDestination() : false);
      // Обновляем весь UI (включая журнал)
      uiRenderer.update();
    }
  });

  uiRenderer.updateRouteDisplay(carRenderer ? carRenderer.isAtDestination() : false);
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
  if (carRenderer && carRenderer.isAtDestination()) {
    // Получаем время из TimeManager для расчета таймера
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
  
  if (carRenderer) {
    carRenderer.setAtDestination(false);
    carRenderer.setStayTimer(0);

    // Восстанавливаем сохраненное состояние машины
    if (savedCarState) {
      carRenderer.setRotation(savedCarState.direction);

      if (savedCarState.nextIntersection) {
        console.log(`🔄 Восстановлено направление к перекрестку: ${savedCarState.direction.toFixed(3)} радиан (${(savedCarState.direction * 180 / Math.PI).toFixed(1)}°) к перекрестку (${savedCarState.nextIntersection.x}, ${savedCarState.nextIntersection.y})`);
      } else {
        console.log(`🔄 Восстановлено направление к пункту назначения: ${savedCarState.direction.toFixed(3)} радиан (${(savedCarState.direction * 180 / Math.PI).toFixed(1)}°) к ${savedCarState.nextDestination.name} (${savedCarState.nextDestCenter.x}, ${savedCarState.nextDestCenter.y})`);
      }

      // Очищаем сохраненное состояние после использования
      savedCarState = null;
    }

    // Обновляем путь к новому пункту назначения
    const newPath = buildCarPath();
    carRenderer.setPath(newPath);
    
    // Синхронизируем с carEntity
    if (carEntity) {
      carEntity.setCurrentRouteIndex(currentRouteIndex);
      carEntity.setPath(newPath);
      carEntity.setAtDestination(false);
      carEntity.setStayTimer(0);
    }
  }

  // Начинаем новую дорогу в журнале при выходе из здания
  const newDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
  if (journalManager && newDest) {
    journalManager.startTrip(newDest.name, newDest.location);
  }

  uiRenderer.updateRouteDisplay(carRenderer ? carRenderer.isAtDestination() : false);
}

// Сохраняем состояние машины для плавного продолжения движения к следующему пункту
function saveCarStateForNextDestination () {
  // Определяем следующий пункт назначения
  const nextRouteIndex = (currentRouteIndex + 1) % CONFIG.ROUTE_SCHEDULE.length;
  const nextDestination = CONFIG.ROUTE_SCHEDULE[nextRouteIndex];

  if (!nextDestination) return null;

  // Получаем центр следующего пункта назначения
  const nextDestCenter = getDestinationCenter(nextDestination.location);

  // Строим путь к следующему пункту назначения, чтобы найти первый перекресток
  const currentPos = carRenderer ? carRenderer.getCar().position : { x: 0, y: 0 };
  const verticalRoadXs = getVerticalRoadXs();
  const horizontalRoadYs = getHorizontalRoadYs();
  const currentIJ = getNearestIntersectionIJ(currentPos.x, currentPos.y, verticalRoadXs, horizontalRoadYs);
  const nextPath = buildGraphPathToBuilding(currentIJ, nextDestCenter, verticalRoadXs, horizontalRoadYs);

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
  if (carRenderer && !carRenderer.isAtDestination()) {
    debugLogAlways(`🏠 Прибытие в ${currentDest.name} (обочина)`);

    // Завершаем дорогу в журнале при входе в здание
    if (journalManager && currentDest) {
      journalManager.endTrip(currentDest.name);
      // Устанавливаем время начала пребывания в месте
      journalManager.setLocationStartTime(currentDest.name);
    }

    // Сохраняем состояние машины для плавного продолжения движения
    savedCarState = saveCarStateForNextDestination();
    debugLogAlways(`💾 Сохранено состояние машины:`, savedCarState);

    carRenderer.setAtDestination(true);
    carRenderer.setStayTimer(currentDest.stayHours);
    
    // Синхронизируем с carEntity
    if (carEntity) {
      carEntity.setAtDestination(true);
      carEntity.setStayTimer(currentDest.stayHours);
    }
    
    // Получаем текущее игровое время
    const gameTime = timeManager.getGameTime();
    lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes; // инициализируем таймер
    lastStayTimerDay = gameTime.day; // инициализируем день
    uiRenderer.updateRouteDisplay(carRenderer ? carRenderer.isAtDestination() : false);
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

  // Создаем аватарку в здании (такого же размера как в машинке)
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
    // Синхронизируем позицию и поворот
    const carSprite = carRenderer.getCar();
    if (carSprite) {
      carSprite.position.set(carEntity.getPosition().x, carEntity.getPosition().y);
      carSprite.rotation = carEntity.getRotation();
    }
    
    // Синхронизируем аватарку
    const avatar = carRenderer.getAvatar();
    if (avatar) {
      avatar.rotation = -carEntity.getRotation();
    }
    
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

