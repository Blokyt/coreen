/* Blokaja v2 — Revision coreen A1 */

let D = null;   // course_data
let P = {};     // progress {id: {s:seen, c:correct, t:timestamp}}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.random()*i+1|0;[a[i],a[j]]=[a[j],a[i]];} return a; };

const CATS = {
  vocabulary:        {l:'Vocabulaire', i:'単'},
  verbs:             {l:'Verbes', i:'動'},
  grammar:           {l:'Grammaire', i:'文'},
  particles:         {l:'Particules', i:'助'},
  expressions:       {l:'Expressions', i:'話'},
  hangeul:           {l:'Hangeul', i:'가'},
  numbers:           {l:'Nombres', i:'数'},
  culture:           {l:'Culture', i:'韓'},
  dialogues:         {l:'Dialogues', i:'会'},
  pronunciation_rules:{l:'Prononciation', i:'音'},
  time_expressions:  {l:'Temps', i:'時'},
  classifiers:       {l:'Classificateurs', i:'量'},
  connectors:        {l:'Connecteurs', i:'接'},
  adjectives:        {l:'Adjectifs', i:'形'},
  adverbs:           {l:'Adverbes', i:'副'},
};

const CH_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e'];

// Categories that are flashcard-able (have a front/back)
const FLASHABLE = ['vocabulary','verbs','hangeul','numbers','expressions','particles',
  'time_expressions','classifiers','connectors','adjectives','adverbs'];

// Categories that are read-only (detail cards)
const READABLE = ['grammar','culture','dialogues','pronunciation_rules'];

// ===== Init =====
async function init() {
  const res = await fetch('data/course_data.json');
  D = await res.json();
  P = JSON.parse(localStorage.getItem('blokaja2') || '{}');
  renderHome();
  setupEvents();
}

function saveP() { localStorage.setItem('blokaja2', JSON.stringify(P)); }

function mastery(id) {
  const p = P[id];
  if (!p || !p.s) return 0;
  return p.c / p.s;
}

function dotClass(id) {
  const m = mastery(id);
  if (m === 0 && !P[id]) return 'new';
  if (m < 0.4) return 'learning';
  if (m < 0.8) return 'almost';
  return 'known';
}

function itemsForChapter(ch) {
  const out = [];
  for (const cat of Object.keys(CATS)) {
    for (const item of (D[cat] || [])) {
      if (item.chapter === ch) out.push({...item, _cat: cat});
    }
  }
  return out;
}

function itemsForCategory(cat) {
  return (D[cat] || []).map(item => ({...item, _cat: cat}));
}

function countKnown(items) {
  return items.filter(i => i.id && mastery(i.id) >= 0.8).length;
}

// ===== Navigation =====
let currentScreen = 'home';
let currentItems = [];
let currentTitle = '';

function show(screen) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(`#screen-${screen}`).classList.add('active');
  currentScreen = screen;
  $('#btn-back').classList.toggle('hidden', screen === 'home' || screen === 'search');
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.screen === screen || (screen === 'list' || screen === 'fc') && t.dataset.screen === 'home'));
}

// ===== Home =====
function renderHome() {
  show('home');
  $('#header-title').textContent = 'Blokaja';

  // Global progress
  let total = 0, known = 0;
  for (const cat of FLASHABLE) {
    for (const item of (D[cat] || [])) {
      if (item.id) { total++; if (mastery(item.id) >= 0.8) known++; }
    }
  }
  const pct = total ? Math.round(known / total * 100) : 0;
  $('#global-progress').innerHTML = `
    <div class="gp-pct">${pct}%</div>
    <div class="gp-bar"><div class="gp-fill" style="width:${pct}%"></div></div>
    <div class="gp-label">${known} / ${total}</div>`;

  // Chapters
  $('#chapters-grid').innerHTML = D.chapters.map((ch, i) => {
    const items = itemsForChapter(ch.number).filter(x => FLASHABLE.includes(x._cat));
    const k = countKnown(items);
    const p = items.length ? Math.round(k / items.length * 100) : 0;
    return `<div class="card card-ch" style="border-left-color:${CH_COLORS[i]}" data-ch="${ch.number}">
      <div class="card-title">Ch.${ch.number} ${esc(ch.title_fr)}</div>
      <div class="card-sub">${esc(ch.title_ko || '')}</div>
      <div class="card-count">${k}/${items.length}</div>
      <div class="card-bar"><div class="card-bar-fill" style="width:${p}%"></div></div>
    </div>`;
  }).join('');

  // Categories
  $('#categories-grid').innerHTML = Object.entries(CATS).map(([cat, info]) => {
    const items = D[cat] || [];
    if (!items.length) return '';
    const flashable = FLASHABLE.includes(cat);
    const k = flashable ? items.filter(i => i.id && mastery(i.id) >= 0.8).length : '';
    return `<div class="card" data-cat="${cat}">
      <div class="card-title">${info.i} ${info.l}</div>
      <div class="card-count">${flashable ? k + '/' : ''}${items.length}</div>
    </div>`;
  }).join('');
}

