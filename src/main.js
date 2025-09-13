
import { initTrafficLightsForIntersection, getDirectionForSegment, Direction, TrafficLightCoordinator } from './systems/trafficLights.js';
import { CarTrafficController } from './systems/carTrafficControl.js';
import { PanningController } from './systems/panning.js';
import { CONFIG, BASE_CAR_SPEED } from './config/gameConfig.js';
import { TimeManager } from './game/TimeManager.js';
import { PauseManager } from './game/PauseManager.js';
import { DayNightManager } from './game/DayNightManager.js';
import { WorldRenderer } from './rendering/WorldRenderer.js';

// globals
let app, world, gridLayer, roadsLayer, lotsLayer, zonesLayer, labelsLayer, intersectionsLayer, decorLayer, trafficLightsLayer, borderLayer, uiLayer, lightingLayer, car;
let carPath = [], carSegment = 0, carProgress = 0;
let avatar;
let horizontalRoadYs = [], verticalRoadXs = [];
let hoverLabel;
let carTrafficController;
let buildingAvatars = new Map(); // карта зданий -> маленькие аватарки

// Менеджеры
let timeManager, pauseManager, dayNightManager, worldRenderer;

// ДЕБАГ МОД
let DEBUG_MODE = true; // теперь можно изменять
let debugInfo = {
  frameCount: 0,
  lastLogTime: 0,
  logInterval: 1000 // логировать каждую секунду
};

// УПРАВЛЕНИЕ СКОРОСТЬЮ И ПАУЗОЙ (перенесено в PauseManager)


// УПРАВЛЕНИЕ РЕЖИМАМИ ДНЯ/НОЧИ (перенесено в DayNightManager)

// Функции для работы с localStorage (перенесены в PauseManager)

// loadDayNightSettings перенесена в DayNightManager

// Функции для управления паузой (перенесены в PauseManager)

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

// Функции для работы с датами
// getMonthName перенесена в TimeManager

// Функции для ночного режима (перенесены в DayNightManager)
// isNightTime, createCityNightOverlay, updateNightMode

// Обновление таймера пребывания в здании
let lastStayTimerUpdate = 0;
let lastStayTimerDay = 0;

function updateStayTimer() {
  if (!isAtDestination) return;
  
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
    
    stayTimer -= timeDiff / 60; // переводим в игровые часы
    lastStayTimerUpdate = currentTime;
    lastStayTimerDay = currentDay;
    
    if (stayTimer <= 0) {
      // Время пребывания закончилось, едем к следующему пункту
      console.log('🚗 Время пребывания закончилось, продолжаем движение');
      nextDestination();
    }
  }
}



// Функция для переключения режимов дня/ночи
// Функции переключения режимов дня/ночи (перенесены в DayNightManager)
// toggleDayNightMode, updateDayNightModeText

// Функции работы с источниками света (перенесены в DayNightManager)
// addLightSource, removeLightSource



// Функции цветовых фильтров (перенесены в DayNightManager)
// applyNightColorFilter, resetDayColorFilter

// Функции работы с датами перенесены в TimeManager
// getDayOfWeekShort, getDayOfWeek, getDaysInMonth, formatGameDateTime


// Показать уведомление о скорости
// showSpeedNotification перенесена в PauseManager

// Геометрия зон, вычисленная при отрисовке
const zoneGeometry = new Map(); // key -> { center:{x,y}, bounds:{x,y,w,h} | {x,y,r}, type }

// Система маршрутов и времени (перенесено в TimeManager)
let datetimeDisplay;
let routeDisplay;
let currentRouteIndex = 0;
let stayTimer = 0; // таймер пребывания в текущем месте
let isAtDestination = false; // находится ли машина в пункте назначения
let savedCarState = null; // сохраненное состояние машины при входе в здание: {nextIntersection: {x,y}, direction: number, currentPosition: {x,y}}

// Система ночного режима (перенесена в DayNightManager)
// isNightMode, cityNightOverlay, nightTransitionSpeed, currentCityNightAlpha
// Хранилище светофоров по ключу перекрёстка
const intersectionKeyToTL = new Map();
// Координатор зеленой волны светофоров
const trafficCoordinator = new TrafficLightCoordinator(45); // скорость машин ~45 км/ч

// 🚦 КОНФИГУРАЦИЯ СВЕТОФОРОВ 🚦
// Массив буквенно-цифровых координат перекрестков, где должны быть светофоры
// Формат: 'A1', 'B2', 'C3' и т.д. (буква = столбец дороги, цифра = ряд дороги)
// Можно легко редактировать этот массив для изменения расположения светофоров!
const TRAFFIC_LIGHTS_CONFIG = [
  'A2', 'A3',        // левый столбец (въезд в город)
  'B2', 'B4',        // второй столбец  
  'C1', 'C3',        // третий столбец
  'D2', 'D4',        // четвертый столбец
  'E1', 'E3',        // пятый столбец
  'F2', 'F4',        // шестой столбец
  'G1', 'G2', 'G3', 'G4' // правый столбец (выезд из города) - все перекрестки
];

// 🚛 МАРШРУТ ШИНЫ 🚛
// Массив с маршрутом: место назначения и время пребывания (в игровых часах)
// Позиции вычисляются динамически из геометрии зон, а НЕ захардкожены
const ROUTE_SCHEDULE = [
  { location: 'house', name: 'Дом', stayHours: 2 },
  { location: 'institute', name: 'Институт', stayHours: 2 },
  { location: 'work', name: 'Работа', stayHours: 5 },
  { location: 'relatives', name: 'Родственники', stayHours: 1.5 },
  { location: 'box', name: 'Бокс', stayHours: 1 },
];

// Определяем мобильное устройство в начале
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Настройки скорости загружаются в PauseManager

// Настройки режима дня/ночи загружаются в DayNightManager

// Обновляем текст режима дня/ночи и паузы в меню после загрузки
setTimeout(() => {
  dayNightManager.updateDayNightModeText();
  pauseManager.updatePauseModeText();
}, 100);

setupApp();

// Инициализируем менеджеры
timeManager = new TimeManager();
pauseManager = new PauseManager();

