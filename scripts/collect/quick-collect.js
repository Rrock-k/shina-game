#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Быстрый скрипт для сбора файлов репозитория
 * Простая версия без сложной обработки .gitignore
 */

function collectAllFiles(dir, outputFile) {
    const files = [];
    
    function walkDir(currentPath) {
        const items = fs.readdirSync(currentPath);
        
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            
            // Пропускаем node_modules, .git, .DS_Store и другие системные файлы
            if (item === 'node_modules' || 
                item === '.git' || 
                item === '.DS_Store' ||
                item === 'repository-content.txt' ||
                item.startsWith('.')) {
                continue;
            }
            
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (stat.isFile()) {
                files.push(fullPath);
            }
        }
    }
    
    walkDir(dir);
    return files;
}

function main() {
    const projectRoot = process.cwd();
    const outputPath = path.join(projectRoot, 'repository-content.txt');
    
    console.log('🚀 Быстрый сбор файлов репозитория...');
    
    const allFiles = collectAllFiles(projectRoot);
    console.log(`📁 Найдено ${allFiles.length} файлов`);
    
    let output = `# Содержимое репозитория\n`;
    output += `# Собрано: ${new Date().toLocaleString('ru-RU')}\n`;
    output += `# Всего файлов: ${allFiles.length}\n\n`;
    
    for (const filePath of allFiles) {
        const relativePath = path.relative(projectRoot, filePath);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            output += `\n${'='.repeat(60)}\n`;
            output += `📄 ${relativePath}\n`;
            output += `${'='.repeat(60)}\n\n`;
            output += content;
            output += `\n\n`;
            
        } catch (error) {
            console.warn(`⚠️  Ошибка чтения ${relativePath}: ${error.message}`);
        }
    }
    
    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`✅ Готово! Файл: ${outputPath}`);
    console.log(`📊 Размер: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

main();
