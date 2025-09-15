import { TimeManager } from './TimeManager.js';
import { PauseManager } from './PauseManager.js';
import { DayNightManager } from './DayNightManager.js';
import { JournalManager } from './JournalManager.js';
import { WorldRenderer } from '../rendering/WorldRenderer.js';
import { UIRenderer } from '../rendering/UIRenderer.js';
import { CarRenderer } from '../rendering/CarRenderer.js';
import { Car } from '../entities/Car.js';
import { Shina } from '../entities/Shina.js';
import { CarTrafficController } from '../systems/carTrafficControl.js';
import { PathBuilder } from '../systems/PathBuilder.js';
import { CONFIG } from '../config/gameConfig.js';

/**
 * Главный класс игры - централизует управление игровым состоянием и циклом
 */
class Game {
    constructor() {
        console.log('Game constructor called');
        
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
        window.world = this.world;
        window.decorLayer = this.decorLayer;
        window.trafficLightsLayer = this.trafficLightsLayer;
        
        // Создаем менеджеры
        this.timeManager = new TimeManager();
        this.pauseManager = new PauseManager();
        this.journalManager = new JournalManager(this.timeManager);
        this.dayNightManager = new DayNightManager(PIXI, CONFIG);
        
        // Синхронизируем менеджеры
        this.timeManager.setSpeedMultiplier(this.pauseManager.getSpeedMultiplier());
        this.timeManager.setPaused(this.pauseManager.isPaused());
        
        // Устанавливаем начальное время в журнале
        this.journalManager.setLocationStartTime('Дом');
        
        // Создаем рендереры
        this.worldRenderer = new WorldRenderer(CONFIG, this.app);
        this.uiRenderer = new UIRenderer(CONFIG, this.timeManager, this.pauseManager, this.dayNightManager, null, this.journalManager);
        
        // Создаем сущности
        this.carEntity = new Car(CONFIG, this.pauseManager);
        this.shinaEntity = new Shina(CONFIG);
        
        // Инициализируем геометрию зон
        this.zoneGeometry = new Map(); // key -> { center:{x,y}, bounds:{x,y,w,h} | {x,y,r}, type }
        
        // Переменные для таймера пребывания в здании
        this.lastStayTimerUpdate = 0;
        this.lastStayTimerDay = 0;
        
        // Делаем carEntity глобально доступным для UI (временно, до полного рефакторинга)
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
        this.dayNightManager.updateNightMode(gameTime);
        
        // Обновляем UI (включая журнал)
        if (this.uiRenderer) {
            this.uiRenderer.update();
        }
        
        // Обновляем сущности (машина и шина)
        this.updateEntities(delta);
        
        // Обновляем таймер пребывания в здании
        this.updateStayTimer();
    }
    
    /**
     * Обновляет сущности игры
     * @param {number} delta - Время, прошедшее с предыдущего кадра
     */
    updateEntities(delta) {
        // Обновляем машину
        if (this.carEntity) {
            // Получаем необходимые зависимости из глобальной области (временно)
            const carTrafficController = window.carTrafficController;
            const intersectionKeyToTL = window.intersectionKeyToTL;
            const pathBuilder = window.pathBuilder;
            const debugLog = window.debugLog;
            const debugLogAlways = window.debugLogAlways;
            const debugInfo = window.debugInfo;
            
            this.carEntity.update(delta, {
                checkArrival: () => this.checkArrival(),
                debugLog: debugLog,
                debugLogAlways: debugLogAlways,
                carTrafficController: carTrafficController,
                intersectionKeyToTL: intersectionKeyToTL,
                getVerticalRoadXs: () => this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [],
                getHorizontalRoadYs: () => this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [],
                buildCarPath: () => pathBuilder ? pathBuilder.buildCarPath(this.carEntity, window.currentRouteIndex, window.savedCarState, this._getDestinationCenter.bind(this), debugLogAlways) : [],
                updateLightBeams: undefined,
                debugInfo: debugInfo
            });
        }

        // Обновляем Шину
        if (this.shinaEntity) {
            this.shinaEntity.update({
                timeManager: this.timeManager,
                debugLog: window.debugLog
            });
        }
    }
    
