import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TimeManager } from '../src/game/TimeManager.js';

test('TimeManager keeps time stable while paused and after resume', () => {
  const originalNow = Date.now;
  let now = 0;
  Date.now = () => now;

  try {
    const manager = new TimeManager();

    now = 1_000;
    manager.update();
    assert.equal(manager.gameTime.hours, 6);
    assert.equal(Math.floor(manager.gameTime.minutes), 25);

    manager.setPaused(true);
    now = 6_000;
    manager.update();
    assert.equal(manager.gameTime.hours, 6);
    assert.equal(Math.floor(manager.gameTime.minutes), 25);

    manager.setPaused(false);
    assert.equal(manager.lastTimeUpdate, now);

    now = 7_000;
    manager.update();

    assert.equal(manager.gameTime.hours, 6);
    assert.equal(Math.floor(manager.gameTime.minutes), 50);
  } finally {
    Date.now = originalNow;
  }
});

test('TimeManager resets lastTimeUpdate when speed multiplier changes', () => {
  const originalNow = Date.now;
  let now = 0;
  Date.now = () => now;

  try {
    const manager = new TimeManager();

    now = 2_000;
    manager.update();
    assert.equal(manager.gameTime.hours, 6);
    assert.equal(Math.floor(manager.gameTime.minutes), 50);

    now = 5_000;
    manager.setSpeedMultiplier(4);
    assert.equal(manager.lastTimeUpdate, now);
    assert.equal(manager.speedMultiplier, 4);

    now = 6_000;
    manager.update();

    assert.equal(manager.gameTime.hours, 8);
    assert.equal(Math.floor(manager.gameTime.minutes), 30);
  } finally {
    Date.now = originalNow;
  }
});
