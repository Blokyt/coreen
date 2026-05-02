// Unit tests for the SRS engine in app.js.
// Loaded via tests/setup.js which installs the browser globals app.js needs.

require('./setup');
const { test, expect, describe, beforeEach } = require('bun:test');
const srs = require('../app.js');

const MIN = 60_000;        // 1 minute in ms
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Pin Math.random to a midpoint for fuzz tests so results are stable.
// 0.5 means the symmetric fuzz delta is 0 (Math.random() * 2 - 1 == 0).
beforeEach(() => {
  _resetSrsState(srs);
  _setRandom(0.5);
  // Disable the daily new-card limit by default so srsPriority doesn't
  // demote new cards in tests that don't care about the cap.
  srs._setSettings({ newPerDay: 0 });
  srs._resetNewCount();
  srs.refreshNewLimit();
});

// ===== State transitions =====

describe('state transitions', () => {
  test('new -> learning on Again', () => {
    srs.srsAgain('a');
    const c = srs.getCard('a');
    expect(c.st).toBe(1);
    expect(c.step).toBe(0);
  });

  test('new -> learning on Hard', () => {
    srs.srsHard('a');
    expect(srs.getCard('a').st).toBe(1);
  });

  test('new -> learning on Good (advances step)', () => {
    srs.srsGood('a');
    const c = srs.getCard('a');
    expect(c.st).toBe(1);
    expect(c.step).toBe(1);
  });

  test('learning -> review after final Good', () => {
    srs.srsGood('a'); // step 0 -> 1
    srs.srsGood('a'); // step 1 -> graduate (LEARN_STEPS = [1, 10])
    const c = srs.getCard('a');
    expect(c.st).toBe(2);
    expect(c.iv).toBe(srs.GRADUATING_IV);
  });

  test('new -> review on Easy (skip learning)', () => {
    srs.srsEasy('a');
    const c = srs.getCard('a');
    expect(c.st).toBe(2);
    expect(c.iv).toBe(srs.EASY_IV);
  });

  test('review -> relearning on Again', () => {
    // Graduate first
    srs.srsEasy('a');
    expect(srs.getCard('a').st).toBe(2);
    srs.srsAgain('a');
    const c = srs.getCard('a');
    expect(c.st).toBe(3);
    expect(c.lapses).toBe(1);
  });

  test('relearning -> review after Good', () => {
    srs.srsEasy('a');           // st=2
    srs.srsAgain('a');          // st=3
    srs.srsGood('a');           // RELEARN_STEPS = [10] -> graduate
    const c = srs.getCard('a');
    expect(c.st).toBe(2);
  });
});

// ===== Lapses counter =====

describe('lapses', () => {
  test('lapses increments only on review->relearning', () => {
    srs.srsAgain('a'); // new -> learning, no lapse
    expect(srs.getCard('a').lapses).toBe(0);
    srs.srsAgain('a'); // learning -> learning, no lapse
    expect(srs.getCard('a').lapses).toBe(0);
    // graduate
    srs.srsEasy('a');
    expect(srs.getCard('a').lapses).toBe(0);
    // now lapse
    srs.srsAgain('a');
    expect(srs.getCard('a').lapses).toBe(1);
  });

  test('relearning Again does not increment lapses again', () => {
    srs.srsEasy('a');
    srs.srsAgain('a');                      // lapse 1
    expect(srs.getCard('a').lapses).toBe(1);
    srs.srsAgain('a');                      // still relearning
    expect(srs.getCard('a').lapses).toBe(1);
  });
});

// ===== Ease bounds =====

describe('ease bounds', () => {
  test('Again drops ease by 0.20 (capped at MIN_EASE)', () => {
    srs.srsEasy('a'); // st=2, e=2.5+0.15=2.65? No: srsEasy on new sets st=2 but doesn't bump ease (only review->Easy bumps)
    expect(srs.getCard('a').e).toBe(2.5);
    srs.srsAgain('a');
    expect(srs.getCard('a').e).toBeCloseTo(2.30, 5);
  });

  test('Hard drops ease by 0.15', () => {
    srs.srsEasy('a');
    expect(srs.getCard('a').e).toBe(2.5);
    srs.srsHard('a');
    expect(srs.getCard('a').e).toBeCloseTo(2.35, 5);
  });

  test('Good keeps ease unchanged on review', () => {
    srs.srsEasy('a');
    const before = srs.getCard('a').e;
    srs.srsGood('a');
    expect(srs.getCard('a').e).toBe(before);
  });

  test('Easy bumps ease by 0.15 on review', () => {
    srs.srsEasy('a');
    expect(srs.getCard('a').e).toBe(2.5);
    srs.srsEasy('a');
    expect(srs.getCard('a').e).toBeCloseTo(2.65, 5);
  });

  test('ease floor at MIN_EASE (1.3)', () => {
    srs._setP({ a: { st: 2, e: 1.4, iv: 1440, due: 0, step: 0, reps: 1, lapses: 0 } });
    srs.srsAgain('a'); // -0.20 would go to 1.20, must clamp to 1.3
    expect(srs.getCard('a').e).toBe(1.3);
  });

  test('ease cap at 3.69 (Anki standard)', () => {
    srs._setP({ a: { st: 2, e: 3.6, iv: 1440, due: Date.now(), step: 0, reps: 1, lapses: 0 } });
    srs.srsEasy('a'); // +0.15 would go to 3.75, must clamp to 3.69
    expect(srs.getCard('a').e).toBeCloseTo(3.69, 5);
  });
});

// ===== Intervals =====

