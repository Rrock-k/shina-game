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

test('ScheduleManager spans midnight when day start is late', () => {
  const manager = new ScheduleManager(baseConfig, null, { dayStartHour: 22 });

  const [firstTask, secondTask] = manager.getAllTasks();

  assert.equal(firstTask.startTime.getHours(), 22);
  assert.equal(firstTask.endTime.getHours(), 2);
  assert.notEqual(firstTask.startTime.getDate(), firstTask.endTime.getDate());

  assert.equal(secondTask.startTime.getHours(), 2);
  assert.equal(secondTask.startTime.getDate(), firstTask.endTime.getDate());
  assert.equal(secondTask.status, 'PENDING');
  assert.equal(firstTask.status, 'ACTIVE');
});

test('Schedule transitions tasks when current is completed', () => {
  const manager = new ScheduleManager(baseConfig, null, { dayStartHour: 8 });

  const completionTime = new Date(2025, 8, 7, 10, 0);
  manager.completeTask(0, completionTime);
  manager.startTask(1, completionTime);

  const firstTask = manager.getTaskByIndex(0);
  const secondTask = manager.getTaskByIndex(1);
  const thirdTask = manager.getTaskByIndex(2);

  assert.equal(firstTask.status, 'COMPLETED');
  assert.equal(firstTask.actualEndTime.getHours(), 10);

  assert.equal(manager.currentTaskIndex, 1);
  assert.equal(secondTask.status, 'ACTIVE');
  assert.equal(secondTask.actualStartTime.getHours(), 10);

  assert(secondTask.actualEndTime === null);
  assert.equal(thirdTask.status, 'PENDING');
});

test('Schedule keeps actual timestamps when a task completes after midnight', () => {
  const manager = new ScheduleManager(baseConfig, null, { dayStartHour: 22 });

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
