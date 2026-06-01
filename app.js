/* Blokaja v4 — SRS Anki SM-2, infinite mode */

let D = null;
let P = {};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

const CATS = {
  vocabulary: 'Vocabulaire', verbs: 'Verbes', grammar: 'Grammaire',
  particles: 'Particules', expressions: 'Expressions', hangeul: 'Hangeul',
  numbers: 'Nombres', culture: 'Culture', dialogues: 'Dialogues',
  pronunciation_rules: 'Prononciation', time_expressions: 'Temps',
  classifiers: 'Classificateurs', connectors: 'Connecteurs',
  adjectives: 'Adjectifs', adverbs: 'Adverbes',
};

const CH_COLORS = ['#4338ca','#7c3aed','#db2777','#dc2626','#ea580c','#ca8a04','#16a34a'];
const FLASHABLE = ['vocabulary','verbs','hangeul','numbers','expressions','particles',
  'time_expressions','classifiers','connectors','adjectives','adverbs'];
const READABLE = ['grammar','culture','dialogues','pronunciation_rules'];

// ========== SRS Engine (Anki SM-2) ==========
//
// Card states: 0=new, 1=learning, 2=review, 3=relearning
// Grades: 1=Again, 2=Hard, 3=Good, 4=Easy
//
// P[id] = { st, e, iv, due, step, reps, lapses }
//   st     : state (0-3)
//   e      : ease factor (default 2.5, min 1.3)
//   iv     : current interval in minutes
//   due    : timestamp (ms) when next review is due
//   step   : current learning step index
//   reps   : total number of reviews
//   lapses : number of times a review card was failed

const LEARN_STEPS    = [1, 10];    // learning steps in minutes
const RELEARN_STEPS  = [10];       // relearning steps in minutes
const GRADUATING_IV  = 1440;       // first review interval after learning: 1 day
const EASY_IV        = 5760;       // Easy graduation interval: 4 days
const MIN_EASE       = 1.3;
const INIT_EASE      = 2.5;
const HARD_MULT      = 1.2;        // Hard interval multiplier
const EASY_BONUS     = 1.3;        // Easy interval bonus multiplier
const LEECH_THRESHOLD = 8;         // lapses before leech flag
const RECENT_GUARD    = 8;         // don't re-show a card within the last N shows (when deck > N)

