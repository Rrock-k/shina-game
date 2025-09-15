# План рефакторинга: Шина 2.0 - Детальная реализация

## 📋 Обзор
Этот файл содержит детальный план рефакторинга для реализации "Шина 2.0" - расширенной версии игры с системой друзей, динамическим расписанием и принятием решений. Цель: создать полноценную симуляцию жизни персонажа с возможностью взаимодействия с друзьями и принятия решений о встречах.

## 🎯 Этап 0: ПОДГОТОВКА И РАСШИРЕНИЕ МИРА (Foundation & World Expansion)

### 0.1 Расширение gameConfig.js: Централизация всех новых параметров ✅ (В ПРОЦЕССЕ)
- **0.1.1** Добавить секцию `BALANCING` с параметрами балансировки ✅ (ВЫПОЛНЕНО)
  - Добавить `SIMULATION_MESSAGES_PER_3_HOURS: 3` ✅
  - Добавить `FRIENDSHIP_PRIORITY_START: 0` ✅
  - Добавить `FRIENDSHIP_PRIORITY_MAX: 100` ✅
  - Добавить `FATIGUE_GROWTH_RATE: 0.1` ✅
  - Добавить `FATIGUE_MAX: 100` ✅
  - **Файлы**: `src/config/gameConfig.js` ✅
  - **Проверка**: ✅ Все новые параметры доступны через `CONFIG.BALANCING`

- **0.1.2** Добавить секцию `TASK_PRIORITIES` с приоритетами задач ✅ (ВЫПОЛНЕНО)
  - Добавить `SLEEP: 100`, `WORK: 90`, `WORK_WITH_STUDENTS: 85`, `CONSTRUCTION_VISIT: 80`
  - Добавить `RELATIVES_VISIT: 70`, `BARBER: 50`, `SHOPPING: 40`
  - Добавить `PARK_WALK: 30`, `DOMESTIC_TASK: 20`, `FRIENDS_MEETING: 0`
  - **Файлы**: `src/config/gameConfig.js` ✅
  - **Проверка**: ✅ Приоритеты доступны через `CONFIG.TASK_PRIORITIES`

- **0.1.3** Добавить новые цвета для локаций
  - Добавить `redberry: 0xffa07a`, `shop: 0xadd8e6`, `market: 0x90ee90`
  - Добавить `barber: 0xf0e68c`, `construction: 0xd2b48c`, `park: 0x3cb371`
  - **Файлы**: `src/config/gameConfig.js`
  - **Проверка**: ✅ Новые цвета доступны через `CONFIG.COLORS`

### 0.2 Расширение Игрового Мира: Добавление новых локаций ✅ (ПЛАНИРУЕТСЯ)
- **0.2.1** Добавить расположения в `ZONE_LAYOUT`
  - Добавить `redberry: { block: { i: 3, j: 2 }, cells: [[1, 2]] }`
  - Добавить `shop: { block: { i: 0, j: 1 }, cells: [[0, 1], [1, 1]] }`
  - Добавить `market: { block: { i: 0, j: 0 }, cells: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]] }`
  - Добавить `barber: { block: { i: 6, j: 1 }, cells: [[0, 0]] }`
  - Добавить `construction1: { block: { i: 4, j: 0 }, cells: [[0, 0]] }`
  - Добавить `construction2: { block: { i: 2, j: 2 }, cells: [[1, 0]] }`
  - Добавить парки: `park_large1`, `park_large2`, `park_medium1`
  - **Файлы**: `src/config/gameConfig.js`
  - **Проверка**: ✅ Новые зоны отображаются на карте

- **0.2.2** Добавить метки в `ZONES`
  - Добавить метки для всех новых локаций
  - Добавить `redberry: { label: 'Редбери' }`
  - Добавить `shop: { label: 'Магазин' }`, `market: { label: 'Рынок' }`
  - Добавить `barber: { label: 'Барбершоп' }`
  - Добавить `construction1: { label: 'Стройка 1' }`, `construction2: { label: 'Стройка 2' }`
  - Добавить метки для парков
  - **Файлы**: `src/config/gameConfig.js`
  - **Проверка**: ✅ Метки отображаются при наведении на зоны

