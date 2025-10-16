import { TimeManager } from './TimeManager.js';
import { PauseManager } from './PauseManager.js';
import { DayNightManager } from './DayNightManager.js';
import { JournalManager } from './JournalManager.js';
import StateManager from './StateManager.js';
import DependencyContainer from './DependencyContainer.js';
import { WorldRenderer } from '../rendering/WorldRenderer.js';
import { UIRenderer } from '../rendering/UIRenderer.js';
import { CarRenderer } from '../rendering/CarRenderer.js';
import { ShinaRenderer } from '../rendering/ShinaRenderer.js';
import { Car } from '../entities/Car.js';
import { Shina } from '../entities/Shina.js';
import { CarTrafficController } from '../systems/carTrafficControl.js';
import { PathBuilder } from '../systems/PathBuilder.js';
import { CONFIG } from '../config/gameConfig.js';
import { TrafficLight, TrafficLightCoordinator } from '../systems/trafficLights.js';
import { TrafficLightRenderer } from '../rendering/TrafficLightRenderer.js';
import ScheduleManager from './ScheduleManager.js';

/**
 * Главный класс игры - централизует управление игровым состоянием и циклом
 */
class Game {
    constructor() {
        console.log('Game constructor called');
        
        // Создаем контейнер зависимостей
        this.dependencies = new DependencyContainer();
        
        // Регистрируем базовые зависимости
        this.dependencies.register('config', CONFIG);
        this.dependencies.register('debugLog', () => this.debugLog.bind(this));
        this.dependencies.register('debugLogAlways', () => this.debugLogAlways.bind(this));
        this.dependencies.register('debugInfo', () => this.debugInfo);
        
        // Создаем PIXI приложение
        this.app = new PIXI.Application({
            width: 1200,
            height: 800,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            backgroundColor: 0x3a6f3e
        });
        
        // Добавляем canvas в игровую область
        const gameContainer = document.querySelector('.game-container');
        gameContainer.appendChild(this.app.view);
        
        // Включаем систему событий для всей сцены
        this.app.stage.eventMode = 'static';
        this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 1200, 800);
        
        // Создаем контейнер мира и все слои
        this.world = new PIXI.Container();
        this.world.sortableChildren = true; // Включаем сортировку по zIndex
        this.app.stage.addChild(this.world);
        
        this.gridLayer = new PIXI.Container();
        this.roadsLayer = new PIXI.Container();
        this.lotsLayer = new PIXI.Container();
        this.zonesLayer = new PIXI.Container();
        this.labelsLayer = new PIXI.Container();
        this.intersectionsLayer = new PIXI.Container();
        this.decorLayer = new PIXI.Container();
        this.trafficLightsLayer = new PIXI.Container(); // слой для светофоров (поверх машин)
        this.borderLayer = new PIXI.Container();
        this.lightingLayer = new PIXI.Container(); // слой для всех источников света (поверх ночного оверлея)
        this.uiLayer = new PIXI.Container();
        
        // Делаем world и слои глобально доступными для dayNightManager
        // (временно, до полного рефакторинга dayNightManager)
        window.world = this.world;
        window.decorLayer = this.decorLayer;
        window.trafficLightsLayer = this.trafficLightsLayer;
        
        // Создаем менеджеры
        this.stateManager = new StateManager();
        this.timeManager = new TimeManager();
        this.pauseManager = new PauseManager();
        this.journalManager = new JournalManager(this.timeManager);
        this.scheduleManager = new ScheduleManager(this.dependencies.get('config'), this.timeManager);
        this.dependencies.register('scheduleManager', this.scheduleManager);
        this.activeAvatarLocation = null;
        const initialIndex = this.scheduleManager.getActiveTaskIndex();
        this.stateManager.setCurrentRouteIndex(initialIndex);
        const currentGameTime = this.timeManager.getGameTime();
        const initialTaskStart = this._gameTimeToDate(currentGameTime);
        this.scheduleManager.setCurrentTaskIndex(initialIndex);
        this.scheduleManager.startTask(initialIndex, initialTaskStart);
        const initialTask = this.scheduleManager.getTaskByIndex(initialIndex);
        if (initialTask) {
            this.stateManager.setCurrentLocation(initialTask.location);
        }
        // dayNightManager будет создан в init() после worldRenderer
        
        // Синхронизируем менеджеры
        this.timeManager.setSpeedMultiplier(this.pauseManager.getSpeedMultiplier());
        this.timeManager.setPaused(this.pauseManager.isPaused());
        
        // Устанавливаем начальное время в журнале
        this.journalManager.setLocationStartTime('Дом');
        
        // Создаем рендереры
        this.worldRenderer = new WorldRenderer(this.dependencies.get('config'), this.app);
        // UIRenderer будет создан в init() после регистрации panningController
        
        // Создаем сущности
        this.carEntity = new Car(this.dependencies.get('config'), this.pauseManager);
        this.shinaEntity = new Shina(this.dependencies.get('config'));
        this.carEntity.setScheduleAccess({
            getTaskByIndex: this.scheduleManager.getTaskByIndex.bind(this.scheduleManager),
            getTaskCount: this.scheduleManager.getTaskCount.bind(this.scheduleManager)
        });
        
        // Создаем рендерер Шины
        this.shinaRenderer = new ShinaRenderer(this.dependencies.get('config'), this.pauseManager);
        this.shinaSprite = this.shinaRenderer.create();
        if (this.decorLayer && this.shinaSprite) {
            this.decorLayer.addChild(this.shinaSprite);
        }
        
        // Создаем dayNightManager после worldRenderer
        this.dayNightManager = new DayNightManager(
            PIXI,
            this.dependencies.get('config'),
            this.worldRenderer,
            this.timeManager
        );
        
        // Инициализируем геометрию зон
        this.zoneGeometry = new Map(); // key -> { center:{x,y}, bounds:{x,y,w,h} | {x,y,r}, type }
        
        // Переменные для таймера пребывания в здании теперь управляются через StateManager
        
        // Переменные отладки
        this.DEBUG_MODE = true; // теперь можно изменять
        this.debugInfo = {
            frameCount: 0,
            lastLogTime: 0,
            logInterval: 1000 // логировать каждую секунду
        };
        
