/* Blokaja - Korean A1 Revision App */

let DATA = null;
let PROGRESS = {};
let currentItems = [];
let currentCategory = '';
let currentChapter = null;
let fcIndex = 0;
let qzIndex = 0;
let qzScore = 0;
let qzResults = [];
let sessionHistory = [];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const CATEGORY_LABELS = {
  vocabulary: { label: 'Vocabulaire', icon: '単' },
  verbs: { label: 'Verbes', icon: '動' },
  grammar: { label: 'Grammaire', icon: '文' },
  particles: { label: 'Particules', icon: '助' },
  expressions: { label: 'Expressions', icon: '話' },
  hangeul: { label: 'Hangeul', icon: '가' },
  numbers: { label: 'Nombres', icon: '数' },
  culture: { label: 'Culture', icon: '韓' },
  dialogues: { label: 'Dialogues', icon: '会' },
  pronunciation_rules: { label: 'Prononciation', icon: '音' },
  time_expressions: { label: 'Temps', icon: '時' },
  classifiers: { label: 'Classificateurs', icon: '量' },
  connectors: { label: 'Connecteurs', icon: '接' },
  adjectives: { label: 'Adjectifs', icon: '形' },
  adverbs: { label: 'Adverbes', icon: '副' },
};

const CHAPTER_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e'];

// ===== Data Loading =====
async function loadData() {
  try {
    const res = await fetch('data/course_data.json');
    DATA = await res.json();
  } catch (e) {
    console.error('Failed to load data:', e);
    document.body.innerHTML = '<p style="padding:20px;color:red;">Erreur: impossible de charger les données.</p>';
    return;
  }
  loadProgress();
  renderHome();
}

// ===== Progress =====
function loadProgress() {
  try {
    PROGRESS = JSON.parse(localStorage.getItem('blokaja_progress') || '{}');
  } catch { PROGRESS = {}; }
}

function saveProgress() {
  localStorage.setItem('blokaja_progress', JSON.stringify(PROGRESS));
}

function getItemProgress(id) {
  return PROGRESS[id] || { mastery: 0, seen: 0, correct: 0, streak: 0 };
}

function updateItemProgress(id, correct) {
  const p = getItemProgress(id);
  p.seen++;
  if (correct) { p.correct++; p.streak++; }
  else { p.streak = 0; }
  p.mastery = Math.min(1, p.correct / Math.max(p.seen, 1));
  p.lastReview = new Date().toISOString().split('T')[0];
  PROGRESS[id] = p;
  saveProgress();
}

function getMasteryClass(mastery) {
  if (mastery === 0) return 'none';
  if (mastery < 0.4) return 'low';
  if (mastery < 0.8) return 'mid';
  return 'high';
}

// ===== Navigation =====
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');

  const isHome = id === '#screen-home';
  $('#btn-back').classList.toggle('hidden', isHome);
  $('#header-title').textContent = isHome ? 'Blokaja' : '';
}

$('#btn-back').addEventListener('click', () => {
  showScreen('#screen-home');
  renderHome();
});

// ===== Dark Mode =====
$('#btn-dark').addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('blokaja_dark', document.documentElement.classList.contains('dark'));
});

if (localStorage.getItem('blokaja_dark') === 'true') {
  document.documentElement.classList.add('dark');
}

// ===== Search =====
$('#btn-search').addEventListener('click', () => {
  $('#search-overlay').classList.remove('hidden');
  $('#search-input').value = '';
  $('#search-input').focus();
  $('#search-results').innerHTML = '';
});

$('#search-close').addEventListener('click', () => {
  $('#search-overlay').classList.add('hidden');
});

$('#search-input').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (q.length < 2) { $('#search-results').innerHTML = ''; return; }
  const results = searchAll(q).slice(0, 50);
  $('#search-results').innerHTML = results.map(r =>
    `<div class="search-item">
      <div class="si-kr">${esc(r.korean || r.title || r.letter || '')}</div>
      <div class="si-fr">${esc(r.french || r.explanation || r.body || r.description_fr || '')}</div>
      <span class="si-tag">${r._category} · Ch${r.chapter ?? '?'}</span>
    </div>`
  ).join('') || '<p style="color:var(--fg3);padding:20px;text-align:center;">Aucun résultat</p>';
});