// Синхронизируем менеджеры
timeManager.setSpeedMultiplier(pauseManager.getSpeedMultiplier());
timeManager.setPaused(pauseManager.isPaused());

// Создаем panningController раньше, чтобы он был доступен в setupWorld
let panningController;

setupWorld();

// Инициализируем dayNightManager после создания PIXI приложения
dayNightManager = new DayNightManager(PIXI, CONFIG);

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
  worldRenderer.render();
  
  drawRoads(roadsLayer);
  createIntersections(intersectionsLayer);
  drawLots(lotsLayer);
  drawZones(zonesLayer);
  // placeLabels(labelsLayer);
  // Светофоры создаются в отдельном слое (пока что в trafficLightsLayer)
  createTrafficLightsForAllIntersections(trafficLightsLayer);

  // Создаем и добавляем городской ночной оверлей (ПЕРЕД машиной)
  // Пропускаем создание оверлея здесь, так как dayNightManager еще не инициализирован
  // Оверлей будет создан позже в updateNightMode

  // Добавляем decorLayer (машина) - будет добавлен поверх оверлея
  world.addChild(decorLayer);

  // Добавляем светофоры - будут добавлены поверх оверлея
  world.addChild(trafficLightsLayer);
  // drawAlina(decorLayer);

  uiLayer = new PIXI.Container();

  // Добавляем слой освещения ПЕРЕД UI (но после ночного оверлея)
  lightingLayer.zIndex = 1000; // поверх ночного оверлея
  app.stage.addChild(lightingLayer);

  uiLayer.zIndex = 2000; // поверх всего
  app.stage.addChild(uiLayer);

  // Получаем ссылки на HTML элементы панели управления
  datetimeDisplay = document.getElementById('game-datetime');
  routeDisplay = document.getElementById('route-info');
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
    const newBoosted = !pauseManager.isSpeedBoostedEnabled();
    pauseManager.setSpeedBoosted(newBoosted);
    pauseManager.setSpeedMultiplier(newBoosted ? 5 : 1);
    timeManager.setSpeedMultiplier(pauseManager.getSpeedMultiplier());

    // Обновляем внешний вид кнопки
    speedButton.textContent = newBoosted ? 'x5' : 'x1';
    speedButton.classList.toggle('boosted', newBoosted);

    // Логируем изменение
    console.log(`⚡ СКОРОСТЬ ИГРЫ: ${newBoosted ? 'x5 УСКОРЕНО' : 'x1 НОРМАЛЬНАЯ'}`);

    // Показываем уведомление
    pauseManager.showSpeedNotification(newBoosted ? 'СКОРОСТЬ x5' : 'СКОРОСТЬ x1');
  });

  // Инициализируем кнопку
  speedButton.textContent = pauseManager.isSpeedBoostedEnabled() ? 'x5' : 'x1';
  speedButton.classList.toggle('boosted', pauseManager.isSpeedBoostedEnabled());

  // Настраиваем кнопку масштабирования
  zoomButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.toggleZoom();
      updateZoomButton();
    }
  });

  // Настраиваем кнопки увеличения/уменьшения масштаба
  zoomInButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.zoomIn();
      updateZoomButton();
    }
  });

  zoomOutButton.addEventListener('click', () => {
    if (typeof panningController !== 'undefined' && panningController) {
      panningController.zoomOut();
      updateZoomButton();
    }
  });

  // Функция обновления кнопки масштабирования
  function updateZoomButton () {
    if (typeof panningController !== 'undefined' && panningController) {
      const isFullscreen = panningController.isFullscreenMode();
      if (isFullscreen) {
        zoomButton.textContent = 'Обычный размер';
        zoomButton.classList.add('boosted');
      } else {
        const scale = panningController.getCurrentScale();
        zoomButton.textContent = `Полный экран`;
        zoomButton.classList.toggle('boosted', scale > 1.1);
      }

      // Обновляем состояние кнопок масштабирования
      if (isMobile) {
        const scale = panningController.getCurrentScale();
        zoomInButton.disabled = scale >= 10;
        zoomOutButton.disabled = scale <= 0.1;
      }
    }
  }

  // Инициализируем panningController
  panningController = new PanningController();
  panningController.setWorld(world);
  panningController.setOnZoomChange((scale) => {
    if (typeof updateZoomButton === 'function') {
      updateZoomButton();
    }
  });
  panningController.setOnFullscreenChange((isFullscreen) => {
    if (typeof updateZoomButton === 'function') {
      updateZoomButton();
    }
  });

  // На мобильных устройствах кнопки масштабирования скрыты

  // Инициализируем меню-бургер
  initMenu();

  // Инициализируем дисплеи
  updateRouteDisplay();
  // Инициализируем дисплей даты и времени
  if (datetimeDisplay) {
    datetimeDisplay.innerHTML = timeManager.formatDateTime();
  }
  // Лёгкая задержка, чтобы зона успела отрисоваться, затем построим первый путь
  setTimeout(() => {
    // перестроим путь, когда геометрия зон уже известна
    if (car) {
      carPath = buildCarPath();
    }
  }, 0);
}

