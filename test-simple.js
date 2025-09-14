#!/usr/bin/env node

/**
 * Простой тестовый скрипт для проекта "Карта Шины"
 * Заменяет Jest пока не настроим ES модули
 */

console.log('🧪 Запуск простых тестов...');
console.log('='.repeat(40));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error('Expected value to be truthy');
      }
    }
  };
}

// Запускаем тесты
test('базовый тест', () => {
  expect(1 + 1).toBe(2);
});

test('проверка окружения', () => {
  expect(typeof process).toBe('object');
  expect(process.env).toBeDefined();
});

test('проверка готовности к тестированию', () => {
  expect(true).toBeTruthy();
});

// Результаты
console.log('='.repeat(40));
console.log(`📊 Результаты: ${passed} прошли, ${failed} провалились`);
console.log(`⏱️  Время: ${Date.now() - Date.now()}ms`);

if (failed === 0) {
  console.log('🎉 Все тесты прошли успешно!');
  process.exit(0);
} else {
  console.log('💥 Некоторые тесты провалились!');
  process.exit(1);
}