function searchAll(q) {
  const results = [];
  const cats = ['vocabulary','verbs','expressions','grammar','particles','hangeul',
    'numbers','culture','time_expressions','classifiers','connectors','adjectives','adverbs',
    'pronunciation_rules','dialogues'];
  for (const cat of cats) {
    for (const item of (DATA[cat] || [])) {
      const fields = [
        item.korean, item.french, item.infinitive, item.title,
        item.letter, item.particle, item.explanation, item.body,
        item.description_fr, item.name_fr, item.function_fr,
      ].filter(Boolean).map(s => s.toLowerCase());
      if (fields.some(f => f.includes(q))) {
        results.push({ ...item, _category: CATEGORY_LABELS[cat]?.label || cat });
      }
    }
  }
  return results;
}

// ===== Home Screen =====
function renderHome() {
  // Stats
  let totalItems = 0;
  let masteredItems = 0;
  const cats = Object.keys(CATEGORY_LABELS);
  for (const cat of cats) {
    const items = DATA[cat] || [];
    totalItems += items.length;
    for (const item of items) {
      if (item.id && getItemProgress(item.id).mastery >= 0.8) masteredItems++;
    }
  }
  $('#stat-total').textContent = totalItems;
  $('#stat-mastered').textContent = masteredItems;

  // Streak
  const today = new Date().toISOString().split('T')[0];
  const hasToday = Object.values(PROGRESS).some(p => p.lastReview === today);
  $('#stat-streak').textContent = hasToday ? '1' : '0';

  // Chapters
  const chaptersHTML = DATA.chapters.map((ch, i) => {
    const color = CHAPTER_COLORS[i % CHAPTER_COLORS.length];
    const count = countChapterItems(ch.number);
    const progress = getChapterProgress(ch.number);
    return `<div class="card card-chapter" style="border-left-color:${color}" onclick="openChapter(${ch.number})">
      <div class="card-title">${ch.number === 0 ? 'Ch.0' : 'Ch.' + ch.number} ${esc(ch.title_fr)}</div>
      <div class="card-sub">${esc(ch.title_ko || '')}</div>
      <span class="card-count">${count} items</span>
      <div class="card-progress"><div class="card-progress-fill" style="width:${progress}%"></div></div>
    </div>`;
  }).join('');
  $('#chapters-list').innerHTML = chaptersHTML;

  // Categories
  const catsHTML = cats.map(cat => {
    const items = DATA[cat] || [];
    if (items.length === 0) return '';
    const info = CATEGORY_LABELS[cat];
    return `<div class="card" onclick="openCategory('${cat}')">
      <div class="card-title">${info.icon} ${info.label}</div>
      <span class="card-count">${items.length}</span>
    </div>`;
  }).join('');
  $('#categories-list').innerHTML = catsHTML;
}

function countChapterItems(chNum) {
  let count = 0;
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    for (const item of (DATA[cat] || [])) {
      if (item.chapter === chNum) count++;
    }
  }
  return count;
}

function getChapterProgress(chNum) {
  let total = 0, mastered = 0;
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    for (const item of (DATA[cat] || [])) {
      if (item.chapter === chNum && item.id) {
        total++;
        if (getItemProgress(item.id).mastery >= 0.8) mastered++;
      }
    }
  }
  return total ? Math.round(mastered / total * 100) : 0;
}

// ===== List Screen =====
window.openChapter = function(chNum) {
  currentChapter = chNum;
  currentCategory = '';
  const ch = DATA.chapters.find(c => c.number === chNum);
  const title = ch ? `Ch.${chNum} ${ch.title_fr}` : `Chapitre ${chNum}`;

  const items = [];
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    for (const item of (DATA[cat] || [])) {
      if (item.chapter === chNum) items.push({ ...item, _cat: cat });
    }
  }
  currentItems = items;
  renderList(title, items);
};

window.openCategory = function(cat) {
  currentCategory = cat;
  currentChapter = null;
  const items = (DATA[cat] || []).map(item => ({ ...item, _cat: cat }));
  currentItems = items;
  const info = CATEGORY_LABELS[cat];
  renderList(`${info.icon} ${info.label}`, items);
};

function renderList(title, items) {
  showScreen('#screen-list');
  $('#header-title').textContent = title;
  $('#list-title').textContent = `${items.length} items`;

  // Progress
  let mastered = 0;
  for (const item of items) {
    if (item.id && getItemProgress(item.id).mastery >= 0.8) mastered++;
  }
  const pct = items.length ? Math.round(mastered / items.length * 100) : 0;
  $('#list-progress-fill').style.width = pct + '%';
  $('#list-progress-text').textContent = pct + '%';

  // Render items based on category
  const html = items.map(item => renderItemRow(item)).join('');
  $('#items-list').innerHTML = html;
}

