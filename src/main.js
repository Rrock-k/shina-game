
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
// Делаем trafficCoordinator глобально доступным
window.trafficCoordinator = trafficCoordinator;

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

// Делаем конфигурацию светофоров глобально доступной
window.TRAFFIC_LIGHTS_CONFIG = TRAFFIC_LIGHTS_CONFIG;

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

game._setupWorld(intersectionKeyToTL);

uiRenderer.init();

// Обновляем текст режима дня/ночи и паузы в меню после инициализации
setTimeout(() => {
  dayNightManager.updateDayNightModeText();
  pauseManager.updatePauseModeText();
}, 100);

const carData = game._createCar(currentRouteIndex, savedCarState, intersectionKeyToTL, uiRenderer, debugLogAlways);
carRenderer = carData.carRenderer;
game._layout(panningController, currentRouteIndex, savedCarState, carRenderer);
window.addEventListener('resize', () => {
  // Убираем изменение размера canvas - оставляем фиксированный размер
  game._layout(panningController, currentRouteIndex, savedCarState, carRenderer);

  // Если включен полноэкранный режим, обновляем его при изменении размера окна
  if (typeof panningController !== 'undefined' && panningController && panningController.isFullscreenMode()) {
    panningController.toggleFullscreen(); // выключаем
    panningController.toggleFullscreen(); // включаем с новыми размерами
  }
});



// Функция для парсинга буквенно-цифровых координат в индексы перенесена в Game.js как _parseIntersectionCoordinate

// Проверка, есть ли светофор на данном перекрестке перенесена в Game.js как _shouldHaveTrafficLight


// Функция setupWorld перенесена в Game.js как _setupWorld


// Функции-обертки для получения позиций дорог из WorldRenderer


// Функция createTrafficLightsForAllIntersections перенесена в Game.js как _createTrafficLightsForAllIntersections

// Функция drawDashedPath перенесена в WorldRenderer




// ======= Новая логика движения по графу перекрёстков и зданий =======
// Вспомогательные функции индексации и координат перекрёстков





// Построить полный маршрут с учётом ограничений: только I->I и I->B/B->I

// Создание машины теперь в Game.js







// Функция updateCar() перенесена в Game.js как _updateCar()


// Настраиваем игровую область для панорамирования
const gameContainer = document.querySelector('.game-container');
gameContainer.style.width = '1200px';
gameContainer.style.height = '800px';
gameContainer.style.overflow = 'auto';

// Запускаем игровой цикл
game.start();

