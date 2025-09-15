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


### 🟡 Потенциальные улучшения для будущего

#### 1. Устранение глобальных зависимостей
- **Проблема**: В `Game.js` все еще используются глобальные переменные через `window.*`
- **Файлы**: `src/game/Game.js` (методы `updateEntities`, `_updateCar`, `_createCar`)
- **Глобальные переменные**: `window.carTrafficController`, `window.pathBuilder`, `window.carRenderer`, `window.intersectionKeyToTL`, `window.debugLog`, `window.debugLogAlways`, `window.debugInfo`, `window.currentRouteIndex`, `window.savedCarState`, `window.zoneGeometry`
- **Решение**: Передавать зависимости через параметры конструктора или методов

## 📊 Статистика прогресса
- **Исходный размер main.js**: 808 строк → 10 строк ✅ (99% сокращение!)
- **Оставшиеся функции для переноса**: 0 функций ✅
- **Централизация состояния**: В процессе (StateManager создан)

## 🎯 Приоритеты
1. **Высокий**: Миграция состояния в StateManager (текущий этап)
2. **Средний**: Устранение глобальных зависимостей
3. **Низкий**: Дополнительные улучшения архитектуры

## 🎉 ДОСТИЖЕНИЯ РЕФАКТОРИНГА
- **main.js**: 808 → 10 строк (99% сокращение!)
- **Централизация**: Вся игровая логика в классе `Game`
- **Чистая архитектура**: main.js стал тонкой точкой входа
- **StateManager**: Создан для централизованного управления состоянием
- **Организованная документация**: Четкое разделение активных и завершенных планов