// Инициализация меню-бургера
function initMenu () {
  const burgerButton = document.getElementById('burger-button');
  const menuModal = document.getElementById('menu-modal');
  const modalClose = document.getElementById('modal-close');
  const menuItems = document.querySelectorAll('.menu-item');

  // Функция для обновления состояния панорамирования
  function updatePanningState () {
    const isMenuOpen = menuModal.classList.contains('active');
    if (panningController) {
      panningController.setMenuOpen(isMenuOpen);
    }
  }

  // Открытие/закрытие меню по клику на бургер
  burgerButton.addEventListener('click', () => {
    menuModal.classList.toggle('active');
    burgerButton.classList.toggle('active');
    updatePanningState();
  });

  // Закрытие меню по клику на крестик
  modalClose.addEventListener('click', () => {
    menuModal.classList.remove('active');
    burgerButton.classList.remove('active');
    updatePanningState();
  });

  // Закрытие меню по клику на фон
  menuModal.addEventListener('click', (e) => {
    if (e.target === menuModal) {
      menuModal.classList.remove('active');
      burgerButton.classList.remove('active');
      updatePanningState();
    }
  });

  // Закрытие меню по нажатию Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuModal.classList.contains('active')) {
      menuModal.classList.remove('active');
      burgerButton.classList.remove('active');
      updatePanningState();
    }
  });

  // Обработчики для пунктов меню
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const itemId = item.id;

      // Выполняем действие в зависимости от выбранного пункта
      switch (itemId) {
        case 'menu-pause':
          // Переключаем паузу
          pauseManager.togglePause();
          timeManager.setPaused(pauseManager.isPaused());
          break;
        case 'menu-speed':
          // Переключаем скорость
          speedButton.click();
          showMenuNotification('⚡ Скорость переключена');
          break;
        case 'menu-daynight':
          // Переключаем режим дня/ночи (не закрываем меню)
          dayNightManager.toggleDayNightMode();
          break;
        case 'menu-route':
          showMenuNotification('🗺️ Информация о маршруте', 'Текущий маршрут: ' + ROUTE_SCHEDULE[currentRouteIndex].name);
          // Закрываем меню
          menuModal.classList.remove('active');
          burgerButton.classList.remove('active');
          updatePanningState();
          break;
        case 'menu-settings':
          showMenuNotification('⚙️ Настройки', 'Настройки игры будут добавлены в следующих версиях');
          // Закрываем меню
          menuModal.classList.remove('active');
          burgerButton.classList.remove('active');
          updatePanningState();
          break;
        case 'menu-help':
          showMenuNotification('❓ Помощь', 'Используйте мышь для панорамирования, колесо мыши для масштабирования. На мобильных: касание для панорамирования, два пальца для масштабирования. Режим дня/ночи можно переключать: автоматический, только день, только ночь. Все источники света отображаются поверх ночного режима.');
          // Закрываем меню
          menuModal.classList.remove('active');
          burgerButton.classList.remove('active');
          updatePanningState();
          break;
        case 'menu-about':
          showMenuNotification('ℹ️ О игре', 'Карта Шины - симулятор движения по городу с системой светофоров и маршрутизацией.');
          // Закрываем меню
          menuModal.classList.remove('active');
          burgerButton.classList.remove('active');
          updatePanningState();
          break;
      }
    });
  });
}

// Показать уведомление из меню
function showMenuNotification (title, message = '') {
  const notification = document.createElement('div');
  notification.innerHTML = `<strong>${title}</strong>${message ? '<br>' + message : ''}`;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: bold;
    z-index: 1001;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
    text-align: center;
    max-width: 300px;
    animation: slideDown 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Убираем уведомление через 3 секунды
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideDown 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Обновление дисплея маршрута
function updateRouteDisplay () {
  if (!routeDisplay) return; // защита от вызова до инициализации
  const currentDest = ROUTE_SCHEDULE[currentRouteIndex];
  const prefixSpan = routeDisplay.querySelector('.route-prefix');
  const destinationSpan = routeDisplay.querySelector('.route-destination');

  if (isAtDestination) {
    prefixSpan.textContent = 'В пункте:';
    destinationSpan.textContent = currentDest.name;
  } else {
    prefixSpan.textContent = 'В пути в:';
    destinationSpan.textContent = currentDest.name;
  }
}

function getRoadPositions () {
  const margin = CONFIG.ROAD_MARGIN;
  const horizontalPositions = [];
  const verticalPositions = [];
  const availableHeight = CONFIG.WORLD_HEIGHT - 2 * margin;
  for (let i = 0; i < 4; i++) {
    const y = margin + (availableHeight / (4 - 1)) * i;
    horizontalPositions.push(y);
  }
  const availableWidth = CONFIG.WORLD_WIDTH - 2 * margin;
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

// Функции drawGrid и drawWorldBorder перенесены в WorldRenderer

function randInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateBuildingSlots (maxSlots) {
  const sizes = [];
  const target = randInt(Math.max(3, Math.floor(maxSlots / 2)), maxSlots);
  let used = 0;
  while (used < target) {
    const remaining = target - used;
    const maxTake = Math.min(remaining, CONFIG.LOTS.MAX_MULTI_SLOT);
    const roll = Math.random();
    let take = 1;
    if (maxTake >= 3 && roll < 0.18) take = 3;
    else if (maxTake >= 2 && roll < 0.55) take = 2;
    sizes.push(take);
    used += take;
  }
  return sizes;
}

function drawLots (layer) {
  if (!horizontalRoadYs.length || !verticalRoadXs.length) return;
  const roadHalf = CONFIG.ROAD_WIDTH / 2;
  const cols = 2; // по горизонтали
  const rows = 3; // по вертикали
  const gap = CONFIG.LOTS.GAP;
  const padding = CONFIG.LOTS.PADDING;

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
          g.lineStyle(1, CONFIG.COLORS.lotBorder, 0.9);
          g.beginFill(CONFIG.COLORS.lotFill, CONFIG.LOTS.FILL_ALPHA);
          g.drawRect(rx, ry, lotWidth, lotHeight);
          g.endFill();
          layer.addChild(g);
        }
      }
    }
  }
}