// Settings (persisted in localStorage)
const SETTINGS_KEY = 'blokaja4_settings';
function getSettings() {
  const defaults = { newPerDay: 20, autoSpeak: false, showRomanization: true, direction: 'kr-fr' };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return defaults; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

// Daily new-card counter (persisted in localStorage)
const NEW_COUNT_KEY = 'blokaja4_newcount';
function getNewCount() {
  try {
    const d = JSON.parse(localStorage.getItem(NEW_COUNT_KEY) || '{}');
    const today = new Date().toDateString();
    return d.day === today ? d.count : 0;
  } catch { return 0; }
}
function incNewCount() {
  const today = new Date().toDateString();
  let d;
  try { d = JSON.parse(localStorage.getItem(NEW_COUNT_KEY) || '{}'); } catch { d = {}; }
  if (d.day !== today) d = { day: today, count: 0 };
  d.count++;
  localStorage.setItem(NEW_COUNT_KEY, JSON.stringify(d));
  // Toast on the exact transition to the limit (browser only)
  const lim = getSettings().newPerDay;
  if (lim > 0 && d.count === lim && typeof window !== 'undefined' && typeof showToast === 'function') {
    showToast('Limite quotidienne atteinte');
  }
}

// Summary used by the UI to display the daily new-card budget.
function dailyNewSummary() {
  const limit = getSettings().newPerDay;
  const count = getNewCount();
  return { count, limit, isReached: limit > 0 && count >= limit };
}

// Interval fuzz to prevent card clustering (Anki-style)
function fuzzInterval(iv) {
  if (iv < 2880) return iv; // < 2 days: no fuzz
  const days = iv / 1440;
  let fuzz;
  if (days < 7)       fuzz = Math.max(1, Math.round(days * 0.25));
  else if (days < 30) fuzz = Math.max(2, Math.round(days * 0.15));
  else                fuzz = Math.max(4, Math.round(days * 0.05));
  const fuzzMin = fuzz * 1440;
  return Math.max(1440, iv + Math.round((Math.random() * 2 - 1) * fuzzMin));
}

function getCard(id) {
  if (!P[id]) P[id] = { st: 0, e: INIT_EASE, iv: 0, due: 0, step: 0, reps: 0, lapses: 0 };
  // Migrate old format {s, c, t, iv} → new format
  if (P[id].s !== undefined && P[id].st === undefined) {
    const old = P[id];
    const accuracy = old.s ? old.c / old.s : 0;
    P[id] = {
      st: accuracy >= 0.8 ? 2 : accuracy > 0 ? 1 : 0,
      e: Math.max(MIN_EASE, 1.3 + accuracy * 1.2),
      iv: old.iv || (accuracy >= 0.8 ? 1440 : 10),
      due: old.t || 0,
      step: 0,
      reps: old.s || 0,
      lapses: 0,
    };
  }
  // Ensure lapses field exists (migration from v4 without lapses)
  if (P[id].lapses === undefined) P[id].lapses = 0;
  return P[id];
}

// Grade 1: Again
function srsAgain(id) {
  const c = getCard(id);
  if (c.st === 2) {
    // Review → Relearning (lapse)
    c.e = Math.max(MIN_EASE, c.e - 0.2);
    c.st = 3;
    c.step = 0;
    c.due = Date.now() + RELEARN_STEPS[0] * 60000;
    c.iv = GRADUATING_IV; // reset to 1 day (Anki default: new_interval = 0)
    c.lapses++;
  } else {
    // New/Learning/Relearning → back to step 0
    if (c.st === 0) { c.st = 1; incNewCount(); }
    c.step = 0;
    const steps = c.st === 3 ? RELEARN_STEPS : LEARN_STEPS;
    c.due = Date.now() + steps[0] * 60000;
  }
  c.reps++;
  saveP();
}

// Grade 2: Hard
function srsHard(id) {
  const c = getCard(id);
  if (c.st === 2) {
    // Review: interval * 1.2 + delay/4, ease -0.15
    // (Anki SM-2: Hard now also benefits from overdue delay, capped at 1×iv
    //  to prevent runaway growth after long breaks. Previous +1440 floor
    //  inflated short intervals and was non-standard.)
    c.e = Math.max(MIN_EASE, c.e - 0.15);
    const delay = Math.max(0, Date.now() - c.due) / 60000;
    const cappedDelay = Math.min(delay, c.iv);
    c.iv = fuzzInterval(Math.max(1, Math.round(c.iv * HARD_MULT + cappedDelay / 4)));
    c.due = Date.now() + c.iv * 60000;
  } else {
    // Learning/Relearning: repeat current step
    if (c.st === 0) { c.st = 1; incNewCount(); }
    const steps = c.st === 3 ? RELEARN_STEPS : LEARN_STEPS;
    const stepIdx = Math.min(c.step, steps.length - 1);
    c.due = Date.now() + steps[stepIdx] * 60000;
  }
  c.reps++;
  saveP();
}

// Grade 3: Good
function srsGood(id) {
  const c = getCard(id);
  if (c.st === 0 || c.st === 1 || c.st === 3) {
    // Learning or Relearning: advance step
    const wasRelearn = c.st === 3;
    const steps = wasRelearn ? RELEARN_STEPS : LEARN_STEPS;
    c.step++;
    if (c.st === 0) { c.st = 1; incNewCount(); }

    if (c.step >= steps.length) {
      // Graduate to Review
      c.iv = wasRelearn ? Math.max(GRADUATING_IV, Math.round(c.iv * 0.7)) : GRADUATING_IV;
      c.st = 2;
      c.due = Date.now() + fuzzInterval(c.iv) * 60000;
    } else {
      c.due = Date.now() + steps[c.step] * 60000;
    }
  } else {
    // Review: interval grows by ease factor + overdue bonus
    // Delay capped at 1×iv so a card studied very late can't balloon
    // its interval into multi-year territory.
    const delay = Math.max(0, Date.now() - c.due) / 60000;
    const cappedDelay = Math.min(delay, c.iv);
    c.iv = fuzzInterval(Math.round((c.iv + cappedDelay / 2) * c.e));
    c.due = Date.now() + c.iv * 60000;
    // No ease change on Good (Anki SM-2 behavior)
  }
  c.reps++;
  saveP();
}

// Grade 4: Easy
function srsEasy(id) {
  const c = getCard(id);
  if (c.st === 0 || c.st === 1 || c.st === 3) {
    // Skip remaining learning steps, graduate immediately
    if (c.st === 0) { c.st = 1; incNewCount(); }
    c.iv = EASY_IV; // 4 days
    c.st = 2;
    c.step = 0;
    c.due = Date.now() + fuzzInterval(c.iv) * 60000;
  } else {
    // Review: interval * ease * easy bonus + capped overdue bonus
    const delay = Math.max(0, Date.now() - c.due) / 60000;
    const cappedDelay = Math.min(delay, c.iv);
    c.iv = fuzzInterval(Math.round((c.iv + cappedDelay) * c.e * EASY_BONUS));
    c.due = Date.now() + c.iv * 60000;
    c.e = Math.min(3.69, c.e + 0.15); // ease bonus for Easy, capped like Anki
  }
  c.reps++;
  saveP();
}

// Preview what interval each grade would give (for button labels)
function previewIntervals(id) {
  const c = getCard(id);
  const now = Date.now();
  const delay = Math.max(0, now - (c.due || 0)) / 60000;

  if (c.st === 0 || c.st === 1 || c.st === 3) {
    const steps = (c.st === 3) ? RELEARN_STEPS : LEARN_STEPS;
    const againStep = steps[0];
    const hardStep = steps[Math.min(c.step, steps.length - 1)];
    const goodNext = c.step + 1 >= steps.length;
    const goodIv = goodNext
      ? ((c.st === 3) ? Math.max(GRADUATING_IV, Math.round(c.iv * 0.7)) : GRADUATING_IV)
      : steps[c.step + 1] || steps[c.step];
    return { again: againStep, hard: hardStep, good: goodIv, easy: EASY_IV };
  }

  // Review (delay capped at 1×iv to match srs* mutators)
  const cappedDelay = Math.min(delay, c.iv);
  const ivHard = Math.max(1, Math.round(c.iv * HARD_MULT + cappedDelay / 4));
  const ivGood = Math.round((c.iv + cappedDelay / 2) * c.e);
  const ivEasy = Math.round((c.iv + cappedDelay) * c.e * EASY_BONUS);
  return { again: RELEARN_STEPS[0], hard: ivHard, good: ivGood, easy: ivEasy };
}

// Format interval for button display
function fmtIv(min) {
  if (min < 60) return `${Math.round(min)}min`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  const d = min / 1440;
  if (d < 30) return `${Math.round(d)}j`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}a`;
}

// Cached new-card limit check (set before each sort to avoid O(N) localStorage reads)
let _newLimitReached = false;
function refreshNewLimit() {
  const s = getSettings();
  _newLimitReached = s.newPerDay > 0 && getNewCount() >= s.newPerDay;
}

// Priority for infinite feed: higher = show sooner
// Order: overdue reviews > overdue learning > new cards > not yet due
function srsPriority(item) {
  const c = P[item.id];
  // Suspended cards (manually set) never appear in any deck
  if (c && c.suspended) return -Infinity;
  if (!c || c.st === 0) {
    if (_newLimitReached) return -Infinity;
    return 5000; // after overdue reviews/learning
  }

  const now = Date.now();
  const overdue = now - (c.due || 0); // positive = overdue

  if (c.st === 2 && overdue > 0) {
    // Review card overdue: highest priority
    return 10000 + Math.min(overdue / 60000, 999);
  }

  if (c.st === 1 || c.st === 3) {
    // Learning/relearning: show ASAP when due
    return overdue > 0 ? 8000 + Math.min(overdue / 60000, 999) : overdue / 60000;
  }

  // Review card not yet due: kept well below new cards; sooner due = higher
  // priority (closer to 0). Was inverted before: far-future reviews outranked
  // near ones because of the sign on the original Math.min(4999, ...).
  return -Math.min(Math.abs(overdue) / 60000, 1e7);
}

// Pick the next card to show from a unique working set `items`, given the ids
// shown recently (oldest..newest). Pure w.r.t. module state: reads P + settings
// via srsPriority/refreshNewLimit. Returns the item to show, or null if nothing
// is eligible.
//
// This replaces the old "deck array + splice duplicates + occasional re-sort"
// mechanic, which let duplicate refs pile up (deck grew without bound), starved
// new cards, and made the same few cards cluster/loop. See tests/repro_deck.js
// for the reproduction and tests/scheduler.test.js for the regression coverage.
function pickNext(items, recent) {
  refreshNewLimit();
  // Eligible = priority above -Infinity → drops suspended cards and, once the
  // daily cap is hit, new cards (a real hard cap, not just a demotion).
  const elig = items.filter(it => srsPriority(it) > -Infinity);
  if (!elig.length) return null;
  // Avoid re-showing a card seen in the last RECENT_GUARD shows, unless doing so
  // would leave nothing to show (deck smaller than the guard window).
  const guard = new Set(recent.slice(-RECENT_GUARD));
  let pool = elig.filter(it => !guard.has(it.id));
  if (!pool.length) pool = elig;
  // Highest live priority wins; tie-break by earliest due. Equal priority AND
  // equal due keeps list order (new cards have due 0, so they are introduced in
  // chapter/page order rather than by id string).
  let best = pool[0], bestP = srsPriority(best);
  for (let i = 1; i < pool.length; i++) {
    const p = srsPriority(pool[i]);
    if (p > bestP) { best = pool[i]; bestP = p; continue; }
    if (p === bestP && (P[pool[i].id]?.due || 0) < (P[best.id]?.due || 0)) best = pool[i];
  }
  return best;
}

// Display helpers
function cardState(id) {
  const c = P[id];
  if (!c || c.st === 0) return 'new';
  if (c.st === 1 || c.st === 3) return 'learning';
  // Review: use ease to determine mastery level
  if (c.e < 1.8) return 'almost';
  return 'known';
}

// Count items by SRS state for a list of flashable items
function stateCounts(items) {
  const now = Date.now();
  let nw = 0, learn = 0, due = 0, almost = 0, known = 0;
  for (const it of items) {
    if (!it.id) continue;
    const c = P[it.id];
    if (c?.suspended) continue; // suspended cards don't count toward any total
    if (!c || c.st === 0) { nw++; continue; }
    if (c.st === 1 || c.st === 3) { learn++; continue; }
    // st === 2 (review)
    if (c.e < 1.8) almost++; else known++;
    if (c.due && c.due <= now) due++;
  }
  const ok = almost + known;
  return { nw, learn, due, almost, known, ok, total: nw + learn + ok };
}

function segBar(s, cls) {
  if (!s.total) return `<div class="${cls}"></div>`;
  const pK = s.known / s.total * 100;
  const pA = s.almost / s.total * 100;
  const pL = s.learn / s.total * 100;
  return `<div class="${cls}"><div class="seg seg-known" style="width:${pK}%"></div><div class="seg seg-almost" style="width:${pA}%"></div><div class="seg seg-learn" style="width:${pL}%"></div></div>`;
}

// Format next due time for display
function dueLabel(id) {
  const c = P[id];
  if (!c || c.st === 0) return '';
  const diff = (c.due || 0) - Date.now();
  if (diff <= 0) return 'maintenant';
  return fmtIv(diff / 60000);
}

// ========== Data ==========

/* Normalize expression data: 3 source formats → 1 canonical { polite, informal } */
function normalizeExpression(it) {
  // Format A: flat korean_formal/korean_informal (12 items, pages 33-34)
  if (it.korean_formal !== undefined) {
    return { ...it,
      polite:   { korean: it.korean_formal,   romanization: it.romanization_formal   || '' },
      informal: { korean: it.korean_informal,  romanization: it.romanization_informal || '' },
    };
  }
  // Format B: flat korean/romanization, no register split (3 items)
  if (it.korean !== undefined && !it.polite) {
    return { ...it,
      polite: { korean: it.korean, romanization: it.romanization || '' },
    };
  }
  // Format C: nested polite/informal — already canonical
  return it;
}

function normalizeData(raw) {
  if (raw.expressions) raw.expressions = raw.expressions.map(normalizeExpression);
  return raw;
}

async function init() {
  const res = await fetch('data/course_data.json');
  D = normalizeData(await res.json());
  P = JSON.parse(localStorage.getItem('blokaja4') || '{}');
  renderHome();
  setupEvents();
}

function saveP() { localStorage.setItem('blokaja4', JSON.stringify(P)); }

// ========== Daily streak ==========

const STREAK_KEY = 'blokaja4_streak';
function getStreak() { try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{}'); } catch { return {}; } }
function bumpStreak() {
  const today = new Date().toDateString();
  const s = getStreak();
  if (s.last === today) return s.count || 1;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  s.count = (s.last === yesterday) ? (s.count || 0) + 1 : 1;
  s.last = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  return s.count;
}

function chItems(ch) {
  const out = [];
  for (const cat of Object.keys(CATS)) for (const it of (D[cat] || [])) if (it.chapter === ch) out.push({...it, _c: cat});
  return out;
}
function catItems(cat) { return (D[cat] || []).map(it => ({...it, _c: cat})); }

// ========== Navigation ==========

let screen = 'home', curItems = [], curTitle = '';

function show(s) {
  $$('.screen').forEach(el => el.classList.remove('active'));
  $(`#screen-${s}`).classList.add('active');
  screen = s;
  $('#btn-back').classList.toggle('hidden', s === 'home');
}