// ===== List =====
function openList(title, items) {
  currentTitle = title;
  currentItems = items;
  show('list');
  $('#header-title').textContent = title;

  const flashable = items.filter(i => FLASHABLE.includes(i._cat) && i.id);
  const k = countKnown(flashable);
  const t = flashable.length;
  $('#list-known').textContent = k;
  $('#list-total').textContent = t;
  $('#list-bar').style.width = (t ? Math.round(k/t*100) : 0) + '%';
  $('#btn-fc').classList.toggle('hidden', t === 0);

  $('#items').innerHTML = items.map(i => renderItem(i)).join('');
}

function renderItem(item) {
  const cat = item._cat;
  const page = item.page ? `p.${item.page}` : '';

  // Detail cards for grammar/culture/dialogues/pronunciation
  if (READABLE.includes(cat)) {
    if (cat === 'dialogues') {
      const lines = (item.lines || []).map(l =>
        `<div><b>${esc(l.speaker||'')}:</b> <span class="kr">${esc(l.korean||'')}</span> <span style="color:var(--fg3)">— ${esc(l.french||'')}</span></div>`
      ).join('');
      return `<div class="detail">
        <div class="detail-title">${esc(item.title_fr||'Dialogue')}</div>
        ${item.setting_fr ? `<div class="detail-body">${esc(item.setting_fr)}</div>` : ''}
        <div style="margin-top:6px">${lines}</div>
        <div class="detail-src">Reformulé depuis le manuel p.${item.page}</div>
      </div>`;
    }

    let body = item.explanation || item.explanation_fr || item.body || '';
    let examples = '';
    if (item.examples && item.examples.length) {
      examples = item.examples.map(ex => {
        const kr = ex.korean || ex.written || '';
        const fr = ex.french || '';
        return kr ? `<span class="detail-ex">${esc(kr)}</span><span class="detail-ex-fr">${esc(fr)}</span>` : '';
      }).join('');
    }

    return `<div class="detail">
      <div class="detail-title">${esc(item.title || '')}</div>
      <div class="detail-body">${esc(body)}</div>
      ${examples}
      <div class="detail-src">Reformulé depuis le manuel p.${item.page}</div>
    </div>`;
  }

  // Flashable items
  const kr = getKorean(item);
  const fr = getFrench(item);
  const dc = item.id ? dotClass(item.id) : 'new';

  return `<div class="item">
    <div class="item-dot ${dc}"></div>
    <div class="item-body">
      <div class="item-kr">${esc(kr)}</div>
      <div class="item-fr">${esc(fr)}</div>
      ${page ? `<div class="item-page">${page}</div>` : ''}
    </div>
  </div>`;
}

// ===== Flashcard (infinite) =====
let fcDeck = [];
let fcIdx = 0;
let fcFlipped = false;

function startFc() {
  const flashable = currentItems.filter(i => FLASHABLE.includes(i._cat) && i.id);
  if (!flashable.length) return;

  // Prioritize: unseen first, then low mastery, then shuffle rest
  const unseen = flashable.filter(i => !P[i.id]);
  const weak = flashable.filter(i => P[i.id] && mastery(i.id) < 0.8);
  const strong = flashable.filter(i => P[i.id] && mastery(i.id) >= 0.8);
  fcDeck = [...shuffle(unseen), ...shuffle(weak), ...shuffle(strong)];
  fcIdx = 0;
  show('fc');
  $('#header-title').textContent = currentTitle;
  showCard();
}

function showCard() {
  if (fcIdx >= fcDeck.length) {
    // Loop: reshuffle
    fcDeck = shuffle(fcDeck);
    fcIdx = 0;
  }
  const item = fcDeck[fcIdx];
  fcFlipped = false;

  const cat = item._cat;
  const catLabel = CATS[cat]?.l || cat;
  $('#fc-cat').textContent = catLabel;
  $('#fc-page').textContent = item.page ? `p.${item.page}` : '';

  // Front
  const front = buildFront(item);
  const back = buildBack(item);

  $('#fc-front').innerHTML = front;
  $('#fc-back').innerHTML = back;
  $('#fc-front').classList.remove('hidden');
  $('#fc-back').classList.add('hidden');
  $('#fc-actions').classList.add('hidden');
  $('#fc-reveal').classList.remove('hidden');
}