function renderItemRow(item) {
  const cat = item._cat;
  const p = item.id ? getItemProgress(item.id) : { mastery: 0 };
  const mc = getMasteryClass(p.mastery);

  if (cat === 'grammar' || cat === 'pronunciation_rules') {
    const examples = (item.examples || []).slice(0, 2);
    return `<div class="detail-card">
      <h3>${esc(item.title || '')}</h3>
      <p>${esc(item.explanation || item.explanation_fr || '')}</p>
      ${examples.map(ex => `<span class="example">${esc(ex.korean || ex.written || '')}</span>
        <span class="example-fr">${esc(ex.french || '')}</span>`).join('')}
    </div>`;
  }
  if (cat === 'culture') {
    return `<div class="detail-card">
      <h3>${esc(item.title || '')}</h3>
      <p>${esc(item.body || '')}</p>
    </div>`;
  }
  if (cat === 'dialogues') {
    const lines = (item.lines || []).map(l =>
      `<div style="margin:4px 0"><b>${esc(l.speaker || '?')}:</b> <span class="kr">${esc(l.korean || '')}</span> — ${esc(l.french || '')}</div>`
    ).join('');
    return `<div class="detail-card"><h3>${esc(item.title_fr || '')}</h3>${lines}</div>`;
  }

  const kr = item.korean || item.infinitive || item.particle || item.letter || item.title || '';
  let fr = item.french || item.name_fr || item.description_fr || item.function_fr || '';
  if (cat === 'verbs' && item.conjugations) {
    const c = item.conjugations;
    fr += ` → ${c.polite_present || c.informal_present || ''}`;
  }
  if (cat === 'expressions') {
    const pol = item.polite?.korean || '';
    const inf = item.informal?.korean || '';
    return `<div class="item-row">
      <div class="ir-mastery ${mc}"></div>
      <div style="flex:1">
        <div class="ir-fr">${esc(item.french || '')}</div>
        ${pol ? `<div class="kr" style="font-size:.95rem;margin-top:2px">${esc(pol)}</div>` : ''}
        ${inf ? `<div class="kr" style="font-size:.85rem;color:var(--fg3)">${esc(inf)}</div>` : ''}
      </div>
    </div>`;
  }

  return `<div class="item-row">
    <div class="ir-mastery ${mc}"></div>
    <span class="ir-kr">${esc(kr)}</span>
    <span class="ir-fr">${esc(fr)}</span>
  </div>`;
}

// ===== Flashcards =====
$('#btn-flashcard').addEventListener('click', startFlashcards);

function startFlashcards() {
  const items = getQuizzableItems(currentItems);
  if (items.length === 0) return;
  currentItems = shuffle([...items]).slice(0, Math.min(20, items.length));
  fcIndex = 0;
  sessionHistory = [];
  showScreen('#screen-flashcard');
  $('#header-title').textContent = 'Flashcards';
  showFlashcard();
}

function showFlashcard() {
  const item = currentItems[fcIndex];
  if (!item) return showResults();

  $('#fc-counter').textContent = `${fcIndex + 1}/${currentItems.length}`;
  $('#fc-progress-fill').style.width = (fcIndex / currentItems.length * 100) + '%';

  const { front, back, sub, extra, label } = getFlashcardContent(item);
  $('#fc-label').textContent = label;
  $('#fc-front-text').textContent = front;
  $('#fc-front-sub').textContent = sub;
  $('#fc-back-text').textContent = back;
  $('#fc-back-sub').textContent = extra;
  $('#fc-back-extra').textContent = '';

  $('.fc-front').classList.remove('hidden');
  $('.fc-back').classList.add('hidden');
  $('#fc-buttons').classList.add('hidden');
}

