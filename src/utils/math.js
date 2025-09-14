/**
 * Математические утилиты для игры "Карта Шины"
 * Содержит функции для работы с числами, случайными значениями и интерполяцией
 */

/**
 * Генерировать случайное целое число в диапазоне [min, max]
 * @param {number} min - минимальное значение (включительно)
 * @param {number} max - максимальное значение (включительно)
 * @returns {number} - случайное целое число
 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Генерировать случайное число с плавающей точкой в диапазоне [min, max)
 * @param {number} min - минимальное значение (включительно)
 * @param {number} max - максимальное значение (исключительно)
 * @returns {number} - случайное число с плавающей точкой
 */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Ограничить значение в заданном диапазоне
 * @param {number} value - исходное значение
 * @param {number} min - минимальное значение
 * @param {number} max - максимальное значение
 * @returns {number} - ограниченное значение
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Линейная интерполяция между двумя значениями
 * @param {number} a - начальное значение
 * @param {number} b - конечное значение
 * @param {number} t - параметр интерполяции (0-1)
 * @returns {number} - интерполированное значение
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Обратная линейная интерполяция (нахождение параметра t для заданного значения)
 * @param {number} a - начальное значение
 * @param {number} b - конечное значение
 * @param {number} value - значение для которого нужно найти параметр
 * @returns {number} - параметр интерполяции (0-1)
 */
export function inverseLerp(a, b, value) {
  if (b === a) return 0;
  return (value - a) / (b - a);
}

/**
 * Округлить число до заданного количества знаков после запятой
 * @param {number} value - исходное число
 * @param {number} decimals - количество знаков после запятой
 * @returns {number} - округленное число
 */
export function roundToDecimals(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Проверить, является ли число четным
 * @param {number} value - число для проверки
 * @returns {boolean} - true если число четное
 */
export function isEven(value) {
  return value % 2 === 0;
}

/**
 * Проверить, является ли число нечетным
 * @param {number} value - число для проверки
 * @returns {boolean} - true если число нечетное
 */
export function isOdd(value) {
  return value % 2 !== 0;
}

/**
 * Вычислить факториал числа
 * @param {number} n - число для вычисления факториала
 * @returns {number} - факториал числа
 */
export function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Вычислить степень числа
 * @param {number} base - основание
 * @param {number} exponent - показатель степени
 * @returns {number} - результат возведения в степень
 */
export function power(base, exponent) {
  return Math.pow(base, exponent);
}

/**
 * Вычислить квадратный корень
 * @param {number} value - число для извлечения корня
 * @returns {number} - квадратный корень
 */
export function sqrt(value) {
  return Math.sqrt(value);
}

/**
 * Вычислить абсолютное значение
 * @param {number} value - число
 * @returns {number} - абсолютное значение
 */
export function abs(value) {
  return Math.abs(value);
}

/**
 * Вычислить минимум из массива чисел
 * @param {number[]} values - массив чисел
 * @returns {number} - минимальное значение
 */
export function min(values) {
  return Math.min(...values);
}

/**
 * Вычислить максимум из массива чисел
 * @param {number[]} values - массив чисел
 * @returns {number} - максимальное значение
 */
export function max(values) {
  return Math.max(...values);
}

/**
 * Вычислить среднее арифметическое
 * @param {number[]} values - массив чисел
 * @returns {number} - среднее арифметическое
 */
export function average(values) {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Вычислить медиану
 * @param {number[]} values - массив чисел
 * @returns {number} - медиана
 */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
}

/**
 * Преобразовать градусы в радианы
 * @param {number} degrees - угол в градусах
 * @returns {number} - угол в радианах
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Преобразовать радианы в градусы
 * @param {number} radians - угол в радианах
 * @returns {number} - угол в градусах
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Нормализовать угол в диапазоне [0, 2π]
 * @param {number} angle - угол в радианах
 * @returns {number} - нормализованный угол
 */
export function normalizeAngle(angle) {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}
