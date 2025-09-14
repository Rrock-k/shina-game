# Карта зависимостей функций для рефакторинга

## 🎯 Цель
Создать карту зависимостей между функциями в `main.js`, чтобы определить правильный порядок их переноса в класс `Game.js`.

## 📊 Анализ функций

### 🔴 Критичные функции (требуют переноса в первую очередь)

#### 1. `updateStayTimer()` - **ПРОСТАЯ** ⭐
- **Зависимости**: `game.timeManager`, `carEntity`
- **Вызывается из**: `Game.update()` (через `updateCar()`)
- **Приоритет**: ВЫСОКИЙ (самая простая)
- **Статус**: ✅ Готова к переносу

#### 2. `saveCarStateForNextDestination()` - **СРЕДНЯЯ** ⭐⭐
- **Зависимости**: `CONFIG.ROUTE_SCHEDULE`, `getDestinationCenter()`, `pathBuilder`, `carRenderer`, `car`
- **Вызывается из**: `checkArrival()`
- **Приоритет**: ВЫСОКИЙ (независимая)
- **Статус**: ✅ Готова к переносу

#### 3. `showBuildingAvatar(locationKey)` - **СРЕДНЯЯ** ⭐⭐
- **Зависимости**: `getDestinationCenter()`, `carRenderer`, `zoneGeometry`, `decorLayer`, `buildingAvatars`
- **Вызывается из**: `checkArrival()`
- **Приоритет**: СРЕДНИЙ
- **Статус**: ✅ Готова к переносу

#### 4. `hideBuildingAvatar()` - **ПРОСТАЯ** ⭐
- **Зависимости**: `CONFIG.ROUTE_SCHEDULE`, `buildingAvatars`, `carRenderer`
- **Вызывается из**: `nextDestination()`
- **Приоритет**: СРЕДНИЙ
- **Статус**: ✅ Готова к переносу

#### 5. `checkArrival()` - **СЛОЖНАЯ** ⭐⭐⭐
- **Зависимости**: `CONFIG.ROUTE_SCHEDULE`, `carEntity`, `journalManager`, `saveCarStateForNextDestination()`, `uiRenderer`, `showBuildingAvatar()`
- **Вызывается из**: `Game.update()` (через `updateCar()`)
- **Приоритет**: ВЫСОКИЙ (зависит от saveCarStateForNextDestination)
- **Статус**: ⚠️ Требует переноса зависимых функций

#### 6. `nextDestination()` - **ОЧЕНЬ СЛОЖНАЯ** ⭐⭐⭐⭐
- **Зависимости**: `CONFIG.ROUTE_SCHEDULE`, `journalManager`, `hideBuildingAvatar()`, `uiRenderer`, `carEntity`, `pathBuilder`, `getDestinationCenter()`
- **Вызывается из**: `updateStayTimer()`
- **Приоритет**: ВЫСОКИЙ (зависит от всех остальных)
- **Статус**: ⚠️ Требует переноса всех зависимых функций

### 🟡 Вспомогательные функции (переносятся во вторую очередь)

#### 7. `getDestinationCenter(locationKey)` - **ПРОСТАЯ** ⭐
- **Зависимости**: `CONFIG.ROUTE_SCHEDULE`
- **Вызывается из**: `saveCarStateForNextDestination()`, `showBuildingAvatar()`
- **Приоритет**: СРЕДНИЙ
- **Статус**: ✅ Готова к переносу

#### 8. `updateCar(delta)` - **СРЕДНЯЯ** ⭐⭐
- **Зависимости**: `updateEntities()`, `carEntity`, `carRenderer`, `uiRenderer`
- **Вызывается из**: `Game.update()`
- **Приоритет**: СРЕДНИЙ
- **Статус**: ⚠️ Требует переноса updateEntities()

#### 9. `updateEntities(delta)` - **ПРОСТАЯ** ⭐
- **Зависимости**: `carEntity`, `shinaEntity`
- **Вызывается из**: `updateCar()`
- **Приоритет**: СРЕДНИЙ
- **Статус**: ✅ Готова к переносу

### 🟢 Функции инициализации (переносятся в последнюю очередь)

