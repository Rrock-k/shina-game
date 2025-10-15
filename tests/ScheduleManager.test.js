import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScheduleManager } from '../src/game/ScheduleManager.js';

const baseConfig = {
  ROUTE_SCHEDULE: [
    { location: 'house', name: 'Дом', stayHours: 4 },
    { location: 'work', name: 'Работа', stayHours: 3 },
    { location: 'relatives', name: 'Родственники', stayHours: 1.5 }
  ]
};

const weekdayTemplate = {
  id: 'weekday-test',
  title: 'Тестовый будний день',
  tasks: [
    { location: 'house', name: 'Утро', stayHours: 1 },
    { location: 'work', name: 'Работа', stayHours: 9 },
    { location: 'park_large1', name: 'Прогулка', stayHours: 2 },
    { location: 'box', name: 'Спорт', stayHours: 1 },
    { location: 'relatives', name: 'Встреча', stayHours: 2 },
    { location: 'shop', name: 'Поздний заезд', stayHours: 1 },
    { location: 'construction1', name: 'Вечерняя проверка', stayHours: 1 },
    { location: 'house', name: 'Ночь', stayHours: 7 }
  ]
};

const weekendTemplate = {
  id: 'weekend-test',
  title: 'Тестовый выходной',
  tasks: [
    { location: 'house', name: 'Поздний завтрак', stayHours: 4 },
    { location: 'park_large2', name: 'Парк', stayHours: 4 },
    { location: 'market', name: 'Рынок', stayHours: 2 },
    { location: 'relatives', name: 'Гости', stayHours: 4 },
    { location: 'redberry', name: 'Кафе', stayHours: 2 },
    { location: 'house', name: 'Отдых', stayHours: 8 }
  ]
};

function createGameTime(year, month, day, hours, minutes) {
  const date = new Date(year, month, day, hours, minutes);
  return {
    year,
    month,
    day,
    hours,
    minutes,
    dayOfWeek: date.getDay()
  };
}

class MockTimeManager {
  constructor(initial) {
    this.time = { ...initial };
  }

  setGameTime(update) {
    this.time = { ...this.time, ...update };
  }

  getGameTime() {
    return { ...this.time };
  }
}

function createScheduleManagerWithTemplates(timeManager) {
  return new ScheduleManager(baseConfig, timeManager, {
    dayStartHour: 6,
    lateHour: 22,
    scheduleTemplates: {
      weekday: [weekdayTemplate],
      weekend: [weekendTemplate]
    },
    random: () => 0
  });
}

test('ScheduleManager builds weekly plan with day metadata', () => {
  const initialTime = createGameTime(2025, 8, 8, 6, 0); // Monday 08.09.2025 06:00
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManagerWithTemplates(timeManager);

  const tasks = manager.getAllTasks();
  const expectedCount = weekdayTemplate.tasks.length * 5 + weekendTemplate.tasks.length * 2;
  assert.equal(tasks.length, expectedCount);

  const mondayKey = tasks[0].dayKey;
  const mondayTasks = tasks.filter(task => task.dayKey === mondayKey);
  assert.equal(mondayTasks.length, weekdayTemplate.tasks.length);
  assert.ok(mondayTasks.every(task => task.dayLabel.startsWith('Пн')));

  const firstTask = tasks[0];
  assert.equal(firstTask.startTime.getHours(), 6);
  const lastMondayTask = mondayTasks[mondayTasks.length - 1];
  assert.equal(lastMondayTask.endTime.getHours(), 6);
});

test('ScheduleManager waits until the next day before advancing', () => {
  const initialTime = createGameTime(2025, 8, 8, 21, 0); // Monday 21:00
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManagerWithTemplates(timeManager);
  const tasks = manager.getAllTasks();

  const mondayIndices = tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => task.dayIndex === 0)
    .map(({ index }) => index);

  const homeIndex = mondayIndices[mondayIndices.length - 1];
  manager.tasks.forEach((task, idx) => {
    if (idx < homeIndex) {
      task.status = 'COMPLETED';
    }
  });
  manager.tasks[homeIndex].status = 'ACTIVE';
  manager.currentTaskIndex = homeIndex;

  const beforeMidnightIndex = manager.getNextIndex(homeIndex);
  assert.equal(beforeMidnightIndex, homeIndex);

  timeManager.setGameTime(createGameTime(2025, 8, 9, 6, 15)); // Tuesday 06:15
  manager.update(timeManager.getGameTime());
  const afterMidnightIndex = manager.getNextIndex(homeIndex);
  const nextTask = manager.getTaskByIndex(afterMidnightIndex);
  assert.notEqual(afterMidnightIndex, homeIndex);
  assert.equal(nextTask.dayIndex, 1); // Tuesday
});

test('ScheduleManager cancels late tasks and keeps home available', () => {
  const initialTime = createGameTime(2025, 8, 8, 22, 5); // Monday 22:05
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManagerWithTemplates(timeManager);
  manager.update(timeManager.getGameTime());

  const tasks = manager.getAllTasks();
  const lateTask = tasks.find(task => task.location === 'construction1' && task.dayIndex === 0);
  const nightHomeTask = tasks.find(
    task => task.location === 'house' && task.dayIndex === 0 && task.startTime.getHours() >= 23
  );

  assert.equal(lateTask.status, 'CANCELLED');
  assert.equal(nightHomeTask.status, 'PENDING');
});

test('Static fallback keeps actual timestamps across midnight', () => {
  const manager = new ScheduleManager(baseConfig, null, {
    dayStartHour: 22,
    scheduleTemplates: { weekday: [], weekend: [] }
  });

  const startTime = new Date(2025, 8, 7, 22, 0);
  const completionTime = new Date(2025, 8, 8, 2, 30);

  manager.startTask(0, startTime);
  manager.completeTask(0, completionTime);
  manager.startTask(1, completionTime);

  const firstTask = manager.getTaskByIndex(0);
  const secondTask = manager.getTaskByIndex(1);

  assert.equal(firstTask.actualStartTime.getHours(), 22);
  assert.equal(firstTask.actualStartTime.getDate(), 7);

  assert.equal(firstTask.actualEndTime.getHours(), 2);
  assert.equal(firstTask.actualEndTime.getDate(), 8);

  assert.equal(secondTask.status, 'ACTIVE');
  assert.equal(secondTask.actualStartTime.getHours(), 2);
  assert.equal(secondTask.actualStartTime.getDate(), 8);
});
