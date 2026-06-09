// practice.js — Modes d'entrainement de Blokaja (en plus des flashcards SRS).
// Charge APRES app.js et conjugator.js. Reutilise les globales D, getKr, getFr,
// speakKr, esc, show, $. Expose ses fonctions en global (navigateur) et via
// module.exports (tests bun). Le SRS SM-2 n'est pas touche.
//
// 4 modes : conjugaison (moteur), QCM (donnees), generateurs nombres/heure/date,
// grammaire (data/exercises.json, charge a la demande).

// ───────────────────────── Nombres coreens (purs, testables) ─────────────────
const SINO_D = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const NATIVE = { 1:'하나', 2:'둘', 3:'셋', 4:'넷', 5:'다섯', 6:'여섯', 7:'일곱', 8:'여덟', 9:'아홉', 10:'열' };
const NATIVE_TENS = { 10:'열', 20:'스물', 30:'서른', 40:'마흔', 50:'쉰', 60:'예순', 70:'일흔', 80:'여든', 90:'아흔' };
const NATIVE_BEFORE = { 1:'한', 2:'두', 3:'세', 4:'네', 20:'스무' };

function _sinoUnder(g) {            // 1..9999
  if (g === 0) return '';
  const uu = ['천', '백', '십', ''];
  const dg = [Math.floor(g / 1000) % 10, Math.floor(g / 100) % 10, Math.floor(g / 10) % 10, g % 10];
  let s = '';
  for (let i = 0; i < 4; i++) {
    if (dg[i] > 0) s += (dg[i] === 1 && i < 3 ? '' : SINO_D[dg[i]]) + uu[i];
  }
  return s;
}
function sinoNum(n) {
  if (n === 0) return '영';
  if (n < 10000) return _sinoUnder(n);
  const man = Math.floor(n / 10000), rem = n % 10000;
  return (man === 1 ? '' : _sinoUnder(man)) + '만' + (rem ? _sinoUnder(rem) : '');
}
function nativeNum(n, before = false) {
  if (n < 1 || n > 99) return String(n);
  const tens = Math.floor(n / 10) * 10, ones = n % 10;
  let s = '';
  if (tens) s += (before && tens === 20 && ones === 0) ? '스무' : NATIVE_TENS[tens];
  if (ones) s += before ? (NATIVE_BEFORE[ones] || NATIVE[ones]) : NATIVE[ones];
  return s;
}

function timeKorean(h, m) {
  const hk = nativeNum(h, true) + ' 시';
  let mk = '';
  if (m === 30) mk = '반';
  else if (m > 0) mk = sinoNum(m) + ' 분';
  return mk ? hk + ' ' + mk : hk;
}
const MONTH_EXC = { 6: '유월', 10: '시월' };
function dateKorean(month, day) {
  return (MONTH_EXC[month] || (sinoNum(month) + '월')) + ' ' + sinoNum(day) + '일';
}
function priceKorean(n) { return sinoNum(n) + '원'; }
function countKorean(n, clf) {
  const num = (clf.number_system === 'native-korean') ? nativeNum(n, true) : sinoNum(n);
  return num + ' ' + clf.korean;
}

// ───────────────────────── Utilitaires de reponse / choix ────────────────────
function _normAns(s) { return (s || '').trim().replace(/\s+/g, '').toLowerCase(); }
function checkAnswer(ex, input) {
  const cand = [ex.answer, ...(ex.answer_alts || [])].map(_normAns);
  return cand.includes(_normAns(input));
}
function _shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
function _unique(a) { return [...new Set(a.filter(x => x != null && x !== ''))]; }
// 4 choix uniques : la bonne reponse + jusqu'a 3 distracteurs distincts, melanges.
function buildChoices(answer, distractors, pad = []) {
  const out = [answer];
  for (const d of _unique(distractors)) { if (out.length >= 4) break; if (!out.includes(d)) out.push(d); }
  for (const d of _unique(pad)) { if (out.length >= 4) break; if (!out.includes(d)) out.push(d); }
  return _shuffle(out);
}

