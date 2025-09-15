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

### 6.3 Упростить main.js до точки входа ⏳ (В ПРОЦЕССЕ)
- ⏳ **В ПРОЦЕССЕ**: main.js содержит ~500 строк (было 808)
- ⏳ **В ПРОЦЕССЕ**: Перенесены функции `getDestinationCenter()`, `initEntities()` и `createCar()` в Game.js
- ✅ **НОВОЕ**: Перенесены переменные `lastStayTimerUpdate` и `lastStayTimerDay` в Game.js
- **Файлы**: `src/main.js`, `src/game/Game.js`
- **Проверка**: Функция `getDestinationCenter()` успешно перенесена, все ссылки обновлены.

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

**Цель**: Оставить только импорты и `const game = new Game(); game.start();`

## 🟢 СРЕДНИЕ ЗАДАЧИ 

### 5.1-5.4 Очистка зависимостей от глобальных переменных ⏳ (ПЛАНИРУЕТСЯ)
- Передать зависимости через параметры вместо `window.*`
- Обновить `DayNightManager` и `UIRenderer`
- Убрать использование `window.carEntity`, `window.world` и других глобальных переменных

## 📊 Статистика оставшихся задач
- **Критические**: 0 задач ✅ (удаление дублирующих функций завершено)
- **Важные**: 1 задача ⏳ (упрощение main.js - в процессе)
- **Средние**: 1 задача (очистка зависимостей)
- **Всего оставшихся**: 2 задачи

## 🎯 Критерии завершения
- [x] Все дублирующие функции удалены из main.js ✅
- [x] Глобальные переменные удалены из main.js ✅
- [ ] main.js упрощен до точки входа (< 10 строк)
- [ ] Игра работает без ошибок
- [ ] Код готов к продакшену