// ========== Home ==========

function renderHome() {
  show('home');
  $('#header-title').textContent = 'Blokaja';

  const allFlashable = [];
  for (const cat of FLASHABLE) for (const it of (D[cat] || [])) if (it.id) allFlashable.push({...it, _c: cat});
  const g = stateCounts(allFlashable);
  const touched = g.ok + g.learn;
  const pct = g.total ? Math.round(touched / g.total * 100) : 0;

  const parts = [`${g.known} acquis`];
  if (g.almost) parts.push(`${g.almost} fragile${g.almost > 1 ? 's' : ''}`);
  if (g.learn) parts.push(`${g.learn} en cours`);
  if (g.due) parts.push(`${g.due} à revoir`);
  parts.push(`${g.nw} nouveau${g.nw > 1 ? 'x' : ''}`);

  const dn = dailyNewSummary();
  const dnText = dn.limit > 0
    ? `Nouvelles aujourd'hui : ${dn.count} / ${dn.limit}`
    : `Nouvelles aujourd'hui : ${dn.count}`;
  const dnCls = dn.isReached ? 'gp-daily reached' : 'gp-daily';

  $('#global-progress').innerHTML =
    `<div class="gp-pct">${pct}%</div>
     <div class="gp-right">
       ${segBar(g, 'gp-bar')}
       <div class="gp-label">${parts.join(' · ')}</div>
       <div class="${dnCls}">${dnText}</div>
       ${(() => { const st = getStreak(); return st.count ? `<div class="gp-streak">🔥 ${st.count} jour${st.count>1?'s':''} d'affilée</div>` : ''; })()}
     </div>`;

  $('#chapters-grid').innerHTML = D.chapters.map((ch, i) => {
    const items = chItems(ch.number).filter(x => FLASHABLE.includes(x._c));
    const s = stateCounts(items);
    return `<div class="card card-ch" data-ch="${ch.number}">
      <div class="card-ch-num" style="background:${CH_COLORS[i % CH_COLORS.length]}">${ch.number}</div>
      <div class="card-ch-body">
        <div class="card-ch-title">${esc(ch.title_fr)}</div>
        <div class="card-ch-sub">${esc(ch.title_ko || '')}</div>
      </div>
      <div class="card-ch-right">
        <div class="card-ch-count">${s.ok + s.learn} / ${s.total}</div>
        ${segBar(s, 'card-ch-bar')}
      </div>
    </div>`;
  }).join('');

  $('#categories-grid').innerHTML = Object.entries(CATS).map(([cat, label]) => {
    const items = (D[cat] || []).map(it => ({...it, _c: cat}));
    if (!items.length) return '';
    if (!FLASHABLE.includes(cat)) {
      return `<div class="card" data-cat="${cat}">
        <div class="card-cat-title">${esc(label)}</div>
        <div class="card-cat-count">${items.length}</div>
      </div>`;
    }
    const s = stateCounts(items);
    return `<div class="card" data-cat="${cat}">
      <div class="card-cat-title">${esc(label)}</div>
      <div class="card-cat-count">${s.ok + s.learn} / ${s.total}</div>
    </div>`;
  }).join('');
}

// ========== List ==========

function openList(title, items) {
  curTitle = title; curItems = items;
  show('list');
  $('#header-title').textContent = title;

  const fl = items.filter(i => FLASHABLE.includes(i._c) && i.id);
  const s = stateCounts(fl);
  $('#list-title').textContent = title;
  const lp = [];
  if (s.ok) lp.push(`${s.ok} acquis`);
  if (s.learn) lp.push(`${s.learn} en cours`);
  lp.push(`${s.total} total`);
  $('#list-stats').textContent = s.total ? lp.join(' · ') : '';
  $('#list-bar-wrap').innerHTML = s.total ? segBar(s, 'bar') : '';
  $('#btn-fc').classList.toggle('hidden', s.total === 0);
  $('#items').innerHTML = items.map(renderItem).join('');
}

function renderItem(it) {
  const c = it._c, pg = it.page ? `p.${it.page}` : '';

  if (READABLE.includes(c)) {
    if (c === 'dialogues') {
      const lines = (it.lines || []).map(l =>
        `<div style="margin:3px 0"><strong>${esc(l.speaker || '')} :</strong> <span style="font-family:var(--kr)">${esc(l.korean || '')}</span> <span style="color:var(--fg3)">— ${esc(l.french || '')}</span></div>`
      ).join('');
      return `<div class="detail">
        <div class="detail-title">${esc(it.title_fr || 'Dialogue')}</div>
        ${it.setting_fr ? `<div class="detail-body">${esc(it.setting_fr)}</div>` : ''}
        <div style="margin-top:6px">${lines}</div>
        <div class="detail-src">Reformule depuis le manuel ${pg}</div>
      </div>`;
    }
    const body = it.explanation || it.explanation_fr || it.body || '';
    let ex = '';
    if (it.examples?.length) {
      ex = it.examples.map(e => {
        const kr = e.korean || e.written || '';
        return kr ? `<span class="detail-ex">${esc(kr)}</span><span class="detail-ex-fr">${esc(e.french || '')}</span>` : '';
      }).join('');
    }
    return `<div class="detail">
      <div class="detail-title">${esc(it.title || '')}</div>
      <div class="detail-body">${esc(body)}</div>
      ${ex}
      <div class="detail-src">Reformule depuis le manuel ${pg}</div>
    </div>`;
  }

  const kr = getKr(it), fr = getFr(it);
  const st = it.id ? cardState(it.id) : 'new';
  const dl = it.id ? dueLabel(it.id) : '';
  return `<div class="item">
    <div class="dot dot-${st}"></div>
    <div class="item-body">
      <div class="item-kr">${esc(kr)}</div>
      <div class="item-fr">${esc(fr)}</div>
      <div class="item-pg">${pg}${dl ? ` · ${dl}` : ''}</div>
    </div>
  </div>`;
}

// ========== Flashcard (infinite) ==========

// `deck` is the UNIQUE working set (never mutated by grading). `_cur` is the
// card currently on screen; `_recent` is the recently-shown id history used by
// pickNext's repeat guard. No more `fi`/splice: cards are chosen live by
// pickNext, so duplicates never accumulate and the queue can't starve.
let deck = [], flipped = false, deckFlashable = [], _recent = [], _cur = null;
let _undo = null; // snapshot of last graded state, or null when nothing to undo
let _curDir = 'kr-fr'; // current card's direction: 'kr-fr' or 'fr-kr'
let _sess = { n: 0, again: 0 };
let _drillAhead = false;

function startFc() {
  // Unique working set: flashable, has an id, not suspended.
  deckFlashable = curItems.filter(i => FLASHABLE.includes(i._c) && i.id && !P[i.id]?.suspended);
  if (!deckFlashable.length) return;
  deckFlashable.forEach(i => getCard(i.id)); // initialize cards with no SRS data
  deck = deckFlashable;
  _recent = [];
  _cur = null;
  _undo = null;
  _sess = { n: 0, again: 0 };
  _drillAhead = false;
  updateUndoButton();
  show('fc');
  $('#header-title').textContent = curTitle;
  showCard();
}

function updateUndoButton() {
  const btn = $('#fc-undo');
  if (!btn) return;
  btn.classList.toggle('hidden', _undo === null);
}

function showCard() {
  const it = pickNext(deck, _recent);
  if (!it) { showSessionSummary(); return; }
  const c = P[it.id];
  const dueNow = !c || c.st === 0 || (c.due || 0) <= Date.now();
  if (!dueNow && !_drillAhead) { showSessionSummary(); return; }
  _drillAhead = false;
  _cur = it;
  _recent.push(it.id);
  if (_recent.length > RECENT_GUARD * 2) _recent.shift();
  renderCurrentCard();
}

function showSessionSummary() {
  const done = $('#fc-done');
  if (!done) { renderHome(); return; }
  $('#fc-card').classList.add('hidden');
  $('#fc-actions').classList.add('hidden');
  $('#fc-reveal').classList.add('hidden');
  const reussies = _sess.n - _sess.again;
  const st = getStreak();
  $('#fc-done-stats').innerHTML =
    `<div>${_sess.n} carte${_sess.n>1?'s':''} révisée${_sess.n>1?'s':''} · ${reussies} réussie${reussies>1?'s':''}</div>`
    + (st.count ? `<div class="fc-done-streak">🔥 ${st.count} jour${st.count>1?'s':''} d'affilée</div>` : '');
  done.classList.remove('hidden');
}

