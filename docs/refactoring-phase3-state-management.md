План рефакторинга: Централизация Управления Состоянием
Цель: Изолировать всё глобальное состояние игрового процесса (currentRouteIndex, savedCarState и т.д.) из main.js и Game.js в новый класс StateManager.js. Это обеспечит "Единый Источник Истины" (SSoT), сделает состояние предсказуемым, упростит отладку и подготовит проект к функциям сохранения/загрузки.
Этап 1: Создание StateManager (1 шаг)
Шаг 1.1: Создать класс StateManager.js ⏳
Файл (новый): src/game/StateManager.js
Действие:
Создать класс StateManager с конструктором.
В конструкторе инициализировать свойства: this.currentRouteIndex = 0;, this.savedCarState = null;, this.lastStayTimerUpdate = 0;, this.lastStayTimerDay = 0;.
Создать простые get/set методы для этих свойств (например, getCurrentRouteIndex(), setCurrentRouteIndex(index)).
В классе Game.js импортировать StateManager и создать его экземпляр в конструкторе: this.stateManager = new StateManager();.
Проверка: Игра запускается без ошибок. В консоли браузера, через объект game, можно получить доступ к game.stateManager и его начальным свойствам.
Статус: ⏳ Планируется
Этап 2: Миграция состояния игрового процесса (3 шага)
Шаг 2.1: Перенести управление currentRouteIndex ⏳
Файлы: src/game/Game.js, src/main.js (если переменная еще там)
Действие:
Удалить глобальную переменную currentRouteIndex из main.js.
В классе Game.js найти все использования currentRouteIndex и заменить их на вызовы this.stateManager.getCurrentRouteIndex() ( для чтения) и this.stateManager.setCurrentRouteIndex(newIndex) (для записи).
Проверка: Машина по-прежнему корректно следует по всему маршруту от дома до бокса и обратно. Последовательность пунктов назначения не нарушена.
Статус: ⏳ Планируется
Шаг 2.2: Перенести управление savedCarState ⏳
Файл: src/game/Game.js
Действие:
Удалить свойство savedCarState из класса Game (или глобальную переменную из main.js).
Заменить все его использования в Game.js на вызовы this.stateManager.getSavedCarState() и this.stateManager.setSavedCarState(state).
Проверка: Машина корректно останавливается в пункте назначения, а при начале следующей поездки плавно стартует в правильном направлении, используя сохраненное состояние.
Статус: ⏳ Планируется
Шаг 2.3: Инкапсулировать логику stayTimer ⏳
Файл: src/game/Game.js, src/game/StateManager.js
Действие:
Перенести логику из метода _updateStayTimer() (в Game.js) в новый метод StateManager.js, например updateStayTimer(gameTime, currentStayDuration). Этот метод будет принимать текущее время и продолжительность, а возвращать новую продолжительность.
Перенести переменные lastStayTimerUpdate и lastStayTimerDay в StateManager в качестве private свойств.
Упростить метод _updateStayTimer() в Game.js: он будет только вызывать метод из stateManager и применять результат к carEntity.
Проверка: Таймер пребывания в локациях работает как и прежде. Машина ждет положенное время и уезжает.
Статус: ⏳ Планируется
Этап 3: Устранение дублирования и неявных зависимостей (1 шаг)
Шаг 3.1: Убрать window.isGamePaused и передать pauseManager в светофоры ⏳
Файлы: src/game/PauseManager.js, src/systems/trafficLights.js, src/game/Game.js.
Действие:
В PauseManager.js удалить строки window.isGamePaused = ....
В trafficLights.js изменить конструктор класса IntersectionTrafficLight, чтобы он принимал экземпляр pauseManager.
В IntersectionTrafficLight._onTick изменить проверку if (window.isGamePaused) на if (this.pauseManager.isPaused()).
В Game.js, при создании светофоров (внутри createTrafficLightsForAllIntersections), передать this.pauseManager в конструктор.
Проверка: При нажатии на кнопку паузы, светофоры должны "замирать" и прекращать смену фаз. При снятии с паузы — продолжать работать.
Статус: ⏳ Планируется
Этап 4: Финализация (1 шаг)
Шаг 4.1: Проверить, что всё состояние игры теперь управляется централизованно ⏳
Действие: Просмотреть Game.js и main.js на предмет оставшихся "бездомных" переменных состояния. Убедиться, что все ключевые данные процесса игры (что происходит, куда едем, сколько ждем) находятся внутри stateManager или других соответствующих менеджеров.
Проверка: Код стал чище, поток данных более предсказуем. Глобальное состояние полностью ликвидировано.
Статус: ⏳ Планируется
