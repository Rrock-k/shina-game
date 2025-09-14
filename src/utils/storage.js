/**
 * Утилиты для работы с localStorage
 * Содержит функции для сохранения и загрузки настроек игры
 */

/**
 * Сохранить значение в localStorage
 * @param {string} key - ключ для сохранения
 * @param {*} value - значение для сохранения (будет преобразовано в JSON)
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function saveToStorage(key, value) {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error('Ошибка сохранения в localStorage:', error);
    return false;
  }
}

/**
 * Загрузить значение из localStorage
 * @param {string} key - ключ для загрузки
 * @param {*} defaultValue - значение по умолчанию, если ключ не найден
 * @returns {*} - загруженное значение или значение по умолчанию
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const serializedValue = localStorage.getItem(key);
    if (serializedValue === null) {
      return defaultValue;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error('Ошибка загрузки из localStorage:', error);
    return defaultValue;
  }
}

/**
 * Удалить значение из localStorage
 * @param {string} key - ключ для удаления
 * @returns {boolean} - true если удаление прошло успешно
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Ошибка удаления из localStorage:', error);
    return false;
  }
}

/**
 * Очистить весь localStorage
 * @returns {boolean} - true если очистка прошла успешно
 */
export function clearStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Ошибка очистки localStorage:', error);
    return false;
  }
}

/**
 * Проверить, поддерживается ли localStorage
 * @returns {boolean} - true если localStorage поддерживается
 */
export function isStorageSupported() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Получить размер используемого localStorage в байтах
 * @returns {number} - размер в байтах
 */
export function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

/**
 * Получить список всех ключей в localStorage
 * @returns {string[]} - массив ключей
 */
export function getStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }
  return keys;
}

/**
 * Сохранить настройки игры
 * @param {Object} settings - объект с настройками
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function saveGameSettings(settings) {
  return saveToStorage('shina-game-settings', settings);
}

/**
 * Загрузить настройки игры
 * @param {Object} defaultSettings - настройки по умолчанию
 * @returns {Object} - загруженные настройки
 */
export function loadGameSettings(defaultSettings = {}) {
  return loadFromStorage('shina-game-settings', defaultSettings);
}

/**
 * Сохранить состояние игры
 * @param {Object} gameState - состояние игры
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function saveGameState(gameState) {
  return saveToStorage('shina-game-state', gameState);
}

/**
 * Загрузить состояние игры
 * @param {Object} defaultState - состояние по умолчанию
 * @returns {Object} - загруженное состояние
 */
export function loadGameState(defaultState = {}) {
  return loadFromStorage('shina-game-state', defaultState);
}

/**
 * Сохранить настройки паузы
 * @param {boolean} isSpeedBoosted - ускорена ли игра
 * @param {number} speedMultiplier - множитель скорости
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function savePauseSettings(isSpeedBoosted, speedMultiplier) {
  const settings = {
    isSpeedBoosted,
    speedMultiplier
  };
  return saveToStorage('shina-game-pause-settings', settings);
}

/**
 * Загрузить настройки паузы
 * @param {boolean} defaultBoosted - значение по умолчанию для ускорения
 * @param {number} defaultMultiplier - множитель скорости по умолчанию
 * @returns {Object} - загруженные настройки паузы
 */
export function loadPauseSettings(defaultBoosted = false, defaultMultiplier = 1) {
  const defaultSettings = {
    isSpeedBoosted: defaultBoosted,
    speedMultiplier: defaultMultiplier
  };
  return loadFromStorage('shina-game-pause-settings', defaultSettings);
}

/**
 * Сохранить настройки дня/ночи
 * @param {string} dayNightMode - режим дня/ночи
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function saveDayNightSettings(dayNightMode) {
  return saveToStorage('shina-game-daynight-mode', dayNightMode);
}

/**
 * Загрузить настройки дня/ночи
 * @param {string} defaultMode - режим по умолчанию
 * @returns {string} - загруженный режим дня/ночи
 */
export function loadDayNightSettings(defaultMode = 'auto') {
  return loadFromStorage('shina-game-daynight-mode', defaultMode);
}

/**
 * Сохранить статистику игры
 * @param {Object} stats - статистика игры
 * @returns {boolean} - true если сохранение прошло успешно
 */
export function saveGameStats(stats) {
  return saveToStorage('shina-game-stats', stats);
}

/**
 * Загрузить статистику игры
 * @param {Object} defaultStats - статистика по умолчанию
 * @returns {Object} - загруженная статистика
 */
export function loadGameStats(defaultStats = {}) {
  return loadFromStorage('shina-game-stats', defaultStats);
}