## 🎯 Этап 1: ЯДРО ЛОГИКИ - КОНЕЧНЫЙ АВТОМАТ И СИСТЕМА ПРИОРИТЕТОВ

### 1.1 Рефакторинг Shina.js: Внедрение Конечного Автомата ✅ (ПЛАНИРУЕТСЯ)
- **1.1.1** Создать базовый класс `BaseState.js`
  - Создать файл `src/entities/states/BaseState.js`
  - Определить интерфейс: `enter(shina, task)`, `execute(shina)`, `exit(shina)`
  - Добавить методы: `onMessage(shina, message)`, `onPhoneCall(shina, call)`
  - **Файлы**: `src/entities/states/BaseState.js` (новый файл)
  - **Проверка**: ✅ Базовый класс создан и экспортирован

- **1.1.2** Создать конкретные классы состояний
  - Создать `SleepingState.js`: `onMessage` и `onPhoneCall` возвращают `false`
  - Создать `DrivingState.js`: `onMessage` возвращает `true`, `onPhoneCall` — `false`
  - Создать `IdleState.js`: оба метода возвращают `true`
  - Создать `BusyState.js`: оба метода возвращают `false`
  - Создать `AtRedberryState.js`: оба метода возвращают `false`, в `exit()` обнуляет `friendshipPriority`
  - **Файлы**: `src/entities/states/` (5 новых файлов)
  - **Проверка**: ✅ Все состояния созданы и наследуют BaseState

- **1.1.3** Создать класс `StateMachine.js`
  - Создать файл `src/entities/StateMachine.js`
  - Реализовать методы: `changeState(newState)`, `update()`, `getCurrentState()`
  - Добавить валидацию переходов между состояниями
  - **Файлы**: `src/entities/StateMachine.js` (новый файл)
  - **Проверка**: ✅ StateMachine корректно управляет переходами

- **1.1.4** Модифицировать `Shina.js` для использования StateMachine
  - Заменить `this.currentState = 'available'` на `this.stateMachine = new StateMachine(this, new IdleState())`
  - В `update()` вызывать `this.stateMachine.update()`
  - В `receiveMessage()` делегировать вызов `this.stateMachine.currentState.onMessage()`
  - Добавить метод `receivePhoneCall()` с делегированием
  - **Файлы**: `src/entities/Shina.js`
  - **Проверка**: ✅ Шина использует StateMachine, все состояния работают корректно

### 1.2 Реализация Системы Приоритетов ✅ (ПЛАНИРУЕТСЯ)
- **1.2.1** Добавить свойства приоритетов в `Shina.js`
  - Добавить `this.friendshipPriority = CONFIG.BALANCING.FRIENDSHIP_PRIORITY_START`
  - Добавить `this.fatigueLevel = 0`
  - Добавить `this.lastPriorityUpdate = Date.now()`
  - **Файлы**: `src/entities/Shina.js`
  - **Проверка**: ✅ Свойства инициализированы в конструкторе

- **1.2.2** Реализовать метод `_updatePriorities(delta)`
  - Добавить логику роста `friendshipPriority` со временем
  - Добавить логику роста `fatigueLevel` при активности
  - Использовать константы из `CONFIG.BALANCING`
  - Вызывать в `update()` каждый кадр
  - **Файлы**: `src/entities/Shina.js`
  - **Проверка**: ✅ Приоритеты изменяются со временем согласно формулам

## 🎯 Этап 2: ИГРОВОЙ ЦИКЛ - ДИНАМИЧЕСКАЯ СИСТЕМА ЗАДАЧ И РАСПИСАНИЯ

