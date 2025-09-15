# Технический долг (Tech Debt)

## 🔄 Рефакторинг в процессе

### ✅ Выполнено в текущей сессии (2024-12-19)
- **Создание StateManager**: Создан класс `StateManager.js` для централизованного управления состоянием игры
  - Добавлены свойства: `currentRouteIndex`, `savedCarState`, `lastStayTimerUpdate`, `lastStayTimerDay`
  - Созданы get/set методы для всех свойств
  - Интегрирован в `Game.js` как `this.stateManager`

- **Миграция currentRouteIndex**: ✅ Перенесен из Game.js в StateManager
  - Удалено свойство `this.currentRouteIndex` из Game.js
  - Заменены все использования на `this.stateManager.getCurrentRouteIndex()` и `this.stateManager.setCurrentRouteIndex()`

- **Миграция savedCarState**: ✅ Перенесен из Game.js в StateManager  
  - Удалено свойство `this.savedCarState` из Game.js
  - Заменены все использования на `this.stateManager.getSavedCarState()` и `this.stateManager.setSavedCarState()`

- **Инкапсуляция логики stayTimer**: ✅ Перенесена в StateManager
  - Создан метод `updateStayTimer(gameTime, currentStayDuration)` в StateManager
  - Упрощен метод `updateStayTimer()` в Game.js - теперь только вызывает StateManager
  - Удалены дублирующие свойства `lastStayTimerUpdate` и `lastStayTimerDay` из Game.js

- **Устранение window.isGamePaused**: ✅ Убрана глобальная переменная
  - Удалены строки `window.isGamePaused = ...` из PauseManager.js
  - Изменен конструктор IntersectionTrafficLight для принятия pauseManager
  - Заменена проверка `window.isGamePaused` на `this.pauseManager.isPaused()`

- **Централизация состояния**: ✅ Завершена основная централизация
  - Заменены обращения к `window.savedCarState` на `this.stateManager.getSavedCarState()`
  - Заменены обращения к `window.zoneGeometry` на `this.zoneGeometry`
  - Заменены обращения к `window.TRAFFIC_LIGHTS_CONFIG` на `this.TRAFFIC_LIGHTS_CONFIG`
  - Заменены обращения к `window.debugInfo` на `this.debugInfo`
  - Добавлены TODO комментарии для оставшихся глобальных переменных


### 🟡 Потенциальные улучшения для будущего

#### 1. Устранение оставшихся глобальных зависимостей
- **Проблема**: В `Game.js` все еще используются некоторые глобальные переменные через `window.*`
- **Файлы**: `src/game/Game.js` (методы `updateEntities`, `_updateCar`, `_createCar`)
- **Оставшиеся глобальные переменные**: 
  - `window.pathBuilder` - построитель путей (TODO: убрать после рефакторинга)
  - `window.carTrafficController` - контроллер трафика (TODO: убрать после рефакторинга)
  - `window.intersectionKeyToTL` - карта светофоров (TODO: убрать после рефакторинга)
  - `window.CONFIG` - конфигурация игры (TODO: убрать после рефакторинга)
  - `window.panningController` - контроллер панорамирования (TODO: убрать после рефакторинга)
  - `window.trafficCoordinator` - координатор светофоров (TODO: убрать после рефакторинга)
- **Решение**: Передавать зависимости через параметры конструктора или методов

## 📊 Статистика прогресса
- **Исходный размер main.js**: 808 строк → 10 строк ✅ (99% сокращение!)
- **Оставшиеся функции для переноса**: 0 функций ✅
- **Централизация состояния**: ✅ ЗАВЕРШЕНА (StateManager полностью интегрирован)
- **Глобальные переменные**: 6 оставшихся (помечены TODO для будущего рефакторинга)

## 🎯 Приоритеты
1. **Высокий**: ✅ Миграция состояния в StateManager (ЗАВЕРШЕНА)
2. **Средний**: Устранение оставшихся глобальных зависимостей
3. **Низкий**: Дополнительные улучшения архитектуры

## 🎉 ДОСТИЖЕНИЯ РЕФАКТОРИНГА
- **main.js**: 808 → 10 строк (99% сокращение!)
- **Централизация**: Вся игровая логика в классе `Game`
- **Чистая архитектура**: main.js стал тонкой точкой входа
- **StateManager**: ✅ Создан и полностью интегрирован для централизованного управления состоянием
- **Централизация состояния**: ✅ Все ключевые данные игры теперь управляются через StateManager
- **Устранение глобальных переменных**: ✅ Убраны основные глобальные переменные состояния
- **Организованная документация**: Четкое разделение активных и завершенных планов
