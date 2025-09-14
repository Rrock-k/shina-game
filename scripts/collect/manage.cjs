#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Интерактивный менеджер для скриптов сбора файлов
 * Красивый интерфейс с выбором опций
 */

// Функция для очистки экрана
function clearScreen() {
    console.clear();
}

// Функция для вывода заголовка
function printHeader() {
    console.log('\n' + '='.repeat(60));
    console.log('🎮 КАРТА ШИНЫ - МЕНЕДЖЕР СКРИПТОВ');
    console.log('='.repeat(60));
    console.log(`📁 Проект: ${path.basename(process.cwd())}`);
    console.log(`⏰ Время: ${new Date().toLocaleString('ru-RU')}`);
    console.log('='.repeat(60) + '\n');
}

// Функция для вывода меню
function printMenu() {
    console.log('📋 ДОСТУПНЫЕ КОМАНДЫ:');
    console.log();
    console.log('1. 🚀 Запустить игру (npm start)');
    console.log('2. 🔧 Запустить в dev режиме (npm run dev)');
    console.log('3. 🧪 Запустить тесты (npm test)');
    console.log('4. 📦 Быстрый сбор файлов (npm run collect)');
    console.log('5. 📚 Полный сбор файлов (npm run collect-full)');
    console.log('6. 📊 Показать статистику проекта');
    console.log('7. 🧹 Очистить временные файлы');
    console.log('8. ❓ Показать справку');
    console.log('0. 🚪 Выход');
    console.log();
}