// ───────────────────────── Conjugaison (moteur) ─────────────────────────────
function _CJ(dict, opts) {
  const fn = (typeof conjugate === 'function') ? conjugate : globalThis.conjugate;
  return fn(dict, opts);
}
const CONJ_TARGETS = [
  { key: 'presentPolite',   label: 'présent poli' },
  { key: 'pastPolite',      label: 'passé poli' },
  { key: 'future',          label: 'futur' },
  { key: 'negShort',        label: 'négation' },
  { key: 'honorificPolite', label: 'honorifique poli' },
];
const _CONJ_POOL = ['presentPolite', 'presentInformal', 'pastPolite', 'pastInformal', 'future', 'negShort', 'honorificPolite', 'connectiveSeo'];

function buildConjugationExercise(item, target) {
  const dict = item.infinitive || (typeof item.korean === 'string' && item.korean.endsWith('다') ? item.korean : null);
  if (!dict) return null;
  let forms;
  try { forms = _CJ(dict, item.irregular ? { irregular: item.irregular } : {}); } catch (e) { return null; }
  const answer = forms[target.key];
  if (!answer) return null;
  const distractors = _unique(_CONJ_POOL.map(k => forms[k])).filter(v => v !== answer);
  return {
    type: 'conjugation', mode: 'mcq', source_id: item.id, chapter: item.chapter,
    prompt_fr: `Donne la forme « ${target.label} » de :`,
    prompt_kr: dict,
    answer, distractors, choices: buildChoices(answer, distractors),
    explanation: `${dict} (${item.french || ''}) → ${answer}`,
    label: `Conjugaison · ${target.label}`, tts_answer: answer,
  };
}

// ───────────────────────── QCM vocabulaire / particules ─────────────────────
function buildMcqExercise(item, cat) {
  if (cat === 'particles') {
    const ex0 = (item.examples || [])[0];
    if (!ex0 || !ex0.korean || !item.particle) return null;
    const others = (D.particles || []).filter(p => p.particle && p.particle !== item.particle);
    const distractors = _shuffle(others).slice(0, 3).map(p => p.particle);
    const blanked = ex0.korean.replace(item.particle, '___');
    return {
      type: 'mcq', mode: 'mcq', source_id: item.id, chapter: item.chapter,
      prompt_fr: 'Quelle particule complète la phrase ?',
      context_kr: blanked, prompt_kr: null,
      answer: item.particle, distractors, choices: buildChoices(item.particle, distractors),
      explanation: `${ex0.korean}${ex0.french ? ' — ' + ex0.french : ''}\n${item.particle} : ${item.function_fr || item.name_fr || ''}`,
      label: 'QCM · Particule', tts_answer: ex0.korean,
    };
  }
  // kr -> fr
  const it = { ...item, _c: cat };
  const correctFr = getFr(it);
  const correctKr = getKr(it);
  if (!correctFr || !correctKr) return null;
  const pool = (D[cat] || []).filter(o => o.id !== item.id);
  const distractors = _shuffle(pool).slice(0, 6).map(o => getFr({ ...o, _c: cat })).filter(Boolean);
  return {
    type: 'mcq', mode: 'mcq', source_id: item.id, chapter: item.chapter,
    prompt_fr: 'Que signifie ce mot ?', prompt_kr: correctKr,
    answer: correctFr, distractors, choices: buildChoices(correctFr, distractors),
    explanation: `${correctKr} = ${correctFr}`,
    label: `QCM · ${(typeof CATS !== 'undefined' && CATS[cat]) || cat}`, tts_answer: correctKr,
  };
}

// ───────────────────────── Generateurs nombres/heure/date ───────────────────
function _ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const _MIN_CHOICES = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50];