describe('intervals', () => {
  test('Again on review resets interval to GRADUATING_IV', () => {
    srs._setP({ a: { st: 2, e: 2.5, iv: 60 * 24 * 30, due: 0, step: 0, reps: 5, lapses: 0 } });
    srs.srsAgain('a');
    expect(srs.getCard('a').iv).toBe(srs.GRADUATING_IV);
  });

  test('Easy on new graduates to EASY_IV (4 days)', () => {
    srs.srsEasy('a');
    expect(srs.getCard('a').iv).toBe(srs.EASY_IV);
  });

  test('Good on review multiplies by ease (no overdue)', () => {
    // Place card due NOW so delay = 0
    const now = Date.now();
    srs._setP({ a: { st: 2, e: 2.0, iv: 1000, due: now, step: 0, reps: 5, lapses: 0 } });
    srs.srsGood('a');
    // iv = round((1000 + 0/2) * 2.0) = 2000, then fuzzInterval (1000 < 2880 -> no fuzz)
    expect(srs.getCard('a').iv).toBe(2000);
  });

  test('Easy on review multiplies by ease * EASY_BONUS', () => {
    const now = Date.now();
    srs._setP({ a: { st: 2, e: 2.0, iv: 1000, due: now, step: 0, reps: 5, lapses: 0 } });
    srs.srsEasy('a');
    // iv = round((1000 + 0) * 2.0 * 1.3) = 2600
    expect(srs.getCard('a').iv).toBe(2600);
  });
});

// ===== Fuzz =====

describe('fuzz', () => {
  test('intervals < 2 days are not fuzzed', () => {
    expect(srs.fuzzInterval(1)).toBe(1);
    expect(srs.fuzzInterval(1440)).toBe(1440);
    expect(srs.fuzzInterval(2879)).toBe(2879);
  });

  test('fuzz preserves minimum 1440 minutes', () => {
    _setRandom(0); // pull all the way negative
    const out = srs.fuzzInterval(2880);
    expect(out).toBeGreaterThanOrEqual(1440);
  });

  test('fuzz at random=0.5 leaves interval unchanged', () => {
    _setRandom(0.5);
    expect(srs.fuzzInterval(7 * DAY / MIN)).toBe(7 * DAY / MIN);
  });
});

// ===== Priority =====

describe('priority', () => {
  test('overdue review > overdue learning > new (no limit) > review not yet due', () => {
    const now = Date.now();
    srs._setP({
      newCard: {/* not set => returns undefined; treated as new */},
      overdueRev:  { st: 2, e: 2.5, iv: 1440, due: now - 10*MIN, step: 0, reps: 5, lapses: 0 },
      overdueLrn:  { st: 1, e: 2.5, iv: 0,    due: now - 10*MIN, step: 0, reps: 1, lapses: 0 },
      futureRev:   { st: 2, e: 2.5, iv: 1440, due: now + 10*DAY, step: 0, reps: 5, lapses: 0 },
    });
    delete srs._getP().newCard; // simulate "no entry"
    srs.refreshNewLimit();

    const items = [
      { id: 'newCard' },
      { id: 'overdueRev' },
      { id: 'overdueLrn' },
      { id: 'futureRev' },
    ].sort((a, b) => srs.srsPriority(b) - srs.srsPriority(a));

    expect(items.map(i => i.id)).toEqual([
      'overdueRev', 'overdueLrn', 'newCard', 'futureRev',
    ]);
  });

  test('new cards get -Infinity priority when daily limit is reached', () => {
    srs._setP({});
    srs._setSettings({ newPerDay: 1 });
    // Simulate that one new card has been studied today
    const today = new Date().toDateString();
    localStorage.setItem('blokaja4_newcount', JSON.stringify({ day: today, count: 1 }));
    srs.refreshNewLimit();

    expect(srs.srsPriority({ id: 'aFreshNewCard' })).toBe(-Infinity);
  });
});

// ===== Migration =====

describe('migration', () => {
  test('v3 {s, c, t, iv} format migrates to v4 with derived state', () => {
    srs._setP({ legacy: { s: 10, c: 9, t: 1234567890, iv: 1440 } }); // 90% accuracy
    const c = srs.getCard('legacy');
    expect(c.st).toBe(2);             // accuracy >= 0.8 -> review
    expect(c.iv).toBe(1440);
    expect(c.reps).toBe(10);
    expect(c.due).toBe(1234567890);
    expect(c.lapses).toBe(0);
    expect(c.e).toBeGreaterThanOrEqual(srs.MIN_EASE);
  });

  test('v3 with low accuracy migrates to learning', () => {
    srs._setP({ legacy: { s: 10, c: 4, t: 0, iv: 10 } }); // 40% accuracy
    const c = srs.getCard('legacy');
    expect(c.st).toBe(1);
  });

  test('v4 cards without lapses field gain lapses=0 on read', () => {
    srs._setP({ a: { st: 2, e: 2.5, iv: 1440, due: 0, step: 0, reps: 1 } });
    expect(srs.getCard('a').lapses).toBe(0);
  });
});

// ===== Daily new count =====

describe('daily new count', () => {
  test('new card count increments only on first answer', () => {
    srs._setP({});
    srs._setSettings({ newPerDay: 0 });
    srs._resetNewCount();
    srs.refreshNewLimit();

    srs.srsGood('a'); // first answer -> increment
    const today = new Date().toDateString();
    let raw = JSON.parse(localStorage.getItem('blokaja4_newcount') || '{}');
    expect(raw.day).toBe(today);
    expect(raw.count).toBe(1);

    srs.srsGood('a'); // second answer on same card -> no increment (already learning)
    raw = JSON.parse(localStorage.getItem('blokaja4_newcount') || '{}');
    expect(raw.count).toBe(1);

    srs.srsGood('b'); // new card B -> increment
    raw = JSON.parse(localStorage.getItem('blokaja4_newcount') || '{}');
    expect(raw.count).toBe(2);
  });
});