function flipCard() {
  if (fcFlipped) return;
  fcFlipped = true;
  $('#fc-front').classList.add('hidden');
  $('#fc-back').classList.remove('hidden');
  $('#fc-reveal').classList.add('hidden');
  $('#fc-actions').classList.remove('hidden');
}

function answerCard(correct) {
  const item = fcDeck[fcIdx];
  if (item.id) {
    if (!P[item.id]) P[item.id] = {s:0, c:0};
    P[item.id].s++;
    if (correct) P[item.id].c++;
    P[item.id].t = Date.now();
    saveP();
  }
  fcIdx++;
  showCard();
}

// ===== Card content builders =====
function getKorean(item) {
  const cat = item._cat;
  if (cat === 'vocabulary' || cat === 'time_expressions' || cat === 'adverbs' || cat === 'connectors' || cat === 'classifiers')
    return item.korean || '';
  if (cat === 'verbs') return item.infinitive || '';
  if (cat === 'hangeul') return item.letter || '';
  if (cat === 'numbers') return item.korean || '';
  if (cat === 'particles') return item.particle || '';
  if (cat === 'adjectives') return item.infinitive || item.korean || '';
  if (cat === 'expressions') {
    const pol = item.polite?.korean || '';
    const inf = item.informal?.korean || '';
    return pol || inf;
  }
  return item.korean || item.title || '';
}

function getFrench(item) {
  const cat = item._cat;
  if (cat === 'particles') return item.function_fr || item.name_fr || '';
  if (cat === 'expressions') return item.french || '';
  if (cat === 'numbers') return String(item.numeral ?? '') + (item.system === 'native-korean' ? ' (natif)' : item.system === 'sino-korean' ? ' (sino)' : '');
  if (cat === 'hangeul') return item.romanization || '';
  return item.french || '';
}

function buildFront(item) {
  const cat = item._cat;
  let label = 'Coréen';
  let main = '';
  let sub = '';

  if (cat === 'vocabulary' || cat === 'time_expressions' || cat === 'adverbs' || cat === 'connectors' || cat === 'classifiers') {
    main = item.korean || '';
    sub = item.romanization || '';
  } else if (cat === 'verbs') {
    label = 'Verbe';
    main = item.infinitive || '';
    sub = item.french || '';
  } else if (cat === 'hangeul') {
    label = 'Lettre';
    main = item.letter || '';
  } else if (cat === 'numbers') {
    label = item.system === 'native-korean' ? 'Nombre natif' : 'Nombre sino';
    main = String(item.numeral ?? '');
  } else if (cat === 'particles') {
    label = 'Particule';
    main = item.particle || '';
  } else if (cat === 'adjectives') {
    label = 'Adjectif';
    main = item.infinitive || item.korean || '';
    sub = item.french || '';
  } else if (cat === 'expressions') {
    label = 'Traduire';
    main = item.french || '';
    sub = '';
  }

  return `<div class="fc-label">${esc(label)}</div><div class="fc-main">${esc(main)}</div>${sub ? `<div class="fc-sub">${esc(sub)}</div>` : ''}`;
}

function buildBack(item) {
  const cat = item._cat;
  let main = '';
  let sub = '';
  let extra = '';

  if (cat === 'vocabulary' || cat === 'time_expressions' || cat === 'adverbs' || cat === 'connectors' || cat === 'classifiers') {
    main = item.french || '';
  } else if (cat === 'verbs') {
    const c = item.conjugations || {};
    main = c.polite_present || c.informal_present || c.polite_present_after_vowel || '';
    const parts = [];
    if (c.polite_present) parts.push(`poli: ${c.polite_present}`);
    if (c.informal_present) parts.push(`informel: ${c.informal_present}`);
    if (c.polite_past) parts.push(`passé: ${c.polite_past}`);
    if (c.polite_negative) parts.push(`nég: ${c.polite_negative}`);
    extra = parts.join(' · ');
    if (item.contraction_note) extra += (extra ? '\n' : '') + item.contraction_note;
  } else if (cat === 'hangeul') {
    main = item.romanization || '';
    sub = item.description_fr || '';
  } else if (cat === 'numbers') {
    main = item.korean || '';
    if (item.korean_before_counter) sub = `devant compteur: ${item.korean_before_counter}`;
  } else if (cat === 'particles') {
    main = item.function_fr || '';
    const f = item.forms || {};
    if (f.after_vowel || f.after_consonant) {
      sub = `voyelle → ${f.after_vowel || '?'} · consonne → ${f.after_consonant || '?'}`;
    }
    if (item.examples?.length) {
      extra = item.examples.slice(0, 2).map(ex => ex.korean || '').join(' / ');
    }
  } else if (cat === 'adjectives') {
    main = item.korean_polite || '';
    sub = item.french || '';
  } else if (cat === 'expressions') {
    const pol = item.polite?.korean || '';
    const inf = item.informal?.korean || '';
    main = pol || inf;
    if (pol && inf && pol !== inf) sub = `informel: ${inf}`;
  }

  return `<div class="fc-main">${esc(main)}</div>${sub ? `<div class="fc-sub">${esc(sub)}</div>` : ''}${extra ? `<div class="fc-extra">${esc(extra)}</div>` : ''}`;
}