// Render the currently selected card (_cur) without advancing the queue. Used
// by showCard() after a pick, and by undo to restore the previous card.
function renderCurrentCard() {
  $('#fc-done')?.classList.add('hidden');
  $('#fc-card').classList.remove('hidden');
  const it = _cur;
  flipped = false;

  // Resolve direction for this card before building front/back.
  const cfg = getSettings();
  _curDir = cfg.direction === 'mixed' ? (Math.random() < 0.5 ? 'kr-fr' : 'fr-kr') : (cfg.direction || 'kr-fr');

  $('#fc-cat').textContent = CATS[it._c] || '';

  const pg = it.page ? `p.${it.page}` : '';
  const dl = dueLabel(it.id);
  $('#fc-page').textContent = pg + (dl ? ` · ${dl}` : '');

  // Daily new-card chip
  const dn = dailyNewSummary();
  const fcDn = $('#fc-new-count');
  if (fcDn) {
    if (dn.limit > 0) {
      fcDn.textContent = `${dn.count}/${dn.limit} nouv.`;
      fcDn.classList.toggle('reached', dn.isReached);
      fcDn.classList.remove('hidden');
    } else {
      fcDn.classList.add('hidden');
    }
  }

  // Session progress (reuse cached flashable list)
  const s = stateCounts(deckFlashable);
  const done = s.ok + s.learn;
  $('#fc-progress').textContent = `${done} / ${s.total}`;
  $('#fc-bar-wrap').innerHTML = segBar(s, 'fc-session-track');

  $('#fc-front').innerHTML = buildFront(it);
  $('#fc-back').innerHTML = buildBack(it);
  $('#fc-front').classList.remove('hidden', 'flip-out');
  $('#fc-back').classList.add('hidden');
  $('#fc-back').classList.remove('flip-in');
  $('#fc-actions').classList.add('hidden');
  $('#fc-reveal').classList.remove('hidden');
}

