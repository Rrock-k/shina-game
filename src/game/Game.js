import { TimeManager } from './TimeManager.js';
import { PauseManager } from './PauseManager.js';
import { DayNightManager } from './DayNightManager.js';
import { JournalManager } from './JournalManager.js';
import { WorldRenderer } from '../rendering/WorldRenderer.js';
import { UIRenderer } from '../rendering/UIRenderer.js';
import { Car } from '../entities/Car.js';
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
    }

    /**
     * Запускает игровой цикл
     */
    start() {
        // TODO: Здесь будет запуск игрового цикла
        console.log('Game start() called');
    }

    /**
     * Обновляет состояние игры на каждом кадре
     * @param {number} delta - Время, прошедшее с предыдущего кадра
     */
    update(delta) {
        // TODO: Здесь будет вся логика обновления игры
        console.log('Game update() called with delta:', delta);
    }
}

export default Game;