### 2.1 Улучшение сущности Task ✅ (ПЛАНИРУЕТСЯ)
- **2.1.1** Создать класс `Task.js`
  - Создать файл `src/game/Task.js`
  - Добавить свойства: `id`, `name`, `location`, `startTime`, `endTime`, `duration`
  - Добавить свойства: `priority`, `isMeeting`, `dynamicPriority`, `status`
  - Добавить методы: `isCompleted()`, `isCancelled()`, `isActive()`
  - **Файлы**: `src/game/Task.js` (новый файл)
  - **Проверка**: ✅ Класс Task создан с полным API

- **2.1.2** Добавить валидацию и утилиты для Task
  - Добавить метод `calculateEndTime()` для автоматического вычисления `endTime`
  - Добавить метод `updateDynamicPriority(newPriority)` для встреч с друзьями
  - Добавить метод `cancel()` для отмены задач
  - **Файлы**: `src/game/Task.js`
  - **Проверка**: ✅ Все утилиты работают корректно

### 2.2 Создание динамического ScheduleManager ✅ (ПЛАНИРУЕТСЯ)
- **2.2.1** Создать класс `ScheduleManager.js`
  - Создать файл `src/game/ScheduleManager.js`
  - Добавить свойство `this.dailyTasks = []` (отсортированный по startTime)
  - Добавить метод `generateDailySchedule(gameDate)` для генерации базового расписания
  - **Файлы**: `src/game/ScheduleManager.js` (новый файл)
  - **Проверка**: ✅ ScheduleManager создан с базовой структурой

- **2.2.2** Реализовать метод `addTask(task)`
  - Добавить вставку задачи в `dailyTasks` с сохранением сортировки
  - Добавить валидацию конфликтов времени
  - Добавить логирование добавления задач
  - **Файлы**: `src/game/ScheduleManager.js`
  - **Проверка**: ✅ Задачи добавляются в правильном порядке

- **2.2.3** Реализовать метод `findFreeTimeSlot(requestedDate, durationHours)`
  - Добавить алгоритм поиска свободных окон в расписании
  - Проверить интервал от начала дня до первой задачи
  - Проверить интервалы между задачами
  - Проверить интервал от последней задачи до конца дня
  - **Файлы**: `src/game/ScheduleManager.js`
  - **Проверка**: ✅ Алгоритм находит корректные свободные окна

- **2.2.4** Реализовать метод `getUpcomingTask()`
  - Найти первую задачу со статусом не `COMPLETED` или `CANCELLED`
  - Вернуть `null` если задач нет
  - **Файлы**: `src/game/ScheduleManager.js`
  - **Проверка**: ✅ Метод возвращает следующую активную задачу

### 2.3 Интеграция в игровой цикл ✅ (ПЛАНИРУЕТСЯ)
- **2.3.1** Интегрировать ScheduleManager в Game.js
  - Создать `this.scheduleManager = new ScheduleManager()` в конструкторе
  - В `update()` проверять наступление нового дня и вызывать `generateDailySchedule()`
  - Передавать `scheduleManager` в `shinaEntity.updateAI()`
  - **Файлы**: `src/game/Game.js`
  - **Проверка**: ✅ ScheduleManager интегрирован в игровой цикл

- **2.3.2** Реализовать метод `updateAI(scheduleManager)` в Shina.js
  - Получить `upcomingTask` из scheduleManager
  - Сравнить с `currentTask` и инициировать смену состояния при необходимости
  - Обновлять статус задач при прибытии/завершении
  - **Файлы**: `src/entities/Shina.js`
  - **Проверка**: ✅ Шина следует динамическому расписанию

## 🎯 Этап 3: СИСТЕМА ВЗАИМОДЕЙСТВИЯ - "ДРУЗЬЯ"

### 3.1 Создание CommunicationManager ✅ (ПЛАНИРУЕТСЯ)
- **3.1.1** Создать класс `CommunicationManager.js`
  - Создать файл `src/systems/CommunicationManager.js`
  - Добавить свойства: `this.messageQueue = []`, `this.lastMessageTime = 0`
  - Добавить метод `generateMessage()` для создания случайных сообщений
  - **Файлы**: `src/systems/CommunicationManager.js` (новый файл)
  - **Проверка**: ✅ CommunicationManager создан с базовой функциональностью