function flip() {
  if (flipped) return;
  flipped = true;
  const front = $('#fc-front'), back = $('#fc-back');
  front.classList.add('flip-out');
  setTimeout(() => {
    front.classList.add('hidden');
    front.classList.remove('flip-out');
    back.classList.remove('hidden');
    back.classList.add('flip-in');
    setTimeout(() => back.classList.remove('flip-in'), 150);
  }, 140);
  $('#fc-reveal').classList.add('hidden');
  $('#fc-actions').classList.remove('hidden');

  // Show predicted intervals on buttons
  const it = _cur;
  const iv = previewIntervals(it.id);
  $('#fc-again').innerHTML = `<span class="btn-iv">${fmtIv(iv.again)}</span>Pas su`;
  $('#fc-hard').innerHTML  = `<span class="btn-iv">${fmtIv(iv.hard)}</span>Difficile`;
  $('#fc-good').innerHTML  = `<span class="btn-iv">${fmtIv(iv.good)}</span>Su`;
  $('#fc-easy').innerHTML  = `<span class="btn-iv">${fmtIv(iv.easy)}</span>Facile`;

  // Leech indicator + banner
  const card = getCard(it.id);
  $('#fc-card').classList.toggle('leech', card.lapses >= LEECH_THRESHOLD);
  if (card.lapses >= LEECH_THRESHOLD && !card.leechAcknowledged) {
    showLeechBanner(it.id);
  }

  // Auto-play Korean TTS if the user enabled it
  if (getSettings().autoSpeak) speakKr(getKr(it));
}

// grade: 1=Again, 2=Hard, 3=Good, 4=Easy
function answer(grade) {
  const it = _cur;

  // Snapshot for undo (state BEFORE the grade).
  _undo = {
    cardId: it.id,
    P_id_snap: P[it.id] ? JSON.parse(JSON.stringify(P[it.id])) : null,
    newCount_snap: localStorage.getItem('blokaja4_newcount'),
    recent_snap: _recent.slice(),
    cur_snap: it,
  };

  _sess.n++;
  if (grade === 1) { _sess.again++; srsAgain(it.id); }
  else if (grade === 2) srsHard(it.id);
  else if (grade === 3) srsGood(it.id);
  else srsEasy(it.id);
  bumpStreak();
  // Re-test timing comes from the card's due time + pickNext priority; no manual
  // re-insertion (that splice was the source of the runaway, looping deck).
  updateUndoButton();

  const slideDir = grade >= 3 ? 'slide-right' : 'slide-left';
  const card = $('#fc-card');
  card.classList.add(slideDir);
  setTimeout(() => {
    card.classList.remove('slide-right', 'slide-left');
    showCard();
  }, 200);
}

function showLeechBanner(cardId) {
  const banner = $('#fc-leech-banner');
  if (!banner) return;
  banner.classList.remove('hidden');
  $('#fc-leech-suspend').onclick = e => {
    e.stopPropagation();
    suspendCard(cardId);
    banner.classList.add('hidden');
  };
  $('#fc-leech-keep').onclick = e => {
    e.stopPropagation();
    const c = getCard(cardId);
    c.leechAcknowledged = true;
    saveP();
    banner.classList.add('hidden');
  };
}