// Функция для запуска игры
function startGame() {
    console.log('🚀 Запуск игры...');
    console.log('='.repeat(40));
    try {
        execSync('npm start', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Ошибка запуска игры:', error.message);
    }
}

// Функция для запуска в dev режиме
function startDev() {
    console.log('🔧 Запуск в dev режиме...');
    console.log('='.repeat(40));
    try {
        execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Ошибка запуска dev режима:', error.message);
    }
}

// Функция для запуска тестов
function runTests() {
    console.log('🧪 Запуск тестов...');
    console.log('='.repeat(40));
    try {
        execSync('npm test', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Ошибка запуска тестов:', error.message);
    }
}

// Функция для быстрого сбора
function collectQuick() {
    console.log('📦 Запуск быстрого сбора...');
    console.log('='.repeat(40));
    try {
        execSync('npm run collect', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Ошибка быстрого сбора:', error.message);
    }
}

// Функция для полного сбора
function collectFull() {
    console.log('📚 Запуск полного сбора...');
    console.log('='.repeat(40));
    try {
        execSync('npm run collect-full', { stdio: 'inherit' });
    } catch (error) {
        console.error('❌ Ошибка полного сбора:', error.message);
    }
}

// Функция для показа статистики
function showStats() {
    console.log('📊 СТАТИСТИКА ПРОЕКТА:');
    console.log('='.repeat(40));
    
    try {
        // Количество файлов по типам
        console.log('\n📁 Файлы по типам:');
        const jsFiles = execSync('find . -name "*.js" -type f | wc -l', { encoding: 'utf8' }).trim();
        const htmlFiles = execSync('find . -name "*.html" -type f | wc -l', { encoding: 'utf8' }).trim();
        const cssFiles = execSync('find . -name "*.css" -type f | wc -l', { encoding: 'utf8' }).trim();
        const mdFiles = execSync('find . -name "*.md" -type f | wc -l', { encoding: 'utf8' }).trim();
        const jsonFiles = execSync('find . -name "*.json" -type f | wc -l', { encoding: 'utf8' }).trim();
        
        console.log(`  JavaScript: ${jsFiles}`);
        console.log(`  HTML: ${htmlFiles}`);
        console.log(`  CSS: ${cssFiles}`);
        console.log(`  Markdown: ${mdFiles}`);
        console.log(`  JSON: ${jsonFiles}`);
        
        // Размер проекта
        console.log('\n📏 Размер проекта:');
        const size = execSync('du -sh . --exclude=node_modules --exclude=.git 2>/dev/null | cut -f1', { encoding: 'utf8' }).trim();
        console.log(`  Общий размер: ${size}`);
        
        // Последние изменения
        console.log('\n📝 Последние изменения:');
        try {
            const lastCommits = execSync('git log --oneline -5', { encoding: 'utf8' }).trim();
            console.log(lastCommits);
        } catch (error) {
            console.log('  Git не инициализирован');
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения статистики:', error.message);
    }
    
    console.log('\n' + '='.repeat(40));
}

// Функция для очистки временных файлов
function cleanup() {
    console.log('🧹 ОЧИСТКА ВРЕМЕННЫХ ФАЙЛОВ:');
    console.log('='.repeat(40));
    
    const filesToRemove = [
        'repository-content.txt',
        'test-*.html',
        'test-*.js',
        'monitor-*.js'
    ];
    
    let removedCount = 0;
    
    for (const pattern of filesToRemove) {
        try {
            const files = execSync(`find . -name "${pattern}" -type f`, { encoding: 'utf8' }).trim();
            if (files) {
                const fileList = files.split('\n');
                for (const file of fileList) {
                    if (file) {
                        fs.unlinkSync(file);
                        console.log(`  🗑️  Удален: ${file}`);
                        removedCount++;
                    }
                }
            }
        } catch (error) {
            // Файлы не найдены, это нормально
        }
    }
    
    // Останавливаем серверы
    try {
        execSync('pkill -f "python3 -m http.server"', { stdio: 'ignore' });
        console.log('  🛑 Остановлены HTTP серверы');
    } catch (error) {
        // Серверы не запущены, это нормально
    }
    
    console.log(`\n✅ Очистка завершена! Удалено файлов: ${removedCount}`);
    console.log('='.repeat(40));
}

// Функция для показа справки
function showHelp() {
    console.log('❓ СПРАВКА ПО УТИЛИТАМ:');
    console.log('='.repeat(40));
    console.log();
    console.log('📦 Скрипты сбора файлов:');
    console.log('  npm run collect      - Быстрый сбор (исключает node_modules, .git)');
    console.log('  npm run collect-full - Полный сбор (с учетом .gitignore)');
    console.log();
    console.log('🎮 Запуск игры:');
    console.log('  npm start            - Запуск с красивым интерфейсом');
    console.log('  npm run dev          - Простой запуск сервера');
    console.log();
    console.log('🧪 Тестирование:');
    console.log('  npm test             - Запуск тестов валидации');
    console.log();
    console.log('🔧 Прямой запуск скриптов:');
    console.log('  node scripts/collect/quick-collect.cjs');
    console.log('  node scripts/collect/collect-files.cjs');
    console.log('  node scripts/collect/manage.cjs');
    console.log();
    console.log('='.repeat(40));
}

// Основной цикл
function main() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    function showMenu() {
        clearScreen();
        printHeader();
        printMenu();
        
        rl.question('Выберите команду (0-8): ', (answer) => {
            const choice = answer.trim();
            
            switch (choice) {
                case '1':
                    startGame();
                    break;
                case '2':
                    startDev();
                    break;
                case '3':
                    runTests();
                    break;
                case '4':
                    collectQuick();
                    break;
                case '5':
                    collectFull();
                    break;
                case '6':
                    showStats();
                    break;
                case '7':
                    cleanup();
                    break;
                case '8':
                    showHelp();
                    break;
                case '0':
                    console.log('\n👋 До свидания!');
                    rl.close();
                    return;
                default:
                    console.log('\n❌ Неверная команда. Попробуйте снова.');
            }
            
            console.log('\nНажмите Enter для продолжения...');
            rl.question('', () => {
                showMenu();
            });
        });
    }
    
    showMenu();
}

// Запуск
if (require.main === module) {
    main();
}

module.exports = { main };