#### 10. `initEntities()` - **СРЕДНЯЯ** ⭐⭐
- **Зависимости**: `game.carEntity`, `game.shinaEntity`
- **Вызывается из**: `main.js` (инициализация)
- **Приоритет**: НИЗКИЙ
- **Статус**: ⚠️ Требует рефакторинга (уже частично в Game.js)

#### 11. `setupWorld()` - **СЛОЖНАЯ** ⭐⭐⭐
- **Зависимости**: Множество глобальных переменных
- **Вызывается из**: `main.js` (инициализация)
- **Приоритет**: НИЗКИЙ
- **Статус**: ⚠️ Требует рефакторинга

#### 12. `createCar()` - **СРЕДНЯЯ** ⭐⭐
- **Зависимости**: `CONFIG`, `carRenderer`, `pathBuilder`
- **Вызывается из**: `main.js` (инициализация)
- **Приоритет**: НИЗКИЙ
- **Статус**: ⚠️ Требует рефакторинга

## 🔄 Порядок переноса (рекомендуемый)

### Фаза 1: Простые независимые функции
1. `updateStayTimer()` → `_updateStayTimer()`
2. `saveCarStateForNextDestination()` → `_saveCarStateForNextDestination()`
3. `getDestinationCenter()` → `_getDestinationCenter()`

### Фаза 2: Функции аватарок
4. `showBuildingAvatar()` → `_showBuildingAvatar()`
5. `hideBuildingAvatar()` → `_hideBuildingAvatar()`

### Фаза 3: Сложные зависимые функции
6. `checkArrival()` → `_checkArrival()`
7. `nextDestination()` → `_nextDestination()`

### Фаза 4: Вспомогательные функции
8. `updateEntities()` → `_updateEntities()`
9. `updateCar()` → `_updateCar()`

### Фаза 5: Функции инициализации
10. `initEntities()` → `_initEntities()`
11. `setupWorld()` → `_setupWorld()`
12. `createCar()` → `_createCar()`

## 📋 Детальный анализ зависимостей

### Глобальные переменные, используемые функциями:
- `game` - экземпляр Game (уже доступен как `this`)
- `carEntity` - сущность машины (станет `this.carEntity`)
- `carRenderer` - рендерер машины (станет `this.carRenderer`)
- `uiRenderer` - рендерер UI (станет `this.uiRenderer`)
- `journalManager` - менеджер журнала (станет `this.journalManager`)
- `pathBuilder` - построитель путей (станет `this.pathBuilder`)
- `decorLayer` - слой декораций (станет `this.decorLayer`)
- `zoneGeometry` - геометрия зон (станет `this.zoneGeometry`)
- `buildingAvatars` - карта аватарок (станет `this.buildingAvatars`)
- `currentRouteIndex` - текущий индекс маршрута (станет `this.currentRouteIndex`)
- `savedCarState` - сохраненное состояние машины (станет `this.savedCarState`)

### Константы и конфигурация:
- `CONFIG.ROUTE_SCHEDULE` - расписание маршрута
- `PIXI` - библиотека PIXI.js

## ⚠️ Риски и митигация

### 🔴 Высокий риск
- **Циклические зависимости** - `nextDestination()` и `checkArrival()` могут создать циклические вызовы
  - *Митигация*: Тщательно проанализировать логику вызовов
- **Потеря состояния** - при переносе глобальных переменных в класс
  - *Митигация*: Пошаговая миграция с проверкой на каждом шаге

### 🟡 Средний риск
- **Синтаксические ошибки** - при замене глобальных переменных на `this.`
  - *Митигация*: Использование IDE с автодополнением, тестирование

### 🟢 Низкий риск
- **Производительность** - добавление слоя абстракции
  - *Митигация*: Профилирование при необходимости

## ✅ Критерии успеха
- Все функции работают как методы класса Game
- Нет циклических зависимостей
- Глобальные переменные заменены на `this.`
- Игра запускается и работает корректно
- main.js упрощен до точки входа

## 📝 Примечания
- Каждую функцию переносить по одной
- Тестировать после каждого переноса
- Обновлять вызовы функций в `Game.update()`
- Удалять перенесенные функции из `main.js`