function suspendCard(cardId) {
  const c = getCard(cardId);
  c.suspended = true;
  saveP();
  showToast('Carte suspendue');
  showCard(); // pickNext skips suspended cards; advances to next (or session summary)
}

function unsuspendCard(cardId) {
  const c = getCard(cardId);
  c.suspended = false;
  c.leechAcknowledged = false;
  saveP();
  renderSuspendedList();
}

function renderSuspendedList() {
  const el = $('#settings-suspended');
  if (!el || !D) return;
  const ids = Object.keys(P).filter(id => P[id]?.suspended);
  if (!ids.length) {
    el.innerHTML = '<div class="empty-mini">Aucune carte suspendue.</div>';
    return;
  }
  // Build a lookup from id -> { kr, fr, cat } using D
  const lookup = {};
  for (const cat of Object.keys(CATS)) {
    for (const it of (D[cat] || [])) {
      if (it.id) lookup[it.id] = { it, cat };
    }
  }
  el.innerHTML = ids.map(id => {
    const e = lookup[id];
    if (!e) return '';
    const kr = getKr({ ...e.it, _c: e.cat });
    const fr = getFr({ ...e.it, _c: e.cat });
    return `<div class="suspended-row">
      <div class="suspended-text">
        <span class="suspended-kr">${esc(kr)}</span>
        <span class="suspended-fr">${esc(fr)}</span>
      </div>
      <button class="suspended-restore" data-id="${esc(id)}">Réactiver</button>
    </div>`;
  }).join('');
  el.querySelectorAll('.suspended-restore').forEach(btn => {
    btn.onclick = () => unsuspendCard(btn.dataset.id);
  });
}

function undoLastAnswer() {
  if (!_undo) return;
  const { cardId, P_id_snap, newCount_snap, recent_snap, cur_snap } = _undo;

  // Restore card state.
  if (P_id_snap === null) delete P[cardId];
  else P[cardId] = P_id_snap;
  saveP();

  // Restore daily new-card counter.
  if (newCount_snap === null) localStorage.removeItem('blokaja4_newcount');
  else localStorage.setItem('blokaja4_newcount', newCount_snap);
  refreshNewLimit();

  // Restore the queue position and re-show the same card (don't pick a new one).
  _recent = recent_snap;
  _cur = cur_snap;
  _undo = null;
  updateUndoButton();
  renderCurrentCard();
  showToast('Annulé');
}

// ========== Content accessors ==========

function getKr(it) {
  const c = it._c;
  if (c === 'expressions') return it.polite?.korean || it.informal?.korean || '';
  if (c === 'verbs')       return it.infinitive || '';
  if (c === 'hangeul')     return it.letter || '';
  if (c === 'particles')   return it.particle || '';
  if (c === 'adjectives')  return it.infinitive || it.korean || '';
  return it.korean || '';
}

function getFr(it) {
  const c = it._c;
  if (c === 'particles') return it.function_fr || it.name_fr || '';
  if (c === 'numbers')   return String(it.numeral ?? '') + (it.system === 'native-korean' ? ' (natif)' : it.system === 'sino-korean' ? ' (sino)' : '');
  if (c === 'hangeul')   return it.romanization || '';
  return it.french || '';
}

function getRom(it) {
  if (it._c === 'expressions') return it.polite?.romanization || it.informal?.romanization || '';
  return it.romanization || '';
}

// ---- Category-specific helpers ----

function verbExtra(it) {
  const cj = it.conjugations || {};
  const p = [];
  if (cj.polite_present)  p.push(`poli : ${cj.polite_present}`);
  if (cj.informal_present) p.push(`informel : ${cj.informal_present}`);
  if (cj.polite_past)     p.push(`passé : ${cj.polite_past}`);
  if (cj.polite_negative) p.push(`nég : ${cj.polite_negative}`);
  let s = p.join(' · ');
  if (it.contraction_note) s += (s ? '\n' : '') + it.contraction_note;
  return s;
}
function particleSub(it) {
  const f = it.forms || {};
  return (f.after_vowel || f.after_consonant)
    ? `voyelle : ${f.after_vowel || '?'} / consonne : ${f.after_consonant || '?'}` : '';
}
function particleExtra(it) {
  return it.examples?.length ? it.examples.slice(0, 2).map(e => e.korean || '').join('\n') : '';
}
function exprSub(it) {
  const pol = it.polite?.korean || '', inf = it.informal?.korean || '';
  return (pol && inf && pol !== inf) ? `informel : ${inf}` : '';
}
function exprRom(it) {
  const rp = it.polite?.romanization || '', ri = it.informal?.romanization || '';
  if (rp && ri && rp !== ri) return `${rp} / ${ri}`;
  return rp || ri;
}

// ========== Card config (declarative) ==========
//
// Each category only needs a label; front/back content is built by
// buildFront/buildBack using the direction setting and the shared accessors.

const CARD = {
  vocabulary:       { label: 'Vocabulaire' },
  time_expressions: { label: 'Temps' },
  adverbs:          { label: 'Adverbes' },
  connectors:       { label: 'Connecteurs' },
  classifiers:      { label: 'Classificateurs' },
  verbs:            { label: 'Verbe' },
  adjectives:       { label: 'Adjectif' },
  hangeul:          { label: 'Hangeul' },
  numbers:          { label: it => it.system === 'native-korean' ? 'Nombre natif' : 'Nombre sino' },
  particles:        { label: 'Particule' },
  expressions:      { label: 'Expression' },
};

// Detect any Hangul codepoint to decide whether a TTS button is meaningful.
const _HANGUL_RE = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯]/;
function _ttsBtn(text) {
  if (!text || !_HANGUL_RE.test(text)) return '';
  return `<button class="tts-btn" data-tts="${esc(text)}" aria-label="Lire à voix haute">🔈</button>`;
}

// Romanization reading-aid for the Korean side. Hangeul has none (its
// romanization is the meaning side); expressions use the polite/informal pair.
function koSub(it) {
  if (it._c === 'hangeul') return '';
  if (it._c === 'expressions') return exprRom(it);
  return getRom(it);
}