- **3.1.2** Реализовать эмуляцию входящих звонков и СМС
  - Добавить метод `simulateIncomingMessage()` с использованием `CONFIG.BALANCING.SIMULATION_MESSAGES_PER_3_HOURS`
  - Добавить метод `simulatePhoneCall()` для звонков
  - Добавить таймеры для периодической генерации сообщений
  - **Файлы**: `src/systems/CommunicationManager.js`
  - **Проверка**: ✅ Сообщения генерируются с правильной частотой

### 3.2 Введение сущности Invitation ✅ (ПЛАНИРУЕТСЯ)
- **3.2.1** Создать класс `Invitation.js`
  - Создать файл `src/entities/Invitation.js`
  - Добавить свойства: `id`, `from`, `message`, `proposedTime`, `location`, `priority`
  - Добавить методы: `isExpired()`, `accept()`, `decline()`, `getTimeUntilExpiry()`
  - **Файлы**: `src/entities/Invitation.js` (новый файл)
  - **Проверка**: ✅ Класс Invitation создан с полным API

- **3.2.2** Интегрировать Invitation с CommunicationManager
  - Добавить генерацию приглашений в `simulateIncomingMessage()`
  - Добавить очередь приглашений в CommunicationManager
  - **Файлы**: `src/systems/CommunicationManager.js`
  - **Проверка**: ✅ Приглашения генерируются и обрабатываются

### 3.3 Интеграция с Shina.js ✅ (ПЛАНИРУЕТСЯ)
- **3.3.1** Добавить обработку входящих сообщений в зависимости от состояния
  - Модифицировать `receiveMessage()` для проверки состояния через StateMachine
  - Добавить логику отложенной обработки сообщений
  - **Файлы**: `src/entities/Shina.js`
  - **Проверка**: ✅ Сообщения обрабатываются согласно текущему состоянию

- **3.3.2** Интегрировать CommunicationManager в игровой цикл
  - Добавить CommunicationManager в Game.js
  - Вызывать `update()` каждый кадр
  - **Файлы**: `src/game/Game.js`
  - **Проверка**: ✅ CommunicationManager работает в игровом цикле

## 🎯 Этап 4: КУЛЬМИНАЦИЯ - ПРИНЯТИЕ РЕШЕНИЙ И УСЛОВИЕ ПОБЕДЫ

### 4.1 Реализация DecisionEngine ✅ (ПЛАНИРУЕТСЯ)
- **4.1.1** Создать класс `DecisionEngine.js`
  - Создать файл `src/systems/DecisionEngine.js`
  - Добавить метод `analyzeInvitation(invitation, currentTask, shinaState)`
  - Реализовать алгоритм сравнения приоритетов
  - **Файлы**: `src/systems/DecisionEngine.js` (новый файл)
  - **Проверка**: ✅ DecisionEngine создан с базовой логикой анализа

- **4.1.2** Реализовать логику принятия решений
  - Добавить сравнение `invitation.priority` с `currentTask.priority`
  - Учесть `shina.friendshipPriority` и `shina.fatigueLevel`
  - Добавить случайный фактор для реалистичности
  - **Файлы**: `src/systems/DecisionEngine.js`
  - **Проверка**: ✅ Решения принимаются на основе приоритетов

### 4.2 Механика отмены задач ✅ (ПЛАНИРУЕТСЯ)
- **4.2.1** Реализовать логику отмены текущих дел ради встречи
  - Добавить метод `cancelCurrentTask()` в ScheduleManager
  - Добавить метод `rescheduleTask(task, newTime)` для переноса задач
  - **Файлы**: `src/game/ScheduleManager.js`
  - **Проверка**: ✅ Задачи корректно отменяются и переносятся

