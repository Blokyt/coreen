// Reproduction harness for the "same cards keep coming back" report (unlimited mode).
// NOT a unit test (filename lacks .test.) so `bun test` ignores it.
// Run with:  bun tests/repro_deck.js
//
// It faithfully replays the deck algorithm from app.js:
//   - startFc():  deck = [...items].sort(byPriority)
//   - answer():   on Again (always) / Hard-when-not-review, splice the SAME
//                 item ref into deck at fi+3+rand(0..2); then fi++.
//   - showCard(): when fi >= deck.length -> refreshNewLimit(); re-sort; fi=0.
// using the EXPORTED srs* mutators + srsPriority, on a controlled fake clock.

require('./setup');
const srs = require('../app.js');

// ---- Deterministic RNG (so the run is reproducible) -----------------------
let _seed = 12345;
function rng() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 2 ** 32; }
Math.random = rng; // app.js uses Math.random in fuzzInterval + reinsert offset

// ---- Controlled clock -----------------------------------------------------
let NOW = 1_700_000_000_000;       // fixed epoch base
Date.now = () => NOW;
const SEC = 1000, MIN = 60 * SEC;
const ANSWER_TIME = 8 * SEC;       // ~8s of wall-clock per answer (realistic)

// ---- Session setup (UNLIMITED mode = the reported scenario) ---------------
const N = 30;                      // cards in the list (e.g. one chapter)
const HARD = new Set([2, 5, 9, 13, 17, 22]); // cards the learner keeps missing
srs._setP({});
srs._setSettings({ newPerDay: 0 });   // 0 = unlimited
srs._resetNewCount();
srs.refreshNewLimit();

const items = Array.from({ length: N }, (_, i) => ({ id: 'c' + i }));
items.forEach(i => srs.getCard(i.id));

const byPriority = (a, b) => srs.srsPriority(b) - srs.srsPriority(a);
let deck = [...items].sort(byPriority);
let fi = 0;

// ---- Learner model: decide a grade for the card currently shown -----------
function chooseGrade(id) {
  const n = Number(id.slice(1));
  const c = srs._getP()[id];
  const isReview = c && c.st === 2;
  if (HARD.has(n)) return rng() < 0.70 ? 1 : 3;        // fails hard cards often
  if (isReview)    return rng() < 0.92 ? 3 : 1;        // mostly remembers reviews
  return rng() < 0.85 ? 3 : 1;                          // learning: usually Good
}

// ---- Faithful answer() + showCard() loop ----------------------------------
const shownSeq = [];               // id shown at each step
const deckLenSeq = [];             // deck.length at each step
let wraps = 0;

function showCardWrapCheck() {
  if (fi >= deck.length) { srs.refreshNewLimit(); deck.sort(byPriority); fi = 0; wraps++; }
}

const STEPS = 300;
for (let step = 0; step < STEPS; step++) {
  showCardWrapCheck();
  const it = deck[fi];
  shownSeq.push(it.id);
  deckLenSeq.push(deck.length);

  const grade = chooseGrade(it.id);
  const wasReview = (srs._getP()[it.id] && srs._getP()[it.id].st === 2);

  if (grade === 1) srs.srsAgain(it.id);
  else if (grade === 2) srs.srsHard(it.id);
  else if (grade === 3) srs.srsGood(it.id);
  else srs.srsEasy(it.id);

  if (grade === 1 || (grade === 2 && !wasReview)) {
    const reinsert = Math.min(fi + 3 + (rng() * 3 | 0), deck.length);
    deck.splice(reinsert, 0, it);
  }
  fi++;
  NOW += ANSWER_TIME;              // time advances like a real session
}

// ---- Metrics --------------------------------------------------------------
// 1. Deck growth (duplicate accumulation)
const dupCount = deck.length - N;

// 2. Repeat gaps: distance between consecutive shows of the same id.
//    A gap of 1 = shown twice in a row. Small gaps = "same card coming back".
const lastSeen = {};
const gaps = [];
shownSeq.forEach((id, i) => { if (lastSeen[id] !== undefined) gaps.push(i - lastSeen[id]); lastSeen[id] = i; });
const shortGaps = gaps.filter(g => g <= 3).length;        // came back within 3 cards
const veryShort = gaps.filter(g => g === 1).length;       // back-to-back

// 3. Distinct cards seen in each sliding window of 20.
let minDistinct = Infinity, sumDistinct = 0, windows = 0;
for (let i = 0; i + 20 <= shownSeq.length; i++) {
  const d = new Set(shownSeq.slice(i, i + 20)).size;
  minDistinct = Math.min(minDistinct, d); sumDistinct += d; windows++;
}

// 4. Show-count concentration: how many shows did the top 5 cards eat?
const counts = {};
shownSeq.forEach(id => counts[id] = (counts[id] || 0) + 1);
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const top5Shows = sorted.slice(0, 5).reduce((s, [, c]) => s + c, 0);

console.log('=== Repro: unlimited-mode deck behavior ===');
console.log(`cards in list (N)............ ${N}`);
console.log(`answers simulated............ ${STEPS}  (~${(STEPS * ANSWER_TIME / MIN).toFixed(0)} min of study)`);
console.log(`deck wraps (full re-sorts)... ${wraps}`);
console.log(`final deck.length............ ${deck.length}   (duplicate entries: ${dupCount})`);
console.log(`max deck.length seen......... ${Math.max(...deckLenSeq)}`);
console.log('');
console.log(`repeat gaps recorded......... ${gaps.length}`);
console.log(`  back-to-back (gap == 1).... ${veryShort}`);
console.log(`  came back within 3 cards... ${shortGaps}  (${(100 * shortGaps / gaps.length).toFixed(0)}% of repeats)`);
console.log('');
console.log(`distinct cards / 20-card window: min ${minDistinct}, avg ${(sumDistinct / windows).toFixed(1)} (of 30)`);
console.log(`top-5 cards ate ${top5Shows}/${STEPS} shows (${(100 * top5Shows / STEPS).toFixed(0)}%)`);
console.log('');
console.log('top 8 most-shown cards (id: times shown):');
sorted.slice(0, 8).forEach(([id, c]) => console.log(`  ${id}: ${c}`));