function genTime() {
  const h = _ri(1, 12), m = _MIN_CHOICES[_ri(0, _MIN_CHOICES.length - 1)];
  const answer = timeKorean(h, m);
  const mk = m === 30 ? '반' : (m > 0 ? sinoNum(m) + ' 분' : '');
  const d1 = (sinoNum(h) + ' 시' + (mk ? ' ' + mk : '')).trim();             // heure en sino (faux)
  const d2 = (nativeNum(h, true) + ' 시' + (m > 0 ? ' ' + nativeNum(m) + ' 분' : '')).trim(); // minutes natives (faux)
  const d3 = timeKorean(h === 12 ? 1 : h + 1, m);
  return {
    type: 'generator', mode: 'mcq',
    prompt_fr: 'Comment lit-on cette heure ?', prompt_kr: `${h}h${String(m).padStart(2, '0')}`,
    answer, distractors: [d1, d2, d3], choices: buildChoices(answer, [d1, d2, d3]),
    explanation: `${h}h${String(m).padStart(2, '0')} = ${answer}\nHeures : nombres natifs + 시 · Minutes : sino-coréens + 분 (30 = 반)`,
    label: 'Nombres · Heure', tts_answer: answer,
  };
}
function genDate() {
  const month = _ri(1, 12), day = _ri(1, 28);
  const answer = dateKorean(month, day);
  const d1 = sinoNum(month) + '월 ' + sinoNum(day) + '일';        // sans exception 유월/시월
  const d2 = (MONTH_EXC[month] || sinoNum(month) + '월') + ' ' + nativeNum(day, true) + '일'; // jour natif (faux)
  const d3 = dateKorean(month === 12 ? 1 : month + 1, day);
  return {
    type: 'generator', mode: 'mcq',
    prompt_fr: 'Comment dit-on cette date ?', prompt_kr: `${day}/${month}`,
    answer, distractors: [d1, d2, d3], choices: buildChoices(answer, [d1, d2, d3]),
    explanation: `${day}/${month} = ${answer}\nMois et jour en sino-coréen + 월/일. Exceptions : 6월 = 유월, 10월 = 시월.`,
    label: 'Nombres · Date', tts_answer: answer,
  };
}
function genPrice() {
  const units = [500, 1000, 2000, 3000, 5000, 10000, 30000, 50000];
  const price = units[_ri(0, units.length - 1)];
  const answer = priceKorean(price);
  const d1 = nativeNum(Math.min(price / 1000, 99) || 1, false) + '원';
  const d2 = priceKorean(price + (price >= 10000 ? 10000 : 1000));
  const d3 = priceKorean(price >= 2000 ? price - 1000 : price + 2000);
  return {
    type: 'generator', mode: 'mcq',
    prompt_fr: 'Quel est ce prix ?', prompt_kr: `${price.toLocaleString('fr-FR')} ₩`,
    answer, distractors: [d1, d2, d3], choices: buildChoices(answer, [d1, d2, d3]),
    explanation: `${price.toLocaleString('fr-FR')} won = ${answer} (nombres sino-coréens)`,
    label: 'Nombres · Prix', tts_answer: answer,
  };
}
function genCount() {
  const list = (D && D.classifiers) ? D.classifiers.filter(c => c.korean && c.number_system) : [];
  if (!list.length) return genTime();
  const clf = list[_ri(0, list.length - 1)];
  const n = _ri(1, 9);
  const answer = countKorean(n, clf);
  const other = (clf.number_system === 'native-korean') ? sinoNum(n) : nativeNum(n, true);
  const d1 = other + ' ' + clf.korean;                         // mauvais systeme de nombres
  const d2 = countKorean(n === 9 ? 1 : n + 1, clf);
  const d3 = (clf.number_system === 'native-korean' ? nativeNum(n) : sinoNum(n)) + ' ' + clf.korean;
  return {
    type: 'generator', mode: 'mcq',
    prompt_fr: `Compte avec le classificateur ${clf.korean} (${clf.used_with_fr || clf.french}) :`,
    prompt_kr: `${n} × ${clf.korean}`,
    answer, distractors: [d1, d2, d3], choices: buildChoices(answer, [d1, d2, d3]),
    explanation: `${answer}\n${clf.korean} utilise les nombres ${clf.number_system === 'native-korean' ? 'coréens natifs (하나, 둘, 셋…)' : 'sino-coréens (일, 이, 삼…)'}.`,
    label: 'Nombres · Classificateur', tts_answer: answer,
  };
}
const _GENERATORS = [genTime, genDate, genPrice, genCount];
function genRandom() { return _GENERATORS[_ri(0, _GENERATORS.length - 1)](); }

// ───────────────────────── Construction de la file d'exercices ──────────────
function buildPracticeQueue(mode, chapter, count = 12) {
  const inCh = it => chapter == null || it.chapter === chapter || it.chapter === -1;
  let pool = [];
  if (mode === 'conjugation') {
    const items = [...(D.verbs || []), ...(D.adjectives || [])].filter(inCh);
    for (const it of items) for (const t of CONJ_TARGETS) { const ex = buildConjugationExercise(it, t); if (ex) pool.push(ex); }
  } else if (mode === 'mcq') {
    for (const cat of ['vocabulary', 'particles']) {
      for (const it of (D[cat] || []).filter(inCh)) { const ex = buildMcqExercise(it, cat); if (ex) pool.push(ex); }
    }
  } else if (mode === 'grammar') {
    pool = (D.exercises || []).filter(ex => chapter == null || ex.chapter === chapter)
      .map(ex => ({ ...ex, choices: ex.mode === 'mcq' ? buildChoices(ex.answer, ex.distractors || []) : null }));
  } else if (mode === 'generator') {
    return Array.from({ length: count }, genRandom);
  }
  return _shuffle(pool).slice(0, count);
}