function getFlashcardContent(item) {
  const cat = item._cat;
  if (cat === 'verbs') {
    return {
      label: 'Conjuguez',
      front: item.infinitive || '',
      sub: item.french || '',
      back: item.conjugations?.polite_present || item.conjugations?.informal_present || '',
      extra: item.contraction_note || '',
    };
  }
  if (cat === 'particles') {
    return {
      label: 'Particule',
      front: item.particle || '',
      sub: item.name_fr || '',
      back: item.function_fr || '',
      extra: item.forms ? `voyelle: ${item.forms.after_vowel || ''} / consonne: ${item.forms.after_consonant || ''}` : '',
    };
  }
  if (cat === 'expressions') {
    return {
      label: 'Traduisez',
      front: item.french || '',
      sub: '',
      back: item.polite?.korean || item.informal?.korean || '',
      extra: item.informal?.korean && item.polite?.korean ? `informel: ${item.informal.korean}` : '',
    };
  }
  if (cat === 'hangeul') {
    return {
      label: 'Lettre',
      front: item.letter || '',
      sub: '',
      back: item.romanization || '',
      extra: item.description_fr || '',
    };
  }
  if (cat === 'numbers') {
    return {
      label: item.system === 'native-korean' ? 'Nombre natif' : 'Nombre sino',
      front: String(item.numeral ?? ''),
      sub: item.system || '',
      back: item.korean || '',
      extra: item.korean_before_counter ? `devant compteur: ${item.korean_before_counter}` : '',
    };
  }
  // Default: vocabulary-style
  const kr = item.korean || item.infinitive || item.particle || item.letter || '';
  const fr = item.french || item.name_fr || item.description_fr || '';
  return { label: 'Coréen → Français', front: kr, sub: item.romanization || '', back: fr, extra: '' };
}

$('#flashcard').addEventListener('click', flipCard);
$('#fc-flip').addEventListener('click', flipCard);

function flipCard() {
  const frontHidden = !$('.fc-front').classList.contains('hidden');
  if (frontHidden) {
    $('.fc-front').classList.add('hidden');
    $('.fc-back').classList.remove('hidden');
    $('#fc-buttons').classList.remove('hidden');
  } else {
    $('.fc-front').classList.remove('hidden');
    $('.fc-back').classList.add('hidden');
    $('#fc-buttons').classList.add('hidden');
  }
}

$('#fc-fail').addEventListener('click', () => fcAnswer(false));
$('#fc-ok').addEventListener('click', () => fcAnswer(null));
$('#fc-pass').addEventListener('click', () => fcAnswer(true));

function fcAnswer(correct) {
  const item = currentItems[fcIndex];
  if (item?.id) {
    if (correct === true) updateItemProgress(item.id, true);
    else if (correct === false) updateItemProgress(item.id, false);
    // null = "ok" → count as seen but partial
    else { const p = getItemProgress(item.id); p.seen++; p.mastery = Math.min(1, (p.correct + 0.5) / p.seen); PROGRESS[item.id] = p; saveProgress(); }
  }
  sessionHistory.push({ item, correct });
  fcIndex++;
  showFlashcard();
}

$('#fc-skip').addEventListener('click', () => { fcIndex++; showFlashcard(); });

$('#fc-speak').addEventListener('click', () => {
  const item = currentItems[fcIndex];
  if (!item) return;
  const text = item.korean || item.infinitive || item.letter || '';
  if (text) speak(text);
});

// ===== Quiz =====
$('#btn-quiz').addEventListener('click', startQuiz);

function startQuiz() {
  const items = getQuizzableItems(currentItems);
  if (items.length < 4) return;
  currentItems = shuffle([...items]).slice(0, Math.min(10, items.length));
  qzIndex = 0;
  qzScore = 0;
  qzResults = [];
  showScreen('#screen-quiz');
  $('#header-title').textContent = 'Quiz';
  showQuizQuestion();
}

function showQuizQuestion() {
  if (qzIndex >= currentItems.length) return showResults();

  const item = currentItems[qzIndex];
  $('#qz-counter').textContent = `${qzIndex + 1}/${currentItems.length}`;
  $('#qz-progress-fill').style.width = (qzIndex / currentItems.length * 100) + '%';
  $('#qz-score').textContent = qzScore;

  const { prompt, answer, hint, choices, label } = buildQuizQuestion(item);
  $('#qz-label').textContent = label;
  $('#qz-prompt').textContent = prompt;
  $('#qz-hint').textContent = hint;

  const choicesHTML = choices.map((c, i) =>
    `<button class="qz-choice" data-idx="${i}" data-correct="${c === answer}">${esc(c)}</button>`
  ).join('');
  $('#qz-choices').innerHTML = choicesHTML;
  $('#qz-feedback').classList.add('hidden');
  $('#qz-next').classList.add('hidden');

  $$('.qz-choice').forEach(btn => {
    btn.addEventListener('click', () => handleQuizAnswer(btn, answer, item));
  });
}