// Answer-only extra lines, shown on the back in any direction.
function cardDetail(it) {
  const c = it._c, out = [];
  if (c === 'verbs')            { const v = verbExtra(it); if (v) out.push(v); }
  else if (c === 'adjectives')  { if (it.korean_polite) out.push(`forme polie : ${it.korean_polite}`); }
  else if (c === 'expressions') { const s = exprSub(it); if (s) out.push(s); }
  else if (c === 'particles')   { const s = particleSub(it), e = particleExtra(it); if (s) out.push(s); if (e) out.push(e); }
  else if (c === 'numbers')     { if (it.korean_before_counter) out.push(`devant compteur : ${it.korean_before_counter}`); }
  else if (c === 'hangeul')     { if (it.description_fr) out.push(it.description_fr); }
  if (typeof it.notes === 'string' && it.notes.trim()) out.push(it.notes.trim());
  return out;
}

function _faceMain(text, withTts) {
  return `<div class="fc-main">${esc(text)}${withTts ? _ttsBtn(text) : ''}</div>`;
}
function _detailHtml(it) {
  const d = cardDetail(it);
  return d.length ? `<div class="fc-extra">${d.map(esc).join('\n')}</div>` : '';
}

// Up to 2 example sentences for the back. Particles already show examples via
// particleExtra, so skip them here to avoid duplication.
function cardExamplesHtml(it) {
  if (it._c === 'particles' || !Array.isArray(it.examples) || !it.examples.length) return '';
  return it.examples.slice(0, 2).map(ex => {
    const kr = ex.korean || ex.written || '';
    if (!kr) return '';
    const fr = ex.french || '';
    return `<span class="detail-ex">${esc(kr)}</span>` + (fr ? `<span class="detail-ex-fr">${esc(fr)}</span>` : '');
  }).join('');
}

function buildFront(it) {
  const cfg = CARD[it._c];
  if (!cfg) return '';
  const label = typeof cfg.label === 'function' ? cfg.label(it) : cfg.label;
  let body;
  if (_curDir === 'fr-kr') {
    body = _faceMain(getFr(it), false);              // French prompt
  } else {
    body = _faceMain(getKr(it), true);               // Korean prompt (+ TTS)
    const sub = koSub(it);
    if (sub) {
      body += getSettings().showRomanization
        ? `<div class="fc-sub">${esc(sub)}</div>`
        : `<div class="fc-sub fc-hint-sub hidden">${esc(sub)}</div>`
          + `<button type="button" class="fc-hint-btn">Indice : romanisation</button>`;
    }
  }
  return `<div class="fc-label">${esc(label)}</div>` + body;
}

function buildBack(it) {
  const cfg = CARD[it._c];
  if (!cfg) return '';
  if (_curDir === 'fr-kr') {
    const sub = koSub(it);                            // Korean answer (+ TTS + rom always shown)
    return _faceMain(getKr(it), true)
      + (sub ? `<div class="fc-sub">${esc(sub)}</div>` : '')
      + _detailHtml(it)
      + cardExamplesHtml(it);
  }
  return _faceMain(getFr(it), false) + _detailHtml(it) + cardExamplesHtml(it);  // French answer + detail
}

// Korean text-to-speech.
// - On device (Capacitor): delegates to the native TextToSpeech plugin so that
//   Android reliably has a ko-KR voice.
// - In a browser: falls back to the Web Speech API with an async voice-ready
//   guard (voices load lazily in many browsers).
// Safe to call from any context; never throws.

let _cachedVoices = null; // module-level cache for web fallback

function _webSpeakKr(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const ss = window.speechSynthesis;

  function doSpeak(voices) {
    try {
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.9;
      const koVoice = voices.find(v => /^ko/i.test(v.lang));
      if (koVoice) u.voice = koVoice;
      ss.speak(u);
    } catch (_) {}
  }

  try {
    const voices = ss.getVoices();
    if (voices && voices.length > 0) {
      _cachedVoices = voices;
      doSpeak(voices);
    } else if (_cachedVoices && _cachedVoices.length > 0) {
      doSpeak(_cachedVoices);
    } else {
      // Voices not ready yet; wait for the event with a timeout fallback.
      let resolved = false;
      const onReady = () => {
        if (resolved) return;
        resolved = true;
        try { ss.removeEventListener('voiceschanged', onReady); } catch (_) {}
        const v = ss.getVoices() || [];
        _cachedVoices = v;
        doSpeak(v);
      };
      try { ss.addEventListener('voiceschanged', onReady); } catch (_) {}
      setTimeout(onReady, 500); // fallback: speak even without a ko voice
    }
  } catch (_) {}
}

function speakKr(text) {
  if (!text) return;
  try {
    const nativeTts = typeof window !== 'undefined'
      && window.Capacitor
      && window.Capacitor.Plugins
      && window.Capacitor.Plugins.TextToSpeech;
    if (nativeTts) {
      nativeTts.stop().catch(() => {});
      nativeTts.speak({ text, lang: 'ko-KR', rate: 1.0 }).catch(() => {});
      return;
    }
  } catch (_) {}
  _webSpeakKr(text);
}

// ========== Search ==========

function doSearch(q, el) {
  q = q.trim().toLowerCase();
  if (q.length < 2) { el.innerHTML = ''; return; }

  const res = [];
  for (const cat of Object.keys(CATS)) {
    for (const it of (D[cat] || [])) {
      const fields = [
        it.korean, it.french, it.infinitive, it.title, it.title_fr,
        it.letter, it.particle, it.romanization, it.explanation,
        it.explanation_fr, it.body, it.name_fr, it.function_fr,
        it.polite?.korean, it.informal?.korean,
        it.polite?.romanization, it.informal?.romanization,
      ].filter(Boolean).map(s => s.toLowerCase());
      if (fields.some(f => f.includes(q))) res.push({it, cat});
    }
  }

  if (!res.length) { el.innerHTML = '<div class="empty">Aucun résultat</div>'; return; }

  el.innerHTML = res.slice(0, 60).map(({it, cat}) => {
    const kr = getKr({...it, _c: cat});
    const fr = getFr({...it, _c: cat}) || it.title || (it.body || '').slice(0, 50) || '';
    const ch = it.chapter === -1 ? 'Lexique' : it.chapter >= 0 ? `Ch.${it.chapter}` : '';
    return `<div class="sr">
      <div class="sr-kr">${esc(kr)}</div>
      <div class="sr-fr">${esc(fr)}</div>
      <div class="sr-meta">${esc(CATS[cat] || cat)} · ${ch} · p.${it.page || '?'}</div>
    </div>`;
  }).join('');
}

