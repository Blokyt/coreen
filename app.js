/* Blokaja v3 */

let D = null;
let P = {};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

const CATS = {
  vocabulary:         'Vocabulaire',
  verbs:              'Verbes',
  grammar:            'Grammaire',
  particles:          'Particules',
  expressions:        'Expressions',
  hangeul:            'Hangeul',
  numbers:            'Nombres',
  culture:            'Culture',
  dialogues:          'Dialogues',
  pronunciation_rules:'Prononciation',
  time_expressions:   'Temps',
  classifiers:        'Classificateurs',
  connectors:         'Connecteurs',
  adjectives:         'Adjectifs',
  adverbs:            'Adverbes',
};

const CH_COLORS = ['#4338ca','#7c3aed','#db2777','#dc2626','#ea580c','#ca8a04','#16a34a'];

const FLASHABLE = ['vocabulary','verbs','hangeul','numbers','expressions','particles',
  'time_expressions','classifiers','connectors','adjectives','adverbs'];

const READABLE = ['grammar','culture','dialogues','pronunciation_rules'];

// ===== Init =====
async function init() {
  const res = await fetch('data/course_data.json');
  D = await res.json();
  P = JSON.parse(localStorage.getItem('blokaja3') || '{}');
  renderHome();
  setupEvents();
}

function saveP() { localStorage.setItem('blokaja3', JSON.stringify(P)); }
function m(id) { const p = P[id]; return p && p.s ? p.c / p.s : 0; }
function dot(id) { const v = m(id); if (!P[id]) return 'new'; if (v < 0.4) return 'learning'; if (v < 0.8) return 'almost'; return 'known'; }

function chItems(ch) {
  const out = [];
  for (const cat of Object.keys(CATS)) for (const it of (D[cat] || [])) if (it.chapter === ch) out.push({...it, _c: cat});
  return out;
}

function catItems(cat) { return (D[cat] || []).map(it => ({...it, _c: cat})); }

function known(items) { return items.filter(i => i.id && m(i.id) >= 0.8).length; }

// ===== Nav =====
let screen = 'home', curItems = [], curTitle = '';

function show(s) {
  $$('.screen').forEach(el => el.classList.remove('active'));
  $(`#screen-${s}`).classList.add('active');
  screen = s;
  $('#btn-back').classList.toggle('hidden', s === 'home' || s === 'search');
  $$('.tab').forEach(t => t.classList.toggle('active',
    t.dataset.screen === s || ((s === 'list' || s === 'fc') && t.dataset.screen === 'home')));
}

// ===== Home =====
function renderHome() {
  show('home');
  $('#header-title').textContent = '블로카자';

  let total = 0, kn = 0;
  for (const cat of FLASHABLE) for (const it of (D[cat] || [])) if (it.id) { total++; if (m(it.id) >= 0.8) kn++; }
  const pct = total ? Math.round(kn / total * 100) : 0;

  $('#global-progress').innerHTML =
    `<div class="gp-pct">${pct}%</div>
     <div class="gp-right">
       <div class="gp-bar"><div class="gp-fill" style="width:${pct}%"></div></div>
       <div class="gp-label">${kn} sur ${total} maitrise${kn > 1 ? 's' : ''}</div>
     </div>`;

  $('#chapters-grid').innerHTML = D.chapters.map((ch, i) => {
    const items = chItems(ch.number).filter(x => FLASHABLE.includes(x._c));
    const k = known(items), t = items.length, p = t ? Math.round(k / t * 100) : 0;
    return `<div class="card card-ch" data-ch="${ch.number}">
      <div class="card-ch-num" style="background:${CH_COLORS[i]}">
        ${ch.number}
      </div>
      <div class="card-ch-body">
        <div class="card-ch-title">${esc(ch.title_fr)}</div>
        <div class="card-ch-sub">${esc(ch.title_ko || '')}</div>
      </div>
      <div class="card-ch-right">
        <div class="card-ch-count">${k}/${t}</div>
        <div class="card-ch-bar"><div class="card-ch-bar-fill" style="width:${p}%"></div></div>
      </div>
    </div>`;
  }).join('');

  $('#categories-grid').innerHTML = Object.entries(CATS).map(([cat, label]) => {
    const items = D[cat] || [];
    if (!items.length) return '';
    const fl = FLASHABLE.includes(cat);
    const k = fl ? items.filter(i => i.id && m(i.id) >= 0.8).length : null;
    return `<div class="card" data-cat="${cat}">
      <div class="card-cat-title">${esc(label)}</div>
      <div class="card-cat-count">${k !== null ? k + ' / ' : ''}${items.length}</div>
    </div>`;
  }).join('');
}