        // Делаем carEntity глобально доступным для UI (временно, до полного рефакторинга)
        // TODO: убрать после рефакторинга UI
        window.carEntity = this.carEntity;
        
        // Инициализируем carEntity (базовая инициализация, полная будет в main.js)
        this.carEntity.init({
            currentRouteIndex: 0, // будет обновлено в main.js
            savedState: null, // будет обновлено в main.js
            onArrival: (destination) => {
                console.log(`🚗 Машина прибыла в ${destination.name}`);
                // TODO: будет перенесено в Game.js позже
            },
            onStateChange: (event, data) => {
                console.log(`🚗 Машина: ${event}`, data);
            }
        });

        // Инициализируем shinaEntity
        this.shinaEntity.init({
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

    /**
     * Инициализирует игру (настройка светофоров, создание машины, настройка UI)
     */
    async init() {
        // Инициализируем переменные для светофоров
        // currentRouteIndex теперь управляется через stateManager
        // savedCarState теперь управляется через stateManager
        this.intersectionKeyToTL = new Map();
        
        // Регистрируем intersectionKeyToTL в контейнере зависимостей
        this.dependencies.register('intersectionKeyToTL', this.intersectionKeyToTL);
        
        // Создаем координатор светофоров
        this.trafficCoordinator = new TrafficLightCoordinator(45); // скорость машин ~45 км/ч
        this.dependencies.register('trafficCoordinator', this.trafficCoordinator);
        // TODO: убрать window.trafficCoordinator после рефакторинга всех систем
        window.trafficCoordinator = this.trafficCoordinator;
        
        // Конфигурация светофоров
        this.TRAFFIC_LIGHTS_CONFIG = [
            'A2',              // левый столбец (въезд в город) - убран A3
            'B2',              // второй столбец - убран B4
            'C3',              // третий столбец - убран C1
            'D2', 'D4',        // четвертый столбец
            'E1',              // пятый столбец - убран E3
            'F2', 'F4',        // шестой столбец
            'G1', 'G3', 'G4'   // правый столбец (выезд из города) - убран G2
        ];
        window.TRAFFIC_LIGHTS_CONFIG = this.TRAFFIC_LIGHTS_CONFIG;
        
        // Определяем мобильное устройство
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Делаем необходимые переменные глобально доступными (временно)
        // TODO: убрать после полного рефакторинга всех систем
        window.CONFIG = this.dependencies.get('config');
        window.debugLog = this.dependencies.get('debugLog');
        window.debugLogAlways = this.dependencies.get('debugLogAlways');
        window.debugInfo = this.dependencies.get('debugInfo');
        // currentRouteIndex теперь управляется через stateManager
        // TODO: убрать дублирование savedCarState в window
        window.savedCarState = this.stateManager.getSavedCarState();
        window.zoneGeometry = this.zoneGeometry;
        
        // Создаем CarTrafficController и регистрируем в контейнере зависимостей
        const carTrafficController = new CarTrafficController();
        this.dependencies.register('carTrafficController', carTrafficController);
        
        // Создаем PanningController и регистрируем в контейнере зависимостей
        const { PanningController } = await import('../systems/panning.js');
        if (PanningController) {
            const panningController = new PanningController();
            panningController.setWorld(this.world);
            panningController.setOnZoomChange((scale) => {
                if (this.uiRenderer) {
                    this.uiRenderer.updateZoomButton();
                }
            });
            panningController.setOnFullscreenChange((isFullscreen) => {
                if (this.uiRenderer) {
                    this.uiRenderer.updateZoomButton();
                }
            });
            this.dependencies.register('panningController', panningController);
            // TODO: убрать window.panningController после рефакторинга всех систем
            window.panningController = panningController;
        }
        
        // Создаем UIRenderer после регистрации panningController
        const panningController = this.dependencies.has('panningController') ? this.dependencies.get('panningController') : null;
        this.uiRenderer = new UIRenderer(
            this.dependencies.get('config'),
            this.timeManager,
            this.pauseManager,
            this.dayNightManager,
            panningController,
            this.journalManager,
            this.carEntity,
            this.scheduleManager,
            this.stateManager
        );
        
        // Настраиваем мир
        this._setupWorld(this.intersectionKeyToTL);
        
        // Создаем PathBuilder после инициализации WorldRenderer
        const verticalRoadXs = this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [];
        const horizontalRoadYs = this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [];
        const pathBuilder = new PathBuilder(verticalRoadXs, horizontalRoadYs, this.dependencies.get('config'));
        if (this.scheduleManager) {
            pathBuilder.setRouteResolver(index => this.scheduleManager.getTaskByIndex(index));
        }
        this.dependencies.register('pathBuilder', pathBuilder);
        
        // Инициализируем UI
        this.uiRenderer.init();
        
        // Подписываемся на события DayNightManager
        this.initDayNightEventListeners();
        
        // Обновляем текст режима дня/ночи и паузы в меню после инициализации
        setTimeout(() => {
            this.dayNightManager.updateDayNightModeText();
            this.pauseManager.updatePauseModeText();
        }, 100);
        
        // Создаем машину
        const carData = this._createCar(this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this.intersectionKeyToTL, this.uiRenderer, this.debugLogAlways.bind(this));
        this.carRenderer = carData.carRenderer;
        
        // Настраиваем компоновку
        this._layout(null, this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this.carRenderer);
        
        // Настраиваем обработчик изменения размера окна
        window.addEventListener('resize', () => {
            this._layout(null, this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this.carRenderer);
            
            // Если включен полноэкранный режим, обновляем его при изменении размера окна
            const panningController = this.dependencies.get('panningController');
            if (panningController && panningController.isFullscreenMode()) {
                panningController.toggleFullscreen(); // выключаем
                panningController.toggleFullscreen(); // включаем с новыми размерами
            }
        });
        
        // Настраиваем игровую область для панорамирования
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.width = '1200px';
        gameContainer.style.height = '800px';
        gameContainer.style.overflow = 'auto';
    }

    /**
     * Инициализация подписок на события DayNightManager
     */
    initDayNightEventListeners() {
        if (!this.dayNightManager) return;

        // Подписываемся на изменение режима дня/ночи
        this.dayNightManager.on('modeChange', (data) => {
            console.log('🌙 Game: получено событие modeChange', data);
            // Здесь можно добавить дополнительную логику игры
        });

        // Подписываемся на переключение режима
        this.dayNightManager.on('modeToggle', (data) => {
            console.log('🌅 Game: получено событие modeToggle', data);
            // Здесь можно добавить дополнительную логику игры
        });

        // Подписываемся на изменение альфы
        this.dayNightManager.on('alphaChange', (data) => {
            console.log('🎨 Game: получено событие alphaChange', data);
            // Здесь можно добавить дополнительную логику игры
        });
    }

    /**
     * Запускает игровой цикл
     */
    start() {
        console.log('Game start() called');
        
        // Запускаем игровой цикл
        this.app.ticker.add((delta) => this.update(delta));
    }

    /**
     * Обновляет состояние игры на каждом кадре
     * @param {number} delta - Время, прошедшее с предыдущего кадра
     */
    update(delta) {
        // Обновляем время
        this.timeManager.update();
        
        // Обновляем UI с датой и временем
        if (this.uiRenderer) {
            this.uiRenderer.updateDateTimeDisplay();
        }
        
        // Обновляем ночной режим
        const gameTime = this.timeManager.getGameTime();
        if (this.scheduleManager) {
            this.scheduleManager.update(gameTime);
            const activeIndex = this.scheduleManager.getActiveTaskIndex();
            const storedIndex = this.stateManager.getCurrentRouteIndex();
            if (typeof activeIndex === 'number' && activeIndex !== storedIndex) {
                const isAtDestination = this.carEntity ? this.carEntity.isAtDestination() : false;
                if (isAtDestination) {
                    this.nextDestination();
                } else {
                    const previousTask = this.scheduleManager ? this.scheduleManager.getTaskByIndex(storedIndex) : null;
                    const previousLocation = previousTask?.location || this.stateManager.getCurrentLocation();
                    this.stateManager.setCurrentRouteIndex(activeIndex);
                    this.scheduleManager.setCurrentTaskIndex(activeIndex);
                    this.hideBuildingAvatar(previousLocation);
                    this.stateManager.setCurrentLocation(null);

                    if (this.uiRenderer) {
                        this.uiRenderer.setCurrentRouteIndex(activeIndex);
                    }

                    if (this.carEntity) {
                        this.carEntity.setCurrentRouteIndex(activeIndex);
                        this.carEntity.setAtDestination(false);
                        this.carEntity.setStayTimer(0);
                        const pathBuilder = this.dependencies.get('pathBuilder');
                        if (pathBuilder) {
                            const newPath = pathBuilder.buildCarPath(
                                this.carEntity,
                                activeIndex,
                                this.stateManager.getSavedCarState(),
                                this._getDestinationCenter.bind(this),
                                this.debugLogAlways.bind(this)
                            );
                            this.carEntity.setPath(newPath);
                        }
                    }

                    const newTask = this.scheduleManager.getTaskByIndex(activeIndex);
                    if (newTask && this.journalManager) {
                        this.journalManager.startTrip(newTask.name, newTask.location);
                    }
                }
            }
        }
        this.dayNightManager.updateNightMode(gameTime);
        
        // Обновляем UI (включая журнал)
        if (this.uiRenderer) {
            this.uiRenderer.update();
        }
        
        // Обновляем машину (включая сущности)
        this._updateCar(delta);
        
        // Обновляем таймер пребывания в здании
        this.updateStayTimer();
    }
    
    /**
     * Обновляет машину и связанные компоненты
     * @param {number} delta - Время, прошедшее с предыдущего кадра
     */
    _updateCar(delta) {
        // Обновляем новые сущности
        this.updateEntities(delta);
        
        // Синхронизируем game.carEntity с carRenderer для визуального представления
        if (this.carEntity && this.carRenderer) {
            // Обновляем визуальное представление
            this.carRenderer.updateVisuals(this.carEntity.getViewState());
            
            // Синхронизируем локальные переменные с game.carEntity (глобальные переменные удалены)
            const carPath = this.carEntity.getPath();
            const carSegment = this.carEntity.getCurrentSegment();
            const carProgress = this.carEntity.getProgress();
            const stayTimer = this.carEntity.getStayTimer();
        }
        
        // Обновляем UI
        if (this.uiRenderer) {
            this.uiRenderer.updateRouteDisplay(this.carEntity ? this.carEntity.isAtDestination() : false);
        }
    }

    /**
     * Обновляет сущности игры
     * @param {number} delta - Время, прошедшее с предыдущего кадра
     */
    updateEntities(delta) {
        // Обновляем машину
        if (this.carEntity) {
            // Получаем необходимые зависимости из контейнера зависимостей
            const carTrafficController = this.dependencies.get('carTrafficController');
            const intersectionKeyToTL = this.dependencies.get('intersectionKeyToTL');
            const pathBuilder = this.dependencies.get('pathBuilder');
            const debugLog = this.debugLog.bind(this);
            const debugLogAlways = this.debugLogAlways.bind(this);
            const debugInfo = this.debugInfo;
            
            this.carEntity.update(delta, {
                checkArrival: () => this.checkArrival(),
                debugLog: debugLog,
                debugLogAlways: debugLogAlways,
                carTrafficController: carTrafficController,
                intersectionKeyToTL: intersectionKeyToTL,
                getVerticalRoadXs: () => this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [],
                getHorizontalRoadYs: () => this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [],
                buildCarPath: () => pathBuilder ? pathBuilder.buildCarPath(this.carEntity, this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this._getDestinationCenter.bind(this), debugLogAlways) : [],
                updateLightBeams: undefined,
                debugInfo: debugInfo
            });
        }

        // Обновляем Шину
        if (this.shinaEntity) {
            this.shinaEntity.update({
                timeManager: this.timeManager,
                debugLog: this.debugLog.bind(this)
            });
            
            // Обновляем визуальное представление Шины
            if (this.shinaRenderer) {
                this.shinaRenderer.updateVisuals(this.shinaEntity.getViewState());
            }
        }

        // Обновляем светофоры
        const intersectionKeyToTL = this.dependencies.get('intersectionKeyToTL');
        if (intersectionKeyToTL) {
            // Преобразуем delta (тики PIXI) в миллисекунды
            const deltaMs = delta * (1000 / 60); // 60 FPS = 1000ms/60 = 16.67ms per frame
            
            intersectionKeyToTL.forEach((trafficLightData, key) => {
                if (trafficLightData && trafficLightData.logic && trafficLightData.renderer) {
                    // Обновляем логику светофора
                    trafficLightData.logic.update(deltaMs);
                    
                    // Обновляем визуальное представление
                    trafficLightData.renderer.updateVisuals(trafficLightData.logic.getState());
                }
            });
        }
    }
    
    /**
     * Обновляет таймер пребывания в здании
     */
    updateStayTimer() {
        if (this.carEntity && this.carEntity.isAtDestination()) {
            const gameTime = this.timeManager.getGameTime();
            const currentStayDuration = this.carEntity.getStayTimer();
            
            // Используем StateManager для обновления таймера
            const newStayTimer = this.stateManager.updateStayTimer(gameTime, currentStayDuration);
            this.carEntity.setStayTimer(newStayTimer);
            
            if (newStayTimer <= 0) {
                const currentIndex = this.stateManager.getCurrentRouteIndex();
                const nextIndex = this.scheduleManager
                    ? this.scheduleManager.getNextIndex(currentIndex, gameTime)
                    : null;
                if (this.scheduleManager && nextIndex === currentIndex) {
                    return;
                }
                // Время пребывания закончилось, едем к следующему пункту
                console.log('🚗 Время пребывания закончилось, продолжаем движение');
                this.nextDestination();
            }
        }
    }
    
    /**
     * Переход к следующему пункту маршрута
     */
    nextDestination() {
        console.log(`🔄 Переход к следующему пункту назначения`);

        const currentRouteIndex = this.stateManager.getCurrentRouteIndex();
        const currentTask = this.scheduleManager ? this.scheduleManager.getTaskByIndex(currentRouteIndex) : null;

        const gameTime = this.timeManager.getGameTime();
        const departureTime = this._gameTimeToDate(gameTime);

        const newRouteIndex = this.scheduleManager
            ? this.scheduleManager.getNextIndex(currentRouteIndex, gameTime)
            : currentRouteIndex;
        if (this.scheduleManager) {
            this.scheduleManager.setCurrentTaskIndex(newRouteIndex);
        }

        const stayingInPlace = newRouteIndex === currentRouteIndex;

        if (stayingInPlace) {
            console.log('⏸ Нет следующего назначения, остаемся на месте');
            this.stateManager.setCurrentRouteIndex(currentRouteIndex);
            const location = currentTask ? currentTask.location : null;
            this.stateManager.setCurrentLocation(location);
            if (this.carEntity) {
                this.carEntity.setCurrentRouteIndex(currentRouteIndex);
                this.carEntity.setAtDestination(true);
                this.carEntity.setStayTimer(currentTask ? currentTask.duration || 0 : 0);
            }
            this.stateManager.setStayStartTimeAbs(gameTime);
            this.stateManager.setStayTotalDuration(currentTask ? currentTask.duration || 0 : 0);
            if (this.uiRenderer) {
                this.uiRenderer.setCurrentRouteIndex(currentRouteIndex);
                this.uiRenderer.updateRouteDisplay(true);
            }
            return;
        }

        if (this.journalManager && currentTask) {
            this.journalManager.endLocationStay(currentTask.name);
        }

        if (this.scheduleManager && currentTask) {
            this.scheduleManager.completeTask(currentRouteIndex, departureTime);
        }

        this.hideBuildingAvatar(currentTask ? currentTask.location : null);
        this.stateManager.setCurrentLocation(null);
        this.stateManager.setCurrentRouteIndex(newRouteIndex);

        if (this.uiRenderer) {
            this.uiRenderer.setCurrentRouteIndex(newRouteIndex);
        }

        if (this.carEntity) {
            this.carEntity.setCurrentRouteIndex(newRouteIndex);
            this.carEntity.setAtDestination(false);
            this.carEntity.setStayTimer(0);

            this.stateManager.clearStayStartTimeAbs();
            this.stateManager.setStayTotalDuration(0);

            const pathBuilder = this.dependencies.get('pathBuilder');
            if (pathBuilder) {
                const newPath = pathBuilder.buildCarPath(
                    this.carEntity,
                    newRouteIndex,
                    this.stateManager.getSavedCarState(),
                    this._getDestinationCenter.bind(this),
                    this.debugLogAlways.bind(this)
                );
                this.carEntity.setPath(newPath);
            }
        }

        let newTask = this.scheduleManager ? this.scheduleManager.getTaskByIndex(newRouteIndex) : null;
        if (!newTask && this.scheduleManager) {
            newTask = this.scheduleManager.getReturnHomeTask();
        }
        if (this.journalManager && newTask) {
            this.journalManager.startTrip(newTask.name, newTask.location);
        }

        this.uiRenderer.updateRouteDisplay(this.carEntity ? this.carEntity.isAtDestination() : false);
    }
    
    /**
     * Проверка прибытия в пункт назначения
     * Атомарно выполняет все действия, связанные с прибытием
     */
    checkArrival() {
        const currentRouteIndex = this.stateManager.getCurrentRouteIndex();
        const currentTask = this.scheduleManager ? this.scheduleManager.getTaskByIndex(currentRouteIndex) : null;
        
        if (!this.carEntity || !currentTask) {
            console.warn('⚠️ checkArrival: отсутствуют необходимые компоненты');
            return;
        }

        if (this.carEntity.isAtDestination()) {
            return;
        }

        console.log(`🏠 Прибытие в ${currentTask.name} (обочина)`);

        if (this.journalManager) {
            this.journalManager.endTrip(currentTask.name);
            this.journalManager.setLocationStartTime(currentTask.name);
        }

        const savedCarState = this.saveCarStateForNextDestination();
        this.stateManager.setSavedCarState(savedCarState);
        window.savedCarState = savedCarState;
        console.log(`💾 Сохранено состояние машины:`, savedCarState);

        this.carEntity.setAtDestination(true);
        this.carEntity.setStayTimer(currentTask.duration || 0);
        this.stateManager.setStayTotalDuration(currentTask.duration || 0);
        this.stateManager.setCurrentLocation(currentTask.location);
        
        const gameTime = this.timeManager.getGameTime();
        this.stateManager.setStayStartTimeAbs(gameTime);
        const arrivalTime = this._gameTimeToDate(gameTime);
        if (this.scheduleManager) {
            this.scheduleManager.startTask(currentRouteIndex, arrivalTime);
        }
        console.log(`⏰ Сохранено время начала пребывания: ${gameTime.hours}:${Math.floor(gameTime.minutes)}`);
        
        this.uiRenderer.updateRouteDisplay(true);
        this.showBuildingAvatar(currentTask.location);
        
        console.log(`✅ Прибытие в ${currentTask.name} обработано атомарно`);
    }
    
    /**
     * Сохраняет состояние машины для плавного продолжения движения к следующему пункту
     */
    saveCarStateForNextDestination() {
        const currentRouteIndex = this.stateManager.getCurrentRouteIndex();
        const taskCount = this.scheduleManager ? this.scheduleManager.getTaskCount() : 0;
        if (!taskCount) return null;

        const nextRouteIndex = this.scheduleManager
            ? this.scheduleManager.getNextIndex(currentRouteIndex)
            : currentRouteIndex;
        const nextTask = this.scheduleManager ? this.scheduleManager.getTaskByIndex(nextRouteIndex) : null;

        if (!nextTask) return null;

        const nextDestCenter = this._getDestinationCenter(nextTask.location);

        const carRenderer = this.carRenderer;
        const pathBuilder = this.dependencies.get('pathBuilder');
        if (!carRenderer || !pathBuilder) return null;
        
        const currentPos = carRenderer.getCar().position;
        const currentIJ = pathBuilder.getNearestIntersectionIJ(currentPos.x, currentPos.y);
        const nextPath = pathBuilder.buildPathToBuilding(currentIJ, nextDestCenter);

        let nextIntersection = null;
        if (nextPath.length >= 2) {
            nextIntersection = nextPath[nextPath.length - 2];
        } else if (nextPath.length === 1) {
            nextIntersection = nextPath[0];
        }

        let direction;
        if (nextIntersection) {
            const dx = nextIntersection.x - currentPos.x;
            const dy = nextIntersection.y - currentPos.y;
            direction = Math.atan2(dy, dx);
            console.log(`🎯 Следующий перекресток: (${nextIntersection.x}, ${nextIntersection.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
        } else {
            const dx = nextDestCenter.x - currentPos.x;
            const dy = nextDestCenter.y - currentPos.y;
            direction = Math.atan2(dy, dx);
            console.log(`🎯 Fallback к центру назначения: (${nextDestCenter.x}, ${nextDestCenter.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
        }

        return {
            nextDestination: nextTask,
            nextDestCenter: nextDestCenter,
            nextIntersection: nextIntersection,
            direction: direction,
            currentPosition: { x: currentPos.x, y: currentPos.y }
        };
    }
    
    /**
     * Показать маленькую аватарку в здании
     */
    showBuildingAvatar(locationKey) {
        const buildingCenter = this._getDestinationCenter(locationKey);
        if (!buildingCenter) return;

        // Скрываем аватарку из машинки
        const carRenderer = this.carRenderer;
        if (carRenderer) {
            carRenderer.setAvatarVisible(false);
        }

        if (this.buildingAvatars && this.buildingAvatars.has(locationKey)) {
            const existing = this.buildingAvatars.get(locationKey);
            if (existing?.parent) {
                existing.parent.removeChild(existing);
            }
            this.buildingAvatars.delete(locationKey);
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
        const zoneGeometry = this.zoneGeometry;
        const zone = zoneGeometry ? zoneGeometry.get(locationKey) : null;
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

        this.decorLayer.addChild(avatarContainer);
        if (!this.buildingAvatars) {
            this.buildingAvatars = new Map();
        }
        this.buildingAvatars.set(locationKey, avatarContainer);
        this.activeAvatarLocation = locationKey;

        console.log(`🏠 Показана аватарка в здании ${locationKey}`, {
            zone: zone,
            buildingCenter: buildingCenter,
            position: avatarContainer.position
        });
    }
    
    /**
     * Скрыть аватарку в здании
     */
    hideBuildingAvatar(locationKeyOverride = null) {
        if (!this.buildingAvatars || this.buildingAvatars.size === 0) {
            if (this.carRenderer) {
                this.carRenderer.setAvatarVisible(true);
            }
            return;
        }

        const keysToRemove = [];
        if (locationKeyOverride) {
            keysToRemove.push(locationKeyOverride);
        } else if (this.activeAvatarLocation) {
            keysToRemove.push(this.activeAvatarLocation);
        } else {
            keysToRemove.push(...this.buildingAvatars.keys());
        }

        keysToRemove.forEach((key) => {
            const avatarContainer = this.buildingAvatars.get(key);
            if (avatarContainer && avatarContainer.parent) {
                avatarContainer.parent.removeChild(avatarContainer);
            }
            if (this.buildingAvatars.has(key)) {
                this.buildingAvatars.delete(key);
                console.log(`🏠 Скрыта аватарка в здании ${key}`);
            }
            if (this.activeAvatarLocation === key) {
                this.activeAvatarLocation = null;
            }
        });

        if (this.carRenderer) {
            this.carRenderer.setAvatarVisible(true);
        }
    }

    /**
     * Получить Y координаты горизонтальных дорог
     * @returns {Array} массив Y координат
     */
    _getHorizontalRoadYs() {
        return this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [];
    }

    /**
     * Получить X координаты вертикальных дорог
     * @returns {Array} массив X координат
     */
    _getVerticalRoadXs() {
        return this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [];
    }

    /**
     * Получить центр назначения по ключу локации
     * @param {string} locationKey - ключ локации
     * @returns {Object} координаты центра {x, y}
     */
    _getDestinationCenter(locationKey) {
        const z = this.zoneGeometry.get(locationKey);
        if (z && z.center) return z.center;
        // fallback: из статического конфига
        const CONFIG = this.dependencies.get('config');
        const def = CONFIG.ZONES[locationKey];
        const verticalRoadXs = this._getVerticalRoadXs();
        const horizontalRoadYs = this._getHorizontalRoadYs();
        if (!def) return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
        if (def.type === 'rect') return { x: def.x + def.w / 2, y: def.y + def.h / 2 };
        if (def.type === 'circle') return { x: def.x, y: def.y };
        return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
    }

    _gameTimeToDate(gameTime) {
        return new Date(
            gameTime.year,
            gameTime.month,
            gameTime.day,
            Math.floor(gameTime.hours),
            Math.floor(gameTime.minutes),
            0,
            0
        );
    }

    /**
     * Инициализировать сущности игры
     * @param {number} currentRouteIndex - текущий индекс маршрута
     * @param {Object} savedCarState - сохраненное состояние машины
     * @param {Object} carRenderer - рендерер машины
     */
    _initEntities(currentRouteIndex, savedCarState, carRenderer) {
        // Обновляем инициализацию carEntity с актуальными параметрами
        this.carEntity.init({
            // currentRouteIndex теперь управляется через stateManager
            savedState: savedCarState,
            onArrival: (destination) => {
                console.log(`🚗 Машина прибыла в ${destination.name}`);
                this.checkArrival();
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
                this.carEntity.setSprite(carSprite);
            }
            if (avatar) {
                this.carEntity.setAvatar(avatar);
            }
            
            if (carSprite) {
                this.carEntity.setPosition({ x: carSprite.position.x, y: carSprite.position.y });
                this.carEntity.setRotation(carSprite.rotation);
            }
        }

        // shinaEntity уже создан в конструкторе, дополнительная инициализация не требуется
    }

    /**
     * Настроить мир игры (слои, светофоры, UI)
     * @param {Map} intersectionKeyToTL - карта светофоров
     */
    _setupWorld(intersectionKeyToTL) {
        // Получаем слои из экземпляра игры - теперь используем напрямую через this
        const world = this.world;
        const gridLayer = this.gridLayer;
        const roadsLayer = this.roadsLayer;
        const lotsLayer = this.lotsLayer;
        const zonesLayer = this.zonesLayer;
        const labelsLayer = this.labelsLayer;
        const intersectionsLayer = this.intersectionsLayer;
        const decorLayer = this.decorLayer;
        const trafficLightsLayer = this.trafficLightsLayer;
        const borderLayer = this.borderLayer;
        const lightingLayer = this.lightingLayer;
        const uiLayer = this.uiLayer;

        // Инициализируем WorldRenderer с слоями
        this.worldRenderer.init(world, {
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

        
        world.addChild(gridLayer);
        world.addChild(roadsLayer);
        world.addChild(intersectionsLayer);
        world.addChild(lotsLayer);
        world.addChild(zonesLayer);
        world.addChild(labelsLayer);
        world.addChild(borderLayer);

        // Используем WorldRenderer для отрисовки базовых элементов
        this.worldRenderer.render(this.zoneGeometry);
        // Светофоры создаются в отдельном слое (пока что в trafficLightsLayer)
        this._createTrafficLightsForAllIntersections(this.trafficLightsLayer, intersectionKeyToTL, this.TRAFFIC_LIGHTS_CONFIG);

        // Добавляем decorLayer и trafficLightsLayer в правильном порядке
        // (cityNightOverlay будет добавлен позже через DayNightManager)
        decorLayer.zIndex = 500; // Поверх cityNightOverlay (400)
        trafficLightsLayer.zIndex = 500; // Поверх cityNightOverlay (400)
        
        world.addChild(decorLayer);
        world.addChild(trafficLightsLayer);

        // Добавляем слой освещения ПЕРЕД UI (но после ночного оверлея)
        lightingLayer.zIndex = 1000; // поверх ночного оверлея
        this.app.stage.addChild(lightingLayer);

        // Добавляем UI слой поверх всего
        uiLayer.zIndex = 2000; // поверх всего
        this.app.stage.addChild(uiLayer);

        const pauseButton = document.getElementById('pause-button');
        const speedButton = document.getElementById('speed-button');
        const zoomButton = document.getElementById('zoom-button');
        const zoomInButton = document.getElementById('zoom-in-button');
        const zoomOutButton = document.getElementById('zoom-out-button');

        // Настраиваем кнопку паузы
        pauseButton.addEventListener('click', () => {
            this.pauseManager.togglePause();
            this.timeManager.setPaused(this.pauseManager.isPaused());
            this.pauseManager.showSpeedNotification(this.pauseManager.isPaused() ? 'ПАУЗА' : 'ВОЗОБНОВЛЕНО');
        });

        // Настраиваем кнопку скорости
        speedButton.addEventListener('click', () => {
            const currentSpeed = this.pauseManager.getSpeedMultiplier();
            let newSpeed;
            
            // Цикл: x1 → x2 → x5 → x1
            if (currentSpeed === 1) {
                newSpeed = 2;
            } else if (currentSpeed === 2) {
                newSpeed = 5;
            } else {
                newSpeed = 1;
            }
            
            this.pauseManager.setSpeedBoosted(newSpeed > 1);
            this.pauseManager.setSpeedMultiplier(newSpeed);
            this.timeManager.setSpeedMultiplier(newSpeed);

            // Обновляем внешний вид кнопки
            speedButton.textContent = `x${newSpeed}`;
            speedButton.classList.toggle('boosted', newSpeed > 1);

            // Логируем изменение
            console.log(`⚡ СКОРОСТЬ ИГРЫ: x${newSpeed} ${newSpeed > 1 ? 'УСКОРЕНО' : 'НОРМАЛЬНАЯ'}`);

            // Показываем уведомление
            this.pauseManager.showSpeedNotification(`СКОРОСТЬ x${newSpeed}`);
        });

        const initialSpeed = this.pauseManager.getSpeedMultiplier();
        speedButton.textContent = `x${initialSpeed}`;
        speedButton.classList.toggle('boosted', initialSpeed > 1);

        // Настраиваем кнопку масштабирования
        zoomButton.addEventListener('click', () => {
            const panningController = this.dependencies.get('panningController');
            if (panningController) {
                panningController.toggleZoom();
                this.uiRenderer.updateZoomButton();
            }
        });

        // Настраиваем кнопки увеличения/уменьшения масштаба
        zoomInButton.addEventListener('click', () => {
            const panningController = this.dependencies.get('panningController');
            if (panningController) {
                panningController.zoomIn();
                this.uiRenderer.updateZoomButton();
            }
        });

        zoomOutButton.addEventListener('click', () => {
            const panningController = this.dependencies.get('panningController');
            if (panningController) {
                panningController.zoomOut();
                this.uiRenderer.updateZoomButton();
            }
        });

        // PanningController уже создан и зарегистрирован в контейнере зависимостей выше

        // Лёгкая задержка, чтобы зона успела отрисоваться, затем построим первый путь
        setTimeout(() => {
            // перестроим путь, когда геометрия зон уже известна
            if (this.carEntity) {
                const pathBuilder = this.dependencies.get('pathBuilder');
                const newPath = pathBuilder.buildCarPath(this.carEntity, this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this._getDestinationCenter.bind(this), this.debugLogAlways.bind(this));
                this.carEntity.setPath(newPath);
            }
        }, 0);
    }

    /**
     * Создать светофоры для всех перекрестков
     * @param {Object} layer - слой для светофоров
     * @param {Map} intersectionKeyToTL - карта светофоров
     * @param {Array} trafficLightsConfig - конфигурация светофоров
     */
    _createTrafficLightsForAllIntersections(layer, intersectionKeyToTL, trafficLightsConfig) {
        // Очищаем переданную карту
        intersectionKeyToTL.clear();
        
        // intersectionKeyToTL теперь доступен через контейнер зависимостей
        // window.intersectionKeyToTL больше не нужен
        const { maxVerticalPos } = this.worldRenderer ? this.worldRenderer.getRoadPositions() : { maxVerticalPos: 0 };
        const horizontalRoadYs = this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [];
        const verticalRoadXs = this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [];

        for (let j = 0; j < horizontalRoadYs.length; j++) {
            for (let i = 0; i < verticalRoadXs.length; i++) {
                const x = verticalRoadXs[i];
                const y = horizontalRoadYs[j];

                if (!this._shouldHaveTrafficLight(i, j, trafficLightsConfig)) {
                    continue; // пропускаем этот перекресток
                }

                // Определяем, какие дороги есть в каждом направлении
                const roadConnections = {
                    north: j > 0 || (x === maxVerticalPos), // дорога на север: внутренний ряд ИЛИ правая дорога (выезд за город)
                    south: j < horizontalRoadYs.length - 1 || (x === maxVerticalPos), // дорога на юг: внутренний ряд ИЛИ правая дорога (выезд за город)
                    west: i > 0, // есть дорога на запад, если не крайний левый столбец
                    east: i < verticalRoadXs.length - 1 // есть дорога на восток, если не крайний правый столбец
                };

                const CONFIG = this.dependencies.get('config');
                
                // Создаем объект логики светофора (без PIXI-зависимостей)
                const trafficLight = new TrafficLight({
                    x,
                    y,
                    roadWidth: CONFIG.ROAD_WIDTH,
                    cycle: { green: 750, yellow: 200 },
                    roadConnections,
                    pauseManager: this.pauseManager
                });
                
                // Создаем рендерер светофора (только PIXI-код)
                const trafficLightRenderer = new TrafficLightRenderer({
                    PIXI,
                    app: this.app,
                    layer,
                    x,
                    y,
                    roadWidth: CONFIG.ROAD_WIDTH,
                    lampRadius: 9,
                    roadConnections
                });
                
                const key = `${x},${y}`;
                intersectionKeyToTL.set(key, { logic: trafficLight, renderer: trafficLightRenderer });

                // Регистрируем светофор в координаторе зеленой волны
                const trafficCoordinator = this.dependencies.get('trafficCoordinator');
                if (trafficCoordinator) {
                    trafficCoordinator.addTrafficLight(key, trafficLight, x, y);
                } else {
                    console.warn('🚦 trafficCoordinator не найден при добавлении светофора');
                }
            }
        }

        if (verticalRoadXs.length > 0 && horizontalRoadYs.length > 0) {
            const trafficCoordinator = this.dependencies.get('trafficCoordinator');
            if (trafficCoordinator) {
                trafficCoordinator.setWaveOrigin(verticalRoadXs[0], horizontalRoadYs[0]);
            } else {
                console.warn('🚦 trafficCoordinator не найден в контейнере зависимостей');
            }
        }
        
        console.log(`🚦 Создано светофоров: ${intersectionKeyToTL.size}`);
    }

    /**
     * Проверить, должен ли быть светофор на данном перекрестке
     * @param {number} i - индекс столбца
     * @param {number} j - индекс ряда
     * @param {Array} trafficLightsConfig - конфигурация светофоров
     * @returns {boolean} true если должен быть светофор
     */
    _shouldHaveTrafficLight(i, j, trafficLightsConfig) {
        const coord = String.fromCharCode(65 + i) + (j + 1);
        const hasConfig = trafficLightsConfig ? true : false;
        const includes = hasConfig ? trafficLightsConfig.includes(coord) : false;
        return includes;
    }

    /**
     * Настроить layout игры
     */
    _layout() {
        const w = 1200;
        const h = 800;
        const CONFIG = this.dependencies.get('config');
        const scale = Math.min(w / CONFIG.WORLD_WIDTH, h / CONFIG.WORLD_HEIGHT);

        const panningController = this.dependencies.get('panningController');
        if (!panningController || panningController.getCurrentScale() === 1) {
            this.world.scale.set(scale);
            this.world.pivot.set(0, 0);
            this.world.position.set(
                (w - CONFIG.WORLD_WIDTH * scale) / 2,
                (h - CONFIG.WORLD_HEIGHT * scale) / 2
            );
        }

        this.labelsLayer.children.forEach(label => {
            label.scale.set(1 / scale);
        });

        // Светофоры теперь внутри world, поэтому синхронизация не нужна
        
        this._initEntities(this.stateManager.getCurrentRouteIndex(), this.stateManager.getSavedCarState(), this.carRenderer);
    }

    /**
     * Создать машину и связанные компоненты
     * @param {number} currentRouteIndex - текущий индекс маршрута
     * @param {Object} savedCarState - сохраненное состояние машины
     * @param {Object} intersectionKeyToTL - карта светофоров
     * @param {Object} uiRenderer - рендерер UI
     * @param {Function} debugLogAlways - функция отладки
     */
    _createCar(currentRouteIndex, savedCarState, intersectionKeyToTL, uiRenderer, debugLogAlways) {
        // Создаем рендерер машины
        const CONFIG = this.dependencies.get('config');
        const carRenderer = new CarRenderer(CONFIG, this.pauseManager);
        
        const car = carRenderer.createCar({
            carPath: [],
            // currentRouteIndex теперь управляется через stateManager
            savedCarState: savedCarState,
            getDestinationCenter: this._getDestinationCenter.bind(this)
        });
        
        const avatar = carRenderer.getAvatar();
        
        // CarTrafficController и PathBuilder теперь создаются в init() и доступны через контейнер зависимостей
        const carTrafficController = this.dependencies.get('carTrafficController');
        const pathBuilder = this.dependencies.get('pathBuilder');
        
        // Делаем дополнительные переменные глобально доступными для совместимости (временно)
        // window.carTrafficController больше не нужен - доступен через контейнер зависимостей
        // window.pathBuilder больше не нужен - доступен через контейнер зависимостей
        // window.intersectionKeyToTL больше не нужен - доступен через контейнер зависимостей
        // window.getDestinationCenter больше не нужен - метод доступен через this._getDestinationCenter

        const routeIndex = this.stateManager.getCurrentRouteIndex();
        const initialTask = this.scheduleManager.getTaskByIndex(routeIndex);
        const stayTimer = initialTask?.duration || 0;
        
        // Обновляем индекс маршрута в UIRenderer
        if (uiRenderer) {
            uiRenderer.setCurrentRouteIndex(routeIndex);
        }

        // Не начинаем поездку сразу - она начнется при выходе из здания
        const carPath = pathBuilder.buildCarPath(this.carEntity, routeIndex, savedCarState, this._getDestinationCenter.bind(this), debugLogAlways);
        
        // Если carEntity уже создан, обновляем его путь
        if (this.carEntity) {
            this.carEntity.setPath(carPath);
            this.carEntity.setAtDestination(true);
            this.carEntity.setStayTimer(stayTimer);
        }
        this.stateManager.setStayTotalDuration(stayTimer);
        
        // Инициализация таймера пребывания теперь происходит в StateManager

        this.decorLayer.addChild(car);

        uiRenderer.updateRouteDisplay(this.carEntity ? this.carEntity.isAtDestination() : false);
        
        return {
            carRenderer,
            carTrafficController,
            pathBuilder,
            routeIndex,
            stayTimer
        };
    }

    /**
     * Парсит буквенно-цифровые координаты в индексы
     * @param {string} coord - координата в формате 'A1', 'B2', etc.
     * @returns {Object} объект с индексами {i, j}
     */
    _parseIntersectionCoordinate(coord) {
        const letter = coord.charAt(0);
        const number = parseInt(coord.slice(1));
        const i = letter.charCodeAt(0) - 65; // A=0, B=1, C=2...
        const j = number - 1; // 1=0, 2=1, 3=2...
        return { i, j };
    }

    /**
     * Проверяет, есть ли светофор на данном перекрестке
     * @param {number} i - индекс столбца
     * @param {number} j - индекс ряда
     * @returns {boolean} true, если на перекрестке должен быть светофор
     */
    _shouldHaveTrafficLight(i, j) {
        const coord = String.fromCharCode(65 + i) + (j + 1);
        return this.TRAFFIC_LIGHTS_CONFIG.includes(coord);
    }

    /**
     * Управляет компоновкой и масштабированием игрового мира
     * @param {Object} panningController - контроллер панорамирования
     * @param {number} currentRouteIndex - текущий индекс маршрута
     * @param {Object} savedCarState - сохраненное состояние машины
     * @param {Object} carRenderer - рендерер машины
     */
    _layout(panningController, currentRouteIndex, savedCarState, carRenderer) {
        const w = 1200;
        const h = 800;
        const CONFIG = this.dependencies.get('config');
        const scale = Math.min(w / CONFIG.WORLD_WIDTH, h / CONFIG.WORLD_HEIGHT);

        if (!panningController || panningController.getCurrentScale() === 1) {
            this.world.scale.set(scale);
            this.world.pivot.set(0, 0);
            this.world.position.set(
                (w - CONFIG.WORLD_WIDTH * scale) / 2,
                (h - CONFIG.WORLD_HEIGHT * scale) / 2
            );
        }

        this.labelsLayer.children.forEach(label => {
            label.scale.set(1 / scale);
        });

        // Светофоры теперь внутри world, поэтому синхронизация не нужна
        
        this._initEntities(currentRouteIndex, savedCarState, carRenderer);
    }

    /**
     * Функция отладки с интервалом
     * @param {string} message - сообщение для вывода
     * @param {*} data - дополнительные данные
     */
    debugLog(message, data = null) {
        if (!this.DEBUG_MODE) return;
        const now = Date.now();
        if (now - this.debugInfo.lastLogTime > this.debugInfo.logInterval) {
            console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
            this.debugInfo.lastLogTime = now;
        }
    }

    /**
     * Функция отладки без интервала (всегда выводит)
     * @param {string} message - сообщение для вывода
     * @param {*} data - дополнительные данные
     */
    debugLogAlways(message, data = null) {
        if (!this.DEBUG_MODE) return;
        console.log(`🐛 DEBUG [${new Date().toLocaleTimeString()}]: ${message}`, data || '');
    }

}

export default Game;
