#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Скрипт для сбора всех файлов репозитория в один файл
 * Исключает файлы и папки, указанные в .gitignore
 */

// Читаем .gitignore и парсим правила
function parseGitignore(gitignorePath) {
    if (!fs.existsSync(gitignorePath)) {
        return [];
    }
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const rules = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(line => {
            // Убираем ведущий слэш для упрощения
            if (line.startsWith('/')) {
                line = line.substring(1);
            }
            return line;
        });
    
    return rules;
}

// Проверяем, должен ли файл быть проигнорирован
function shouldIgnore(filePath, gitignoreRules) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    for (const rule of gitignoreRules) {
        // Обрабатываем правила с wildcard
        if (rule.includes('*')) {
            const regex = new RegExp('^' + rule.replace(/\*/g, '.*') + '$');
            if (regex.test(relativePath) || regex.test(path.basename(relativePath))) {
                return true;
            }
        } else {
            // Точное совпадение или совпадение с началом пути
            if (relativePath === rule || 
                relativePath.startsWith(rule + '/') ||
                relativePath.endsWith('/' + rule) ||
                path.basename(relativePath) === rule) {
                return true;
            }
        }
    }
    
    return false;
}

// Рекурсивно собираем все файлы
function collectFiles(dirPath, gitignoreRules, allFiles = []) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Пропускаем директории, которые должны быть проигнорированы
            if (!shouldIgnore(fullPath, gitignoreRules)) {
                collectFiles(fullPath, gitignoreRules, allFiles);
            }
        } else if (stat.isFile()) {
            // Добавляем файлы, которые не должны быть проигнорированы
            if (!shouldIgnore(fullPath, gitignoreRules)) {
                allFiles.push(fullPath);
            }
        }
    }
    
    return allFiles;
}

// Основная функция
function main() {
    const projectRoot = process.cwd();
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const outputPath = path.join(projectRoot, 'repository-content.txt');
    
    console.log('🔍 Собираю файлы репозитория...');
    
    // Парсим .gitignore
    const gitignoreRules = parseGitignore(gitignorePath);
    console.log(`📋 Найдено ${gitignoreRules.length} правил в .gitignore`);
    
    // Собираем все файлы
    const allFiles = collectFiles(projectRoot, gitignoreRules);
    console.log(`📁 Найдено ${allFiles.length} файлов для обработки`);
    
    // Сортируем файлы по алфавиту
    allFiles.sort();
    
    // Создаем итоговый файл
    let output = `# Содержимое репозитория\n`;
    output += `# Собрано: ${new Date().toLocaleString('ru-RU')}\n`;
    output += `# Всего файлов: ${allFiles.length}\n\n`;
    
    for (const filePath of allFiles) {
        const relativePath = path.relative(projectRoot, filePath);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            output += `\n${'='.repeat(80)}\n`;
            output += `📄 ФАЙЛ: ${relativePath}\n`;
            output += `${'='.repeat(80)}\n\n`;
            output += content;
            output += `\n\n`;
            
        } catch (error) {
            console.warn(`⚠️  Не удалось прочитать файл ${relativePath}: ${error.message}`);
            output += `\n${'='.repeat(80)}\n`;
            output += `📄 ФАЙЛ: ${relativePath} (ОШИБКА ЧТЕНИЯ)\n`;
            output += `${'='.repeat(80)}\n\n`;
            output += `Ошибка: ${error.message}\n\n`;
        }
    }
    
    // Записываем результат
    fs.writeFileSync(outputPath, output, 'utf8');
    
    console.log(`✅ Готово! Результат сохранен в: ${outputPath}`);
    console.log(`📊 Размер файла: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

// Запускаем скрипт
if (require.main === module) {
    main();
}

module.exports = { collectFiles, parseGitignore, shouldIgnore };