// ===== List =====
function openList(title, items) {
  curTitle = title; curItems = items;
  show('list');
  $('#header-title').textContent = title;

  const fl = items.filter(i => FLASHABLE.includes(i._c) && i.id);
  const k = known(fl), t = fl.length;
  $('#list-title').textContent = title;
  $('#list-stats').textContent = `${k} / ${t}`;
  $('#list-bar').style.width = (t ? Math.round(k / t * 100) : 0) + '%';
  $('#btn-fc').classList.toggle('hidden', t === 0);
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

  const kr = getKr(it), fr = getFr(it), d = it.id ? dot(it.id) : 'new';
  return `<div class="item">
    <div class="dot dot-${d}"></div>
    <div class="item-body">
      <div class="item-kr">${esc(kr)}</div>
      <div class="item-fr">${esc(fr)}</div>
      ${pg ? `<div class="item-pg">${pg}</div>` : ''}
    </div>
  </div>`;
}

// ===== Flashcard =====
let deck = [], fi = 0, flipped = false;

function startFc() {
  const fl = curItems.filter(i => FLASHABLE.includes(i._c) && i.id);
  if (!fl.length) return;
  const unseen = fl.filter(i => !P[i.id]);
  const weak = fl.filter(i => P[i.id] && m(i.id) < 0.8);
  const strong = fl.filter(i => P[i.id] && m(i.id) >= 0.8);
  deck = [...shuffle(unseen), ...shuffle(weak), ...shuffle(strong)];
  fi = 0;
  show('fc');
  $('#header-title').textContent = curTitle;
  showCard();
}

function showCard() {
  if (fi >= deck.length) { deck = shuffle(deck); fi = 0; }
  const it = deck[fi];
  flipped = false;
  $('#fc-cat').textContent = CATS[it._c] || '';
  $('#fc-page').textContent = it.page ? `p.${it.page}` : '';
  $('#fc-front').innerHTML = buildFront(it);
  $('#fc-back').innerHTML = buildBack(it);
  $('#fc-front').classList.remove('hidden');
  $('#fc-back').classList.add('hidden');
  $('#fc-actions').classList.add('hidden');
  $('#fc-reveal').classList.remove('hidden');
}

function flip() {
  if (flipped) return;
  flipped = true;
  $('#fc-front').classList.add('hidden');
  $('#fc-back').classList.remove('hidden');
  $('#fc-reveal').classList.add('hidden');
  $('#fc-actions').classList.remove('hidden');
}

function answer(ok) {
  const it = deck[fi];
  if (it.id) {
    if (!P[it.id]) P[it.id] = {s: 0, c: 0};
    P[it.id].s++;
    if (ok) P[it.id].c++;
    P[it.id].t = Date.now();
    saveP();
  }
  fi++;
  showCard();
}

// ===== Content helpers =====
function getKr(it) {
  const c = it._c;
  if (c === 'expressions') return it.polite?.korean || it.informal?.korean || '';
  if (c === 'verbs') return it.infinitive || '';
  if (c === 'hangeul') return it.letter || '';
  if (c === 'particles') return it.particle || '';
  if (c === 'adjectives') return it.infinitive || it.korean || '';
  return it.korean || '';
}

function getFr(it) {
  const c = it._c;
  if (c === 'particles') return it.function_fr || it.name_fr || '';
  if (c === 'expressions') return it.french || '';
  if (c === 'numbers') return String(it.numeral ?? '') + (it.system === 'native-korean' ? ' (natif)' : it.system === 'sino-korean' ? ' (sino)' : '');
  if (c === 'hangeul') return it.romanization || '';
  return it.french || '';
}