function drawZones (layer) {
  if (!horizontalRoadYs.length || !verticalRoadXs.length) return;
  const roadHalf = CONFIG.ROAD_WIDTH / 2;
  const cols = 2;
  const rows = 3;
  const gap = CONFIG.LOTS.GAP;
  const padding = CONFIG.LOTS.PADDING;

  const zoneLayout = CONFIG.ZONE_LAYOUT;
  const blocksAcross = verticalRoadXs.length - 1;
  const blocksDown = horizontalRoadYs.length - 1;

  function getBlockRect (bi, bj) {
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
  }

  function drawZoneRect (x, y, w, h, color) {
    const g = new PIXI.Graphics();
    g.lineStyle(2, 0x333333, 0.9);
    g.beginFill(color, 1.0);
    g.drawRect(x, y, w, h);
    g.endFill();
    layer.addChild(g);
    return g;
  }

  function drawLabel (textValue, x, y, maxWidth) {
    const label = createWrappedLabel(textValue, CONFIG.BASE_FONT, Math.max(60, maxWidth * 0.9));
    label.position.set(x, y);
    layer.addChild(label);
  }

  function createWrappedLabel (textValue, fontSize, maxWidth) {
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

  function drawZoneFromCells (name, colorKey) {
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
          drawZoneRect(x, y, w, h, CONFIG.COLORS[colorKey]);
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
          drawZoneRect(x, y, w, h, CONFIG.COLORS[colorKey]);
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
      drawLabel(CONFIG.ZONES[name].label, cgx, cgy, maxX - minX);

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
    drawZoneRect(x, y, w, h, CONFIG.COLORS[colorKey]);
    const cx = x + w / 2;
    const cy = y + h / 2;
    drawLabel(CONFIG.ZONES[name].label, cx, cy, w);
    // Сохраняем геометрию зоны
    zoneGeometry.set(name, { type: 'rect', center: { x: cx, y: cy }, bounds: { x, y, w, h } });
  }

  drawZoneFromCells('house', 'house');
  drawZoneFromCells('relatives', 'relatives');
  drawZoneFromCells('work', 'work');
  drawZoneFromCells('box', 'box');
  drawZoneFromCells('institute', 'institute');
  // Для круга сохранить центр и радиус (только если не была установлена Г-образная зона)
  const inst = CONFIG.ZONES.institute;
  if (inst?.type === 'circle' && !zoneGeometry.has('institute')) {
    zoneGeometry.set('institute', { type: 'circle', center: { x: inst.x, y: inst.y }, bounds: { x: inst.x, y: inst.y, r: inst.r } });
  }
}

function drawRoads (layer) {
  const { horizontalPositions, verticalPositions, maxVerticalPos } = getRoadPositions();
  horizontalRoadYs = horizontalPositions;
  verticalRoadXs = verticalPositions;

  // Рисуем горизонтальные дороги
  horizontalRoadYs.forEach(y => {
    const h = [{ x: verticalRoadXs[0], y: y }, { x: maxVerticalPos, y: y }];
    const roadH = new PIXI.Graphics();
    roadH.lineStyle(CONFIG.ROAD_WIDTH, CONFIG.COLORS.road, 1);
    roadH.moveTo(h[0].x, h[0].y);
    roadH.lineTo(h[1].x, h[1].y);
    layer.addChild(roadH);
    const dashH = new PIXI.Graphics();
    dashH.lineStyle(CONFIG.ROAD_LINE_WIDTH, CONFIG.COLORS.roadLine, 1);
    drawDashedPath(dashH, h, CONFIG.DASH_LENGTH, CONFIG.DASH_GAP);
    layer.addChild(dashH);
  });

  // Рисуем вертикальные дороги
  verticalRoadXs.forEach(x => {
    let v;
    if (x === maxVerticalPos) {
      v = [{ x: x, y: 0 }, { x: x, y: CONFIG.WORLD_HEIGHT }];
    } else {
      v = [{ x: x, y: horizontalRoadYs[0] }, { x: x, y: horizontalRoadYs[horizontalRoadYs.length - 1] }];
    }
    const roadV = new PIXI.Graphics();
    roadV.lineStyle(CONFIG.ROAD_WIDTH, CONFIG.COLORS.road, 1);
    roadV.moveTo(v[0].x, v[0].y);
    roadV.lineTo(v[1].x, v[1].y);
    layer.addChild(roadV);
    const dashV = new PIXI.Graphics();
    dashV.lineStyle(CONFIG.ROAD_LINE_WIDTH, CONFIG.COLORS.roadLine, 1);
    drawDashedPath(dashV, v, CONFIG.DASH_LENGTH, CONFIG.DASH_GAP);
    layer.addChild(dashV);
  });
}

function createIntersections (layer) {
  // Подпись при наведении
  if (!hoverLabel) {
    hoverLabel = new PIXI.Text('', {
      fontFamily: 'sans-serif',
      fontSize: CONFIG.BASE_FONT,
      fill: 0xffff66,
      stroke: 0x000000,
      strokeThickness: 4
    });
    hoverLabel.anchor.set(0.5, 1);
    hoverLabel.visible = false;
    labelsLayer.addChild(hoverLabel);
  }

  const hitRadius = 60;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  for (let j = 0; j < horizontalRoadYs.length; j++) {
    for (let i = 0; i < verticalRoadXs.length; i++) {
      const x = verticalRoadXs[i];
      const y = horizontalRoadYs[j];
      const labelText = String.fromCharCode(65 + i) + (j + 1);
      const g = new PIXI.Graphics();
      // Прозрачный круг-хитбокс + явная hitArea для стабильного хит-теста
      g.beginFill(0x000000, 0).drawCircle(0, 0, hitRadius).endFill();
      g.position.set(x, y);
      g.eventMode = 'static';
      g.cursor = 'pointer';
      g.hitArea = new PIXI.Circle(0, 0, hitRadius);

      const show = () => {
        hoverLabel.text = labelText;
        hoverLabel.position.set(x, y - 16);
        hoverLabel.visible = true;
      };
      const hide = () => {
        hoverLabel.visible = false;
      };

      if (isMobile) {
        // На мобильных устройствах используем touch события
        g.on('touchstart', (e) => {
          e.stopPropagation(); // предотвращаем конфликт с панорамированием
          show();
        });
        g.on('touchend', (e) => {
          e.stopPropagation();
          // Задержка перед скрытием, чтобы пользователь успел увидеть
          setTimeout(hide, 2000);
        });
        g.on('touchcancel', hide);
      } else {
        // На десктопе используем pointer события
        g.on('pointerover', show);
        g.on('pointerout', hide);
        g.on('pointerenter', show);
        g.on('pointerleave', hide);
      }

      layer.addChild(g);
    }
  }
}

function createTrafficLightsForAllIntersections (layer) {
  intersectionKeyToTL.clear();
  const { maxVerticalPos } = getRoadPositions();

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

function drawDashedPath (g, points, dash, gap) {
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

function drawTrafficLights (layer) {
  CONFIG.TRAFFIC_LIGHTS.forEach(pos => {
    const c = new PIXI.Container();
    c.position.set(pos.x, pos.y);
    const pole = new PIXI.Graphics();
    pole.beginFill(0x555555).drawRect(-3, -20, 6, 40).endFill();
    const box = new PIXI.Graphics();
    box.beginFill(0x111111).drawRect(-8, -32, 16, 28).endFill();
    const red = new PIXI.Graphics(); red.beginFill(0xff0000).drawCircle(0, -26, 5).endFill();
    const yellow = new PIXI.Graphics(); yellow.beginFill(0xffff00).drawCircle(0, -16, 5).endFill();
    const green = new PIXI.Graphics(); green.beginFill(0x00ff00).drawCircle(0, -6, 5).endFill();
    c.addChild(pole, box, red, yellow, green);
    layer.addChild(c);
  });
}

function drawAlina (layer) {
  const house = CONFIG.ZONES.house;
  const container = new PIXI.Container();
  container.position.set(house.x + house.w - 40, house.y + house.h - 40);
  const circle = new PIXI.Graphics();
  circle.beginFill(0xffffff).drawCircle(0, 0, 15).endFill();
  const text = new PIXI.Text('A', {
    fontFamily: 'sans-serif',
    fontSize: 20,
    fill: 0x000000,
    stroke: 0xffffff,
    strokeThickness: 2
  });
  text.anchor.set(0.5);
  container.addChild(circle, text);
  layer.addChild(container);
}

function placeLabels (layer) {
  for (const key in CONFIG.ZONES) {
    const z = CONFIG.ZONES[key];
    let x, y;
    if (z.type === 'rect') {
      x = z.x + z.w / 2;
      y = z.y + z.h / 2;
    } else {
      x = z.x;
      y = z.y;
    }
    const text = new PIXI.Text(z.label, {
      fontFamily: 'sans-serif',
      fontSize: CONFIG.BASE_FONT,
      fill: 0xffffff,
      stroke: 0x000000,
      strokeThickness: 4
    });
    text.anchor.set(0.5);
    text.position.set(x, y);
    layer.addChild(text);
  }
}

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
}

// ======= Новая логика движения по графу перекрёстков и зданий =======
// Вспомогательные функции индексации и координат перекрёстков
function indexOfClosest (arr, value) {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(arr[i] - value);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function getIntersectionCoord (i, j) {
  return { x: verticalRoadXs[i], y: horizontalRoadYs[j] };
}

function getNearestIntersectionIJ (x, y) {
  return { i: indexOfClosest(verticalRoadXs, x), j: indexOfClosest(horizontalRoadYs, y) };
}

// Рассчитать точку остановки у здания: на ближайшей дороге, рядом с центром зоны
// Возвращает { stop: {x,y}, nearestIJ: {i,j}, orientation: 'vertical'|'horizontal' }
function computeBuildingStop (buildingPos) {
  const nearestVXIndex = indexOfClosest(verticalRoadXs, buildingPos.x);
  const nearestVx = verticalRoadXs[nearestVXIndex];
  const distToV = Math.abs(buildingPos.x - nearestVx);

  const nearestHYIndex = indexOfClosest(horizontalRoadYs, buildingPos.y);
  const nearestHy = horizontalRoadYs[nearestHYIndex];
  const distToH = Math.abs(buildingPos.y - nearestHy);

  // Выбираем более близкую дорогу
  if (distToV <= distToH) {
    // Остановка на вертикальной дороге: X фиксирован, Y — проекция центра здания
    const stopY = Math.max(horizontalRoadYs[0], Math.min(horizontalRoadYs[horizontalRoadYs.length - 1], buildingPos.y));
    const j = indexOfClosest(horizontalRoadYs, stopY);
    return { stop: { x: nearestVx, y: stopY }, nearestIJ: { i: nearestVXIndex, j }, orientation: 'vertical' };
  } else {
    // Остановка на горизонтальной дороге: Y фиксирован, X — проекция центра здания
    const stopX = Math.max(verticalRoadXs[0], Math.min(verticalRoadXs[verticalRoadXs.length - 1], buildingPos.x));
    const i = indexOfClosest(verticalRoadXs, stopX);
    return { stop: { x: stopX, y: nearestHy }, nearestIJ: { i, j: nearestHYIndex }, orientation: 'horizontal' };
  }
}

// Поиск пути по сетке перекрёстков (BFS) от (i0,j0) к (i1,j1). Возвращает массив координат перекрёстков
function buildIntersectionPath (fromIJ, toIJ) {
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
    return [getIntersectionCoord(fromIJ.i, fromIJ.j)];
  }
  while (ck) {
    const [si, sj] = ck.split(',').map(Number);
    pathIJ.push({ i: si, j: sj });
    ck = parent.get(ck) || null;
  }
  pathIJ.reverse();
  // Преобразуем в массив точек ({x,y})
  return pathIJ.map(({ i, j }) => getIntersectionCoord(i, j));
}

// Построить путь только ИЗ перекрёстка В перекрёсток, затем к зданию (на обочину)
// Возвращает массив точек: [intersections..., buildingStop]
function buildGraphPathToBuilding (startIJ, buildingPos) {
  const { stop, nearestIJ } = computeBuildingStop(buildingPos);
  const nodes = buildIntersectionPath(startIJ, nearestIJ); // только перекрёстки
  // Добавляем финальную точку остановки у здания
  nodes.push(stop);
  return nodes;
}

function getDestinationCenter (locationKey) {
  const z = zoneGeometry.get(locationKey);
  if (z && z.center) return z.center;
  // fallback: из статического конфига
  const def = CONFIG.ZONES[locationKey];
  if (!def) return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
  if (def.type === 'rect') return { x: def.x + def.w / 2, y: def.y + def.h / 2 };
  if (def.type === 'circle') return { x: def.x, y: def.y };
  return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
}

// Построить полный маршрут с учётом ограничений: только I->I и I->B/B->I
function buildCarPath () {
  const currentDestination = ROUTE_SCHEDULE[currentRouteIndex];
  if (!currentDestination) return [];

  // Определяем стартовый перекрёсток
  let startIJ;
  if (car && car.position && (car.position.x !== 0 || car.position.y !== 0)) {
    startIJ = getNearestIntersectionIJ(car.position.x, car.position.y);
  } else {
    const housePos = getDestinationCenter('house');
    startIJ = getNearestIntersectionIJ(housePos.x, housePos.y);
  }

  const destCenter = getDestinationCenter(currentDestination.location);
  const graphPath = buildGraphPathToBuilding(startIJ, destCenter);

  // Если машина не стоит ровно на перекрёстке старта, добавляем первый короткий сегмент до перекрёстка
  const startIntersection = getIntersectionCoord(startIJ.i, startIJ.j);
  const needsPrefix = car && (Math.abs(car.position.x - startIntersection.x) > 1 || Math.abs(car.position.y - startIntersection.y) > 1);
  const path = needsPrefix ? [{ x: car.position.x, y: car.position.y }, startIntersection, ...graphPath] : graphPath;

  // Если у нас есть сохраненное состояние и мы начинаем с текущей позиции машины,
  // добавляем промежуточную точку в направлении движения для плавного старта
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
  car = new PIXI.Container();

  // Кузов машины
  const body = new PIXI.Graphics();
  body.beginFill(0xff8800).drawRect(-60, -30, 120, 60).endFill();
  car.addChild(body);

  // Радиатор (передняя решетка) - ВПЕРЕДИ
  const radiator = new PIXI.Graphics();
  radiator.beginFill(0x333333).drawRect(45, -25, 10, 50).endFill();
  // Горизонтальные полоски радиатора
  for (let i = 0; i < 5; i++) {
    const line = new PIXI.Graphics();
    line.lineStyle(2, 0x666666);
    line.moveTo(45, -20 + i * 10);
    line.lineTo(55, -20 + i * 10);
    radiator.addChild(line);
  }
  car.addChild(radiator);

  // Передние фары - ВПЕРЕДИ
  const leftHeadlight = new PIXI.Graphics();
  leftHeadlight.beginFill(0xffffaa).drawCircle(50, -20, 8).endFill();
  leftHeadlight.lineStyle(1, 0x333333);
  leftHeadlight.drawCircle(50, -20, 8);
  car.addChild(leftHeadlight);

  const rightHeadlight = new PIXI.Graphics();
  rightHeadlight.beginFill(0xffffaa).drawCircle(50, 20, 8).endFill();
  rightHeadlight.lineStyle(1, 0x333333);
  rightHeadlight.drawCircle(50, 20, 8);
  car.addChild(rightHeadlight);


  // Задние фары - СЗАДИ
  const leftTailLight = new PIXI.Graphics();
  leftTailLight.beginFill(0xff0000).drawCircle(-50, -20, 6).endFill();
  leftTailLight.lineStyle(1, 0x333333);
  leftTailLight.drawCircle(-50, -20, 6);
  car.addChild(leftTailLight);

  const rightTailLight = new PIXI.Graphics();
  rightTailLight.beginFill(0xff0000).drawCircle(-50, 20, 6).endFill();
  rightTailLight.lineStyle(1, 0x333333);
  rightTailLight.drawCircle(-50, 20, 6);
  car.addChild(rightTailLight);

  // Крыша машинки (квадратик по размеру аватарки)
  const roof = new PIXI.Graphics();
  roof.beginFill(0xcc6600).drawRect(-30, -30, 60, 60).endFill();
  roof.lineStyle(2, 0x333333);
  roof.drawRect(-30, -30, 60, 60);
  car.addChild(roof);

  // Аватарка Шины (исходный размер без скругления)
  avatar = PIXI.Sprite.from('/public/shina.jpeg');
  avatar.anchor.set(0.5);
  avatar.width = 60;
  avatar.height = 60;
  car.addChild(avatar);

  // Устанавливаем пивот машины в центр для упрощения расчетов
  // car.position будет указывать на центр машины
  car.pivot.set(0, 0); // пивот в центре
  car.position.set(0, 0); // начальная позиция

  // Инициализируем контроллер светофоров
  carTrafficController = new CarTrafficController();

  // Начинаем с первого пункта назначения (работа)
  currentRouteIndex = 1; // работа, а не дом
  isAtDestination = false;
  stayTimer = 0;

  // Строим путь сначала, чтобы определить стартовую позицию
  carPath = buildCarPath();
  carSegment = 0;
  carProgress = 0;

  // Устанавливаем машину на первую точку пути (которая должна быть на дороге)
  if (carPath.length > 0) {
    // Используем сохраненное направление, если оно есть, иначе 0
    const initialRotation = (savedCarState && savedCarState.direction) || 0;
    car.rotation = initialRotation;
    if (avatar) {
      avatar.rotation = -initialRotation;
    }

    // Устанавливаем машину так, чтобы передняя часть была в точке пути
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(initialRotation);
    const offsetY = -carLength / 2 * Math.sin(initialRotation);
    car.position.set(carPath[0].x + offsetX, carPath[0].y + offsetY);
    console.log('Car starts at:', carPath[0], 'with rotation:', initialRotation);
  } else {
    // Fallback: устанавливаем на ближайшую дорогу к дому
    const housePos = getDestinationCenter('house');
    const houseIJ = getNearestIntersectionIJ(housePos.x, housePos.y);
    const roadPos = getIntersectionCoord(houseIJ.i, houseIJ.j);
    const initialRotation = (savedCarState && savedCarState.direction) || 0;
    car.rotation = initialRotation;
    if (avatar) {
      avatar.rotation = -initialRotation;
    }
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(initialRotation);
    const offsetY = -carLength / 2 * Math.sin(initialRotation);
    car.position.set(roadPos.x + offsetX, roadPos.y + offsetY);
    console.log('Car fallback position:', roadPos, 'with rotation:', initialRotation);
  }

  decorLayer.addChild(car);
  app.ticker.add(updateCar);
  app.ticker.add(() => {
    timeManager.update();
    updateDateTimeDisplay();
    const gameTime = timeManager.getGameTime();
    dayNightManager.updateNightMode(gameTime);
    updateStayTimer();
  });

  updateRouteDisplay();
}

// Обновление отображения времени
function updateDateTimeDisplay() {
  if (datetimeDisplay) {
    datetimeDisplay.innerHTML = timeManager.formatDateTime();
  }
}

// Обновление игрового времени (перенесено в TimeManager)
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
  if (isAtDestination) {
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

  // Скрываем аватарку в текущем здании
  hideBuildingAvatar();

  currentRouteIndex = (currentRouteIndex + 1) % ROUTE_SCHEDULE.length;
  isAtDestination = false;
  stayTimer = 0;

  // Восстанавливаем сохраненное состояние машины
  if (savedCarState) {
    car.rotation = savedCarState.direction;
    if (avatar) {
      avatar.rotation = -savedCarState.direction;
    }

    if (savedCarState.nextIntersection) {
      console.log(`🔄 Восстановлено направление к перекрестку: ${savedCarState.direction.toFixed(3)} радиан (${(savedCarState.direction * 180 / Math.PI).toFixed(1)}°) к перекрестку (${savedCarState.nextIntersection.x}, ${savedCarState.nextIntersection.y})`);
    } else {
      console.log(`🔄 Восстановлено направление к пункту назначения: ${savedCarState.direction.toFixed(3)} радиан (${(savedCarState.direction * 180 / Math.PI).toFixed(1)}°) к ${savedCarState.nextDestination.name} (${savedCarState.nextDestCenter.x}, ${savedCarState.nextDestCenter.y})`);
    }

    // Очищаем сохраненное состояние после использования
    savedCarState = null;
  }

  // Обновляем путь к новому пункту назначения
  carPath = buildCarPath();
  carSegment = 0;
  carProgress = 0;

  updateRouteDisplay();
}

// Сохраняем состояние машины для плавного продолжения движения к следующему пункту
function saveCarStateForNextDestination () {
  // Определяем следующий пункт назначения
  const nextRouteIndex = (currentRouteIndex + 1) % ROUTE_SCHEDULE.length;
  const nextDestination = ROUTE_SCHEDULE[nextRouteIndex];

  if (!nextDestination) return null;

  // Получаем центр следующего пункта назначения
  const nextDestCenter = getDestinationCenter(nextDestination.location);

  // Строим путь к следующему пункту назначения, чтобы найти первый перекресток
  const currentPos = car.position;
  const currentIJ = getNearestIntersectionIJ(currentPos.x, currentPos.y);
  const nextPath = buildGraphPathToBuilding(currentIJ, nextDestCenter);

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
  const currentDest = ROUTE_SCHEDULE[currentRouteIndex];
  if (!isAtDestination) {
    debugLogAlways(`🏠 Прибытие в ${currentDest.name} (обочина)`);

    // Сохраняем состояние машины для плавного продолжения движения
    savedCarState = saveCarStateForNextDestination();
    debugLogAlways(`💾 Сохранено состояние машины:`, savedCarState);

    isAtDestination = true;
    stayTimer = currentDest.stayHours;
    
    // Получаем текущее игровое время
    const gameTime = timeManager.getGameTime();
    lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes; // инициализируем таймер
    lastStayTimerDay = gameTime.day; // инициализируем день
    updateRouteDisplay();
    // Показываем маленькую аватарку в здании
    showBuildingAvatar(currentDest.location);
  }
}

// Показать маленькую аватарку в здании
function showBuildingAvatar (locationKey) {
  const buildingCenter = getDestinationCenter(locationKey);
  if (!buildingCenter) return;

  // Скрываем аватарку из машинки
  if (avatar) {
    avatar.visible = false;
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
  const currentDest = ROUTE_SCHEDULE[currentRouteIndex];
  const avatarContainer = buildingAvatars.get(currentDest.location);
  if (avatarContainer && avatarContainer.parent) {
    avatarContainer.parent.removeChild(avatarContainer);
    buildingAvatars.delete(currentDest.location);
    console.log(`🏠 Скрыта аватарка в здании ${currentDest.location}`);
  }

  // Показываем аватарку обратно в машинке
  if (avatar) {
    avatar.visible = true;
  }
}

function updateCar (delta) {
  debugInfo.frameCount++;

  // Если игра на паузе, не обновляем машину
  if (pauseManager.isPaused()) {
    debugLog('🚗 Игра на паузе, машина не двигается');
    return;
  }

  // Если находимся в пункте назначения, не двигаемся
  if (isAtDestination) {
    debugLog('🚗 Машина в пункте назначения, не двигается');
    checkArrival(); // обновляем статус
    return;
  }

  const speed = BASE_CAR_SPEED * pauseManager.getSpeedMultiplier() * delta;
  debugLog('🚗 Состояние машины', {
    speed: speed.toFixed(2),
    delta: delta.toFixed(3),
    position: `(${car.position.x.toFixed(1)}, ${car.position.y.toFixed(1)})`,
    rotation: `${(car.rotation * 180 / Math.PI).toFixed(1)}°`,
    segment: `${carSegment}/${carPath.length - 1}`,
    isAtDestination: isAtDestination
  });

  // Проверяем, есть ли у нас путь
  if (carPath.length < 2) {
    console.log('No valid path, rebuilding...');
    carPath = buildCarPath();
    carSegment = 0;
    carProgress = 0;
    return;
  }

  // Проверяем, что текущий сегмент существует
  if (carSegment >= carPath.length) {
    console.log('Invalid segment, rebuilding path...');
    carPath = buildCarPath();
    carSegment = 0;
    carProgress = 0;
    return;
  }

  // Убеждаемся, что carSegment находится в допустимых пределах
  if (carSegment >= carPath.length - 1) {
    // Достигли конца пути
    // console.log('Reached end of path');
    const finalX = carPath[carPath.length - 1].x;
    const finalY = carPath[carPath.length - 1].y;
    const carLength = 120;
    const offsetX = -carLength / 2 * Math.cos(car.rotation);
    const offsetY = -carLength / 2 * Math.sin(car.rotation);
    car.position.set(finalX + offsetX, finalY + offsetY);
    checkArrival();
    return;
  }

  let p1 = carPath[carSegment];
  let p2 = carPath[carSegment + 1];
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  let segLen = Math.hypot(dx, dy);

  // Если текущий сегмент имеет нулевую длину, переходим к следующему
  if (segLen < 0.1) {
    // console.log('Zero-length segment, skipping to next');
    carSegment++;
    carProgress = 0;
    return;
  }

  // 🚦 ПРОВЕРКА СВЕТОФОРА ПЕРЕД ПРИБЛИЖЕНИЕМ К ПЕРЕКРЕСТКУ 🚦
  if (carTrafficController) {
    // Вычисляем реальную позицию передней части машины
    const carLength = 120;
    const offsetX = carLength / 2 * Math.cos(car.rotation);
    const offsetY = carLength / 2 * Math.sin(car.rotation);
    const currentPos = {
      x: car.position.x + offsetX,
      y: car.position.y + offsetY
    };
    const targetIntersection = { x: p2.x, y: p2.y }; // целевой перекресток
    const roadPositions = { verticalRoadXs, horizontalRoadYs };

    // Проверяем расстояние до целевого перекрестка
    const distanceToIntersection = Math.hypot(currentPos.x - targetIntersection.x, currentPos.y - targetIntersection.y);

    // ОТЛАДКА: показываем информацию о движении (только первые секунды)
    if (carSegment === 0 && carProgress < 20) {
      console.log(`🚗 DEBUG: segment=${carSegment}, progress=${carProgress.toFixed(1)}, distance=${distanceToIntersection.toFixed(1)}, carPos=(${car.position.x.toFixed(0)},${car.position.y.toFixed(0)}), frontPos=(${currentPos.x.toFixed(0)},${currentPos.y.toFixed(0)}) to=(${targetIntersection.x},${targetIntersection.y})`);
    }

    // Проверяем светофор только если:
    // 1. Находимся в зоне проверки (30-60 пикселей до перекрестка)
    // 2. И НЕ стоим прямо на перекрестке старта 
    if (distanceToIntersection <= 60 && distanceToIntersection > 15) { // зона проверки светофора
      const trafficCheck = carTrafficController.checkTrafficLights(
        currentPos,
        targetIntersection,
        intersectionKeyToTL,
        roadPositions
      );

      if (!trafficCheck.canMove) {
        // Красный свет - останавливаемся
        debugLogAlways(`🚦 Остановка перед красным светом на перекрестке (${targetIntersection.x}, ${targetIntersection.y}), distance=${distanceToIntersection.toFixed(1)}`);
        return; // не обновляем carProgress - машина стоит
      }
    }
  }

  // Обновляем прогресс по текущему сегменту
  carProgress += speed;
  debugLog('🚗 Движение по сегменту', {
    segment: carSegment,
    progress: carProgress.toFixed(1),
    segLen: segLen.toFixed(1),
    speed: speed.toFixed(2)
  });

  // Проверяем, завершили ли мы текущий сегмент
  if (carProgress >= segLen) {
    debugLogAlways('🚗 Завершен сегмент', {
      segment: carSegment,
      progress: carProgress.toFixed(1),
      segLen: segLen.toFixed(1)
    });

    // Переходим к следующему сегменту
    carProgress = carProgress - segLen; // остаток переносим
    carSegment++;

    // Проверяем, не достигли ли мы конца пути
    if (carSegment >= carPath.length - 1) {
      // console.log('Reached final destination');
      const finalX = carPath[carPath.length - 1].x;
      const finalY = carPath[carPath.length - 1].y;
      const carLength = 120;
      const offsetX = -carLength / 2 * Math.cos(car.rotation);
      const offsetY = -carLength / 2 * Math.sin(car.rotation);
      car.position.set(finalX + offsetX, finalY + offsetY);
      checkArrival();
      return;
    }

    // Обновляем данные для нового сегмента
    p1 = carPath[carSegment];
    p2 = carPath[carSegment + 1];
    dx = p2.x - p1.x;
    dy = p2.y - p1.y;
    segLen = Math.hypot(dx, dy);
  }

  // Вычисляем текущую позицию на сегменте
  const t = segLen > 0 ? Math.min(1, carProgress / segLen) : 0;
  const newX = p1.x + dx * t;
  const newY = p1.y + dy * t;

  // Обновляем поворот машинки в направлении движения
  if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    const targetRotation = Math.atan2(dy, dx);
    const oldRotation = car.rotation;
    car.rotation = targetRotation;
    if (avatar) {
      avatar.rotation = -targetRotation;
    }

    // Обновляем лучи света при повороте
    if (car.leftLightBeam && car.rightLightBeam) {
      updateLightBeams();
    }

    // Логируем поворот только если он значительный
    const rotationDiff = Math.abs(targetRotation - oldRotation);
    if (rotationDiff > 0.1) {
      debugLogAlways('🚗 Поворот машины', {
        oldRotation: (oldRotation * 180 / Math.PI).toFixed(1) + '°',
        newRotation: (targetRotation * 180 / Math.PI).toFixed(1) + '°',
        diff: (rotationDiff * 180 / Math.PI).toFixed(1) + '°'
      });
    }
  }

  // Устанавливаем машину так, чтобы передняя часть была в точке пути
  const carLength = 120;
  const offsetX = -carLength / 2 * Math.cos(car.rotation);
  const offsetY = -carLength / 2 * Math.sin(car.rotation);
  car.position.set(newX + offsetX, newY + offsetY);


  // console.log(`Car at segment ${carSegment}/${carPath.length - 1}, progress: ${carProgress.toFixed(1)}/${segLen.toFixed(1)}, pos: (${newX.toFixed(1)}, ${newY.toFixed(1)})`);

  // Проверяем прибытие в пункт назначения: до последней точки пути
  const lastPoint = carPath[carPath.length - 1];
  const distToLast = Math.hypot(car.position.x - lastPoint.x, car.position.y - lastPoint.y);
  if (distToLast < 20) {
    checkArrival();
  }
}

// panningController теперь инициализируется в setupWorld()

// Настраиваем игровую область для панорамирования
const gameContainer = document.querySelector('.game-container');
gameContainer.style.width = '1200px';
gameContainer.style.height = '800px';
gameContainer.style.overflow = 'auto';

// Добавляем подсказку для мобильных устройств
if (isMobile) {
  console.log('📱 Мобильное устройство обнаружено!');
  console.log('👆 Одиночное касание - панорамирование');
  console.log('🤏 Два пальца - одновременное масштабирование И панорамирование (0.1x - 10x)');
  console.log('🔍+ Кнопка увеличения - приближение');
  console.log('🔍- Кнопка уменьшения - отдаление');
  console.log('📱 Кнопка "Полный экран" - переключение полноэкранного режима');
  console.log('📍 Касание перекрестка - показать координаты');

}
