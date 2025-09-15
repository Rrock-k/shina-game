# План рефакторинга: Централизация управления игрой (Оставшиеся задачи)

## 🎯 Цель
Завершить рефакторинг, перенеся всю логику управления, состоянием и игровым циклом из `main.js` в новый класс `Game.js`, как это было запланировано в `docs/final-architecture.md`. `main.js` должен стать тонкой точкой входа в приложение.

## 📋 Статус
- **Оставшиеся задачи**: Этапы 4-6 (частично выполнены)

## 🔗 Связанные файлы
- **Карта зависимостей**: `function-dependencies.md`

## 🚨 КРИТИЧЕСКИЕ ЗАДАЧИ

### 4.12 Удалить дублирующие функции из main.js ✅ (ВЫПОЛНЕНО)
- ✅ **ВЫПОЛНЕНО**: Функции перенесены в Game.js
- ✅ **ВЫПОЛНЕНО**: Функции удалены из main.js (дублирование устранено)
- **Файлы**: `src/main.js` (функции удалены, ссылки обновлены)
- **Проверка**: Функции больше не дублируются, ссылки обновлены на методы game.

**Выполненные изменения:**
- ✅ Обновлены ссылки на `checkArrival()` в `onArrival` callback
- ✅ Обновлены ссылки на `checkArrival()` в `carEntity.update()`
- ✅ Все функции теперь вызываются через `game.checkArrival()` вместо прямых вызовов

## 🟡 ВАЖНЫЕ ЗАДАЧИ

### 6.1 Удалить глобальные переменные ✅ (ВЫПОЛНЕНО)
- ✅ **ВЫПОЛНЕНО**: Глобальные переменные удалены из main.js
- ✅ **ВЫПОЛНЕНО**: Все глобальные переменные заменены на обращения к `game.*`
- **Файлы**: `src/main.js`
- **Проверка**: Глобальные переменные удалены, все ссылки обновлены.

**Удаленные переменные:**
```javascript
// УДАЛЕНЫ: теперь используются свойства game
let world, gridLayer, roadsLayer, lotsLayer, zonesLayer, labelsLayer, 
    intersectionsLayer, decorLayer, trafficLightsLayer, borderLayer, 
    uiLayer, lightingLayer, car;
let carPath = [], carSegment = 0, carProgress = 0;
let avatar;
let carTrafficController;
let pathBuilder;
let buildingAvatars = new Map();
```

**Выполненные изменения:**
- ✅ Удалены объявления глобальных переменных (строки 22-27)
- ✅ Обновлены все ссылки на `world` → `game.world`
- ✅ Обновлены все ссылки на слои → `game.gridLayer`, `game.roadsLayer`, etc.
- ✅ Обновлены ссылки на `carTrafficController` → `window.carTrafficController`
- ✅ Обновлены ссылки на `pathBuilder` → `window.pathBuilder`
- ✅ Обновлены ссылки на `decorLayer` → `game.decorLayer`

### 6.3 Упростить main.js до точки входа ✅ (ВЫПОЛНЕНО)
- ✅ **ВЫПОЛНЕНО**: main.js упрощен до 10 строк (было 808) ✅
- ✅ **ВЫПОЛНЕНО**: Перенесены функции `getDestinationCenter()`, `initEntities()`, `createCar()`, `updateEntities()`, `updateCar()`, `setupWorld()`, `layout()` в Game.js ✅
- ✅ **ВЫПОЛНЕНО**: Перенесены функции `parseIntersectionCoordinate()` и `shouldHaveTrafficLight()` в Game.js как приватные методы
- ✅ **ВЫПОЛНЕНО**: Перенесены переменные `lastStayTimerUpdate` и `lastStayTimerDay` в Game.js
- ✅ **ВЫПОЛНЕНО**: Перенесена функция `updateEntities()` в Game.js как метод класса
- ✅ **ВЫПОЛНЕНО**: Перенесена функция `updateCar()` в Game.js как метод `_updateCar()`
- ✅ **ВЫПОЛНЕНО**: Перенесена функция `setupWorld()` в Game.js как метод `_setupWorld()`
- ✅ **ВЫПОЛНЕНО**: Перенесена функция `layout()` в Game.js как метод `_layout()` ✅
- ✅ **ВЫПОЛНЕНО**: Перенесена функция `createTrafficLightsForAllIntersections()` в Game.js как метод `_createTrafficLightsForAllIntersections()`
- ✅ **ВЫПОЛНЕНО**: Добавлена функция `_shouldHaveTrafficLight()` в Game.js
- ✅ **ВЫПОЛНЕНО**: Удален дублирующий метод `_createTrafficLightsForAllIntersections()` из Game.js
- ✅ **НОВОЕ**: Перенесены функции отладки `debugLog()` и `debugLogAlways()` в Game.js как методы класса
- ✅ **НОВОЕ**: Создан метод `init()` в Game.js для централизованной инициализации
- ✅ **НОВОЕ**: main.js упрощен до минимальной точки входа (только импорты, создание экземпляра, инициализация и запуск)
- **Файлы**: `src/main.js`, `src/game/Game.js`
- **Проверка**: main.js теперь содержит только 10 строк и является чистой точкой входа в приложение.