function buildFront(it) {
  const c = it._c;
  let label = '', main = '', sub = '';

  if (['vocabulary','time_expressions','adverbs','connectors','classifiers'].includes(c)) {
    label = CATS[c]; main = it.korean || ''; sub = it.romanization || '';
  } else if (c === 'verbs') {
    label = 'Verbe'; main = it.infinitive || ''; sub = it.french || '';
  } else if (c === 'hangeul') {
    label = 'Hangeul'; main = it.letter || '';
  } else if (c === 'numbers') {
    label = it.system === 'native-korean' ? 'Nombre natif' : 'Nombre sino';
    main = String(it.numeral ?? '');
  } else if (c === 'particles') {
    label = 'Particule'; main = it.particle || '';
  } else if (c === 'adjectives') {
    label = 'Adjectif'; main = it.infinitive || it.korean || ''; sub = it.french || '';
  } else if (c === 'expressions') {
    label = 'Expression'; main = it.french || '';
  }

  return `<div class="fc-label">${esc(label)}</div><div class="fc-main">${esc(main)}</div>${sub ? `<div class="fc-sub">${esc(sub)}</div>` : ''}`;
}

function buildBack(it) {
  const c = it._c;
  let main = '', sub = '', extra = '';

  if (['vocabulary','time_expressions','adverbs','connectors','classifiers'].includes(c)) {
    main = it.french || '';
  } else if (c === 'verbs') {
    const cj = it.conjugations || {};
    main = cj.polite_present || cj.informal_present || cj.polite_present_after_vowel || '';
    const p = [];
    if (cj.polite_present) p.push(`poli : ${cj.polite_present}`);
    if (cj.informal_present) p.push(`informel : ${cj.informal_present}`);
    if (cj.polite_past) p.push(`passe : ${cj.polite_past}`);
    if (cj.polite_negative) p.push(`neg : ${cj.polite_negative}`);
    extra = p.join(' · ');
    if (it.contraction_note) extra += (extra ? '\n' : '') + it.contraction_note;
  } else if (c === 'hangeul') {
    main = it.romanization || ''; sub = it.description_fr || '';
  } else if (c === 'numbers') {
    main = it.korean || '';
    if (it.korean_before_counter) sub = `devant compteur : ${it.korean_before_counter}`;
  } else if (c === 'particles') {
    main = it.function_fr || '';
    const f = it.forms || {};
    if (f.after_vowel || f.after_consonant) sub = `voyelle : ${f.after_vowel || '?'} / consonne : ${f.after_consonant || '?'}`;
    if (it.examples?.length) extra = it.examples.slice(0, 2).map(e => e.korean || '').join('\n');
  } else if (c === 'adjectives') {
    main = it.korean_polite || ''; sub = it.french || '';
  } else if (c === 'expressions') {
    const pol = it.polite?.korean || '', inf = it.informal?.korean || '';
    main = pol || inf;
    if (pol && inf && pol !== inf) sub = `informel : ${inf}`;
  }

  return `<div class="fc-main">${esc(main)}</div>${sub ? `<div class="fc-sub">${esc(sub)}</div>` : ''}${extra ? `<div class="fc-extra">${esc(extra)}</div>` : ''}`;
}

// ===== Search =====
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

// ===== Events =====
function setupEvents() {
  if (localStorage.getItem('blokaja_dark') === 'true') document.documentElement.classList.add('dark');
  $('#btn-dark').onclick = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('blokaja_dark', document.documentElement.classList.contains('dark'));
  };

  $('#btn-back').onclick = () => {
    if (screen === 'fc') { openList(curTitle, curItems); return; }
    renderHome();
  };

  $$('.tab').forEach(t => t.onclick = () => {
    if (t.dataset.screen === 'home') renderHome();
    if (t.dataset.screen === 'search') { show('search'); $('#search-full').value = ''; $('#search-full').focus(); }
  });

  $('#chapters-grid').onclick = e => {
    const card = e.target.closest('[data-ch]');
    if (!card) return;
    const ch = Number(card.dataset.ch);
    const info = D.chapters.find(c => c.number === ch);
    openList(`Ch.${ch} ${info?.title_fr || ''}`, chItems(ch));
  };

  $('#categories-grid').onclick = e => {
    const card = e.target.closest('[data-cat]');
    if (!card) return;
    const cat = card.dataset.cat;
    openList(CATS[cat] || cat, catItems(cat));
  };

  $('#btn-fc').onclick = startFc;
  $('#fc-card').onclick = flip;
  $('#fc-reveal').onclick = flip;
  $('#fc-nope').onclick = () => answer(false);
  $('#fc-ok').onclick = () => answer(true);

  $('#search-home').oninput = e => {
    if (e.target.value.trim().length >= 2) {
      show('search');
      $('#search-full').value = e.target.value;
      doSearch(e.target.value, $('#search-results'));
    }
  };
  $('#search-full').oninput = e => doSearch(e.target.value, $('#search-results'));

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
