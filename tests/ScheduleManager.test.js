import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScheduleManager } from '../src/game/ScheduleManager.js';

const baseConfig = {
  ROUTE_SCHEDULE: []
};

const weekdayTemplate = {
  id: 'weekday-test',
  title: 'Будничные дела',
  tasks: [
    { location: 'work', name: 'Рабочие задачи', stayHours: 4 },
    { location: 'institute', name: 'Лекции', stayHours: 3 },
    { location: 'box', name: 'Тренировка', stayHours: 1.5 }
  ]
};

const weekendTemplate = {
  id: 'weekend-test',
  title: 'Выходной',
  tasks: [
    { location: 'park_large1', name: 'Прогулка по парку', stayHours: 2.5 },
    { location: 'redberry', name: 'Кофе с друзьями', stayHours: 1.5 }
  ]
};

const emptyTemplate = {
  id: 'day-off',
  title: 'Полный выходной',
  tasks: []
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

function createScheduleManager(timeManager, overrides = {}) {
  return new ScheduleManager(baseConfig, timeManager, {
    dayStartHour: 8,
    lateHour: 21,
    scheduleTemplates: {
      weekday: overrides.weekday ?? [weekdayTemplate],
      weekend: overrides.weekend ?? [weekendTemplate]
    },
    random: () => 0
  });
}

test('daily generation excludes home tasks from display list', () => {
  const initialTime = createGameTime(2025, 8, 8, 7, 0); // Monday
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  const tasks = manager.getAllTasks();
  assert.equal(tasks.length, weekdayTemplate.tasks.length);
  assert(tasks.every(task => task.location !== 'house'));

  const homeIndex = manager.getHomeIndex();
  const homeTask = manager.getTaskByIndex(homeIndex);
  assert.equal(homeTask.location, 'house');
  assert.equal(manager.getTaskCount(), weekdayTemplate.tasks.length + 1);
});

test('Shina stays home until first task starts', () => {
  const initialTime = createGameTime(2025, 8, 8, 7, 0);
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  manager.update(timeManager.getGameTime());

  const homeIndex = manager.getHomeIndex();
  assert.equal(manager.getActiveTaskIndex(), homeIndex);

  const eightAm = createGameTime(2025, 8, 8, 8, 0);
  timeManager.setGameTime(eightAm);
  manager.update(eightAm);

  assert.equal(manager.getActiveTaskIndex(), 0);
});

test('after finishing last task manager routes home', () => {
  const initialTime = createGameTime(2025, 8, 8, 8, 0);
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  // Имитация завершения всех дел
  manager.startTask(0, new Date(2025, 8, 8, 8, 0));
  manager.completeTask(0, new Date(2025, 8, 8, 12, 0));
  manager.startTask(1, new Date(2025, 8, 8, 12, 0));
  manager.completeTask(1, new Date(2025, 8, 8, 15, 0));
  manager.startTask(2, new Date(2025, 8, 8, 15, 0));
  manager.completeTask(2, new Date(2025, 8, 8, 17, 0));

  const homeIndex = manager.getHomeIndex();
  assert.equal(manager.getNextIndex(2), homeIndex);
  assert.equal(manager.getReturnHomeTask().status, 'PENDING');
});

test('empty daily template keeps Shina at home', () => {
  const initialTime = createGameTime(2025, 8, 13, 9, 0); // Saturday
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager, {
    weekend: [emptyTemplate]
  });

  const tasks = manager.getAllTasks();
  assert.equal(tasks.length, 0);

  const homeIndex = manager.getHomeIndex();
  assert.equal(manager.getActiveTaskIndex(), homeIndex);
  const homeTask = manager.getTaskByIndex(homeIndex);
  assert.equal(homeTask.location, 'house');
  assert.equal(homeTask.status, 'ACTIVE');
});

test('day change regenerates tasks and resets active index', () => {
  const initialTime = createGameTime(2025, 8, 8, 20, 0); // Monday
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  manager.update(timeManager.getGameTime());
  assert.equal(manager.getActiveTaskIndex(), 0);

  // Переносимся на следующий день 08:00
  const nextMorning = createGameTime(2025, 8, 9, 8, 0);
  timeManager.setGameTime(nextMorning);
  manager.update(nextMorning);

  const activeIndex = manager.getActiveTaskIndex();
  assert.equal(activeIndex, 0);
  const firstTask = manager.getTaskByIndex(activeIndex);
  assert(firstTask.location !== 'house');
  assert.equal(firstTask.status, 'ACTIVE');
  assert.equal(firstTask.dayKey, '2025-09-09');
});

test('late cancellations do not cancel already completed tasks', () => {
  const initialTime = createGameTime(2025, 8, 8, 20, 30); // Monday
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  manager.completeTask(0, new Date(2025, 8, 8, 12, 0));

  // Создаем искусственную "позднюю" задачу
  const lateTask = manager.tasks[manager.tasks.length - 1];
  lateTask.startTime = new Date(2025, 8, 8, 23, 30);
  lateTask.endTime = new Date(2025, 8, 9, 0, 30);
  lateTask.status = 'PENDING';

  manager.update(createGameTime(2025, 8, 8, 23, 10)); // позже отсечки

  const tasks = manager.getAllTasks();
  const cancelled = tasks[tasks.length - 1];
  assert.equal(cancelled.status, 'CANCELLED');
  const firstTask = tasks[0];
  assert.equal(firstTask.status, 'COMPLETED');
});

test('unfinished tasks are cleared after late hour and Shina returns home', () => {
  const initialTime = createGameTime(2025, 8, 8, 21, 30); // Monday evening
  const timeManager = new MockTimeManager(initialTime);
  const manager = createScheduleManager(timeManager);

  manager.startTask(0, new Date(2025, 8, 8, 21, 30));
  manager.completeTask(0, new Date(2025, 8, 8, 21, 50));

  manager.startTask(1, new Date(2025, 8, 8, 21, 55));

  const lateTime = createGameTime(2025, 8, 8, 22, 5);
  timeManager.setGameTime(lateTime);
  manager.update(lateTime);

  const tasks = manager.getAllTasks();
  const cancelledTasks = tasks.filter(task => task.status === 'CANCELLED');
  assert(cancelledTasks.length >= 1);

  const homeIndex = manager.getHomeIndex();
  assert.equal(manager.getActiveTaskIndex(), homeIndex);

  const homeTask = manager.getTaskByIndex(homeIndex);
  assert.equal(homeTask.status, 'ACTIVE');
  assert(homeTask.actualStartTime instanceof Date);
});
