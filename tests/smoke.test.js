// Smoke test: verify the test harness loads app.js exports correctly.

require('./setup');
const { test, expect } = require('bun:test');
const srs = require('../app.js');

test('module exports the SRS surface', () => {
  expect(typeof srs.srsAgain).toBe('function');
  expect(typeof srs.srsHard).toBe('function');
  expect(typeof srs.srsGood).toBe('function');
  expect(typeof srs.srsEasy).toBe('function');
  expect(typeof srs.previewIntervals).toBe('function');
  expect(typeof srs.fuzzInterval).toBe('function');
  expect(typeof srs.srsPriority).toBe('function');
});

test('SRS constants match spec', () => {
  expect(srs.INIT_EASE).toBe(2.5);
  expect(srs.MIN_EASE).toBe(1.3);
  expect(srs.GRADUATING_IV).toBe(1440);
  expect(srs.EASY_IV).toBe(5760);
  expect(srs.LEECH_THRESHOLD).toBe(8);
  expect(srs.LEARN_STEPS).toEqual([1, 10]);
  expect(srs.RELEARN_STEPS).toEqual([10]);
});

test('getCard initializes a fresh new card', () => {
  _resetSrsState(srs);
  const c = srs.getCard('test_id_001');
  expect(c.st).toBe(0);
  expect(c.e).toBe(2.5);
  expect(c.iv).toBe(0);
  expect(c.due).toBe(0);
  expect(c.step).toBe(0);
  expect(c.reps).toBe(0);
  expect(c.lapses).toBe(0);
});
