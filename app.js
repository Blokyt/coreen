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

// Settings (persisted in localStorage)
const SETTINGS_KEY = 'blokaja4_settings';
function getSettings() {
  try { return { newPerDay: 20, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { newPerDay: 20 }; }
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
    // Review: interval * 1.2, ease -0.15
    c.e = Math.max(MIN_EASE, c.e - 0.15);
    c.iv = fuzzInterval(Math.max(c.iv + 1440, Math.round(c.iv * HARD_MULT)));
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
    const delay = Math.max(0, Date.now() - c.due) / 60000; // overdue minutes
    c.iv = fuzzInterval(Math.round((c.iv + delay / 2) * c.e));
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
    // Review: interval * ease * easy bonus + full overdue bonus
    const delay = Math.max(0, Date.now() - c.due) / 60000;
    c.iv = fuzzInterval(Math.round((c.iv + delay) * c.e * EASY_BONUS));
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

  // Review
  const ivHard = Math.max(c.iv + 1440, Math.round(c.iv * HARD_MULT));
  const ivGood = Math.round((c.iv + delay / 2) * c.e);
  const ivEasy = Math.round((c.iv + delay) * c.e * EASY_BONUS);
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

  // Review card not yet due: below new cards, sooner due = higher priority
  return Math.min(4999, -(overdue / 60000));
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

  $('#global-progress').innerHTML =
    `<div class="gp-pct">${pct}%</div>
     <div class="gp-right">
       ${segBar(g, 'gp-bar')}
       <div class="gp-label">${parts.join(' · ')}</div>
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

let deck = [], fi = 0, flipped = false, deckFlashable = [];

function startFc() {
  deckFlashable = curItems.filter(i => FLASHABLE.includes(i._c) && i.id);
  if (!deckFlashable.length) return;
  // Initialize cards that have no SRS data
  deckFlashable.forEach(i => getCard(i.id));
  // Sort by SRS priority
  refreshNewLimit();
  deck = [...deckFlashable].sort((a, b) => srsPriority(b) - srsPriority(a));
  fi = 0;
  show('fc');
  $('#header-title').textContent = curTitle;
  showCard();
}

function showCard() {
  if (fi >= deck.length) {
    // Reshuffle by priority for next loop
    refreshNewLimit();
    deck.sort((a, b) => srsPriority(b) - srsPriority(a));
    fi = 0;
  }
  const it = deck[fi];
  flipped = false;
  $('#fc-cat').textContent = CATS[it._c] || '';

  const pg = it.page ? `p.${it.page}` : '';
  const dl = dueLabel(it.id);
  $('#fc-page').textContent = pg + (dl ? ` · ${dl}` : '');

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
  const it = deck[fi];
  const iv = previewIntervals(it.id);
  $('#fc-again').innerHTML = `<span class="btn-iv">${fmtIv(iv.again)}</span>Pas su`;
  $('#fc-hard').innerHTML  = `<span class="btn-iv">${fmtIv(iv.hard)}</span>Difficile`;
  $('#fc-good').innerHTML  = `<span class="btn-iv">${fmtIv(iv.good)}</span>Su`;
  $('#fc-easy').innerHTML  = `<span class="btn-iv">${fmtIv(iv.easy)}</span>Facile`;

  // Leech indicator
  $('#fc-card').classList.toggle('leech', getCard(it.id).lapses >= LEECH_THRESHOLD);
}

// grade: 1=Again, 2=Hard, 3=Good, 4=Easy
function answer(grade) {
  const it = deck[fi];
  const wasReview = (P[it.id]?.st === 2); // capture before srs* mutates state

  if (grade === 1) srsAgain(it.id);
  else if (grade === 2) srsHard(it.id);
  else if (grade === 3) srsGood(it.id);
  else srsEasy(it.id);

  // Re-insert for re-test: Again always, Hard only for learning/relearning (not review)
  if (grade === 1 || (grade === 2 && !wasReview)) {
    const reinsert = Math.min(fi + 3 + (Math.random() * 3 | 0), deck.length);
    deck.splice(reinsert, 0, it);
  }

  const slideDir = grade >= 3 ? 'slide-right' : 'slide-left';
  const card = $('#fc-card');
  card.classList.add(slideDir);
  setTimeout(() => {
    card.classList.remove('slide-right', 'slide-left');
    fi++;
    showCard();
  }, 200);
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

// ---- Category-specific back helpers ----

function verbBack(it) {
  const cj = it.conjugations || {};
  return cj.polite_present || cj.informal_present || cj.polite_present_after_vowel || '';
}
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
// Each category declares what goes on the front and back of its flashcard.
// fMain/fSub = front main/sub, bMain/bSub/bExtra = back main/sub/extra.
// Functions receive the item and return a string.

const STD = { fMain: getKr, fSub: getRom, bMain: getFr };

const CARD = {
  vocabulary:       { label: 'Vocabulaire',      ...STD },
  time_expressions: { label: 'Temps',            ...STD },
  adverbs:          { label: 'Adverbes',         ...STD },
  connectors:       { label: 'Connecteurs',      ...STD },
  classifiers:      { label: 'Classificateurs',  ...STD },
  verbs: {
    label: 'Verbe', fMain: getKr, fSub: getRom,
    bMain: verbBack, bSub: getFr, bExtra: verbExtra,
  },
  adjectives: {
    label: 'Adjectif', fMain: getKr, fSub: getRom,
    bMain: it => it.korean_polite || '', bSub: getFr,
  },
  hangeul: {
    label: 'Hangeul', fMain: getKr,
    bMain: getRom, bSub: it => it.description_fr || '',
  },
  numbers: {
    label: it => it.system === 'native-korean' ? 'Nombre natif' : 'Nombre sino',
    fMain: it => String(it.numeral ?? ''),
    bMain: getKr, bSub: it => it.korean_before_counter ? `devant compteur : ${it.korean_before_counter}` : '',
  },
  particles: {
    label: 'Particule', fMain: getKr,
    bMain: getFr, bSub: particleSub, bExtra: particleExtra,
  },
  expressions: {
    label: 'Expression', fMain: getFr,
    bMain: getKr, bSub: exprSub, bExtra: exprRom,
  },
};

function buildFront(it) {
  const cfg = CARD[it._c];
  if (!cfg) return '';
  const label = typeof cfg.label === 'function' ? cfg.label(it) : cfg.label;
  const main  = cfg.fMain?.(it) || '';
  const sub   = cfg.fSub?.(it)  || '';
  return `<div class="fc-label">${esc(label)}</div>`
       + `<div class="fc-main">${esc(main)}</div>`
       + (sub ? `<div class="fc-sub">${esc(sub)}</div>` : '');
}

function buildBack(it) {
  const cfg = CARD[it._c];
  if (!cfg) return '';
  const main  = cfg.bMain?.(it)  || '';
  const sub   = cfg.bSub?.(it)   || '';
  const extra = cfg.bExtra?.(it) || '';
  return `<div class="fc-main">${esc(main)}</div>`
       + (sub   ? `<div class="fc-sub">${esc(sub)}</div>`     : '')
       + (extra ? `<div class="fc-extra">${esc(extra)}</div>` : '');
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

  if (!res.length) { el.innerHTML = '<div class="empty">Aucun resultat</div>'; return; }

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
  $('#fc-card').onclick = flip;
  $('#fc-reveal').onclick = flip;
  $('#fc-again').onclick = () => answer(1);
  $('#fc-hard').onclick  = () => answer(2);
  $('#fc-good').onclick  = () => answer(3);
  $('#fc-easy').onclick  = () => answer(4);

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
}

// ========== Settings panel ==========

function openSettings() {
  const s = getSettings();
  const overlay = $('#settings-overlay');
  const sel = $('#settings-new-per-day');
  if (sel) sel.value = String(s.newPerDay);
  overlay.classList.remove('hidden');
}

function closeSettings() {
  $('#settings-overlay').classList.add('hidden');
}

function applySettings() {
  const val = $('#settings-new-per-day').value;
  const s = getSettings();
  s.newPerDay = val === '0' ? 0 : Number(val);
  saveSettings(s);
  closeSettings();
  // Only re-render home if user is on home screen — don't disrupt active sessions
  if (screen === 'home') renderHome();
}

init();
