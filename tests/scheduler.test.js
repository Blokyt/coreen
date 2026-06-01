// Regression tests for the flashcard scheduler (pickNext).
// These pin down the two reported bugs:
//   1. "same 5 cards loop forever" (clustering / back-to-back repeats)
//   2. "I press Su but no new cards arrive in unlimited mode" (new-card starvation)
// plus the hard daily cap, suspended exclusion, and the priority-inversion fix.
//
// The loop below mirrors showCard()+answer() WITHOUT the DOM: pick a card with
// pickNext(), record it, grade it with the real srs* mutators, advance a fake
// clock. This is the exact selection logic the app runs.

require('./setup');
const { test, expect, describe, afterEach } = require('bun:test');
const srs = require('../app.js');

const _origNow = Date.now;
const SEC = 1000;
let NOW = 1_700_000_000_000;

function newSession(newPerDay) {
  srs._setP({});
  srs._setSettings({ newPerDay });
  srs._resetNewCount();
  srs.refreshNewLimit();
  _setRandom(0.5);              // kill fuzz randomness
  NOW = 1_700_000_000_000;
  Date.now = () => NOW;
}

afterEach(() => { Date.now = _origNow; _restoreRandom(); });

// Drive the real selection+grading loop. `grade(id)` returns 1..4.
function run({ N, steps, stepMs = 8 * SEC, grade, seedP }) {
  const items = Array.from({ length: N }, (_, i) => ({ id: 'c' + i, _c: 'vocabulary' }));
  if (seedP) srs._setP(seedP);
  const recent = [];
  const shown = [];
  for (let s = 0; s < steps; s++) {
    const it = srs.pickNext(items, recent);
    if (!it) break;
    shown.push(it.id);
    recent.push(it.id);
    if (recent.length > srs.RECENT_GUARD * 2) recent.shift();
    const g = grade(it.id);
    if (g === 1) srs.srsAgain(it.id);
    else if (g === 2) srs.srsHard(it.id);
    else if (g === 3) srs.srsGood(it.id);
    else srs.srsEasy(it.id);
    NOW += stepMs;
  }
  return { items, shown };
}

const HARD = new Set(['c2', 'c5', 'c9', 'c13', 'c17', 'c22']);
const learner = id => HARD.has(id) ? 1 : 3;   // fail the hard set, "Su" the rest

describe('scheduler: no new-card starvation (reported bug #2)', () => {
  test('all 30 cards get introduced in unlimited mode even while 6 are always failed', () => {
    newSession(0); // unlimited
    const { shown } = run({ N: 30, steps: 300, grade: learner });
    const distinct = new Set(shown).size;
    expect(distinct).toBe(30); // OLD deck starved ~24 of them; new scheduler must reach all
  });
});

describe('scheduler: no clustering / back-to-back (reported bug #1)', () => {
  test('a card never repeats within RECENT_GUARD shows when the deck is larger', () => {
    newSession(0);
    const { shown } = run({ N: 30, steps: 300, grade: learner });
    let violations = 0;
    for (let i = 0; i < shown.length; i++) {
      for (let k = 1; k <= srs.RECENT_GUARD && i - k >= 0; k++) {
        if (shown[i] === shown[i - k]) violations++;
      }
    }
    expect(violations).toBe(0);
  });

  test('a repeatedly-failed card still comes back soon (bounded gap), just not immediately', () => {
    newSession(0);
    const { shown } = run({ N: 30, steps: 300, grade: learner });
    const idx = shown.map((id, i) => id === 'c9' ? i : -1).filter(i => i >= 0);
    expect(idx.length).toBeGreaterThan(4);          // re-tested several times
    let maxGap = 0;
    for (let i = 1; i < idx.length; i++) maxGap = Math.max(maxGap, idx[i] - idx[i - 1]);
    expect(maxGap).toBeGreaterThan(srs.RECENT_GUARD - 1); // not immediate
    expect(maxGap).toBeLessThanOrEqual(25);              // but soon
  });
});

describe('scheduler: hard daily cap', () => {
  test('never introduces more new cards than the limit', () => {
    newSession(5); // cap = 5 new/day
    const { shown } = run({ N: 20, steps: 120, grade: () => 3 }); // "Su" everything
    const count = JSON.parse(localStorage.getItem('blokaja4_newcount') || '{}').count;
    expect(count).toBe(5);
    // Only the first 5 cards (c0..c4) may ever appear.
    const allowed = new Set(['c0', 'c1', 'c2', 'c3', 'c4']);
    expect(shown.every(id => allowed.has(id))).toBe(true);
  });
});

describe('scheduler: suspended exclusion', () => {
  test('pickNext never returns a suspended card', () => {
    newSession(0);
    srs._setP({
      a: { st: 2, e: 2.5, iv: 1440, due: Date.now() - 600000, step: 0, reps: 5, lapses: 0, suspended: true },
      b: { st: 2, e: 2.5, iv: 1440, due: Date.now() - 600000, step: 0, reps: 5, lapses: 0 },
    });
    srs.refreshNewLimit();
    const items = [{ id: 'a', _c: 'vocabulary' }, { id: 'b', _c: 'vocabulary' }];
    expect(srs.pickNext(items, []).id).toBe('b');
  });

  test('pickNext returns null when everything is suspended', () => {
    newSession(0);
    srs._setP({ a: { st: 2, e: 2.5, iv: 1440, due: Date.now(), step: 0, reps: 5, lapses: 0, suspended: true } });
    srs.refreshNewLimit();
    expect(srs.pickNext([{ id: 'a', _c: 'vocabulary' }], [])).toBeNull();
  });
});

describe('scheduler: priority inversion fix', () => {
  test('a not-yet-due review due sooner ranks higher than one due later', () => {
    const now = _origNow();
    srs._setP({
      soon: { st: 2, e: 2.5, iv: 1440, due: now + 60 * 60000, step: 0, reps: 5, lapses: 0 },
      late: { st: 2, e: 2.5, iv: 1440, due: now + 600 * 60000, step: 0, reps: 5, lapses: 0 },
    });
    srs.refreshNewLimit();
    expect(srs.srsPriority({ id: 'soon' })).toBeGreaterThan(srs.srsPriority({ id: 'late' }));
  });
});