    /**
     * Обновляет таймер пребывания в здании
     */
    updateStayTimer() {
        if (this.carEntity && this.carEntity.isAtDestination()) {
            const gameTime = this.timeManager.getGameTime();
            const currentTime = gameTime.hours * 60 + gameTime.minutes; // время в минутах
            const currentDay = gameTime.day; // день месяца
            
            // Инициализируем переменные для отслеживания времени
            if (this.lastStayTimerUpdate === 0) {
                this.lastStayTimerUpdate = currentTime;
                this.lastStayTimerDay = currentDay;
                return;
            }
            
            // Обновляем таймер только при изменении времени
            if (currentTime !== this.lastStayTimerUpdate || currentDay !== this.lastStayTimerDay) {
                let timeDiff;
                
                // Если день изменился, это переход через полночь
                if (currentDay !== this.lastStayTimerDay) {
                    // Время с последнего обновления до полуночи + время с полуночи до текущего момента
                    timeDiff = (24 * 60 - this.lastStayTimerUpdate) + currentTime;
                    console.log(`🌙 Переход через полночь: ${timeDiff} минут`);
                } else {
                    timeDiff = currentTime - this.lastStayTimerUpdate;
                }
                
                const newStayTimer = this.carEntity.getStayTimer() - timeDiff / 60; // переводим в игровые часы
                this.carEntity.setStayTimer(newStayTimer);
                this.lastStayTimerUpdate = currentTime;
                this.lastStayTimerDay = currentDay;
                
                if (newStayTimer <= 0) {
                    // Время пребывания закончилось, едем к следующему пункту
                    console.log('🚗 Время пребывания закончилось, продолжаем движение');
                    this.nextDestination();
                }
            }
        }
    }
    
    /**
     * Переход к следующему пункту маршрута
     */
    nextDestination() {
        console.log(`🔄 Переход к следующему пункту назначения`);
        
        // Получаем текущий индекс маршрута из глобальной области (временно)
        const currentRouteIndex = window.currentRouteIndex || 0;
        const CONFIG = window.CONFIG || this.config;
        
        // Завершаем пребывание в текущем месте
        const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
        if (this.journalManager && currentDest) {
            this.journalManager.endLocationStay(currentDest.name);
        }

        // Скрываем аватарку в текущем здании
        this.hideBuildingAvatar();

        const newRouteIndex = (currentRouteIndex + 1) % CONFIG.ROUTE_SCHEDULE.length;
        window.currentRouteIndex = newRouteIndex;
        
        // Обновляем индекс маршрута в UIRenderer
        if (this.uiRenderer) {
            this.uiRenderer.setCurrentRouteIndex(newRouteIndex);
        }
        
        // Синхронизируем с carEntity
        if (this.carEntity) {
            this.carEntity.setCurrentRouteIndex(newRouteIndex);
            this.carEntity.setAtDestination(false);
            this.carEntity.setStayTimer(0);
            
            // Обновляем путь к новому пункту назначения
            const pathBuilder = window.pathBuilder;
            if (pathBuilder) {
                const newPath = pathBuilder.buildCarPath(this.carEntity, newRouteIndex, window.savedCarState, this._getDestinationCenter.bind(this), window.debugLogAlways);
                this.carEntity.setPath(newPath);
            }
        }

        // Начинаем новую дорогу в журнале при выходе из здания
        const newDest = CONFIG.ROUTE_SCHEDULE[newRouteIndex];
        if (this.journalManager && newDest) {
            this.journalManager.startTrip(newDest.name, newDest.location);
        }

        this.uiRenderer.updateRouteDisplay(this.carEntity ? this.carEntity.isAtDestination() : false);
    }
    
    /**
     * Проверка прибытия в пункт назначения
     */
    checkArrival() {
        const currentRouteIndex = window.currentRouteIndex || 0;
        const CONFIG = window.CONFIG || this.config;
        const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
        
        if (this.carEntity && !this.carEntity.isAtDestination()) {
            console.log(`🏠 Прибытие в ${currentDest.name} (обочина)`);

            // Завершаем дорогу в журнале при входе в здание
            if (this.journalManager && currentDest) {
                this.journalManager.endTrip(currentDest.name);
                this.journalManager.setLocationStartTime(currentDest.name);
            }

            // Сохраняем состояние машины для плавного продолжения движения
            const savedCarState = this.saveCarStateForNextDestination();
            window.savedCarState = savedCarState;
            console.log(`💾 Сохранено состояние машины:`, savedCarState);

            // Синхронизируем с carEntity
            if (this.carEntity) {
                this.carEntity.setAtDestination(true);
                this.carEntity.setStayTimer(currentDest.stayHours);
            }
            
            const gameTime = this.timeManager.getGameTime();
            this.lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes; // инициализируем таймер
            this.lastStayTimerDay = gameTime.day; // инициализируем день
            this.uiRenderer.updateRouteDisplay(this.carEntity ? this.carEntity.isAtDestination() : false);
            // Показываем маленькую аватарку в здании
            this.showBuildingAvatar(currentDest.location);
        }
    }
    