// ========== Events ==========

function openSearch() {
  $('#search-overlay').classList.remove('hidden');
  $('#search-full').value = $('#search-input').value;
  $('#search-full').focus();
  if ($('#search-full').value.length >= 2) doSearch($('#search-full').value, $('#search-results'));
}

function closeSearch() {
  $('#search-overlay').classList.add('hidden');
  $('#search-input').value = '';
  $('#search-input').blur();
}

function setupEvents() {
  // Back
  $('#btn-back').onclick = () => {
    if (screen === 'fc') { openList(curTitle, curItems); return; }
    renderHome();
  };

  // Search: tap input on home → open overlay
  $('#search-input').onfocus = () => openSearch();
  $('#search-close').onclick = closeSearch;
  $('#search-full').oninput = e => doSearch(e.target.value, $('#search-results'));

  // Chapters
  $('#chapters-grid').onclick = e => {
    const card = e.target.closest('[data-ch]');
    if (!card) return;
    const ch = Number(card.dataset.ch);
    const info = D.chapters.find(c => c.number === ch);
    openList(`Ch.${ch} ${info?.title_fr || ''}`, chItems(ch));
  };

  // Categories
  $('#categories-grid').onclick = e => {
    const card = e.target.closest('[data-cat]');
    if (!card) return;
    const cat = card.dataset.cat;
    openList(CATS[cat] || cat, catItems(cat));
  };

  // Flashcards
  $('#btn-fc').onclick = startFc;
  $('#fc-card').onclick = e => {
    const tts = e.target.closest('.tts-btn');
    if (tts) { e.stopPropagation(); speakKr(tts.dataset.tts); return; }
    const hint = e.target.closest('.fc-hint-btn');
    if (hint) {
      e.stopPropagation();
      const sub = hint.parentElement.querySelector('.fc-hint-sub');
      if (sub) sub.classList.remove('hidden');
      hint.classList.add('hidden');
      return;
    }
    flip();
  };
  $('#fc-reveal').onclick = flip;
  $('#fc-again').onclick = () => answer(1);
  $('#fc-hard').onclick  = () => answer(2);
  $('#fc-good').onclick  = () => answer(3);
  $('#fc-easy').onclick  = () => answer(4);
  if ($('#fc-undo')) $('#fc-undo').onclick = e => { e.stopPropagation(); undoLastAnswer(); };
  if ($('#fc-done-more')) $('#fc-done-more').onclick = () => { _drillAhead = true; $('#fc-done').classList.add('hidden'); showCard(); };
  if ($('#fc-done-home')) $('#fc-done-home').onclick = () => renderHome();

  // Swipe (left = Again, right = Good)
  let tx = 0;
  $('#fc-card').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive: true});
  $('#fc-card').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (!flipped && Math.abs(dx) < 30) return;
    if (flipped && dx > 60) answer(3);  // swipe right = Good
    if (flipped && dx < -60) answer(1); // swipe left = Again
  }, {passive: true});

  // Settings
  $('#btn-settings').onclick = openSettings;

  // Keyboard shortcuts (flashcard screen only)
  document.addEventListener('keydown', e => {
    if (screen !== 'fc') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    const done = $('#fc-done');
    if (done && !done.classList.contains('hidden')) return;
    if (!flipped) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      return;
    }
    if (e.key === '1') answer(1);
    else if (e.key === '2') answer(2);
    else if (e.key === '3') answer(3);
    else if (e.key === '4') answer(4);
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); answer(3); }
  });
}

// ========== Settings panel ==========

function openSettings() {
  const s = getSettings();
  const overlay = $('#settings-overlay');
  const sel = $('#settings-new-per-day');
  if (sel) sel.value = String(s.newPerDay);
  const auto = $('#settings-auto-speak');
  if (auto) auto.checked = !!s.autoSpeak;
  const rom = $('#settings-show-rom');
  if (rom) rom.checked = !!s.showRomanization;
  const dir = $('#settings-direction');
  if (dir) dir.value = s.direction || 'kr-fr';
  const help = $('#settings-new-current');
  if (help) {
    const dn = dailyNewSummary();
    help.textContent = dn.limit > 0
      ? `Aujourd'hui : ${dn.count} / ${dn.limit} utilisées${dn.isReached ? ' (limite atteinte)' : ''}`
      : `Aujourd'hui : ${dn.count} utilisées`;
  }
  renderSuspendedList();
  overlay.classList.remove('hidden');
}

function closeSettings() {
  $('#settings-overlay').classList.add('hidden');
}

function applySettings() {
  const val = $('#settings-new-per-day').value;
  const s = getSettings();
  s.newPerDay = val === '0' ? 0 : Number(val);
  const auto = $('#settings-auto-speak');
  if (auto) s.autoSpeak = !!auto.checked;
  const rom = $('#settings-show-rom');
  if (rom) s.showRomanization = !!rom.checked;
  const dir = $('#settings-direction');
  if (dir) s.direction = dir.value;
  saveSettings(s);
  closeSettings();
  showToast('Réglages enregistrés');
  // Only re-render home if user is on home screen — don't disrupt active sessions
  if (screen === 'home') renderHome();
}

let _toastTimer = null;
function showToast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 1500);
}

// Skip auto-init in non-browser contexts (bun:test loads this file with no DOM)
if (typeof window !== 'undefined') init();

// Test exports — no-op in browser, used by bun:test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fuzzInterval, srsAgain, srsHard, srsGood, srsEasy,
    previewIntervals, fmtIv, srsPriority, pickNext, cardState, stateCounts, getCard,
    refreshNewLimit,
    INIT_EASE, MIN_EASE, GRADUATING_IV, EASY_IV, HARD_MULT, EASY_BONUS,
    LEARN_STEPS, RELEARN_STEPS, LEECH_THRESHOLD, RECENT_GUARD,
    _setP: p => { P = p; },
    _getP: () => P,
    _resetNewCount: () => localStorage.removeItem('blokaja4_newcount'),
    _setSettings: s => localStorage.setItem('blokaja4_settings', JSON.stringify(s)),
  };
}