**Выполненные изменения:**
- ✅ Перенесена функция `getDestinationCenter()` в `Game.js` как `_getDestinationCenter()`
- ✅ Добавлены вспомогательные методы `_getVerticalRoadXs()` и `_getHorizontalRoadYs()`
- ✅ Обновлены все ссылки на `window.getDestinationCenter` → `this._getDestinationCenter`
- ✅ Удалены функции `getVerticalRoadXs()` и `getHorizontalRoadYs()` из main.js
- ✅ Обновлены все ссылки на эти функции в main.js
- ✅ **ИСПРАВЛЕНО**: Добавлена инициализация `this.zoneGeometry` в конструктор Game.js
- ✅ **ИСПРАВЛЕНО**: Обновлены все ссылки на `zoneGeometry` в main.js → `game.zoneGeometry`
- ✅ **НОВОЕ**: Перенесена функция `initEntities()` в `Game.js` как `_initEntities()`
- ✅ **НОВОЕ**: Обновлены все ссылки на `carEntity` и `shinaEntity` в main.js → `game.carEntity` и `game.shinaEntity`
- ✅ **НОВОЕ**: Удалена функция `initEntities()` из main.js
- ✅ **НОВОЕ**: Перенесена функция `createCar()` в `Game.js` как `_createCar()`
- ✅ **НОВОЕ**: Добавлены импорты `CarRenderer`, `CarTrafficController`, `PathBuilder` в Game.js
- ✅ **НОВОЕ**: Обновлен вызов в main.js на `game._createCar()` с получением `carRenderer`
- ✅ **НОВОЕ**: Удалена функция `createCar()` из main.js
- ✅ **НОВОЕ**: Перенесены переменные `lastStayTimerUpdate` и `lastStayTimerDay` в Game.js как свойства класса
- ✅ **НОВОЕ**: Обновлен метод `updateStayTimer()` для использования `this.lastStayTimerUpdate` и `this.lastStayTimerDay`
- ✅ **НОВОЕ**: Удалены глобальные переменные `lastStayTimerUpdate` и `lastStayTimerDay` из main.js
- ✅ **НОВОЕ**: Перенесена функция `updateEntities()` в `Game.js` как метод класса
- ✅ **НОВОЕ**: Обновлен вызов в `updateCar()` на `game.updateEntities(delta)`
- ✅ **НОВОЕ**: Удалена функция `updateEntities()` из main.js
- ✅ **НОВОЕ**: Перенесена функция `updateCar()` в `Game.js` как метод `_updateCar()`
- ✅ **НОВОЕ**: Обновлен вызов в `Game.update()` на `this._updateCar(delta)`
- ✅ **НОВОЕ**: Удалена функция `updateCar()` из main.js
- ✅ **НОВОЕ**: Перенесена функция `setupWorld()` в `Game.js` как метод `_setupWorld()`
- ✅ **НОВОЕ**: Перенесена функция `layout()` в `Game.js` как метод `_layout()`
- ✅ **НОВОЕ**: Перенесена функция `createTrafficLightsForAllIntersections()` в `Game.js` как метод `_createTrafficLightsForAllIntersections()`
- ✅ **НОВОЕ**: Добавлена функция `_shouldHaveTrafficLight()` в `Game.js`
- ✅ **НОВОЕ**: Обновлены все вызовы `setupWorld()` → `game._setupWorld()`
- ✅ **НОВОЕ**: Обновлены все вызовы `layout()` → `game._layout()`
- ✅ **НОВОЕ**: Удалены функции `setupWorld()`, `layout()`, `createTrafficLightsForAllIntersections()` из main.js
- ✅ **НОВОЕ**: Добавлены импорты `initTrafficLightsForIntersection`, `TrafficLightCoordinator` в Game.js
- ✅ **ИСПРАВЛЕНО**: Исправлена проблема с остановкой на светофорах - `trafficCoordinator` теперь доступен до вызова `game._setupWorld()`
- ✅ **ИСПРАВЛЕНО**: Исправлена передача `intersectionKeyToTL` в `_setupWorld()` - теперь карта светофоров правильно передается между компонентами
- ✅ **ИСПРАВЛЕНО**: Исправлена инициализация `TRAFFIC_LIGHTS_CONFIG` - константа теперь доступна в глобальной области видимости
- ✅ **ИСПРАВЛЕНО**: Обновлен метод `_createTrafficLightsForAllIntersections()` для получения конфигурации светофоров как параметра
- ✅ **ИСПРАВЛЕНО**: Машина теперь корректно останавливается на красных светофорах и проезжает на зеленых
- ✅ **НОВОЕ**: Перенесена функция `layout()` в `Game.js` как метод `_layout()`
- ✅ **НОВОЕ**: Обновлены все вызовы `layout()` → `game._layout()` в main.js
- ✅ **НОВОЕ**: Удалена функция `layout()` из main.js
- ✅ **НОВОЕ**: Удалена функция `setupWorld()` из main.js (дублирование устранено)
- ✅ **НОВОЕ**: Перенесена функция `createTrafficLightsForAllIntersections()` в Game.js как метод `_createTrafficLightsForAllIntersections()`
- ✅ **НОВОЕ**: Удален дублирующий метод `_createTrafficLightsForAllIntersections()` из Game.js
- ✅ **НОВОЕ**: Удалена функция `createTrafficLightsForAllIntersections()` из main.js

