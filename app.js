/* Blokaja v4 — SRS Anki-like, infinite mode */

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

// ========== SRS Engine (Anki SM-2 inspired) ==========
//
// Card states: 0=new, 1=learning, 2=review, 3=relearning
//
// P[id] = { st, e, iv, due, step, reps }
//   st   : state (0-3)
//   e    : ease factor (default 2.5, min 1.3)
//   iv   : current interval in minutes
//   due  : timestamp (ms) when next review is due
//   step : current learning step index
//   reps : total number of reviews

const LEARN_STEPS = [1, 10];       // learning steps in minutes
const RELEARN_STEPS = [10];        // relearning steps in minutes
const GRADUATING_IV = 1440;        // first review interval after learning: 1 day
const MIN_EASE = 1.3;
const INIT_EASE = 2.5;

function getCard(id) {
  if (!P[id]) P[id] = { st: 0, e: INIT_EASE, iv: 0, due: 0, step: 0, reps: 0 };
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
    };
  }
  return P[id];
}

function srsAgain(id) {
  const c = getCard(id);
  if (c.st === 2) {
    // Review → Relearning: ease drops, back to relearn steps
    c.e = Math.max(MIN_EASE, c.e - 0.2);
    c.st = 3;
    c.step = 0;
    c.due = Date.now() + RELEARN_STEPS[0] * 60000;
    c.iv = Math.max(1, Math.round(c.iv * 0.5)); // halve interval on lapse
  } else {
    // New/Learning/Relearning → back to step 0
    if (c.st === 0) c.st = 1;
    c.step = 0;
    const steps = c.st === 3 ? RELEARN_STEPS : LEARN_STEPS;
    c.due = Date.now() + steps[0] * 60000;
  }
  c.reps++;
  saveP();
}

function srsGood(id) {
  const c = getCard(id);
  if (c.st === 0 || c.st === 1 || c.st === 3) {
    // Learning or Relearning: advance step
    const wasRelearn = c.st === 3;
    const steps = wasRelearn ? RELEARN_STEPS : LEARN_STEPS;
    c.step++;
    if (c.st === 0) c.st = 1;

    if (c.step >= steps.length) {
      // Graduate to Review
      c.iv = wasRelearn ? Math.max(GRADUATING_IV, Math.round(c.iv * 0.7)) : GRADUATING_IV;
      c.st = 2;
      c.due = Date.now() + c.iv * 60000;
    } else {
      c.due = Date.now() + steps[c.step] * 60000;
    }
  } else {
    // Review: interval grows by ease factor
    c.iv = Math.round(c.iv * c.e);
    c.due = Date.now() + c.iv * 60000;
    // Slight ease bonus for consistent good answers
    c.e = Math.min(3.0, c.e + 0.05);
  }
  c.reps++;
  saveP();
}

// Priority for infinite feed: higher = show sooner
function srsPriority(item) {
  const c = P[item.id];
  if (!c || c.st === 0) return 10000; // new cards first

  const now = Date.now();
  const overdue = now - (c.due || 0); // positive = overdue

  if (c.st === 1 || c.st === 3) {
    // Learning/relearning: show ASAP when due
    return overdue > 0 ? 8000 + Math.min(overdue / 60000, 999) : -(overdue / 60000);
  }

  if (c.st === 2 && overdue > 0) {
    // Review card overdue: priority by how overdue
    return 5000 + Math.min(overdue / 60000, 999);
  }

  // Review card not yet due: low priority, sorted by time to due
  return -(overdue / 60000);
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
  let nw = 0, learn = 0, due = 0, ok = 0;
  for (const it of items) {
    if (!it.id) continue;
    const c = P[it.id];
    if (!c || c.st === 0) { nw++; continue; }
    if (c.st === 1 || c.st === 3) { learn++; continue; }
    // st === 2 (review) — all graduated cards count as "ok" for progress
    ok++;
    if (c.due && c.due <= now) due++;
  }
  return { nw, learn, due, ok, total: nw + learn + ok };
}