- **4.2.2** Интегрировать отмену задач с DecisionEngine
  - При принятии приглашения отменять текущую задачу
  - Добавлять встречу в расписание
  - **Файлы**: `src/systems/DecisionEngine.js`
  - **Проверка**: ✅ Принятие приглашений корректно влияет на расписание

### 4.3 Проверка условия победы ✅ (ПЛАНИРУЕТСЯ)
- **4.3.1** Реализовать триггер на успешное принятие приглашения
  - Добавить проверку в `DecisionEngine.acceptInvitation()`
  - Добавить событие победы при принятии приглашения в "Редбери"
  - **Файлы**: `src/systems/DecisionEngine.js`
  - **Проверка**: ✅ Условие победы срабатывает корректно

## 🎯 Этап 5: ФИНАЛИЗАЦИЯ И ПОЛЬЗОВАТЕЛЬСКИЙ ОПЫТ

### 5.1 Реализация экрана победы "УРАААА" ✅ (ПЛАНИРУЕТСЯ)
- **5.1.1** Создать компонент VictoryScreen
  - Создать файл `src/rendering/VictoryScreen.js`
  - Добавить анимацию "УРАААА" с эффектами
  - Добавить кнопку "Играть снова"
  - **Файлы**: `src/rendering/VictoryScreen.js` (новый файл)
  - **Проверка**: ✅ Экран победы отображается при достижении цели

- **5.1.2** Интегрировать VictoryScreen в Game.js
  - Добавить показ экрана при срабатывании условия победы
  - Добавить логику перезапуска игры
  - **Файлы**: `src/game/Game.js`
  - **Проверка**: ✅ Экран победы интегрирован в игровой цикл

### 5.2 Интеграция с JournalManager ✅ (ПЛАНИРУЕТСЯ)
- **5.2.1** Добавить записи о принятии приглашения и встрече
  - Расширить JournalManager для поддержки событий друзей
  - Добавить методы: `logInvitationReceived()`, `logInvitationAccepted()`, `logMeetingCompleted()`
  - **Файлы**: `src/game/JournalManager.js`
  - **Проверка**: ✅ События друзей записываются в журнал

- **5.2.2** Добавить статистику взаимодействий
  - Добавить подсчет принятых/отклоненных приглашений
  - Добавить время, проведенное с друзьями
  - **Файлы**: `src/game/JournalManager.js`
  - **Проверка**: ✅ Статистика корректно ведется и отображается

### 5.3 Подготовка к симуляции баланса ✅ (ПЛАНИРУЕТСЯ)
- **5.3.1** Обеспечить легкий доступ ко всем параметрам из CONFIG.BALANCING
  - Добавить метод `getBalancingConfig()` в Game.js
  - Создать утилиты для изменения параметров в runtime
  - **Файлы**: `src/game/Game.js`
  - **Проверка**: ✅ Все параметры балансировки доступны для настройки

- **5.3.2** Добавить отладочную панель для балансировки
  - Создать UI для изменения параметров в реальном времени
  - Добавить сброс к значениям по умолчанию
  - **Файлы**: `src/rendering/UIRenderer.js`
  - **Проверка**: ✅ Отладочная панель позволяет настраивать баланс

## 📊 Статистика планируемых этапов
- **Этап 0**: 2 задачи - 0 ВЫПОЛНЕНО (0/2)
- **Этап 1**: 2 задачи - 0 ВЫПОЛНЕНО (0/2)  
- **Этап 2**: 3 задачи - 0 ВЫПОЛНЕНО (0/3)
- **Этап 3**: 3 задачи - 0 ВЫПОЛНЕНО (0/3)
- **Этап 4**: 3 задачи - 0 ВЫПОЛНЕНО (0/3)
- **Этап 5**: 3 задачи - 0 ВЫПОЛНЕНО (0/3)
- **Всего планируемых**: 16 задач, 0 ВЫПОЛНЕНО

## 🔗 Связанные файлы
- Исходный план: `shina2_0.md`
- Технический долг: `tech-debt.md`
- Архитектура проекта: `final-architecture.md`
