const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Игровое состояние
let gameState = {
  time: { hours: 8, minutes: 0 },
  car: {
    position: { x: 0, y: 0 },
    rotation: 0,
    segment: 0,
    progress: 0,
    isAtDestination: false,
    currentRouteIndex: 1
  },
  trafficLights: new Map(),
  players: new Map(),
  buildingAvatars: new Map()
};

// Конфигурация игры (из клиентского кода)
const CONFIG = {
  WORLD_WIDTH: 3000,
  WORLD_HEIGHT: 2000,
  BASE_CAR_SPEED: 11.7,
  BASE_TIME_SPEED: 60,
  SPEED_MULTIPLIER: 5,
  ROUTE_SCHEDULE: [
    { location: 'house', name: 'Дом', stayHours: 2 },
    { location: 'institute', name: 'Институт', stayHours: 2 },
    { location: 'work', name: 'Работа', stayHours: 5 },
    { location: 'relatives', name: 'Родственники', stayHours: 1.5 },
    { location: 'box', name: 'Бокс', stayHours: 1 },
  ]
};

// Инициализация игрового состояния
function initializeGameState() {
  // Устанавливаем начальную позицию машины
  gameState.car.position = { x: 600, y: 1283 };
  gameState.car.rotation = 0;
  gameState.car.segment = 0;
  gameState.car.progress = 0;
  gameState.car.isAtDestination = false;
  gameState.car.currentRouteIndex = 1;
  
  // Инициализируем время
  gameState.time = { hours: 8, minutes: 0 };
}

// Обновление игрового времени
function updateGameTime() {
  const now = Date.now();
  if (!gameState.lastTimeUpdate) {
    gameState.lastTimeUpdate = now;
    return;
  }
  
  const deltaMs = now - gameState.lastTimeUpdate;
  gameState.lastTimeUpdate = now;
  
  // Ускоряем время: 1 реальная секунда = timeSpeed игровых минут
  const gameMinutes = (deltaMs / 1000) * CONFIG.BASE_TIME_SPEED * CONFIG.SPEED_MULTIPLIER;
  
  gameState.time.minutes += gameMinutes;
  let hourGuard = 0;
  while (gameState.time.minutes >= 60 && hourGuard < 100) {
    hourGuard++;
    gameState.time.minutes -= 60;
    gameState.time.hours += 1;
    if (gameState.time.hours >= 24) {
      gameState.time.hours = 0;
    }
  }
}

// Обновление позиции машины
function updateCarPosition() {
  if (gameState.car.isAtDestination) {
    return; // Машина в пункте назначения
  }
  
  // Здесь будет логика движения машины
  // Пока что просто обновляем время
  updateGameTime();
}

// WebSocket соединения
io.on('connection', (socket) => {
  console.log('Новый игрок подключился:', socket.id);
  
  // Добавляем игрока
  gameState.players.set(socket.id, {
    id: socket.id,
    name: `Игрок ${socket.id.slice(0, 6)}`,
    connectedAt: Date.now()
  });
  
  // Отправляем текущее состояние игры
  socket.emit('gameState', gameState);
  
  // Уведомляем всех о новом игроке
  socket.broadcast.emit('playerJoined', {
    id: socket.id,
    name: gameState.players.get(socket.id).name
  });
  
  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('Игрок отключился:', socket.id);
    gameState.players.delete(socket.id);
    
    // Уведомляем всех об отключении
    socket.broadcast.emit('playerLeft', socket.id);
  });
  
  // Обработка сообщений от клиента
  socket.on('clientMessage', (data) => {
    console.log('Сообщение от клиента:', data);
    // Здесь можно обрабатывать команды от клиента
  });
});

// API маршруты
app.get('/api/game-state', (req, res) => {
  res.json(gameState);
});

app.get('/api/config', (req, res) => {
  res.json(CONFIG);
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Инициализация игры
initializeGameState();

// Игровой цикл (обновление каждые 100ms)
setInterval(() => {
  updateCarPosition();
  
  // Отправляем обновленное состояние всем подключенным клиентам
  io.emit('gameStateUpdate', gameState);
}, 100);

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Игра "Карта Шины" запущена на порту ${PORT}`);
  console.log(`🌐 Откройте http://localhost:${PORT} для игры`);
});

module.exports = app;