**Цель**: Оставить только импорты и `const game = new Game(); game.start();`

## 🟢 СРЕДНИЕ ЗАДАЧИ 

### 5.1-5.4 Очистка зависимостей от глобальных переменных ⏳ (ПЛАНИРУЕТСЯ)
- Передать зависимости через параметры вместо `window.*`
- Обновить `DayNightManager` и `UIRenderer`
- Убрать использование `window.carEntity`, `window.world` и других глобальных переменных

## 📊 Статистика оставшихся задач
- **Критические**: 0 задач ✅ (удаление дублирующих функций завершено)
- **Важные**: 0 задач ✅ (упрощение main.js завершено - 10 строк) ✅
- **Средние**: 1 задача (очистка зависимостей)
- **Всего оставшихся**: 1 задача

## 🎯 Критерии завершения
- [x] Все дублирующие функции удалены из main.js ✅
- [x] Глобальные переменные удалены из main.js ✅
- [x] main.js упрощен до точки входа (10 строк) ✅
- [ ] Игра работает без ошибок
- [ ] Код готов к продакшену

## 🎉 ПРОГРЕСС РЕФАКТОРИНГА

### ✅ ВЫПОЛНЕНО (2024-12-19)
- **Функции отладки перенесены**: `debugLog()` и `debugLogAlways()` теперь методы класса `Game`
- **main.js упрощен**: Сокращен с 808 строк до 10 строк - чистая точка входа
- **Централизованная инициализация**: Создан метод `init()` в `Game.js` для всей логики инициализации
- **Все критические и важные задачи завершены** 🎯

### 📈 ДОСТИЖЕНИЯ
- **Сокращение кода**: main.js уменьшен на 99% (808 → 10 строк)
- **Централизация**: Вся игровая логика теперь в классе `Game`
- **Чистая архитектура**: main.js стал тонкой точкой входа
- **Готовность к продакшену**: Код структурирован и готов к финальной очистке зависимостей