    /**
     * Сохраняет состояние машины для плавного продолжения движения к следующему пункту
     */
    saveCarStateForNextDestination() {
        const currentRouteIndex = window.currentRouteIndex || 0;
        const CONFIG = window.CONFIG || this.config;
        const nextRouteIndex = (currentRouteIndex + 1) % CONFIG.ROUTE_SCHEDULE.length;
        const nextDestination = CONFIG.ROUTE_SCHEDULE[nextRouteIndex];

        if (!nextDestination) return null;

        const nextDestCenter = this._getDestinationCenter(nextDestination.location);

        // Строим путь к следующему пункту назначения, чтобы найти первый перекресток
        const carRenderer = window.carRenderer;
        const pathBuilder = window.pathBuilder;
        if (!carRenderer || !pathBuilder) return null;
        
        const currentPos = carRenderer.getCar().position;
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
            console.log(`🎯 Следующий перекресток: (${nextIntersection.x}, ${nextIntersection.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
        } else {
            const dx = nextDestCenter.x - currentPos.x;
            const dy = nextDestCenter.y - currentPos.y;
            direction = Math.atan2(dy, dx);
            console.log(`🎯 Fallback к центру назначения: (${nextDestCenter.x}, ${nextDestCenter.y}), направление: ${direction.toFixed(3)} радиан (${(direction * 180 / Math.PI).toFixed(1)}°)`);
        }

        return {
            nextDestination: nextDestination,
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
        const carRenderer = window.carRenderer;
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
        const zoneGeometry = window.zoneGeometry;
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

        console.log(`🏠 Показана аватарка в здании ${locationKey}`, {
            zone: zone,
            buildingCenter: buildingCenter,
            position: avatarContainer.position
        });
    }
    
    /**
     * Скрыть аватарку в здании
     */
    hideBuildingAvatar() {
        const currentRouteIndex = window.currentRouteIndex || 0;
        const CONFIG = window.CONFIG || this.config;
        const currentDest = CONFIG.ROUTE_SCHEDULE[currentRouteIndex];
        
        if (this.buildingAvatars) {
            const avatarContainer = this.buildingAvatars.get(currentDest.location);
            if (avatarContainer && avatarContainer.parent) {
                avatarContainer.parent.removeChild(avatarContainer);
                this.buildingAvatars.delete(currentDest.location);
                console.log(`🏠 Скрыта аватарка в здании ${currentDest.location}`);
            }
        }

        // Показываем аватарку обратно в машинке
        const carRenderer = window.carRenderer;
        if (carRenderer) {
            carRenderer.setAvatarVisible(true);
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
        const def = CONFIG.ZONES[locationKey];
        const verticalRoadXs = this._getVerticalRoadXs();
        const horizontalRoadYs = this._getHorizontalRoadYs();
        if (!def) return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
        if (def.type === 'rect') return { x: def.x + def.w / 2, y: def.y + def.h / 2 };
        if (def.type === 'circle') return { x: def.x, y: def.y };
        return { x: verticalRoadXs[0], y: horizontalRoadYs[0] };
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
            currentRouteIndex: currentRouteIndex,
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
     * Создать машину и связанные компоненты
     * @param {number} currentRouteIndex - текущий индекс маршрута
     * @param {Object} savedCarState - сохраненное состояние машины
     * @param {Object} intersectionKeyToTL - карта светофоров
     * @param {Object} uiRenderer - рендерер UI
     * @param {Function} debugLogAlways - функция отладки
     */
    _createCar(currentRouteIndex, savedCarState, intersectionKeyToTL, uiRenderer, debugLogAlways) {
        // Создаем рендерер машины
        const carRenderer = new CarRenderer(CONFIG, this.pauseManager);
        
        const car = carRenderer.createCar({
            carPath: [],
            currentRouteIndex: currentRouteIndex,
            savedCarState: savedCarState,
            getDestinationCenter: this._getDestinationCenter.bind(this)
        });
        
        const avatar = carRenderer.getAvatar();
        
        const carTrafficController = new CarTrafficController();

        const verticalRoadXs = this.worldRenderer ? this.worldRenderer.getVerticalRoadXs() : [];
        const horizontalRoadYs = this.worldRenderer ? this.worldRenderer.getHorizontalRoadYs() : [];
        console.log('🔧 Инициализация PathBuilder:', {
            verticalRoads: verticalRoadXs.length,
            horizontalRoads: horizontalRoadYs.length,
            verticalRoadXs: verticalRoadXs.slice(0, 5), // первые 5 для примера
            horizontalRoadYs: horizontalRoadYs.slice(0, 5) // первые 5 для примера
        });
        const pathBuilder = new PathBuilder(verticalRoadXs, horizontalRoadYs, CONFIG);
        
        // Делаем дополнительные переменные глобально доступными для совместимости (временно)
        window.carTrafficController = carTrafficController;
        window.pathBuilder = pathBuilder;
        window.carRenderer = carRenderer;
        window.intersectionKeyToTL = intersectionKeyToTL;
        window.getDestinationCenter = this._getDestinationCenter.bind(this);

        // Начинаем с дома
        const routeIndex = 0; // дом
        const stayTimer = CONFIG.ROUTE_SCHEDULE[0].stayHours; // устанавливаем таймер для дома
        
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
            this.carEntity.setStayTimer(CONFIG.ROUTE_SCHEDULE[0].stayHours);
        }
        
        // Инициализируем переменные таймера пребывания
        const gameTime = this.timeManager.getGameTime();
        this.lastStayTimerUpdate = gameTime.hours * 60 + gameTime.minutes;
        this.lastStayTimerDay = gameTime.day;

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

}

export default Game;