// Format next due time for display
function dueLabel(id) {
  const c = P[id];
  if (!c || c.st === 0) return '';
  const diff = (c.due || 0) - Date.now();
  if (diff <= 0) return 'maintenant';
  const min = Math.round(diff / 60000);
  if (min < 60) return `${min}min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  return `${d}j`;
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
  const pct = g.total ? Math.round(g.ok / g.total * 100) : 0;

  const parts = [];
  if (g.learn) parts.push(`${g.learn} en cours`);
  if (g.due) parts.push(`${g.due} à revoir`);
  const sub = parts.length ? parts.join(' · ') : '';

  $('#global-progress').innerHTML =
    `<div class="gp-pct">${pct}%</div>
     <div class="gp-right">
       <div class="gp-bar"><div class="gp-fill" style="width:${pct}%"></div></div>
       <div class="gp-label">${g.ok} acquis / ${g.total}${sub ? ` · ${sub}` : ''}</div>
     </div>`;

  $('#chapters-grid').innerHTML = D.chapters.map((ch, i) => {
    const items = chItems(ch.number).filter(x => FLASHABLE.includes(x._c));
    const s = stateCounts(items);
    const p = s.total ? Math.round(s.ok / s.total * 100) : 0;
    return `<div class="card card-ch" data-ch="${ch.number}">
      <div class="card-ch-num" style="background:${CH_COLORS[i % CH_COLORS.length]}">${ch.number}</div>
      <div class="card-ch-body">
        <div class="card-ch-title">${esc(ch.title_fr)}</div>
        <div class="card-ch-sub">${esc(ch.title_ko || '')}</div>
      </div>
      <div class="card-ch-right">
        <div class="card-ch-count">${s.ok} / ${s.total}</div>
        <div class="card-ch-bar"><div class="card-ch-bar-fill" style="width:${p}%"></div></div>
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
      <div class="card-cat-count">${s.ok} / ${s.total}</div>
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
  $('#list-stats').textContent = s.total ? `${s.ok} / ${s.total}` : '';
  $('#list-bar').style.width = (s.total ? Math.round(s.ok / s.total * 100) : 0) + '%';
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

let deck = [], fi = 0, flipped = false;

function startFc() {
  const fl = curItems.filter(i => FLASHABLE.includes(i._c) && i.id);
  if (!fl.length) return;
  // Initialize cards that have no SRS data
  fl.forEach(i => getCard(i.id));
  // Sort by SRS priority
  deck = [...fl].sort((a, b) => srsPriority(b) - srsPriority(a));
  fi = 0;
  show('fc');
  $('#header-title').textContent = curTitle;
  showCard();
}

function showCard() {
  if (fi >= deck.length) {
    // Reshuffle by priority for next loop
    deck.sort((a, b) => srsPriority(b) - srsPriority(a));
    fi = 0;
  }
  const it = deck[fi];
  flipped = false;
  $('#fc-cat').textContent = CATS[it._c] || '';

  const pg = it.page ? `p.${it.page}` : '';
  const dl = dueLabel(it.id);
  $('#fc-page').textContent = pg + (dl ? ` · ${dl}` : '');

  // Session progress
  const fl = curItems.filter(i => FLASHABLE.includes(i._c) && i.id);
  const s = stateCounts(fl);
  const done = s.ok + s.learn;
  $('#fc-progress').textContent = `${done} / ${s.total}`;
  const pct = s.total ? Math.round(done / s.total * 100) : 0;
  $('#fc-progress-fill').style.width = pct + '%';

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
}

function answer(ok) {
  const it = deck[fi];

  if (ok) srsGood(it.id);
  else    srsAgain(it.id);

  if (!ok) {
    // Re-insert for re-test soon (Anki learning behavior)
    const reinsert = Math.min(fi + 3 + (Math.random() * 3 | 0), deck.length);
    deck.splice(reinsert, 0, it);
  }

  const card = $('#fc-card');
  card.classList.add(ok ? 'slide-right' : 'slide-left');
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
    label: 'Verbe', fMain: getKr, fSub: getFr,
    bMain: verbBack, bExtra: verbExtra,
  },
  adjectives: {
    label: 'Adjectif', fMain: getKr, fSub: getFr,
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
  $('#fc-nope').onclick = () => answer(false);
  $('#fc-ok').onclick = () => answer(true);

  // Swipe
  let tx = 0;
  $('#fc-card').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive: true});
  $('#fc-card').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (!flipped && Math.abs(dx) < 30) return;
    if (flipped && dx > 60) answer(true);
    if (flipped && dx < -60) answer(false);
  }, {passive: true});
}

init();