function buildQuizQuestion(item) {
  const cat = item._cat;
  const allItems = DATA[cat] || [];

  if (cat === 'vocabulary' || cat === 'time_expressions' || cat === 'adverbs' || cat === 'adjectives') {
    const kr = item.korean || item.infinitive || '';
    const fr = item.french || '';
    const distractors = shuffle(allItems.filter(x => x.french !== fr && x.french))
      .slice(0, 3).map(x => x.french);
    const choices = shuffle([fr, ...distractors]);
    return { prompt: kr, answer: fr, hint: item.romanization || '', choices, label: 'Traduisez' };
  }
  if (cat === 'verbs') {
    const prompt = item.infinitive || '';
    const answer = item.conjugations?.polite_present || item.conjugations?.informal_present || '';
    const distractors = shuffle(allItems.filter(x => {
      const c = x.conjugations?.polite_present || x.conjugations?.informal_present || '';
      return c && c !== answer;
    })).slice(0, 3).map(x => x.conjugations?.polite_present || x.conjugations?.informal_present);
    return { prompt, answer, hint: item.french || '', choices: shuffle([answer, ...distractors]), label: 'Conjugaison polie' };
  }
  if (cat === 'hangeul') {
    const answer = item.romanization || '';
    const distractors = shuffle(allItems.filter(x => x.romanization && x.romanization !== answer))
      .slice(0, 3).map(x => x.romanization);
    return { prompt: item.letter || '', answer, hint: '', choices: shuffle([answer, ...distractors]), label: 'Romanisation' };
  }
  if (cat === 'numbers') {
    const answer = item.korean || '';
    const distractors = shuffle(allItems.filter(x => x.korean && x.korean !== answer && x.system === item.system))
      .slice(0, 3).map(x => x.korean);
    return { prompt: String(item.numeral ?? ''), answer, hint: item.system || '', choices: shuffle([answer, ...distractors]), label: 'Nombre' };
  }
  // Default
  const kr = item.korean || item.particle || '';
  const fr = item.french || item.function_fr || item.name_fr || '';
  const distractors = shuffle(allItems.filter(x => (x.french || x.function_fr || '') !== fr))
    .slice(0, 3).map(x => x.french || x.function_fr || x.name_fr || '');
  return { prompt: kr, answer: fr, hint: '', choices: shuffle([fr, ...distractors]), label: 'Traduisez' };
}

function handleQuizAnswer(btn, correctAnswer, item) {
  $$('.qz-choice').forEach(b => b.classList.add('disabled'));
  const isCorrect = btn.dataset.correct === 'true';

  if (isCorrect) {
    btn.classList.add('correct');
    qzScore++;
    $('#qz-feedback').textContent = 'Correct !';
    $('#qz-feedback').className = 'qz-feedback correct';
  } else {
    btn.classList.add('wrong');
    $$('.qz-choice').forEach(b => { if (b.dataset.correct === 'true') b.classList.add('correct'); });
    $('#qz-feedback').textContent = `Réponse : ${correctAnswer}`;
    $('#qz-feedback').className = 'qz-feedback wrong';
  }

  $('#qz-feedback').classList.remove('hidden');
  $('#qz-next').classList.remove('hidden');

  if (item?.id) updateItemProgress(item.id, isCorrect);
  qzResults.push({ item, correct: isCorrect });
}

$('#qz-next').addEventListener('click', () => { qzIndex++; showQuizQuestion(); });

// ===== Results =====
function showResults() {
  showScreen('#screen-results');
  const results = sessionHistory.length ? sessionHistory : qzResults;
  const correct = results.filter(r => r.correct === true).length;
  const total = results.length;

  $('#res-score').textContent = correct;
  $('#res-total').textContent = total;
  $('#res-details').textContent = total > 0
    ? `${Math.round(correct/total*100)}% de bonnes réponses`
    : '';
}

$('#res-retry').addEventListener('click', () => {
  if (sessionHistory.length) startFlashcards();
  else startQuiz();
});
$('#res-home').addEventListener('click', () => { showScreen('#screen-home'); renderHome(); });

// ===== Helpers =====
function getQuizzableItems(items) {
  return items.filter(item => {
    const cat = item._cat;
    if (['grammar','culture','dialogues','pronunciation_rules'].includes(cat)) return false;
    if (cat === 'vocabulary' || cat === 'verbs' || cat === 'hangeul' || cat === 'numbers' ||
        cat === 'expressions' || cat === 'particles' || cat === 'time_expressions' ||
        cat === 'classifiers' || cat === 'connectors' || cat === 'adjectives' || cat === 'adverbs') return true;
    return false;
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.8;
  speechSynthesis.speak(u);
}

// ===== Tab bar =====
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    if (target === 'home') { showScreen('#screen-home'); renderHome(); }
    // browse and progress could be expanded later
  });
});

// ===== Init =====
loadData();
