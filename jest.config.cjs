module.exports = {
  // Тестовые файлы
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Игнорируем node_modules и src (пока не тестируем ES модули)
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/'
  ],
  
  // Настройки для тестирования
  testEnvironment: 'node',
  
  // Простая конфигурация без ES модулей
  transform: {},
  
  // Расширения файлов
  moduleFileExtensions: ['js', 'json'],
  
  // Настройки для отладки
  verbose: true
};