// ───────────────────────── Progression (localStorage, hors SRS) ─────────────
const PRACTICE_KEY = 'blokaja4_practice';
function getPracticeData() {
  try { return JSON.parse(localStorage.getItem(PRACTICE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function recordPracticeResult(ex, correct) {
  const data = getPracticeData();
  data.stats = data.stats || {};
  const key = ex.grammar_id || ex.source_id || ex.type;
  const s = data.stats[key] || { attempts: 0, correct: 0 };
  s.attempts++; if (correct) s.correct++;
  data.stats[key] = s;
  try { localStorage.setItem(PRACTICE_KEY, JSON.stringify(data)); } catch (e) {}
}

// ───────────────────────── UI (navigateur uniquement) ───────────────────────
let _prac = null;

async function openPracticeHub(chapter) {
  if (typeof document === 'undefined') return;
  if (!D.exercises) {
    try { const r = await fetch('data/exercises.json'); D.exercises = (await r.json()).grammar_exercises || []; }
    catch (e) { D.exercises = []; }
  }
  _practiceChapter = (chapter === undefined) ? _practiceChapter : chapter;
  screen = 'practice';
  show('practice');
  $('#header-title').textContent = "S'entraîner";
  renderPracticeHub();
}

let _practiceChapter = null;
function renderPracticeHub() {
  const chOpts = ['<option value="">Tous les chapitres</option>']
    .concat((D.chapters || []).map(c => `<option value="${c.number}"${String(_practiceChapter) === String(c.number) ? ' selected' : ''}>Ch.${c.number} ${esc(c.title_fr || '')}</option>`))
    .join('');
  const modes = [
    { m: 'conjugation', icon: '활용', t: 'Conjugaison', d: 'Présent, passé, futur, négation' },
    { m: 'grammar',     icon: '문법', t: 'Grammaire',   d: `${(D.exercises || []).length} exercices` },
    { m: 'mcq',         icon: 'QCM',  t: 'QCM',          d: 'Vocabulaire & particules' },
    { m: 'generator',   icon: '123',  t: 'Nombres',      d: 'Heure, date, prix, compter' },
  ];
  $('#practice-body').innerHTML = `
    <div class="section-label">Filtrer</div>
    <select id="prc-ch" class="prc-select">${chOpts}</select>
    <div class="section-label">Choisis un mode</div>
    <div class="mode-grid">
      ${modes.map(x => `<div class="card-mode" data-mode="${x.m}">
        <div class="card-mode-icon">${esc(x.icon)}</div>
        <div class="card-mode-label">${esc(x.t)}</div>
        <div class="card-mode-count">${esc(x.d)}</div>
      </div>`).join('')}
    </div>`;
  $('#prc-ch').onchange = e => { _practiceChapter = e.target.value === '' ? null : Number(e.target.value); };
  $('#practice-body').querySelectorAll('.card-mode').forEach(c => {
    c.onclick = () => startPracticeSession(c.dataset.mode, _practiceChapter);
  });
}

function startPracticeSession(mode, chapter) {
  const queue = buildPracticeQueue(mode, chapter, 12);
  if (!queue.length) { if (typeof showToast === 'function') showToast('Aucun exercice pour ce filtre'); return; }
  _prac = { queue, i: 0, correct: 0, mode };
  screen = 'exercise';
  show('exercise');
  $('#header-title').textContent = "Entraînement";
  renderExercise();
}

function renderExercise() {
  const ex = _prac.queue[_prac.i];
  const total = _prac.queue.length;
  const pct = Math.round((_prac.i) / total * 100);
  const ctx = ex.context_kr ? `<div class="ex-context">${esc(ex.context_kr)}</div>` : '';
  const kr = ex.prompt_kr ? `<div class="ex-prompt-kr">${esc(ex.prompt_kr)}</div>` : '';
  let body;
  if (ex.mode === 'mcq') {
    body = `<div class="ex-choices">${ex.choices.map(c => `<button class="ex-choice" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  } else {
    body = `<input type="text" id="ex-input" class="fc-type" lang="ko" placeholder="Ta réponse..." autocomplete="off">
      <button id="ex-submit" class="btn-go">Valider</button>`;
  }
  $('#exercise-body').innerHTML = `
    <div class="ex-progress-bar"><div class="ex-progress-fill" style="width:${pct}%"></div></div>
    <div class="ex-count">${_prac.i + 1} / ${total}</div>
    <div class="ex-label">${esc(ex.label || '')}</div>
    <div class="ex-card">
      <div class="ex-prompt-fr">${esc(ex.prompt_fr)}</div>
      ${kr}${ctx}
    </div>
    ${body}
    <div id="ex-feedback"></div>`;
  if (ex.mode === 'mcq') {
    $('#exercise-body').querySelectorAll('.ex-choice').forEach(b => { b.onclick = () => submitAnswer(b.dataset.val, b); });
  } else {
    const inp = $('#ex-input');
    inp.focus();
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitAnswer(inp.value); } });
    $('#ex-submit').onclick = () => submitAnswer(inp.value);
  }
}

function submitAnswer(input, btn) {
  const ex = _prac.queue[_prac.i];
  if (_prac.answered) return;
  _prac.answered = true;
  const ok = checkAnswer(ex, input);
  if (ok) _prac.correct++;
  recordPracticeResult(ex, ok);
  // surligner les choix
  if (ex.mode === 'mcq') {
    $('#exercise-body').querySelectorAll('.ex-choice').forEach(b => {
      b.classList.add('disabled');
      if (b.dataset.val === ex.answer) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });
  }
  const tts = ex.tts_answer ? `<button class="tts-btn" data-tts="${esc(ex.tts_answer)}">🔈</button>` : '';
  $('#ex-feedback').innerHTML = `
    <div class="ex-fb ${ok ? 'ok' : 'no'}">
      <div class="ex-fb-title">${ok ? '✓ Correct !' : '✗ Réponse : ' + esc(ex.answer)} ${tts}</div>
      <div class="ex-fb-exp">${esc(ex.explanation || '').replace(/\n/g, '<br>')}</div>
    </div>
    <button id="ex-next" class="btn-go">${_prac.i + 1 >= _prac.queue.length ? 'Terminer' : 'Suivant →'}</button>`;
  const t = $('#ex-feedback').querySelector('.tts-btn');
  if (t && typeof speakKr === 'function') t.onclick = () => speakKr(t.dataset.tts);
  $('#ex-next').onclick = nextExercise;
}

function nextExercise() {
  _prac.i++;
  _prac.answered = false;
  if (_prac.i >= _prac.queue.length) { showPracticeSummary(); return; }
  renderExercise();
}

function showPracticeSummary() {
  const total = _prac.queue.length, correct = _prac.correct;
  const pct = Math.round(correct / total * 100);
  $('#exercise-body').innerHTML = `
    <div class="ex-summary">
      <div class="ex-summary-emoji">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
      <div class="ex-summary-title">${correct} / ${total} réussis (${pct}%)</div>
      <div class="ex-summary-actions">
        <button id="ex-again" class="btn-reveal">Recommencer</button>
        <button id="ex-hub" class="btn-go">Retour</button>
      </div>
    </div>`;
  $('#ex-again').onclick = () => startPracticeSession(_prac.mode, _practiceChapter);
  $('#ex-hub').onclick = () => openPracticeHub();
}

function setupPracticeEvents() {
  if (typeof document === 'undefined') return;
  const home = $('#btn-practice-home');
  if (home) home.onclick = () => openPracticeHub(null);
  const list = $('#btn-practice');
  if (list) list.onclick = () => {
    // deduire le chapitre depuis la liste courante si homogene
    const chs = [...new Set((curItems || []).map(i => i.chapter))];
    openPracticeHub(chs.length === 1 ? chs[0] : null);
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sinoNum, nativeNum, timeKorean, dateKorean, priceKorean, countKorean,
    checkAnswer, buildChoices, buildConjugationExercise, buildMcqExercise,
    genTime, genDate, genPrice, genCount, buildPracticeQueue,
  };
}