// ===== Search =====
function doSearch(query, targetEl) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) { targetEl.innerHTML = ''; return; }

  const results = [];
  for (const cat of Object.keys(CATS)) {
    for (const item of (D[cat] || [])) {
      const fields = [
        item.korean, item.french, item.infinitive, item.title, item.title_fr,
        item.letter, item.particle, item.romanization, item.explanation,
        item.explanation_fr, item.body, item.name_fr, item.function_fr,
      ].filter(Boolean).map(s => s.toLowerCase());

      // Also search in polite/informal korean for expressions
      if (item.polite?.korean) fields.push(item.polite.korean.toLowerCase());
      if (item.informal?.korean) fields.push(item.informal.korean.toLowerCase());

      if (fields.some(f => f.includes(q))) {
        results.push({item, cat});
      }
    }
  }

  if (!results.length) {
    targetEl.innerHTML = '<div class="empty">Aucun résultat</div>';
    return;
  }

  targetEl.innerHTML = results.slice(0, 60).map(({item, cat}) => {
    const kr = getKorean({...item, _cat: cat});
    const fr = getFrench({...item, _cat: cat}) || item.title || item.body?.slice(0, 60) || '';
    const catLabel = CATS[cat]?.l || cat;
    const ch = item.chapter;
    const chLabel = ch === -1 ? 'Lexique' : ch >= 0 ? `Ch.${ch}` : '';
    return `<div class="sr">
      <div class="sr-kr">${esc(kr)}</div>
      <div class="sr-fr">${esc(fr)}</div>
      <div class="sr-meta">${catLabel} · ${chLabel} · p.${item.page || '?'}</div>
    </div>`;
  }).join('');
}

// ===== Events =====
function setupEvents() {
  // Dark mode
  if (localStorage.getItem('blokaja_dark') === 'true') document.documentElement.classList.add('dark');
  $('#btn-dark').onclick = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('blokaja_dark', document.documentElement.classList.contains('dark'));
  };

  // Back
  $('#btn-back').onclick = () => {
    if (currentScreen === 'fc') { openList(currentTitle, currentItems); return; }
    renderHome();
  };

  // Tabs
  $$('.tab').forEach(t => t.onclick = () => {
    if (t.dataset.screen === 'home') renderHome();
    if (t.dataset.screen === 'search') { show('search'); $('#search-full').value = ''; $('#search-full').focus(); }
  });

  // Chapter cards
  $('#chapters-grid').onclick = e => {
    const card = e.target.closest('[data-ch]');
    if (!card) return;
    const ch = Number(card.dataset.ch);
    const chInfo = D.chapters.find(c => c.number === ch);
    const title = `Ch.${ch} ${chInfo?.title_fr || ''}`;
    openList(title, itemsForChapter(ch));
  };

  // Category cards
  $('#categories-grid').onclick = e => {
    const card = e.target.closest('[data-cat]');
    if (!card) return;
    const cat = card.dataset.cat;
    openList(CATS[cat]?.l || cat, itemsForCategory(cat));
  };

  // Start flashcards
  $('#btn-fc').onclick = startFc;

  // Flashcard interactions
  $('#fc-card').onclick = flipCard;
  $('#fc-reveal').onclick = flipCard;
  $('#fc-nope').onclick = () => answerCard(false);
  $('#fc-ok').onclick = () => answerCard(true);

  // Search (home)
  $('#search-home').oninput = e => {
    if (e.target.value.trim().length >= 2) {
      show('search');
      $('#search-full').value = e.target.value;
      doSearch(e.target.value, $('#search-full-results'));
    }
  };

  // Search (full screen)
  $('#search-full').oninput = e => doSearch(e.target.value, $('#search-full-results'));

  // Swipe on flashcard (optional touch)
  let touchStartX = 0;
  $('#fc-card').addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, {passive: true});
  $('#fc-card').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (!fcFlipped && Math.abs(dx) < 30) return; // tap handled by onclick
    if (fcFlipped && dx > 60) answerCard(true);    // swipe right = su
    if (fcFlipped && dx < -60) answerCard(false);   // swipe left = pas su
  }, {passive: true});
}

// Go
init();
