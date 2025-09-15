// Главный класс игры
import Game from './game/Game.js';

// Асинхронная инициализация игры
(async () => {
    // Создаем экземпляр игры
    const game = new Game();

    // Инициализируем игру
    await game.init();

    // Запускаем игровой цикл
    game.start();
})();
