// ═══════════════════════════════════════════════════
// BLOKAJA v2 — App de revision coreen A1
// ═══════════════════════════════════════════════════

// ── 1. UTILS ──────────────────────────────────────

// Raccourcis DOM
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const app = document.getElementById('app');

// Melange Fisher-Yates (retourne une copie)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Anti-rebond classique
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Supprime les accents pour la recherche
function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Date du jour au format YYYY-MM-DD
function getToday() {
  return new Date().toLocaleDateString('sv-SE');
}

// Echappe le HTML pour eviter les injections
function escHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// Synthese vocale coreenne (reutilisee partout)
function speakKr(text) {
  if (!text || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.rate = 0.8;
  if (koVoice) u.voice = koVoice;
  speechSynthesis.speak(u);
}

// Bouton audio HTML reutilisable
function audioBtnHTML(text) {
  if (!text) return '';
  return `<button class="audio-btn" data-speak="${escHtml(text)}" aria-label="Ecouter" title="Ecouter">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
  </button>`;
}

// Confetti celebration
function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#3D7A6E', '#C4935A', '#B54E3F', '#4E7EB5', '#7E5EAE', '#D4884A', '#5EA87A'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 1.5 + 's';
    piece.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 4000);
}

// Mascotte SVG (petit haetae/dokkaebi mignon)
const MASCOT_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="52" r="32" fill="var(--primary-light)" stroke="var(--primary)" stroke-width="2"/>
  <circle cx="40" cy="46" r="4" fill="var(--text)"/>
  <circle cx="60" cy="46" r="4" fill="var(--text)"/>
  <circle cx="41.5" cy="44.5" r="1.5" fill="white"/>
  <circle cx="61.5" cy="44.5" r="1.5" fill="white"/>
  <path d="M42 58 Q50 66 58 58" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M34 34 Q38 24 44 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M66 34 Q62 24 56 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="34" cy="54" r="4" fill="var(--accent)" opacity="0.3"/>
  <circle cx="66" cy="54" r="4" fill="var(--accent)" opacity="0.3"/>
</svg>`;

const MASCOT_HAPPY_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="52" r="32" fill="var(--primary-light)" stroke="var(--primary)" stroke-width="2"/>
  <path d="M36 46 Q40 42 44 46" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M56 46 Q60 42 64 46" stroke="var(--text)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M40 56 Q50 68 60 56" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M34 34 Q38 24 44 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M66 34 Q62 24 56 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="34" cy="54" r="5" fill="var(--accent)" opacity="0.4"/>
  <circle cx="66" cy="54" r="5" fill="var(--accent)" opacity="0.4"/>
  <text x="50" y="90" text-anchor="middle" font-size="14" fill="var(--primary)">★</text>
</svg>`;

const MASCOT_SAD_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="52" r="32" fill="var(--primary-light)" stroke="var(--primary)" stroke-width="2"/>
  <circle cx="40" cy="46" r="4" fill="var(--text)"/>
  <circle cx="60" cy="46" r="4" fill="var(--text)"/>
  <circle cx="41.5" cy="44.5" r="1.5" fill="white"/>
  <circle cx="61.5" cy="44.5" r="1.5" fill="white"/>
  <path d="M42 62 Q50 56 58 62" stroke="var(--text2)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M34 34 Q38 24 44 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M66 34 Q62 24 56 32" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="34" cy="54" r="4" fill="var(--accent)" opacity="0.3"/>
  <circle cx="66" cy="54" r="4" fill="var(--accent)" opacity="0.3"/>
</svg>`;

// Empty state illustre reutilisable
function emptyStateHTML(icon, title, desc, actionHTML) {
  return `<div class="empty">
    <div class="empty-illustration">${icon}</div>
    <div class="empty-title">${escHtml(title)}</div>
    <div class="empty-desc">${escHtml(desc)}</div>
    ${actionHTML || ''}
  </div>`;
}

// Notification temporaire en bas de l'ecran
function toast(msg, duration = 2000) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), duration);
}


// ── 1b. SETTINGS ────────────────────────────────

const Settings = {
  _cache: null,
  _defaults: { hideRom: false, darkMode: null },
  load() {
    if (!this._cache) { let p; try { p = JSON.parse(localStorage.getItem('blokaja_settings') || '{}'); } catch(e) { p = {}; } this._cache = { ...this._defaults, ...p }; }
    return this._cache;
  },
  save() { try { localStorage.setItem('blokaja_settings', JSON.stringify(this._cache)); } catch(e) {} },
  get(key) { return this.load()[key]; },
  set(key, val) { this.load()[key] = val; this.save(); },
  toggle(key) { const v = !this.get(key); this.set(key, v); return v; }
};

// Applique les settings au DOM
function applySettings() {
  document.body.classList.toggle('hide-rom', !!Settings.get('hideRom'));
  // Dark mode
  const dm = Settings.get('darkMode');
  if (dm === true) document.documentElement.setAttribute('data-theme', 'dark');
  else if (dm === false) document.documentElement.removeAttribute('data-theme');
  else {
    // null = auto (system)
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
}

// ── 2. CONFIG ─────────────────────────────────────

const CHAPTER_ICONS = [
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="8" x2="22" y2="8"/><line x1="16" y1="8" x2="16" y2="16"/><line x1="10" y1="16" x2="22" y2="16"/><circle cx="16" cy="24" r="4"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="16" cy="9" r="4"/><path d="M8 28c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="16" height="18" rx="3"/><path d="M12 10V7a4 4 0 018 0v3"/><line x1="8" y1="18" x2="24" y2="18"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="16" cy="16" r="12"/><path d="M16 8v8l5 5"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3C11 3 7 7 7 12c0 7 9 17 9 17s9-10 9-17c0-5-4-9-9-9z"/><circle cx="16" cy="12" r="3"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 16h20c0 6-4 10-10 10S6 22 6 16z"/><path d="M12 5c0 2 2 3 0 5"/><path d="M16 5c0 2 2 3 0 5"/><path d="M20 5c0 2 2 3 0 5"/></svg>',
  '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="16" cy="16" r="12"/><circle cx="12" cy="13" r="2" fill="currentColor" opacity="0.15"/><circle cx="19" cy="11" r="1.5" fill="currentColor" opacity="0.15"/><circle cx="16" cy="20" r="2.5" fill="currentColor" opacity="0.15"/></svg>'
];

const CFG = {
  SRS_INTERVALS: [1, 3, 7, 14, 30, 60],
  DAILY_GOAL: 10,
  SEARCH_DEBOUNCE: 150,
  SEARCH_MAX: 50,
  QUIZ_DELAY: 800,
  SWIPE_THRESHOLD: 80,
  QUIZ_MODES: [
    { id: 'flashcards', title: 'Flashcards', desc: 'Retourner et swiper', color: '--ch0', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/></svg>' },
    { id: 'qcm', title: 'QCM', desc: '4 choix', color: '--ch3', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>' },
    { id: 'ecriture', title: 'Ecriture', desc: 'Taper la traduction', color: '--ch4', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' },
    { id: 'association', title: 'Association', desc: 'Relier les paires', color: '--ch5', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h8M8 12h8M8 18h8"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/><circle cx="20" cy="6" r="1"/><circle cx="20" cy="12" r="1"/><circle cx="20" cy="18" r="1"/></svg>' },
    { id: 'dictee', title: 'Dictee', desc: 'Ecouter et ecrire', color: '--ch1', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>' },
    { id: 'marathon', title: 'Marathon', desc: 'Sans fin', color: '--ch2', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
    { id: 'conjugaison', title: 'Conjugaison', desc: 'Forme verbale', color: '--ch6', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>' },
    { id: 'particules', title: 'Particules', desc: 'Trouver la particule', color: '--ch4', icon: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7.5 7.5l3 3M13.5 13.5l3 3M7.5 16.5l3-3M13.5 10.5l3-3"/></svg>' }
  ]
};


// ── 3. SRS ────────────────────────────────────────

// Cle unique par item, prefixee par type pour eviter les collisions
function srsKey(item, type) {
  if (type === 'verb') return 'v:' + item.inf;
  if (type === 'expr') return 'e:' + (item.poli || item.inf || item.fr);
  if (type === 'adj') return 'a:' + item.kr;
  if (type === 'adv') return 'w:' + item.kr;
  if (type === 'nombre') return 'n:' + item.kr;
  if (type === 'connecteur') return 'c:' + item.kr;
  if (type === 'particule') return 'p:' + item.p;
  if (type === 'hangeul') return 'h:' + item.l;
  return vocabSrsKey(item);
}

// Homonymes : mots kr identiques avec des sens differents (ex: 쓰다 ecrire/amer)
// Detectes au demarrage, disambigues par kr|ch
const _srsCollisions = new Set();

function vocabSrsKey(item) {
  const kr = item.kr || item.inf || item.p || '';
  if (_srsCollisions.has(kr) && item.ch !== undefined) return kr + '|' + item.ch;
  return kr;
}

// Systeme de repetition espacee (SRS)
const SRS = {
  data: (() => { try { return JSON.parse(localStorage.getItem('blokaja_srs') || '{}'); } catch(e) { return {}; } })(),

  // Persiste en localStorage (debounce 2s pour eviter les ecritures repetees)
  _saveTimer: null,
  save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try { localStorage.setItem('blokaja_srs', JSON.stringify(this.data)); } catch(e) {}
      this._saveTimer = null;
    }, 2000);
  },
  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      try { localStorage.setItem('blokaja_srs', JSON.stringify(this.data)); } catch(e) {}
    }
  },

  // Retourne l'entree pour une cle (ou valeur par defaut)
  get(key) { return this.data[key] || { level: 0, next: null, count: 0 }; },

  // Met a jour le niveau SRS : quality 0=difficile, 1=a revoir, 2=connu
  update(key, quality) {
    if (!key) return;
    const e = this.get(key);
    e.level = quality + 1;
    // Reset count on failure so intervals don't grow for struggling items
    if (quality === 0) e.count = 0;
    else e.count = (e.count || 0) + 1;
    const idx = Math.min(e.level - 1 + Math.floor(e.count / 3), CFG.SRS_INTERVALS.length - 1);
    const days = CFG.SRS_INTERVALS[idx];
    e.next = Date.now() + days * 86400000;
    e.lastSeen = Date.now();
    this.data[key] = e;
    this.save();
    Progress.invalidateCache();
  },

  // Retourne le niveau (0-3)
  getLevel(key) { return key ? (this.data[key]?.level || 0) : 0; },

  // Classe CSS selon le niveau SRS
  getLevelClass(key) { return ['srs-new', 'srs-hard', 'srs-review', 'srs-known'][this.getLevel(key)]; },

  // Label texte selon le niveau SRS
  getLevelLabel(key) { return ['Nouveau', 'Difficile', 'A revoir', 'Connu'][this.getLevel(key)]; },

  // Items a revoir aujourd'hui (next <= maintenant) + difficiles
  getDueItems() {
    const now = Date.now();
    const due = [];
    for (const [key, entry] of Object.entries(this.data)) {
      if (entry.level > 0 && entry.next && entry.next <= now) {
        due.push({ key, ...entry });
      }
    }
    return due;
  },

  // Items difficiles (level 1) pour revision prioritaire
  getHardItems() {
    return Object.entries(this.data).filter(([_, e]) => e.level === 1).map(([key, e]) => ({ key, ...e }));
  },

  // Remet tout a zero
  reset() { this.data = {}; this.save(); }
};

// Helpers pour le filtrage SRS reutilisable
const SRS_FILTER_LABELS = [
  { val: null, label: 'Tous' },
  { val: 0, label: 'Nouveaux' },
  { val: 1, label: 'Difficiles' },
  { val: 2, label: 'A revoir' },
  { val: 3, label: 'Connus' }
];

function srsFilterPillsHTML(activeFilter) {
  return `<div class="pills mb-12" style="padding:0">
    ${SRS_FILTER_LABELS.map(s => `<button class="pill ${activeFilter === s.val ? 'active' : ''}" data-srsf="${s.val}">${s.label}</button>`).join('')}
  </div>`;
}

function bindSrsFilterPills(container, onChange) {
  container.querySelectorAll('[data-srsf]').forEach(b =>
    b.addEventListener('click', () => onChange(b.dataset.srsf === 'null' ? null : +b.dataset.srsf))
  );
}


// ── 4. PROGRESS ───────────────────────────────────

// Suivi de progression : streak, objectif, historique
const Progress = {
  // Charge les donnees depuis localStorage (ou cree un objet vierge)
  load() {
    let d; try { d = JSON.parse(localStorage.getItem('blokaja_progress') || 'null'); } catch(e) { d = null; }
    return d || { streak: 0, lastDay: null, todayCount: 0, todayDate: null, dailyGoal: CFG.DAILY_GOAL, history: [] };
  },

  // Sauvegarde en localStorage
  save(d) { try { localStorage.setItem('blokaja_progress', JSON.stringify(d)); } catch(e) {} },

  // Enregistre une activite (un item revise)
  recordActivity() {
    const d = this.load();
    const today = getToday();
    if (d.todayDate !== today) { d.todayDate = today; d.todayCount = 0; }
    d.todayCount++;
    if (d.lastDay !== today) {
      const diff = d.lastDay ? Math.floor((new Date(today) - new Date(d.lastDay)) / 86400000) : 999;
      if (diff === 1) {
        d.streak = d.streak + 1;
      } else if (diff === 2 && d.streak > 0) {
        // Gel de streak : tolere 1 jour manque (max 1 fois par semaine)
        const d2 = new Date(today); d2.setDate(d2.getDate() - ((d2.getDay() + 6) % 7));
        const weekKey = 'freeze_' + d2.toLocaleDateString('sv-SE');
        const freezes = d[weekKey] || 0;
        if (freezes < 1) {
          d[weekKey] = freezes + 1;
          // streak survit mais on ne l'incremente pas
        } else {
          d.streak = 1;
        }
      } else {
        d.streak = 1;
      }
      d.lastDay = today;
      if (!d.history.includes(today)) d.history.push(today);
      // Limiter l'historique a 365 jours
      if (d.history.length > 365) d.history = d.history.slice(-365);
    }
    this.save(d);
    setTimeout(checkBadgeUnlocks, 200);
  },

  // Objectif quotidien : done / total
  getGoal() {
    const d = this.load();
    return { done: d.todayCount || 0, total: d.dailyGoal };
  },

  // Tous les items revisables (cache invalide par SRS.update)
  _reviewCache: null,
  invalidateCache() { this._reviewCache = null; },
  allReviewable() {
    if (this._reviewCache) return this._reviewCache;
    const items = [];
    const seen = new Set();
    const add = (key, ch, type) => {
      if (key && !seen.has(key)) { seen.add(key); items.push({ key, ch, type }); }
    };
    DATA.vocabulary.forEach(i => add(vocabSrsKey(i), i.ch, 'vocab'));
    DATA.phrases.forEach(i => add(vocabSrsKey(i), i.ch, 'phrase'));
    DATA.verbs.forEach(i => add('v:' + i.inf, i.ch, 'verb'));
    DATA.expressions.forEach(i => add('e:' + (i.poli || i.inf || i.fr), i.ch, 'expr'));
    DATA.adjectives.forEach(i => add('a:' + i.kr, i.ch, 'adj'));
    DATA.adverbs.forEach(i => add('w:' + i.kr, 0, 'adv'));
    DATA.numbers.forEach(i => add('n:' + i.kr, 0, 'nombre'));
    DATA.connectors.forEach(i => add('c:' + i.kr, i.ch, 'connecteur'));
    DATA.particles.forEach(i => add('p:' + i.p, i.ch, 'particule'));
    DATA.hangeul.forEach(i => add('h:' + i.l, 0, 'hangeul'));
    this._reviewCache = items;
    return items;
  },

  // Pourcentage de maitrise d'un chapitre (niveau >= 2)
  chapterPct(chId) {
    const items = this.allReviewable().filter(x => x.ch === chId);
    if (!items.length) return 0;
    return Math.round(items.filter(x => SRS.getLevel(x.key) >= 2).length / items.length * 100);
  },

  // Nombre total d'items dans un chapitre
  chapterCount(chId) {
    return this.allReviewable().filter(x => x.ch === chId).length;
  },

  // Statistiques globales par niveau
  getStats() {
    const all = this.allReviewable();
    const s = { nouveau: 0, difficile: 0, revoir: 0, connu: 0, total: all.length };
    all.forEach(i => {
      const l = SRS.getLevel(i.key);
      if (l === 0) s.nouveau++;
      else if (l === 1) s.difficile++;
      else if (l === 2) s.revoir++;
      else if (l === 3) s.connu++;
    });
    return s;
  }
};


// ── 5. SEARCH ─────────────────────────────────────

// Index inverse construit une seule fois
let _searchIdx = null;

// Construit l'index de recherche sur tous les types de donnees
function buildSearchIndex() {
  if (_searchIdx) return _searchIdx;
  _searchIdx = [];
  const n = s => stripAccents((s || '').toLowerCase());

  DATA.vocabulary.forEach(i => _searchIdx.push({
    type: 'vocab', item: i, terms: n(i.kr) + ' ' + n(i.fr) + ' ' + n(i.rom),
    kr: i.kr, fr: i.fr, ch: i.ch
  }));
  DATA.phrases.forEach(i => _searchIdx.push({
    type: 'phrase', item: i, terms: n(i.kr) + ' ' + n(i.fr) + ' ' + n(i.rom),
    kr: i.kr, fr: i.fr, ch: i.ch
  }));
  DATA.grammar.forEach(i => _searchIdx.push({
    type: 'grammaire', item: i, terms: n(i.title) + ' ' + n(i.expl),
    kr: i.title, fr: i.expl || '', ch: i.ch
  }));
  DATA.expressions.forEach(i => _searchIdx.push({
    type: 'expression', item: i, terms: n(i.fr) + ' ' + n(i.poli || '') + ' ' + n(i.inf || ''),
    kr: i.poli || i.inf || '', fr: i.fr, ch: i.ch
  }));
  DATA.verbs.forEach(i => _searchIdx.push({
    type: 'verbe', item: i, terms: n(i.inf) + ' ' + n(i.fr) + ' ' + n(i.poli || '') + ' ' + n(i.fam || ''),
    kr: i.inf, fr: i.fr, ch: i.ch
  }));
  DATA.particles.forEach(i => _searchIdx.push({
    type: 'particule', item: i, terms: n(i.p) + ' ' + n(i.name || '') + ' ' + n(i.fn || ''),
    kr: i.p, fr: i.name || i.fn || '', ch: i.ch
  }));
  DATA.numbers.forEach(i => _searchIdx.push({
    type: 'nombre', item: i, terms: n(i.kr) + ' ' + n(i.val || '') + ' ' + n(i.rom || ''),
    kr: i.kr, fr: i.val + ' (' + (i.sys === 'sino-coréen' ? 'sino-coréen' : 'coréen natif') + ')', ch: 0
  }));
  DATA.connectors.forEach(i => _searchIdx.push({
    type: 'connecteur', item: i, terms: n(i.kr) + ' ' + n(i.fr) + ' ' + n(i.usage || ''),
    kr: i.kr, fr: i.fr, ch: i.ch
  }));
  DATA.adjectives.forEach(i => _searchIdx.push({
    type: 'adjectif', item: i, terms: n(i.kr) + ' ' + n(i.fr) + ' ' + n(i.rom || ''),
    kr: i.kr, fr: i.fr, ch: i.ch
  }));
  DATA.adverbs.forEach(i => _searchIdx.push({
    type: 'adverbe', item: i, terms: n(i.kr) + ' ' + n(i.fr) + ' ' + n(i.rom || ''),
    kr: i.kr, fr: i.fr, ch: i.ch || 0
  }));

  return _searchIdx;
}


// ── 6. ROUTER ─────────────────────────────────────

// Navigation par hash
function navigate(hash) { window.location.hash = hash; }

// Dispatch selon le hash — avec transition de page
function route() {
  const hash = location.hash.slice(1) || 'cours';
  const p = hash.split('/');

  // Mise a jour de l'onglet actif
  $$('.tab').forEach(t => {
    const isActive = t.dataset.tab === p[0];
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive);
  });

  // Transition de page : fade out -> render -> fade in
  const doRender = () => {
    app.scrollTo(0, 0);
    if (p[0] === 'cours' && p[1] !== undefined) renderChapter(+p[1], p[2] || (p[1] === '0' ? 'voyelles' : 'vocab'));
    else if (p[0] === 'cours') renderCoursList();
    else if (p[0] === 'recherche') renderSearch();
    else if (p[0] === 'quiz' && p[1] === 'review') startReviewSession();
    else if (p[0] === 'quiz' && p[1] === 'exam') startExamBlanc();
    else if (p[0] === 'quiz' && p[1] === 'config') renderQuizConfig(p[2]);
    else if (p[0] === 'quiz') renderQuizMenu();
    else if (p[0] === 'progression') renderProgression();
    else renderCoursList();
    app.classList.remove('page-exit');
  };

  if (app.innerHTML && !window._firstRoute) {
    app.classList.add('page-exit');
    setTimeout(doRender, 180);
  } else {
    window._firstRoute = false;
    doRender();
  }
}
window._firstRoute = true;

window.addEventListener('hashchange', route);


// ── 7. COMPONENTS ─────────────────────────────────

// --- Bottom Sheet ---

// Ouvre le bottom sheet avec du contenu HTML
function openBottomSheet(html) {
  $('#bottomSheetContent').innerHTML = html;
  $('#bottomSheet').classList.add('visible');
  $('#bottomSheetOverlay').classList.add('visible');
  document.body.classList.add('sheet-open');
}

// Ferme le bottom sheet
function closeBottomSheet() {
  _sheetCtx = null;
  $('#bottomSheet').classList.remove('visible');
  $('#bottomSheetOverlay').classList.remove('visible');
  document.body.classList.remove('sheet-open');
}

// Drag-to-dismiss sur le bottom sheet
(function initBottomSheetDrag() {
  const sheet = $('#bottomSheet');
  let y0 = 0, yc = 0, drag = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('.bottom-sheet-handle')) {
      y0 = e.touches[0].clientY; drag = true;
      sheet.style.transition = 'none';
    }
  });
  sheet.addEventListener('touchmove', e => {
    if (!drag) return;
    yc = e.touches[0].clientY;
    const dy = yc - y0;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  });
  sheet.addEventListener('touchend', () => {
    if (!drag) return;
    drag = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (yc - y0 > 100) closeBottomSheet();
  });
})();

// Contexte de navigation pour le bottom sheet (liste + index courant)
let _sheetCtx = null;

// --- Detail Sheet ---

// Ouvre un detail dans le bottom sheet selon le type
function openDetailSheet(item, type, listCtx) {
  _sheetCtx = listCtx || null;
  let html = '<div class="detail-header">';

  if (type === 'vocab') {
    html += `<div class="detail-kr">${escHtml(item.kr)} ${audioBtnHTML(item.kr)}</div>`;
    html += `<div class="detail-rom rom-text">${escHtml(item.rom || '')}</div>`;
    html += `<div class="detail-fr">${escHtml(item.fr)}</div>`;
    html += `<div class="detail-meta">
      <span class="badge badge-vocab">${escHtml(item.theme || '')}</span>
      <span class="badge ${SRS.getLevelClass(vocabSrsKey(item))}">${SRS.getLevelLabel(vocabSrsKey(item))}</span>
    </div>`;
    // Phrases d'exemple contenant ce mot
    const examples = DATA.phrases.filter(p => p.kr && p.kr.includes(item.kr) && p.kr !== item.kr).slice(0, 3);
    if (examples.length) {
      html += '<div class="detail-section">';
      html += '<div class="search-group-title" style="margin-bottom:6px">Exemples</div>';
      examples.forEach(ex => {
        html += `<div class="example-block">
          <div style="font-size:14px;font-weight:600">${escHtml(ex.kr)}</div>
          <div class="text-secondary" style="font-size:12px">${escHtml(ex.fr)}</div>
        </div>`;
      });
      html += '</div>';
    }
    html += srsButtonsHTML(vocabSrsKey(item));

  } else if (type === 'verb') {
    html += `<div class="detail-kr">${escHtml(item.inf)} ${audioBtnHTML(item.inf)}</div>`;
    html += `<div class="detail-rom rom-text">${escHtml(item.rom || '')}</div>`;
    html += `<div class="detail-fr">${escHtml(item.fr)}</div>`;
    html += '<div class="detail-section">';
    if (item.poli) html += `<div class="flex items-center gap-8 mb-8"><span class="badge badge-vocab">Poli</span><span class="inline-kr">${escHtml(item.poli)}</span></div>`;
    if (item.fam) html += `<div class="flex items-center gap-8 mb-8"><span class="badge badge-grammar">Informel</span><span class="inline-kr">${escHtml(item.fam)}</span></div>`;
    if (item.passe) html += `<div class="flex items-center gap-8 mb-8"><span class="badge badge-phrase">Passe</span><span class="inline-kr">${escHtml(item.passe)}</span></div>`;
    if (item.irreg) html += '<div style="color:var(--danger);font-size:13px;font-weight:600">Verbe irregulier</div>';
    html += '</div>';
    html += srsButtonsHTML('v:' + item.inf);

  } else if (type === 'grammar') {
    html += `<div style="font-size:18px;font-weight:700;margin-bottom:8px">${escHtml(item.title)}</div>`;
    html += `<div style="font-size:14px;color:var(--text2);line-height:1.7;text-align:left">${escHtml(item.expl || '')}</div>`;

  } else if (type === 'phrase') {
    html += `<div class="detail-kr">${escHtml(item.kr)} ${audioBtnHTML(item.kr)}</div>`;
    if (item.rom) html += `<div class="detail-rom rom-text">${escHtml(item.rom)}</div>`;
    html += `<div class="detail-fr">${escHtml(item.fr)}</div>`;
    html += srsButtonsHTML(vocabSrsKey(item));

  } else if (type === 'expr') {
    html += `<div class="detail-fr" style="font-size:16px;font-weight:600">${escHtml(item.fr)}</div>`;
    html += '<div class="detail-section">';
    if (item.poli) html += `<div class="flex items-center gap-8 mb-8"><span class="badge badge-vocab">Poli</span><span class="inline-kr">${escHtml(item.poli)}</span></div>`;
    if (item.rp) html += `<div class="text-xs-italic" style="margin-top:-4px;margin-bottom:8px;margin-left:60px">${escHtml(item.rp)}</div>`;
    if (item.inf) html += `<div class="flex items-center gap-8 mb-8"><span class="badge badge-grammar">Informel</span><span class="inline-kr">${escHtml(item.inf)}</span></div>`;
    if (item.ri) html += `<div class="text-xs-italic" style="margin-top:-4px;margin-bottom:8px;margin-left:60px">${escHtml(item.ri)}</div>`;
    html += '</div>';
    html += srsButtonsHTML('e:' + (item.poli || item.inf || item.fr));

  } else if (type === 'particle') {
    html += `<div style="font-size:36px;font-weight:700;color:var(--primary)">${escHtml(item.p)}</div>`;
    html += `<div style="font-size:16px;margin:4px 0">${escHtml(item.name || '')}</div>`;
    html += `<div style="font-size:14px;color:var(--text2);line-height:1.7;text-align:left">${escHtml(item.fn || '')}</div>`;
    if (item.rule) html += `<div class="chip mt-8">${escHtml(item.rule)}</div>`;

  } else if (type === 'culture') {
    let body = escHtml(item.body || '');
    if (item.kw) item.kw.forEach(kw => {
      const t = Array.isArray(kw) ? kw[0] : kw;
      if (t) body = body.replace(new RegExp(escHtml(t), 'g'), `<strong style="color:var(--primary)">${escHtml(t)}</strong>`);
    });
    html = '<div style="padding:8px 0">';
    html += `<div style="font-size:18px;font-weight:700;margin-bottom:12px">${escHtml(item.title)}</div>`;
    html += `<div style="font-size:14px;color:var(--text2);line-height:1.7">${body}</div>`;
    if (item.kw && item.kw.length) {
      html += `<div class="chip-list mt-12">${item.kw.map(kw =>
        `<span class="chip" style="background:var(--primary-light);color:var(--primary)">${escHtml(Array.isArray(kw) ? `${kw[0]} — ${kw[1]}` : kw)}</span>`
      ).join('')}</div>`;
    }
    html += '</div>';
    openBottomSheet(html);
    return;

  } else if (type === 'nombre') {
    html += `<div class="detail-kr">${escHtml(item.kr)} ${audioBtnHTML(item.kr)}</div>`;
    html += `<div class="detail-rom rom-text">${escHtml(item.rom || '')}</div>`;
    html += `<div class="detail-fr">${escHtml(item.val)} (${item.sys === 'sino-coréen' ? 'sino-coreen' : 'coreen natif'})</div>`;
    html += srsButtonsHTML('n:' + item.kr);

  } else if (type === 'connecteur') {
    html += `<div class="detail-kr">${escHtml(item.kr)} ${audioBtnHTML(item.kr)}</div>`;
    html += `<div class="detail-rom rom-text">${escHtml(item.rom || '')}</div>`;
    html += `<div class="detail-fr">${escHtml(item.fr)}</div>`;
    if (item.usage) html += `<div style="font-size:13px;color:var(--text3);margin-top:8px">${escHtml(item.usage)}</div>`;
    html += srsButtonsHTML('c:' + item.kr);

  } else if (type === 'hangeul') {
    html += `<div style="font-size:72px;font-weight:700">${escHtml(item.l)} ${audioBtnHTML(item.l)}</div>`;
    html += `<div style="font-size:18px;color:var(--primary);margin:8px 0" class="rom-text">${escHtml(item.rom)}</div>`;
    html += `<div style="font-size:14px;color:var(--text2);line-height:1.6">${escHtml(item.desc)}</div>`;

  } else {
    html += `<div class="detail-kr">${escHtml(item.kr || item.p || '')}</div>`;
    html += `<div class="detail-fr">${escHtml(item.fr || '')}</div>`;
  }

  // Navigation prev/next si contexte de liste
  if (_sheetCtx && _sheetCtx.items.length > 1) {
    html += `<div class="sheet-nav">
      <button class="sheet-nav-btn" id="sheetPrev" ${_sheetCtx.index <= 0 ? 'disabled' : ''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg> Prec.
      </button>
      <span class="sheet-nav-count">${_sheetCtx.index + 1} / ${_sheetCtx.items.length}</span>
      <button class="sheet-nav-btn" id="sheetNext" ${_sheetCtx.index >= _sheetCtx.items.length - 1 ? 'disabled' : ''}>
        Suiv. <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>
      </button>
    </div>`;
  }

  html += '</div>';
  openBottomSheet(html);
  bindSRSButtons();

  // Navigation prev/next
  if (_sheetCtx) {
    const prevBtn = document.getElementById('sheetPrev');
    const nextBtn = document.getElementById('sheetNext');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (_sheetCtx && _sheetCtx.index > 0) {
        _sheetCtx.index--;
        openDetailSheet(_sheetCtx.items[_sheetCtx.index], _sheetCtx.type, _sheetCtx);
      }
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (_sheetCtx && _sheetCtx.index < _sheetCtx.items.length - 1) {
        _sheetCtx.index++;
        openDetailSheet(_sheetCtx.items[_sheetCtx.index], _sheetCtx.type, _sheetCtx);
      }
    });
  }
}

// Lie les boutons SRS dans le bottom sheet (event delegation unique)
function bindSRSButtons() {
  const content = $('#bottomSheetContent');
  // On enleve le listener precedent en re-clonant (approche simple)
  // Mais pour garder ca propre, on utilise un flag
  content.addEventListener('click', function _srs(e) {
    const btn = e.target.closest('[data-srs]');
    if (btn) {
      SRS.update(btn.dataset.key, +btn.dataset.srs);
      Progress.recordActivity();
      closeBottomSheet();
      toast('Progression enregistree');
      content.removeEventListener('click', _srs);
    }
  });
}

// Genere le HTML des boutons SRS
function srsButtonsHTML(key) {
  return `<div class="srs-buttons">
    <button class="srs-btn srs-btn-hard" data-srs="0" data-key="${escHtml(key)}">Difficile</button>
    <button class="srs-btn srs-btn-review" data-srs="1" data-key="${escHtml(key)}">A revoir</button>
    <button class="srs-btn srs-btn-known" data-srs="2" data-key="${escHtml(key)}">Connu</button>
  </div>`;
}

// --- Accordions ---

// Genere une liste d'accordeons
function accordionHTML(items, headerFn, bodyFn) {
  return items.map((item, i) => `
    <div class="card card-flush mb-8">
      <div class="accordion-header" data-ai="${i}">
        ${headerFn(item, i)}
        <svg class="accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body" data-ab="${i}">
        <div style="padding:0 16px 16px">
          ${bodyFn(item, i)}
        </div>
      </div>
    </div>
  `).join('');
}

// Delegue les clics sur .accordion-header dans un container
function bindAccordions(container) {
  container.addEventListener('click', e => {
    const h = e.target.closest('.accordion-header');
    if (!h) return;
    const i = h.dataset.ai || h.dataset.pi;
    h.classList.toggle('open');
    const body = container.querySelector(`.accordion-body[data-ab="${i}"], .accordion-body[data-pbody="${i}"]`);
    if (body) body.classList.toggle('open');
  });
}

// --- Pills ---

// Genere un groupe de pills selectables
function pillsHTML(options, activeVal, dataAttr = 'data-val') {
  return `<div class="pills" style="padding:0">${options.map(o =>
    `<button class="pill ${String(o.val) === String(activeVal) ? 'active' : ''}" ${dataAttr}="${escHtml(o.val)}">${escHtml(o.label)}</button>`
  ).join('')}</div>`;
}

// --- Badges ---

// Genere un badge type + optionnel badge chapitre
function badgeHTML(type, ch) {
  const badgeMap = { vocab: 'badge-vocab', phrase: 'badge-phrase', grammaire: 'badge-grammar', grammar: 'badge-grammar', expression: 'badge-expr', expr: 'badge-expr', verbe: 'badge-verb', verb: 'badge-verb', culture: 'badge-culture', particule: 'badge-culture' };
  return `<span class="badge ${badgeMap[type] || ''}">${escHtml(type.charAt(0).toUpperCase() + type.slice(1))}</span>` +
    (ch !== undefined ? `<span class="badge badge-ch${ch}">Ch.${ch}</span>` : '');
}

// --- Header ---

// Met a jour le titre et la fleche retour du header
function setHeader(title, showBack) {
  $('#headerTitle').textContent = title;
  const back = $('#headerBack');
  if (showBack) back.classList.add('visible');
  else back.classList.remove('visible');
}


// ── 8. PAGES ──────────────────────────────────────

// --- Liste des chapitres ---

function renderCoursList() {
  setHeader('Blokaja', false);
  const d = Progress.load();
  const goal = Progress.getGoal();
  const dueCount = SRS.getDueItems().length;

  app.innerHTML = `
    <div class="section">
      <div class="streak-card">
        <div class="mascot">${(d.streak || 0) >= 3 ? MASCOT_HAPPY_SVG : MASCOT_SVG}</div>
        <div style="flex:1">
          <div class="streak-label" style="font-weight:600">${d.streak || 0} jour${(d.streak || 0) > 1 ? 's' : ''} de suite</div>
          <div class="streak-label">${goal.done}/${goal.total} items aujourd'hui</div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${Math.min(100, goal.done / goal.total * 100)}%"></div></div>
        </div>
      </div>
    </div>

    ${(() => {
      let cta = '';
      if (dueCount > 0) {
        cta += `<div class="section">
          <button class="btn btn-primary btn-block" data-nav="quiz/review" style="padding:16px;font-size:16px">
            Reviser maintenant · ${dueCount} item${dueCount > 1 ? 's' : ''} a revoir
          </button>
        </div>`;
      }
      if (dueCount > 10) {
        cta += `<div class="section" style="padding-top:0">
          <div style="background:var(--accent-light);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--text2);border-left:3px solid var(--accent)">
            Revise d'abord tes ${dueCount} items en attente avant de decouvrir de nouveaux mots.
          </div>
        </div>`;
      } else {
        cta += `<div class="section">
          <button class="btn btn-block" id="discoverBtn" style="padding:16px;font-size:16px;background:var(--primary-light);color:var(--primary);font-weight:600">
            Decouvrir 5 nouveaux mots
          </button>
        </div>`;
      }
      return cta;
    })()}

    <div class="section">
      <div class="section-title">Chapitres</div>
      ${DATA.chapters.map(ch => {
        const pct = Progress.chapterPct(ch.id);
        const count = Progress.chapterCount(ch.id);
        return `
          <div class="chapter-card" role="button" tabindex="0" data-nav="cours/${ch.id}" style="border-left-color:var(--ch${ch.id})">
            <div class="chapter-icon" style="color:var(--ch${ch.id})">${CHAPTER_ICONS[ch.id] || ch.id}</div>
            <div class="chapter-info">
              <div class="chapter-title-kr">${escHtml(ch.title_kr)}</div>
              <div class="chapter-title-fr">${escHtml(ch.title_fr)}</div>
              <div class="chapter-progress"><div class="chapter-progress-fill" style="width:${pct}%;background:var(--ch${ch.id})"></div></div>
              <div class="chapter-meta">${pct}% · ${count} items</div>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;

  // Bouton decouvrir de nouveaux mots (lecon guidee)
  const discBtn = $('#discoverBtn');
  if (discBtn) {
    discBtn.addEventListener('click', () => {
      // Trouver le premier chapitre avec des mots non vus
      const chWithNew = DATA.chapters.find(ch =>
        DATA.vocabulary.some(v => v.ch === ch.id && v.fr && SRS.getLevel(vocabSrsKey(v)) === 0)
      );
      if (!chWithNew) { toast('Tous les mots ont ete vus !'); return; }
      startLesson(chWithNew.id);
    });
  }

  // Event delegation pour navigation
  app.addEventListener('click', function _cl(e) {
    const c = e.target.closest('[data-nav]');
    if (c) { navigate('#' + c.dataset.nav); app.removeEventListener('click', _cl); }
  });
}

// --- Page chapitre ---

function renderChapter(chId, sub) {
  const ch = DATA.chapters.find(c => c.id === chId);
  if (!ch) return renderCoursList();

  trackChapterVisit(chId);
  setHeader(ch.title_fr, true);

  const isH = chId === 0;
  const tabs = isH
    ? [
        { id: 'voyelles', l: 'Voyelles' }, { id: 'consonnes', l: 'Consonnes' },
        { id: 'doubles', l: 'Doubles' }, { id: 'composees', l: 'Composees' },
        { id: 'batchim', l: 'Batchim' }, { id: 'nombres', l: 'Nombres' },
        { id: 'vocab', l: 'Vocab' }, { id: 'grammaire', l: 'Grammaire' }, { id: 'culture', l: 'Culture' }
      ]
    : [
        { id: 'vocab', l: 'Vocab' }, { id: 'grammaire', l: 'Grammaire' },
        { id: 'verbes', l: 'Verbes' }, { id: 'particules', l: 'Particules' },
        { id: 'nombres', l: 'Nombres' }, { id: 'connecteurs', l: 'Connecteurs' },
        { id: 'phrases', l: 'Phrases' }, { id: 'expressions', l: 'Expressions' },
        { id: 'culture', l: 'Culture' }
      ];

  if (!tabs.find(t => t.id === sub)) sub = tabs[0].id;

  app.innerHTML = `
    <div class="section">
      <div class="text-secondary" style="margin-bottom:4px">Chapitre ${chId}</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:12px" lang="ko">${escHtml(ch.title_kr)}</div>
      ${(() => {
        const newCount = DATA.vocabulary.filter(v => v.ch === chId && v.fr && SRS.getLevel(vocabSrsKey(v)) === 0).length;
        const globalDue = SRS.getDueItems().length;
        return newCount > 0 && globalDue <= 10 ? `
          <div class="lesson-banner" id="lessonBtn">
            <div class="lesson-banner-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>
            </div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:var(--primary)">Lecon guidee</div>
              <div class="text-secondary" style="font-size:12px">${newCount} mot${newCount > 1 ? 's' : ''} a decouvrir</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>` : '';
      })()}
    </div>
    <div class="pills" id="chTabs">
      ${tabs.map(t => `<button class="pill ${t.id === sub ? 'active' : ''}" data-sub="${t.id}">${t.l}</button>`).join('')}
    </div>
    <div id="chContent" style="margin-top:12px"></div>
  `;

  renderSubContent(chId, sub);

  // Bouton lecon guidee
  const lessonBtn = $('#lessonBtn');
  if (lessonBtn) lessonBtn.addEventListener('click', () => startLesson(chId));

  $('#chTabs').addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (b) navigate(`#cours/${chId}/${b.dataset.sub}`);
  });
}

// Dispatch vers le bon renderer de sous-page
function renderSubContent(chId, sub) {
  const c = $('#chContent');
  if (!c) return;
  const renderers = {
    voyelles: () => renderHangeulGrid('vowel', c),
    consonnes: () => renderHangeulGrid('consonant', c),
    doubles: () => renderHangeulGrid('consonne_double', c),
    composees: () => renderHangeulGrid('voyelle_composee', c),
    batchim: () => renderBatchim(c),
    vocab: () => renderVocab(chId, c),
    grammaire: () => renderGrammar(chId, c),
    verbes: () => renderVerbs(chId, c),
    particules: () => renderParticles(chId, c),
    nombres: () => renderNombres(chId, c),
    connecteurs: () => renderConnecteurs(chId, c),
    phrases: () => renderPhrases(chId, c),
    expressions: () => renderExpressions(chId, c),
    culture: () => renderCulture(chId, c)
  };
  (renderers[sub] || (() => { c.innerHTML = '<div class="empty"><div class="empty-title">Contenu introuvable</div></div>'; }))();
}

// --- Recherche ---

function renderSearch() {
  setHeader('Recherche', false);
  buildSearchIndex();

  app.innerHTML = `
    <div class="search-bar">
      <div class="search-input-wrap">
        <input type="text" class="search-input" id="searchInput" placeholder="Coreen ou francais..." autocomplete="off">
      </div>
    </div>
    <div id="searchResults" style="padding:0 4px"></div>
  `;

  const input = $('#searchInput');
  const results = $('#searchResults');
  const typeLabels = { vocab: 'Vocabulaire', phrase: 'Phrase', grammaire: 'Grammaire', expression: 'Expression', verbe: 'Verbe', particule: 'Particule' };
  const typeBadge = { vocab: 'badge-vocab', phrase: 'badge-phrase', grammaire: 'badge-grammar', expression: 'badge-expr', verbe: 'badge-verb', particule: 'badge-culture' };

  // Suggestions aleatoires quand le champ est vide
  function showSuggestions() {
    const picks = shuffle([...DATA.vocabulary]).slice(0, 6);
    results.innerHTML = `
      <div class="section mt-16">
        <div class="search-group-title">Suggestions</div>
        ${picks.map(v => `
          <div class="card card-interactive mb-8" data-sgst="${escHtml(v.kr)}">
            <div class="flex items-center gap-8 mb-4">
              <span style="font-size:16px;font-weight:600;flex:1">${escHtml(v.kr)}</span>
              <span class="badge badge-vocab">${escHtml(v.theme || '')}</span>
            </div>
            <div class="text-secondary">${escHtml(v.fr)}</div>
          </div>
        `).join('')}
      </div>`;
    results.addEventListener('click', function _sg(e) {
      const card = e.target.closest('[data-sgst]');
      if (!card) return;
      results.removeEventListener('click', _sg);
      const v = DATA.vocabulary.find(x => x.kr === card.dataset.sgst);
      if (v) openDetailSheet(v, 'vocab');
    });
  }
  showSuggestions();

  // Recherche avec anti-rebond
  let _searchClickHandler = null;
  const doSearch = debounce(() => {
    const q = stripAccents(input.value.toLowerCase().trim());
    if (q.length < 1) {
      showSuggestions();
      return;
    }

    const res = _searchIdx.filter(r => r.terms.includes(q)).slice(0, CFG.SEARCH_MAX);
    if (!res.length) {
      results.innerHTML = emptyStateHTML(MASCOT_SAD_SVG, 'Aucun resultat', 'Essaie un autre mot en coreen ou en francais');
      return;
    }

    // Grouper par type
    const grp = {};
    res.forEach(r => (grp[r.type] = grp[r.type] || []).push(r));

    results.innerHTML = Object.entries(grp).map(([type, items]) => `
      <div class="section mt-16">
        <div class="search-group-title">${typeLabels[type] || type} (${items.length})</div>
        ${items.map((r, i) => `
          <div class="card card-interactive mb-8" data-st="${r.type}" data-si="${i}">
            <div class="flex items-center gap-8 mb-4">
              <span style="font-size:16px;font-weight:600;flex:1">${escHtml(r.kr)}</span>
              <span class="badge ${typeBadge[type] || ''}">${typeLabels[type]}</span>
              ${r.ch !== undefined ? `<span class="badge badge-ch${r.ch}">Ch.${r.ch}</span>` : ''}
            </div>
            <div class="text-secondary">${escHtml((r.fr || '').slice(0, 100))}</div>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Delegation pour ouvrir le detail (un seul handler)
    if (_searchClickHandler) results.removeEventListener('click', _searchClickHandler);
    _searchClickHandler = function(e) {
      const card = e.target.closest('.card[data-st]');
      if (!card) return;
      const r = res.find(x => x.type === card.dataset.st && x.kr === card.querySelector('span')?.textContent);
      if (!r) return;
      openSearchResult(r);
    };
    results.addEventListener('click', _searchClickHandler);
  }, CFG.SEARCH_DEBOUNCE);

  input.addEventListener('input', doSearch);
  setTimeout(() => input.focus(), 100);
}

// Ouvre le detail d'un resultat de recherche
function openSearchResult(r) {
  const typeMap = { vocab: 'vocab', verbe: 'verb', grammaire: 'grammar', phrase: 'phrase', expression: 'expr', particule: 'particle' };
  openDetailSheet(r.item, typeMap[r.type] || r.type);
}

// --- Menu Quiz ---

function renderQuizMenu() {
  setHeader('Quiz', false);

  const dueCount = SRS.getDueItems().length;

  app.innerHTML = `
    ${dueCount > 0 ? `<div class="section">
      <div class="card card-interactive" role="button" tabindex="0" data-qm="review" style="border-left:4px solid var(--accent);background:var(--accent-light)">
        <div class="text-title-sm">Revision du jour</div>
        <div class="text-secondary">${dueCount} item${dueCount > 1 ? 's' : ''} a revoir</div>
      </div>
    </div>` : ''}
    <div class="section">
      <div class="card card-interactive" role="button" tabindex="0" data-qm="exam" style="border-left:4px solid var(--danger)">
        <div class="text-title-sm">Examen blanc</div>
        <div class="text-secondary">30 questions mixtes — vocab, conjugaison, particules</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Modes d'entraînement</div>
      <div class="grid-2-lg">
        ${CFG.QUIZ_MODES.map(m => `
          <div class="card card-interactive" role="button" tabindex="0" data-qm="${m.id}" style="border-left:4px solid var(${m.color})">
            <div style="font-size:28px;margin-bottom:8px">${m.icon}</div>
            <div class="text-title-sm">${m.title}</div>
            <div class="text-secondary">${m.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  app.addEventListener('click', function _qm(e) {
    const c = e.target.closest('[data-qm]');
    if (!c) return;
    app.removeEventListener('click', _qm);
    const mode = c.dataset.qm;
    if (mode === 'review') navigate('#quiz/review');
    else if (mode === 'exam') navigate('#quiz/exam');
    else navigate('#quiz/config/' + mode);
  });
}

// --- Configuration Quiz ---

function renderQuizConfig(mode) {
  const modeObj = CFG.QUIZ_MODES.find(m => m.id === mode);
  const title = modeObj ? modeObj.title : 'Quiz';
  setHeader(title, true);

  let selCh = -1, selCount = 20, selDir = 'kr2fr';

  function render() {
    const showDir = ['flashcards', 'qcm', 'ecriture', 'dictee'].includes(mode);

    app.innerHTML = `
      <div class="section">
        <div style="font-size:18px;font-weight:700;margin-bottom:16px">${escHtml(title)}</div>

        <div class="section-title">Chapitre</div>
        <div class="pills mb-16" style="padding:0" id="cfgCh">
          <button class="pill ${selCh === -1 ? 'active' : ''}" data-ch="-1">Tous</button>
          ${DATA.chapters.map(c => `<button class="pill ${selCh === c.id ? 'active' : ''}" data-ch="${c.id}">Ch.${c.id}</button>`).join('')}
        </div>

        <div class="section-title">Nombre de cartes</div>
        <div class="pills mb-16" style="padding:0" id="cfgN">
          ${[10, 20, 30, 50].map(n => `<button class="pill ${selCount === n ? 'active' : ''}" data-n="${n}">${n}</button>`).join('')}
        </div>

        ${showDir ? `
          <div class="section-title">Direction</div>
          <div class="pills mb-16" style="padding:0" id="cfgDir">
            <button class="pill ${selDir === 'kr2fr' ? 'active' : ''}" data-dir="kr2fr">KR -> FR</button>
            <button class="pill ${selDir === 'fr2kr' ? 'active' : ''}" data-dir="fr2kr">FR -> KR</button>
          </div>
        ` : ''}

        <button class="btn btn-primary btn-block mt-16" id="startBtn">Commencer</button>
        <button class="btn btn-secondary btn-block mt-8" onclick="history.back()">Retour</button>
      </div>
    `;

    // Liaison des pills
    $('#cfgCh').addEventListener('click', e => {
      const b = e.target.closest('.pill');
      if (b) { selCh = +b.dataset.ch; render(); }
    });
    $('#cfgN').addEventListener('click', e => {
      const b = e.target.closest('.pill');
      if (b) { selCount = +b.dataset.n; render(); }
    });
    const dir = $('#cfgDir');
    if (dir) dir.addEventListener('click', e => {
      const b = e.target.closest('.pill');
      if (b) { selDir = b.dataset.dir; render(); }
    });
    $('#startBtn').addEventListener('click', () => startQuiz(mode, selCh, selCount, selDir));
  }
  render();
}

// ── BADGES ────────────────────────────────────────
const BADGE_SVG = {
  sprout: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path stroke="#3D7A5E" d="M12 22V12"/><path stroke="#3D7A6E" d="M7 12c0-4 5-8 5-8s5 4 5 8"/><path stroke="#5EA87A" d="M5 17c3-3 7-3 7-3s4 0 7 3"/></svg>',
  leaf: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D7A5E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A12.4 12.4 0 0021 11c0-4-3-5-4-3z" fill="#D4E8D8"/><path d="M6 15l4-4"/></svg>',
  tree: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D5E3E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 4L7 10h3l-2 4h8l-2-4h3L12 4z" fill="#D4E8D8"/></svg>',
  star: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4935A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#F0E4D0"/></svg>',
  trophy: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4935A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 01-2-2V5h4"/><path d="M18 9h2a2 2 0 002-2V5h-4"/><path d="M4 5h16v4a6 6 0 01-6 6h-4a6 6 0 01-6-6V5z" fill="#F0E4D0"/><path d="M12 15v3"/><path d="M8 21h8"/></svg>',
  flame: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 .5 2.5 2 3 3 1 1 4 4 5 4 6 0 4-3 7-3 7z" stroke="#B54E3F" fill="#F5DDD8"/><path d="M12 22c-1.5 0-3-1.2-3-3s1.5-3 2-4c.3 1.2 1 1.5 1.5.5.5 2 2.5 2.5 2.5 3.5s-1.5 3-3 3z" stroke="#D4884A" fill="#F0DDD0"/></svg>',
  diamond: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D7A6E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 10.3l8.6 10.4a1 1 0 001.4 0l8.6-10.4a1 1 0 00.1-1.1L18.4 4H5.6L2.6 9.2a1 1 0 00.1 1.1z" fill="#D4E8E2"/><path d="M5.6 4L9 10.3 12 4l3 6.3L18.4 4"/><path d="M2.7 10.3h18.6"/></svg>',
  target: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4E7EB5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#D8E4F0"/><circle cx="12" cy="12" r="6" fill="#A3C4E0"/><circle cx="12" cy="12" r="2" fill="#4E7EB5"/></svg>',
  gamepad: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B54E6B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6" fill="#F0D4DE"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="0.8" fill="#B54E6B"/><circle cx="17" cy="13" r="0.8" fill="#B54E6B"/></svg>'
};

const BADGES = [
  { id: 'first10', title: '10 premiers mots', desc: 'Apprendre 10 mots', icon: BADGE_SVG.sprout, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 10 },
  { id: 'first50', title: '50 mots appris', desc: '50 mots vus au moins une fois', icon: BADGE_SVG.leaf, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 50 },
  { id: 'first200', title: '200 mots appris', desc: '200 mots vus', icon: BADGE_SVG.tree, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 200 },
  { id: 'master50', title: '50 mots maitrisés', desc: '50 mots au niveau Connu', icon: BADGE_SVG.star, check: () => Progress.getStats().connu >= 50 },
  { id: 'master200', title: '200 mots maitrisés', desc: '200 mots au niveau Connu', icon: BADGE_SVG.trophy, check: () => Progress.getStats().connu >= 200 },
  { id: 'streak7', title: '7 jours de suite', desc: 'Streak de 7 jours', icon: BADGE_SVG.flame, check: () => Progress.load().streak >= 7 },
  { id: 'streak30', title: '30 jours de suite', desc: 'Streak de 30 jours', icon: BADGE_SVG.diamond, check: () => Progress.load().streak >= 30 },
  { id: 'chapter100', title: 'Chapitre parfait', desc: 'Un chapitre a 100%', icon: BADGE_SVG.target, check: () => DATA.chapters.some(ch => Progress.chapterPct(ch.id) === 100) },
  { id: 'allquiz', title: 'Polyvalent', desc: 'Essayer 4 modes de quiz', icon: BADGE_SVG.gamepad, check: () => { try { return (JSON.parse(localStorage.getItem('blokaja_quizmodes') || '[]')).length >= 4; } catch(e) { return false; } } },
  // Badges intermediaires
  { id: 'first25', title: '25 mots vus', desc: '25 mots decouverts', icon: BADGE_SVG.sprout, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 25 },
  { id: 'first100', title: '100 mots vus', desc: '100 mots decouverts', icon: BADGE_SVG.leaf, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 100 },
  { id: 'first500', title: '500 mots vus', desc: '500 mots decouverts', icon: BADGE_SVG.diamond, check: () => Progress.getStats().total - Progress.getStats().nouveau >= 500 },
  { id: 'master100', title: '100 mots maitrises', desc: '100 mots au niveau Connu', icon: BADGE_SVG.star, check: () => Progress.getStats().connu >= 100 },
  { id: 'streak3', title: '3 jours de suite', desc: 'Streak de 3 jours', icon: BADGE_SVG.flame, check: () => Progress.load().streak >= 3 },
  { id: 'streak14', title: '14 jours de suite', desc: 'Streak de 14 jours', icon: BADGE_SVG.flame, check: () => Progress.load().streak >= 14 },
  { id: 'perfectQuiz', title: 'Score parfait', desc: '100% sur un quiz de 10+', icon: BADGE_SVG.target, check: () => { try { return JSON.parse(localStorage.getItem('blokaja_perfect') || 'false'); } catch(e) { return false; } } },
  { id: 'lesson5', title: '5 lecons terminees', desc: 'Terminer 5 lecons guidees', icon: BADGE_SVG.star, check: () => { try { return JSON.parse(localStorage.getItem('blokaja_lessons') || '0') >= 5; } catch(e) { return false; } } },
  { id: 'allchapters', title: 'Explorateur', desc: 'Visiter les 7 chapitres', icon: BADGE_SVG.gamepad, check: () => { try { return JSON.parse(localStorage.getItem('blokaja_chapters_visited') || '[]').length >= 7; } catch(e) { return false; } } },
];

function trackQuizMode(mode) {
  try {
    const modes = JSON.parse(localStorage.getItem('blokaja_quizmodes') || '[]');
    if (!modes.includes(mode)) { modes.push(mode); localStorage.setItem('blokaja_quizmodes', JSON.stringify(modes)); }
  } catch(e) {}
}

// Verifie si de nouveaux badges ont ete debloques
function checkBadgeUnlocks() {
  try {
    const prev = JSON.parse(localStorage.getItem('blokaja_badges_unlocked') || '[]');
    const newUnlocked = BADGES.filter(b => b.check() && !prev.includes(b.id));
    if (newUnlocked.length > 0) {
      const all = [...prev, ...newUnlocked.map(b => b.id)];
      localStorage.setItem('blokaja_badges_unlocked', JSON.stringify(all));
      showBadgeUnlock(newUnlocked[0]);
    }
  } catch(e) {}
}

// Affiche un toast de celebration pour un badge debloque
function showBadgeUnlock(badge) {
  let el = $('.badge-unlock-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'badge-unlock-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `
    <div class="badge-unlock-icon">${badge.icon}</div>
    <div>
      <div class="badge-unlock-title">Badge debloque !</div>
      <div class="badge-unlock-name">${escHtml(badge.title)}</div>
    </div>
  `;
  el.classList.add('visible');
  if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
  setTimeout(() => el.classList.remove('visible'), 3500);
}

// Enregistre une visite de chapitre (pour badge Explorateur)
function trackChapterVisit(chId) {
  try {
    const visited = JSON.parse(localStorage.getItem('blokaja_chapters_visited') || '[]');
    if (!visited.includes(chId)) {
      visited.push(chId);
      localStorage.setItem('blokaja_chapters_visited', JSON.stringify(visited));
    }
  } catch(e) {}
}

function getBadgesHTML() {
  return `<div class="badge-grid">${BADGES.map(b => {
    const unlocked = b.check();
    return `<div class="achievement-card ${unlocked ? '' : 'locked'}">
      <div class="achievement-icon">${b.icon}</div>
      <div class="achievement-title">${escHtml(b.title)}</div>
      <div class="achievement-desc">${escHtml(b.desc)}</div>
    </div>`;
  }).join('')}</div>`;
}

// --- Progression ---

function renderProgression() {
  setHeader('Progression', false);
  const d = Progress.load();
  const goal = Progress.getGoal();
  const stats = Progress.getStats();

  // Calendrier du mois en cours
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const activeDays = new Set((d.history || []).filter(h => {
    const dt = new Date(h);
    return dt.getFullYear() === year && dt.getMonth() === month;
  }).map(h => new Date(h).getDate()));

  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  let cal = dayLabels.map(dl => `<div class="calendar-day-label">${dl}</div>`).join('');
  for (let i = 0; i < firstDow; i++) cal += '<div></div>';
  for (let dd = 1; dd <= daysInMonth; dd++) {
    const isAct = activeDays.has(dd);
    const isToday = dd === now.getDate();
    cal += `<div class="calendar-day ${isAct ? 'active' : ''} ${isToday ? 'today' : ''}">${dd}</div>`;
  }

  app.innerHTML = `
    <div class="section">
      <div class="streak-card">
        <div class="mascot">${(d.streak || 0) >= 3 ? MASCOT_HAPPY_SVG : MASCOT_SVG}</div>
        <div style="flex:1">
          <div class="streak-label" style="font-weight:600">${d.streak || 0} jour${(d.streak || 0) > 1 ? 's' : ''} de suite</div>
          <div class="streak-label">${goal.done}/${goal.total} items aujourd'hui</div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${Math.min(100, goal.done / goal.total * 100)}%"></div></div>
        </div>
      </div>
    </div>

    <div class="section mt-16">
      <div class="section-title">Par chapitre</div>
      ${DATA.chapters.map(ch => {
        const pct = Progress.chapterPct(ch.id);
        return `
          <div class="chapter-progress-row">
            <div class="chapter-progress-label" style="color:var(--ch${ch.id})">Ch.${ch.id}</div>
            <div class="chapter-progress-bar"><div class="chapter-progress-bar-fill" style="width:${pct}%;background:var(--ch${ch.id})"></div></div>
            <div style="width:36px;text-align:right;font-size:13px;color:var(--text2)">${pct}%</div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="section mt-16">
      <div class="section-title">Statistiques <span style="font-weight:400;color:var(--text3)">(${stats.total} items)</span></div>
      <div class="grid-2">
        <div class="card text-center"><div class="stat-value" style="color:var(--success)">${stats.connu}</div><div class="stat-label">Connus</div></div>
        <div class="card text-center"><div class="stat-value" style="color:var(--accent)">${stats.revoir}</div><div class="stat-label">A revoir</div></div>
        <div class="card text-center"><div class="stat-value" style="color:var(--danger)">${stats.difficile}</div><div class="stat-label">Difficiles</div></div>
        <div class="card text-center"><div class="stat-value" style="color:var(--text3)">${stats.nouveau}</div><div class="stat-label">Nouveaux</div></div>
      </div>
    </div>

    <div class="section mt-16">
      <div class="section-title">${escHtml(monthName)}</div>
      <div class="card">
        <div class="calendar-grid">${cal}</div>
      </div>
    </div>

    <div class="section mt-16">
      <div class="section-title">Badges</div>
      ${getBadgesHTML()}
    </div>

    <div class="section mt-16">
      <div class="section-title">Sauvegarde</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary flex-1" id="exportBtn">Exporter</button>
        <button class="btn btn-secondary flex-1" id="importBtn">Importer</button>
      </div>
      <input type="file" id="importFile" accept=".json" style="display:none">
    </div>

    <div style="text-align:center;padding:32px 0">
      <button class="btn btn-secondary" id="resetBtn" style="font-size:13px;color:var(--danger)">Reinitialiser la progression</button>
    </div>
  `;

  // Export
  $('#exportBtn').addEventListener('click', () => {
    const data = {
      version: 2,
      date: new Date().toISOString(),
      srs: SRS.data,
      progress: Progress.load(),
      settings: Settings.load()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blokaja-backup-${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Sauvegarde exportee');
  });

  // Import
  const importFile = $('#importFile');
  $('#importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.srs || !data.progress) throw new Error('Format invalide');
        if (!confirm('Cela remplacera ta progression actuelle. Continuer ?')) return;
        SRS.data = data.srs;
        SRS.save();
        Progress.save(data.progress);
        if (data.settings) {
          Object.entries(data.settings).forEach(([k, v]) => Settings.set(k, v));
          applySettings();
        }
        renderProgression();
        toast('Sauvegarde restauree');
      } catch (err) {
        toast('Fichier invalide');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (confirm('Es-tu sur(e) de vouloir reinitialiser toute ta progression ?')) {
      SRS.reset();
      localStorage.removeItem('blokaja_progress');
      renderProgression();
      toast('Progression reinitialisee');
    }
  });
}


// ── 9. RENDERERS (sous-pages chapitre) ────────────

// --- Nombres ---

function renderNombres(chId, container) {
  // Chapitre 0 = tous les nombres, sinon filtrer par chapitre (mais les nombres sont ch=0)
  const nums = DATA.numbers;
  if (!nums.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de nombres</div></div>'; return; }

  const sinoKr = nums.filter(n => n.sys === 'sino-coréen');
  const nativeKr = nums.filter(n => n.sys === 'coréen');
  let activeSys = null;

  function render() {
    const filtered = activeSys ? nums.filter(n => n.sys === activeSys) : nums;
    container.innerHTML = `
      <div class="pills mb-12" style="padding:0">
        <button class="pill ${!activeSys ? 'active' : ''}" data-nsys="">Tous (${nums.length})</button>
        <button class="pill ${activeSys === 'sino-coréen' ? 'active' : ''}" data-nsys="sino-coréen">Sino-coreen (${sinoKr.length})</button>
        <button class="pill ${activeSys === 'coréen' ? 'active' : ''}" data-nsys="coréen">Coreen natif (${nativeKr.length})</button>
      </div>
      <div class="vocab-grid">
        ${filtered.map((n, _i) => `
          <div class="vocab-card" role="button" tabindex="0" style="--i:${_i}" data-nk="${escHtml(n.kr)}">
            <div class="vocab-srs ${SRS.getLevelClass('n:' + n.kr)}"></div>
            <div class="vocab-kr" lang="ko">${escHtml(n.kr)}</div>
            <div class="vocab-fr">${escHtml(n.val)}${n.rom ? ` <span class="rom-text" style="color:var(--text3);font-size:11px">${escHtml(n.rom)}</span>` : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
    container.querySelectorAll('[data-nsys]').forEach(b =>
      b.addEventListener('click', () => { activeSys = b.dataset.nsys || null; render(); })
    );
    container.querySelectorAll('.vocab-card').forEach(card =>
      card.addEventListener('click', () => {
        const n = nums.find(x => x.kr === card.dataset.nk);
        if (n) openDetailSheet(n, 'nombre', { items: filtered, index: filtered.indexOf(n), type: 'nombre' });
      })
    );
  }
  render();
}

// --- Connecteurs ---

function renderConnecteurs(chId, container) {
  const conns = DATA.connectors.filter(c => c.ch === chId || chId === 0);
  if (!conns.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de connecteurs pour ce chapitre</div></div>'; return; }

  let srsFilter = null;

  function render() {
    let filtered = srsFilter !== null ? conns.filter(c => SRS.getLevel('c:' + c.kr) === srsFilter) : conns;

    container.innerHTML = `
      ${srsFilterPillsHTML(srsFilter)}
      <div class="section">
        ${filtered.map(c => `
          <div class="card card-interactive mb-8" role="button" tabindex="0" data-ck="${escHtml(c.kr)}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:18px;font-weight:700">${escHtml(c.kr)}</div>
                <div style="font-size:14px;color:var(--text2)">${escHtml(c.fr)}</div>
              </div>
              <div class="vocab-srs ${SRS.getLevelClass('c:' + c.kr)}" style="position:static"></div>
            </div>
            ${c.usage ? `<div class="text-caption mt-4">${escHtml(c.usage)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    bindSrsFilterPills(container, f => { srsFilter = f; render(); });
    container.querySelectorAll('[data-ck]').forEach(card =>
      card.addEventListener('click', () => {
        const c = conns.find(x => x.kr === card.dataset.ck);
        if (c) openDetailSheet(c, 'connecteur', { items: filtered, index: filtered.indexOf(c), type: 'connecteur' });
      })
    );
  }
  render();
}

// --- Vocabulaire ---

// Affiche la grille de vocabulaire avec filtre par theme
function renderVocab(chId, container) {
  const vocab = DATA.vocabulary.filter(v => v.ch === chId);
  if (!vocab.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de vocabulaire</div></div>'; return; }

  const themes = [...new Set(vocab.map(v => v.theme).filter(Boolean))];
  let active = null;
  let srsFilter = null; // null=tous, 0=nouveau, 1=difficile, 2=a revoir, 3=connu

  function render() {
    let filtered = active ? vocab.filter(v => v.theme === active) : vocab;
    if (srsFilter !== null) filtered = filtered.filter(v => SRS.getLevel(vocabSrsKey(v)) === srsFilter);

    const srsLabels = [
      { val: null, label: 'Tous', cls: '' },
      { val: 0, label: 'Nouveaux', cls: 'srs-new' },
      { val: 1, label: 'Difficiles', cls: 'srs-hard' },
      { val: 2, label: 'A revoir', cls: 'srs-review' },
      { val: 3, label: 'Connus', cls: 'srs-known' }
    ];

    container.innerHTML = `
      <div class="pills mb-12" style="padding:0">
        <button class="pill ${!active ? 'active' : ''}" data-th="">Tous (${vocab.length})</button>
        ${themes.map(t => `<button class="pill ${active === t ? 'active' : ''}" data-th="${escHtml(t)}">${escHtml(t)} (${vocab.filter(v => v.theme === t).length})</button>`).join('')}
      </div>
      <div class="pills mb-12" style="padding:0">
        ${srsLabels.map(s => `<button class="pill ${srsFilter === s.val ? 'active' : ''}" data-srsf="${s.val}">${s.label}</button>`).join('')}
      </div>
      <div class="vocab-grid">
        ${filtered.map((v, _i) => `
          <div class="vocab-card" role="button" tabindex="0" style="--i:${_i}" data-vk="${escHtml(v.kr)}">
            <div class="vocab-srs ${SRS.getLevelClass(vocabSrsKey(v))}"></div>
            <div class="vocab-kr" lang="ko">${escHtml(v.kr)}</div>
            <div class="vocab-fr">${escHtml(v.fr)}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Pills de filtre par theme
    container.querySelectorAll('[data-th]').forEach(b =>
      b.addEventListener('click', () => { active = b.dataset.th || null; render(); })
    );
    // Pills de filtre par niveau SRS
    container.querySelectorAll('[data-srsf]').forEach(b =>
      b.addEventListener('click', () => { srsFilter = b.dataset.srsf === 'null' ? null : +b.dataset.srsf; render(); })
    );

    // Clic sur une carte de vocab -> detail
    container.querySelectorAll('.vocab-card').forEach(card =>
      card.addEventListener('click', () => {
        const v = vocab.find(x => x.kr === card.dataset.vk);
        if (v) openDetailSheet(v, 'vocab', { items: filtered, index: filtered.indexOf(v), type: 'vocab' });
      })
    );
  }
  render();
}

// --- Grammaire ---

// Helpers pour le rendu des regles de grammaire
function renderRules(rules) {
  if (!rules || !rules.length) return '';
  if (typeof rules[0] === 'object' && rules[0] !== null) {
    return `<div class="verb-table" style="margin-top:8px"><table>
      <thead><tr><th>Contexte</th><th>Forme</th><th>Exemple</th></tr></thead>
      <tbody>${rules.map(r => `<tr>
        <td style="font-size:13px">${escHtml(r.context || '')}</td>
        <td style="font-size:13px">${escHtml(r.form || '')}</td>
        <td>${r.example_korean ? `<span style="font-weight:600">${escHtml(r.example_korean)}</span>` : ''}${r.example_french ? `<br><span style="font-size:12px;color:var(--text2)">${escHtml(r.example_french)}</span>` : ''}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${rules.map(r => `<span class="chip">${escHtml(r)}</span>`).join('')}</div>`;
}

// Rendu des exemples de grammaire
function renderExamples(examples) {
  if (!examples || !examples.length) return '';
  return examples.map(ex => `
    <div class="example-block mt-8">
      <div style="font-size:16px;font-weight:600">${escHtml(ex.kr)}</div>
      ${ex.rom ? `<div style="font-size:12px;color:var(--primary);font-style:italic">${escHtml(ex.rom)}</div>` : ''}
      <div class="text-secondary">${escHtml(ex.fr)}</div>
    </div>
  `).join('');
}

// Affiche les regles de grammaire en accordeon
function renderGrammar(chId, container) {
  const items = DATA.grammar.filter(g => g.ch === chId);
  if (!items.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de grammaire</div></div>'; return; }

  container.innerHTML = accordionHTML(items,
    (g) => `<div><div style="font-weight:600;font-size:15px">${escHtml(g.title)}</div></div>`,
    (g) => `
      ${g.expl ? `<div class="text-body mb-12">${escHtml(g.expl)}</div>` : ''}
      ${renderRules(g.rules)}
      ${renderExamples(g.ex)}
      ${g.note ? `<div class="note-block">${escHtml(g.note)}</div>` : ''}
    `
  );

  bindAccordions(container);
}

// --- Verbes ---

// Affiche le tableau des verbes du chapitre
function renderVerbs(chId, container) {
  const verbs = DATA.verbs.filter(v => v.ch === chId);
  if (!verbs.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de verbes</div></div>'; return; }

  let srsFilter = null;

  function render() {
    let filtered = srsFilter !== null ? verbs.filter(v => SRS.getLevel('v:' + v.inf) === srsFilter) : verbs;

    container.innerHTML = `
      ${srsFilterPillsHTML(srsFilter)}
      <div class="verb-table">
        <table>
          <thead><tr><th>Infinitif</th><th>Francais</th><th>Poli</th><th>Informel</th><th>Passe</th></tr></thead>
          <tbody>
            ${filtered.map(v => `
              <tr class="${v.irreg ? 'irreg' : ''}" data-vinf="${escHtml(v.inf)}" style="cursor:pointer">
                <td style="font-weight:600">${escHtml(v.inf)}${v.irreg ? ' <span style="color:var(--danger);font-size:10px">irreg.</span>' : ''}</td>
                <td>${escHtml(v.fr)}</td>
                <td>${escHtml(v.poli || '\u2014')}</td>
                <td>${escHtml(v.fam || '\u2014')}</td>
                <td>${escHtml(v.passe || '\u2014')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    bindSrsFilterPills(container, f => { srsFilter = f; render(); });

    // Clic sur une ligne -> detail du verbe
    container.addEventListener('click', e => {
      const row = e.target.closest('tr[data-vinf]');
      if (row) {
        const v = verbs.find(x => x.inf === row.dataset.vinf);
        if (v) openDetailSheet(v, 'verb', { items: filtered, index: filtered.indexOf(v), type: 'verb' });
      }
    });
  }
  render();
}

// --- Particules ---

// Retourne la classe CSS de couleur selon la fonction de la particule
function particleFnClass(p) {
  const n = (p.name || p.fn || '').toLowerCase();
  if (n.includes('sujet')) return 'particle-fn-sujet';
  if (n.includes('lieu') || n.includes('destination')) return 'particle-fn-lieu';
  if (n.includes('temps')) return 'particle-fn-temps';
  if (n.includes('cod') || n.includes('objet')) return 'particle-fn-cod';
  if (n.includes('theme') || n.includes('th\u00e8me')) return 'particle-fn-theme';
  return '';
}

// Affiche les particules en cards colorees avec accordeon
function renderParticles(chId, container) {
  const parts = DATA.particles.filter(p => p.ch === chId || (chId > 0 && p.ch === 0));
  if (!parts.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de particules</div></div>'; return; }

  container.innerHTML = parts.map((p, i) => {
    const exs = p.ex || [];
    return `
      <div class="particle-card ${particleFnClass(p)}" style="padding:0;overflow:hidden">
        <div class="accordion-header" data-pi="${i}">
          <div style="flex:1">
            <div class="particle-name">${escHtml(p.p)}</div>
            <div class="particle-desc">${escHtml(p.name || '')}</div>
          </div>
          ${p.ch > 0 ? `<span class="badge badge-ch${p.ch}">Ch.${p.ch}</span>` : ''}
          <svg class="accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="accordion-body" data-pbody="${i}">
          <div style="padding:0 16px 16px">
            ${p.fn ? `<div class="text-body mb-8">${escHtml(p.fn)}</div>` : ''}
            ${p.rule ? `<div class="particle-rule">${escHtml(p.rule)}</div>` : ''}
            ${exs.map(ex => {
              if (typeof ex === 'string') return `<div style="margin-top:6px;padding:8px 12px;background:var(--bg2);border-radius:8px;font-size:14px">${escHtml(ex)}</div>`;
              return `<div style="margin-top:6px;padding:8px 12px;background:var(--bg2);border-radius:8px"><div style="font-size:15px;font-weight:600">${escHtml(ex.kr)}</div><div style="font-size:13px;color:var(--text2)">${escHtml(ex.fr)}</div></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Delegation des accordeons pour les particules
  container.addEventListener('click', e => {
    const h = e.target.closest('.accordion-header');
    if (!h) return;
    const i = h.dataset.pi;
    h.classList.toggle('open');
    const body = container.querySelector(`.accordion-body[data-pbody="${i}"]`);
    if (body) body.classList.toggle('open');
  });
}

// --- Phrases ---

// Affiche les phrases groupees par categorie
function renderPhrases(chId, container) {
  const phrases = DATA.phrases.filter(p => p.ch === chId);
  if (!phrases.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de phrases</div></div>'; return; }

  let srsFilter = null;

  function render() {
    let filteredPhrases = srsFilter !== null ? phrases.filter(p => SRS.getLevel(vocabSrsKey(p)) === srsFilter) : phrases;

    // Grouper par categorie
    const cats = {};
    filteredPhrases.forEach(p => { const cat = p.cat || 'Divers'; (cats[cat] = cats[cat] || []).push(p); });

    container.innerHTML = `
      ${srsFilterPillsHTML(srsFilter)}
      ${Object.entries(cats).map(([cat, items]) => `
        <div class="section mb-16">
          <div class="section-subtitle" style="text-transform:uppercase;letter-spacing:0.05em;font-size:11px;font-weight:600;color:var(--primary)">${escHtml(cat)}</div>
          ${items.map(p => `
            <div class="card card-interactive mb-8" role="button" tabindex="0" data-pk="${escHtml(p.kr)}">
              <div style="font-size:18px;font-weight:600;line-height:1.3">${escHtml(p.kr)}</div>
              ${p.rom ? `<div class="rom-text" style="font-size:12px;color:var(--text3);font-style:italic;margin-top:2px">${escHtml(p.rom)}</div>` : ''}
              <div style="font-size:14px;color:var(--text2);margin-top:4px">${escHtml(p.fr)}</div>
              ${p.cat ? `<span class="badge badge-phrase mt-4">${escHtml(p.cat)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
    bindSrsFilterPills(container, f => { srsFilter = f; render(); });

    // Clic -> detail dans le bottom sheet
    container.addEventListener('click', e => {
      const card = e.target.closest('[data-pk]');
      if (card) {
        const p = phrases.find(x => x.kr === card.dataset.pk);
        if (p) openDetailSheet(p, 'phrase', { items: filteredPhrases, index: filteredPhrases.indexOf(p), type: 'phrase' });
      }
    });
  }
  render();
}

// --- Expressions ---

// Affiche les expressions : poli / informel cote a cote
function renderExpressions(chId, container) {
  const exprs = DATA.expressions.filter(e => e.ch === chId);
  if (!exprs.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas d\'expressions</div></div>'; return; }

  let srsFilter = null;

  function render() {
    let filtered = srsFilter !== null ? exprs.filter(e => SRS.getLevel('e:' + (e.poli || e.inf || e.fr)) === srsFilter) : exprs;

    container.innerHTML = `
      ${srsFilterPillsHTML(srsFilter)}
      ${filtered.map((ex, i) => `
        <div class="expr-card" role="button" tabindex="0" data-ei="${i}">
          <div class="expr-fr">${escHtml(ex.fr)}</div>
          <div class="expr-row">
            <div>
              ${ex.poli ? `<div class="expr-label">Poli</div><div class="expr-kr">${escHtml(ex.poli)}</div>${ex.rp ? `<div class="text-xs-italic">${escHtml(ex.rp)}</div>` : ''}` : ''}
            </div>
            <div>
              ${ex.inf ? `<div class="expr-label">Informel</div><div class="expr-kr">${escHtml(ex.inf)}</div>${ex.ri ? `<div class="text-xs-italic">${escHtml(ex.ri)}</div>` : ''}` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    `;
    bindSrsFilterPills(container, f => { srsFilter = f; render(); });

    // Clic -> detail
    container.addEventListener('click', e => {
      const card = e.target.closest('[data-ei]');
      if (card) {
        const ex = filtered[+card.dataset.ei];
        if (ex) openDetailSheet(ex, 'expr', { items: filtered, index: +card.dataset.ei, type: 'expr' });
      }
    });
  }
  render();
}

// --- Culture ---

// Affiche les articles de culture avec apercu
function renderCulture(chId, container) {
  const items = DATA.culture.filter(x => x.ch === chId);
  if (!items.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Pas de culture</div></div>'; return; }

  container.innerHTML = items.map((cu, i) => `
    <div class="card card-interactive mb-8" role="button" tabindex="0" data-ci="${i}">
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${escHtml(cu.title)}</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5">${escHtml((cu.body || '').slice(0, 80))}${(cu.body || '').length > 80 ? '...' : ''}</div>
      ${cu.kw && cu.kw.length ? `<div class="chip-list mt-8">${cu.kw.slice(0, 4).map(kw => `<span class="chip">${escHtml(Array.isArray(kw) ? kw[0] : kw)}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  // Clic -> bottom sheet avec mots-cles en surbrillance
  container.addEventListener('click', e => {
    const card = e.target.closest('[data-ci]');
    if (card) {
      const cu = items[+card.dataset.ci];
      if (cu) openDetailSheet(cu, 'culture');
    }
  });
}

// --- Hangeul ---

// Affiche une grille de caracteres hangeul
function renderHangeulGrid(type, container) {
  const items = DATA.hangeul.filter(h => h.type === type);
  if (!items.length) { container.innerHTML = '<div class="empty"><div class="empty-title">Aucun caractere</div></div>'; return; }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:8px">
      ${items.map((h, i) => `
        <div class="card text-center" role="button" tabindex="0" data-hi="${i}" style="padding:12px 8px">
          <div style="font-size:32px;font-weight:700;line-height:1.2">${escHtml(h.l)}</div>
          <div class="rom-text" style="font-size:12px;color:var(--primary);margin-top:4px">${escHtml(h.rom)}</div>
        </div>
      `).join('')}
    </div>
  `;

  container.addEventListener('click', e => {
    const card = e.target.closest('[data-hi]');
    if (card) {
      const h = items[+card.dataset.hi];
      if (h) openDetailSheet(h, 'hangeul');
    }
  });
}

// Affiche les regles de batchim sous forme de tableau
function renderBatchim(container) {
  const rules = DATA.hangeul.filter(h => h.type === 'batchim_regle');
  const notes = DATA.hangeul.filter(h => h.type === 'prononciation_note');

  container.innerHTML = `
    <div class="section-title">Consonnes finales (Batchim)</div>
    <div class="verb-table">
      <table>
        <thead><tr><th>Son</th><th>Consonnes</th><th>Description</th></tr></thead>
        <tbody>
          ${rules.map(b => `<tr>
            <td style="font-weight:700;color:var(--primary)">${escHtml(b.rom)}</td>
            <td style="font-size:16px">${escHtml(b.l)}</td>
            <td style="font-size:13px;color:var(--text2)">${escHtml(b.desc)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${notes.length ? `
      <div class="section-title mt-16">Notes</div>
      ${notes.map(n => `<div class="card mb-8" style="font-size:13px;line-height:1.6"><strong>${escHtml(n.l)}</strong> (${escHtml(n.rom)}) — ${escHtml(n.desc)}</div>`).join('')}
    ` : ''}
  `;
}


// ── 10. QUIZ ENGINE ───────────────────────────────

// Classe Quiz : gere l'etat d'une session de quiz
class Quiz {
  constructor(mode, items, dir) {
    this.mode = mode;
    this.items = shuffle([...items]);
    this.dir = dir;
    this.idx = 0;
    this.score = 0;
    this.answers = [];
    this.total = items.length;
  }
  current() { return this.items[this.idx]; }
  next() { this.idx++; return this.idx < this.total; }
  answer(ok, userAnswer) { this.answers.push({ item: this.current(), correct: ok, userAnswer }); if (ok) this.score++; }
  progress() { return (this.idx + 1) / this.total; }
}

// Quiz en cours (accessible globalement)
let curQuiz = null;

function quitQuiz() {
  if (!curQuiz || confirm('Quitter le quiz en cours ?')) {
    _quizCleanup();
    navigate('#quiz');
  }
}

// Protection back browser pendant quiz
let _quizPopHandler = null;
function _quizGuardBack() {
  if (_quizPopHandler) return;
  history.pushState({ quiz: true }, '');
  _quizPopHandler = () => {
    if (curQuiz) {
      if (confirm('Quitter le quiz en cours ?')) {
        _quizCleanup();
        navigate('#quiz');
      } else {
        history.pushState({ quiz: true }, '');
      }
    }
  };
  window.addEventListener('popstate', _quizPopHandler);
}
function _quizCleanup() {
  if (_quizPopHandler) {
    window.removeEventListener('popstate', _quizPopHandler);
    _quizPopHandler = null;
  }
  curQuiz = null;
}

// --- Traitement unifie d'une reponse quiz ---

// Fonction unique pour traiter une reponse dans tous les modes quiz
function handleQuizAnswer(quiz, key, isCorrect, renderNext, successQuality = 1) {
  if (navigator.vibrate) navigator.vibrate(isCorrect ? [50] : [100, 50, 100]);
  SRS.update(key, isCorrect ? successQuality : 0);
  Progress.recordActivity();
  if (quiz.next()) {
    setTimeout(renderNext, CFG.QUIZ_DELAY);
  } else {
    setTimeout(() => renderQuizResults(quiz), CFG.QUIZ_DELAY);
  }
}

// --- Pool d'items ---

// Retourne les items pour un mode quiz selon le chapitre et le nombre
function getPool(mode, ch, count) {
  let pool;
  if (mode === 'conjugaison') {
    pool = DATA.verbs.filter(v => v.poli || v.fam || v.passe).map(v => ({...v, _type: 'verb'}));
    if (ch >= 0) pool = pool.filter(v => v.ch === ch);
  } else if (mode === 'particules') {
    pool = DATA.phrases.filter(p => p.kr && p.fr).map(p => ({...p, _type: 'phrase'}));
    if (ch >= 0) pool = pool.filter(p => p.ch === ch);
  } else {
    pool = [
      ...DATA.vocabulary.map(v => ({...v, _type: 'vocab'})),
      ...DATA.adjectives.map(v => ({...v, _type: 'adj'})),
      ...DATA.adverbs.map(v => ({...v, _type: 'adv'})),
      ...DATA.connectors.map(v => ({...v, _type: 'connecteur'}))
    ];
    if (ch >= 0) pool = pool.filter(v => v.ch === ch);
  }
  return shuffle(pool).slice(0, count);
}

// Retourne la cle SRS correcte pour un item de quiz
function quizSrsKey(item) {
  if (item._srsKey) return item._srsKey;
  if (item._type === 'verb') return 'v:' + item.inf;
  if (item._type === 'adj') return 'a:' + item.kr;
  if (item._type === 'adv') return 'w:' + item.kr;
  if (item._type === 'connecteur') return 'c:' + item.kr;
  return vocabSrsKey(item);
}

// Retourne count distracteurs (meme chapitre en priorite)
function getDistractors(item, pool, count = 3) {
  // Essaie d'abord le meme chapitre
  const sameCh = pool.filter(v => v !== item && v.ch === item.ch);
  const others = pool.filter(v => v !== item && v.ch !== item.ch);
  const candidates = shuffle([...sameCh, ...others]).slice(0, count);
  return candidates;
}

// --- Barre de progression quiz ---

function quizBar(q) {
  return `<div class="quiz-progress"><div class="quiz-progress-fill" style="width:${q.progress() * 100}%"></div></div>
    <div style="text-align:center;font-size:13px;color:var(--text2);margin:8px 0">${q.idx + 1} / ${q.total}</div>`;
}

// --- Demarrage du quiz ---

function startQuiz(mode, ch, count, dir) {
  const items = getPool(mode, ch, count);
  if (!items.length) {
    app.innerHTML = '<div class="empty mt-24"><div class="empty-title">Pas assez de donnees</div><button class="btn btn-secondary mt-16" onclick="history.back()">Retour</button></div>';
    return;
  }

  curQuiz = new Quiz(mode, items, dir);
  trackQuizMode(mode);
  curQuiz.ch = ch;
  _quizGuardBack();

  const renderers = {
    flashcards: qFlash,
    qcm: qQCM,
    ecriture: qEcriture,
    association: qAssociation,
    dictee: qDictee,
    marathon: qMarathon,
    conjugaison: qConjugaison,
    particules: qParticules
  };
  (renderers[mode] || qFlash)();
}

// --- Flashcards ---

// Quiz flashcard avec flip + swipe
function qFlash() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  const kr2fr = q.dir === 'kr2fr';
  const front = kr2fr ? item.kr : item.fr;
  const back = kr2fr ? item.fr : item.kr;

  app.innerHTML = `
    ${quizBar(q)}
    <div style="display:flex;flex-direction:column;align-items:center;padding:16px 0">
      <div class="flashcard-container">
        <div class="flashcard" id="fc">
          <div class="flashcard-face">
            <div class="flashcard-word">${escHtml(front)}</div>
            <div class="flashcard-hint">Toucher pour retourner</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-word">${escHtml(back)}</div>
            ${item.rom ? `<div class="flashcard-hint rom-text">${escHtml(item.rom)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="srs-buttons" id="srsActions" style="opacity:0;pointer-events:none;transition:opacity 0.3s;width:100%;max-width:340px">
        <button class="srs-btn srs-btn-hard" data-s="0">Difficile</button>
        <button class="srs-btn srs-btn-review" data-s="1">A revoir</button>
        <button class="srs-btn srs-btn-known" data-s="2">Connu</button>
      </div>
      <button class="btn btn-secondary mt-16" onclick="quitQuiz()">Quitter</button>
    </div>
  `;

  const fc = $('#fc'), actions = $('#srsActions');
  let flipped = false;

  function flipCard() {
    if (!flipped) {
      fc.classList.add('flipped');
      flipped = true;
      actions.style.opacity = '1';
      actions.style.pointerEvents = 'auto';
    }
  }

  // Tap = flip
  fc.addEventListener('click', flipCard);

  // Clavier = flip (Enter / Espace)
  fc.setAttribute('tabindex', '0');
  fc.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !flipped) {
      e.preventDefault();
      flipCard();
    }
  });

  // Cle SRS : utiliser quizSrsKey qui gere les prefixes par type
  const srsK = quizSrsKey(item);

  // Boutons SRS
  actions.addEventListener('click', e => {
    const b = e.target.closest('[data-s]');
    if (b) {
      const s = +b.dataset.s;
      SRS.update(srsK, s);
      Progress.recordActivity();
      q.answer(s >= 1, s);
      if (q.next()) qFlash(); else renderQuizResults(q);
    }
  });

  // Swipe gauche/droite
  let x0 = 0, xc = 0, dragging = false;
  fc.addEventListener('touchstart', e => {
    x0 = e.touches[0].clientX; xc = x0; dragging = true;
    fc.classList.add('swiping');
  });
  fc.addEventListener('touchmove', e => {
    if (!dragging) return;
    xc = e.touches[0].clientX;
    const dx = xc - x0;
    fc.style.transform = `${flipped ? 'rotateY(180deg) ' : ''}translateX(${dx}px) rotate(${dx * 0.05}deg)`;
    fc.classList.remove('swipe-feedback-left', 'swipe-feedback-right');
    if (dx > 40) fc.classList.add('swipe-feedback-right');
    else if (dx < -40) fc.classList.add('swipe-feedback-left');
  });
  fc.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    fc.classList.remove('swiping');
    const dx = xc - x0;
    if (Math.abs(dx) > CFG.SWIPE_THRESHOLD) {
      const s = dx > 0 ? 2 : 0;
      fc.classList.add(dx > 0 ? 'swipe-right' : 'swipe-left');
      SRS.update(srsK, s);
      Progress.recordActivity();
      q.answer(s >= 1, s);
      setTimeout(() => { if (q.next()) qFlash(); else renderQuizResults(q); }, 300);
    } else {
      fc.style.transform = flipped ? 'rotateY(180deg)' : '';
      fc.classList.remove('swipe-feedback-left', 'swipe-feedback-right');
    }
  });
}

// --- Marathon (sans fin) ---

function qMarathon() {
  const q = curQuiz, item = q.current();
  if (!item) {
    // Recharger le pool pour continuer
    const newItems = getPool('marathon', q.ch !== undefined ? q.ch : -1, 20);
    if (!newItems.length) { renderQuizResults(q); return; }
    q.items.push(...newItems);
    q.total = q.items.length;
    return qMarathon();
  }

  const kr2fr = q.dir === 'kr2fr';
  const front = kr2fr ? item.kr : item.fr;
  const back = kr2fr ? item.fr : item.kr;
  const srsK = quizSrsKey(item);

  app.innerHTML = `
    <div style="text-align:center;font-size:13px;color:var(--text2);margin:8px 0">Marathon · ${q.score} correct${q.score > 1 ? 's' : ''} / ${q.idx + 1}</div>
    <div style="display:flex;flex-direction:column;align-items:center;padding:16px 0">
      <div class="flashcard-container">
        <div class="flashcard" id="fc">
          <div class="flashcard-face">
            <div class="flashcard-word">${escHtml(front)}</div>
            <div class="flashcard-hint">Toucher pour retourner</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="flashcard-word">${escHtml(back)}</div>
            ${item.rom ? `<div class="flashcard-hint rom-text">${escHtml(item.rom)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="srs-buttons" id="srsActions" style="opacity:0;pointer-events:none;transition:opacity 0.3s;width:100%;max-width:340px">
        <button class="srs-btn srs-btn-hard" data-s="0">Difficile</button>
        <button class="srs-btn srs-btn-review" data-s="1">A revoir</button>
        <button class="srs-btn srs-btn-known" data-s="2">Connu</button>
      </div>
      <button class="btn btn-secondary mt-16" onclick="quitQuiz()">Quitter (${q.score}/${q.idx})</button>
    </div>
  `;

  const fc = $('#fc'), actions = $('#srsActions');
  let flipped = false;
  fc.addEventListener('click', () => {
    if (!flipped) { fc.classList.add('flipped'); flipped = true; actions.style.opacity = '1'; actions.style.pointerEvents = 'auto'; }
  });
  fc.setAttribute('tabindex', '0');
  fc.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !flipped) {
      e.preventDefault();
      fc.classList.add('flipped');
      flipped = true;
      actions.style.opacity = '1';
      actions.style.pointerEvents = 'auto';
    }
  });
  actions.addEventListener('click', e => {
    const b = e.target.closest('[data-s]');
    if (b) {
      const s = +b.dataset.s;
      SRS.update(srsK, s);
      Progress.recordActivity();
      q.answer(s >= 1, s);
      q.next();
      qMarathon();
    }
  });
}

// --- QCM ---

// Quiz QCM : 4 choix
function qQCM() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  const kr2fr = q.dir === 'kr2fr';
  const question = kr2fr ? item.kr : item.fr;
  const correct = kr2fr ? item.fr : item.kr;

  // Distracteurs : meme chapitre/theme en priorite, puis le reste
  const pool = [...DATA.vocabulary, ...DATA.adjectives, ...DATA.adverbs, ...DATA.connectors].filter(v => v.kr !== item.kr && v.fr !== item.fr);
  const sameCh = pool.filter(v => v.ch === item.ch);
  const sameTheme = sameCh.filter(v => v.theme === item.theme);
  const candidates = sameTheme.length >= 3 ? sameTheme : sameCh.length >= 3 ? sameCh : pool;
  const distractors = shuffle(candidates).slice(0, 3).map(d => kr2fr ? d.fr : d.kr);
  const choices = shuffle([{ text: correct, ok: true }, ...distractors.map(d => ({ text: d, ok: false }))]);

  app.innerHTML = `
    ${quizBar(q)}
    <div class="quiz-question">${escHtml(question)}</div>
    ${item.rom && kr2fr && !Settings.get('hideRom') ? `<div class="quiz-hint">${escHtml(item.rom)}</div>` : ''}
    <div class="quiz-options" id="qcmOpts">
      ${choices.map((c, i) => `<button class="quiz-option" data-ok="${c.ok}" data-i="${i}">${escHtml(c.text)}</button>`).join('')}
    </div>
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
  `;

  let done = false;
  $('#qcmOpts').addEventListener('click', e => {
    if (done) return;
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    done = true;

    const ok = btn.dataset.ok === 'true';
    btn.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      const good = $('#qcmOpts').querySelector('[data-ok="true"]');
      if (good) good.classList.add('reveal');
    }

    q.answer(ok, btn.textContent.trim());
    handleQuizAnswer(q, quizSrsKey(item), ok, qQCM);
  });
}

// --- Ecriture ---

// Quiz ecriture : taper la reponse
function qEcriture() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  const kr2fr = q.dir === 'kr2fr';
  const question = kr2fr ? item.kr : item.fr;
  const expected = kr2fr ? item.fr : item.kr;

  app.innerHTML = `
    ${quizBar(q)}
    <div class="quiz-question">${escHtml(question)}</div>
    ${item.rom && kr2fr && !Settings.get('hideRom') ? `<div class="quiz-hint">${escHtml(item.rom)}</div>` : ''}
    <div style="padding:0 16px">
      <input type="text" class="search-input" id="writeIn" placeholder="${kr2fr ? 'Ecris en francais...' : 'Ecris en coreen...'}" autocomplete="off" style="text-align:center;font-size:16px">
      ${!kr2fr && !localStorage.getItem('blokaja_kb_help_dismissed') ? `
        <div class="keyboard-help" id="kbHelp">
          <div class="keyboard-help-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div>Clavier coreen requis. Sur mobile : Parametres &gt; Langues &gt; Ajouter "Coreen". Sur PC : Win+Espace ou Alt+Shift pour changer de clavier.</div>
          <button class="keyboard-help-dismiss" id="kbDismiss"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>` : ''}
      <div id="writeHint" style="text-align:center;font-size:13px;color:var(--text3);min-height:20px;margin:8px 0"></div>
      <div id="writeFb" style="text-align:center;min-height:40px;margin:8px 0"></div>
      <div class="flex gap-8">
        <button class="btn btn-secondary flex-1" id="hintBtn">Indice</button>
        <button class="btn btn-primary flex-1" id="valBtn">Valider</button>
      </div>
    </div>
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
  `;

  const input = $('#writeIn');
  let done = false, hinted = false;
  setTimeout(() => { input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);

  // Fermer l'aide clavier
  const kbDismiss = $('#kbDismiss');
  if (kbDismiss) kbDismiss.addEventListener('click', () => {
    localStorage.setItem('blokaja_kb_help_dismissed', '1');
    const help = $('#kbHelp');
    if (help) help.remove();
  });

  // Indice : premiere syllabe
  $('#hintBtn').addEventListener('click', () => {
    if (!hinted) {
      hinted = true;
      $('#writeHint').textContent = 'Indice : ' + expected.slice(0, Math.max(1, Math.ceil(expected.length / 4))) + '...';
    }
  });

  function validate() {
    if (done) return;
    done = true;
    const ans = input.value.trim();
    const norm = s => kr2fr ? stripAccents(s.toLowerCase().trim()) : s.replace(/\s+/g, '').trim();
    const ok = norm(ans) === norm(expected);

    q.answer(ok, ans);
    input.disabled = true;
    input.style.borderColor = ok ? 'var(--success)' : 'var(--danger)';

    const fb = $('#writeFb');
    fb.innerHTML = ok
      ? '<div style="color:var(--success);font-weight:600">Correct !</div>'
      : `<div style="color:var(--danger);font-weight:600">Incorrect</div><div style="font-size:14px;color:var(--text2)">Reponse : <strong style="color:var(--primary)">${escHtml(expected)}</strong></div>`;

    handleQuizAnswer(q, quizSrsKey(item), ok, qEcriture, 2);
  }

  $('#valBtn').addEventListener('click', validate);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') validate(); });
}

// --- Association ---

// Quiz association : relier les paires
function qAssociation() {
  const q = curQuiz;
  const count = Math.min(6, q.items.length - q.idx);
  if (count <= 0) return renderQuizResults(q);

  const pairs = q.items.slice(q.idx, q.idx + count);
  const left = shuffle([...pairs]), right = shuffle([...pairs]);
  let selLeft = null;
  const matched = new Set();
  const errorItems = new Set();
  let _matchHandler = null;

  function render() {
    app.innerHTML = `
      <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${matched.size / count * 100}%"></div></div>
      <div style="text-align:center;font-size:13px;color:var(--text2);margin:8px 0">${matched.size} / ${count}</div>
      <div class="match-columns">
        <div id="mL">${left.map((it, i) => `<div class="match-item ${matched.has(it.kr) ? 'matched' : ''} ${selLeft === i ? 'selected' : ''}" data-s="l" data-i="${i}" data-k="${escHtml(it.kr)}" style="font-weight:600">${escHtml(it.kr)}</div>`).join('')}</div>
        <div id="mR">${right.map((it, i) => `<div class="match-item ${matched.has(it.kr) ? 'matched' : ''}" data-s="r" data-i="${i}" data-k="${escHtml(it.kr)}">${escHtml(it.fr)}</div>`).join('')}</div>
      </div>
      <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
    `;

    if (_matchHandler) app.removeEventListener('click', _matchHandler);
    _matchHandler = function(e) {
      const el = e.target.closest('.match-item');
      if (!el || el.classList.contains('matched')) return;

      if (el.dataset.s === 'l') {
        selLeft = +el.dataset.i;
        render();
      } else if (el.dataset.s === 'r' && selLeft !== null) {
        const lItem = left[selLeft];
        const lk = lItem.kr, rk = el.dataset.k;
        const lSrsKey = quizSrsKey(lItem);
        if (lk === rk) {
          matched.add(lk);
          const wasError = errorItems.has(lk);
          SRS.update(lSrsKey, wasError ? 0 : 2);
          Progress.recordActivity();
          q.answer(!wasError, lk);
          selLeft = null;
          if (matched.size === count) {
            for (let i = 0; i < count; i++) q.next();
            setTimeout(() => { if (q.idx < q.items.length) qAssociation(); else renderQuizResults(q); }, 400);
          } else render();
        } else {
          el.style.borderColor = 'var(--danger)';
          errorItems.add(lk);
          setTimeout(() => { selLeft = null; render(); }, 500);
        }
      }
    };
    app.addEventListener('click', _matchHandler);
  }
  render();
}

// --- Dictee ---

// Quiz dictee : ecouter et ecrire en coreen
function qDictee() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  let hasKoVoice = false;
  try { hasKoVoice = speechSynthesis.getVoices().some(v => v.lang.startsWith('ko')); } catch (e) {}

  // Synthese vocale coreenne
  function speak() {
    try {
      const u = new SpeechSynthesisUtterance(item.kr);
      u.lang = 'ko-KR';
      u.rate = 0.8;
      if (koVoice) u.voice = koVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  app.innerHTML = `
    ${quizBar(q)}
    <div style="text-align:center;padding:24px 0">
      <button class="btn btn-primary" id="playBtn" style="width:64px;height:64px;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
      </button>
      ${!hasKoVoice ? `
        <div style="font-size:14px;color:var(--accent);margin-top:12px;background:var(--accent-light);padding:10px 16px;border-radius:10px;line-height:1.5">
          <div style="font-weight:600;margin-bottom:4px">Pas de voix coreenne detectee</div>
          ${item.rom ? `<div style="font-style:italic;color:var(--primary)">${escHtml(item.rom)}</div>` : ''}
          <div style="font-size:12px;color:var(--text3);margin-top:4px">Ecris le mot correspondant en coreen</div>
        </div>` : ''}
      <div style="font-size:13px;color:var(--text2);margin-top:8px">${hasKoVoice ? 'Ecoute et ecris en coreen' : 'Ecris le mot en coreen'}</div>
    </div>
    <div style="padding:0 16px">
      <input type="text" class="search-input" id="dictIn" placeholder="Ecris en coreen..." autocomplete="off" style="text-align:center;font-size:16px">
      <div id="dictFb" style="text-align:center;min-height:40px;margin:12px 0"></div>
      <div class="flex gap-8">
        <button class="btn btn-secondary flex-1" id="replayBtn">Reecouter</button>
        <button class="btn btn-primary flex-1" id="dictVal">Valider</button>
      </div>
    </div>
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
  `;

  const input = $('#dictIn');
  setTimeout(() => { speak(); input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
  $('#playBtn').addEventListener('click', speak);
  $('#replayBtn').addEventListener('click', speak);

  let done = false;
  function validate() {
    if (done) return;
    done = true;
    const ans = input.value.trim(), ok = ans.replace(/\s+/g, '') === item.kr.replace(/\s+/g, '');
    q.answer(ok, ans);
    input.disabled = true;
    input.style.borderColor = ok ? 'var(--success)' : 'var(--danger)';
    $('#dictFb').innerHTML = ok
      ? '<div style="color:var(--success);font-weight:600">Correct !</div>'
      : `<div style="color:var(--danger);font-weight:600">Incorrect</div><div style="font-size:14px;color:var(--text2)">Reponse : <strong>${escHtml(item.kr)}</strong> — ${escHtml(item.fr)}</div>`;
    handleQuizAnswer(q, quizSrsKey(item), ok, qDictee, 2);
  }
  $('#dictVal').addEventListener('click', validate);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') validate(); });
}

// --- Conjugaison ---

// Quiz conjugaison : trouver la bonne forme verbale
function qConjugaison() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  // Formes disponibles
  const forms = [];
  if (item.poli) forms.push({ label: 'Forme polie', answer: item.poli, key: 'poli' });
  if (item.fam) forms.push({ label: 'Forme informelle', answer: item.fam, key: 'fam' });
  if (item.passe) forms.push({ label: 'Forme passee', answer: item.passe, key: 'passe' });

  if (!forms.length) { if (q.next()) qConjugaison(); else renderQuizResults(q); return; }

  const form = forms[Math.floor(Math.random() * forms.length)];
  const allV = DATA.verbs.filter(v => v[form.key] && v.inf !== item.inf);
  const distractors = shuffle(allV).slice(0, 3).map(v => v[form.key]);
  const choices = shuffle([{ text: form.answer, ok: true }, ...distractors.map(d => ({ text: d, ok: false }))]);

  app.innerHTML = `
    ${quizBar(q)}
    <div class="quiz-question">${escHtml(item.inf)}</div>
    <div style="text-align:center;font-size:14px;color:var(--text2);margin-bottom:8px">${escHtml(item.fr)}</div>
    <div style="text-align:center;margin-bottom:16px"><span class="badge badge-vocab">${escHtml(form.label)}</span></div>
    <div class="quiz-options" id="conjOpts">
      ${choices.map(c => `<button class="quiz-option" data-ok="${c.ok}">${escHtml(c.text)}</button>`).join('')}
    </div>
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
  `;

  let done = false;
  $('#conjOpts').addEventListener('click', e => {
    if (done) return;
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    done = true;
    const ok = btn.dataset.ok === 'true';
    btn.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      const g = $('#conjOpts').querySelector('[data-ok="true"]');
      if (g) g.classList.add('reveal');
    }
    q.answer(ok, btn.textContent.trim());
    handleQuizAnswer(q, 'v:' + item.inf, ok, qConjugaison);
  });
}

// --- Particules ---

// Quiz particules : phrase a trou
function qParticules() {
  const q = curQuiz, item = q.current();
  if (!item) return renderQuizResults(q);

  // Toutes les particules uniques (longueur <= 3)
  const allP = [...new Set(DATA.particles.flatMap(p =>
    p.p.includes('/') ? p.p.split('/') : [p.p]
  ).filter(p => p.length > 0 && p.length <= 3))];
  allP.sort((a, b) => b.length - a.length);

  // Trouver une particule dans la phrase
  let found = null, blank = item.kr;
  for (const p of allP) {
    if (item.kr.includes(p)) { found = p; blank = item.kr.replace(p, '___'); break; }
  }

  if (!found) { if (q.next()) qParticules(); else renderQuizResults(q); return; }

  const distractors = shuffle(allP.filter(p => p !== found)).slice(0, 3);
  const choices = shuffle([{ text: found, ok: true }, ...distractors.map(d => ({ text: d, ok: false }))]);
  const info = DATA.particles.find(p => p.p.includes(found));

  app.innerHTML = `
    ${quizBar(q)}
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:13px;color:var(--text2);margin-bottom:12px">Complete la phrase :</div>
      <div style="font-size:22px;font-weight:600;line-height:1.5">${escHtml(blank).replace('___', '<span style="color:var(--primary);border-bottom:2px dashed var(--primary);padding:0 4px">___</span>')}</div>
      <div style="font-size:14px;color:var(--text2);margin-top:8px;font-style:italic">${escHtml(item.fr)}</div>
    </div>
    <div class="grid-2-lg" style="padding:0 16px" id="partOpts">
      ${choices.map(c => `<button class="quiz-option" data-ok="${c.ok}" data-p="${escHtml(c.text)}" style="text-align:center;font-size:18px;font-weight:600">${escHtml(c.text)}</button>`).join('')}
    </div>
    <div id="partExpl" style="padding:0 16px;margin-top:12px;min-height:40px"></div>
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>
  `;

  let done = false;
  $('#partOpts').addEventListener('click', e => {
    if (done) return;
    const btn = e.target.closest('.quiz-option');
    if (!btn) return;
    done = true;
    const ok = btn.dataset.ok === 'true';
    btn.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      const g = $('#partOpts').querySelector('[data-ok="true"]');
      if (g) g.classList.add('reveal');
    }

    // Explication apres reponse
    if (info) {
      $('#partExpl').innerHTML = `<div class="card" style="border-left:3px solid var(--primary)">
        <div style="font-weight:600;color:var(--primary)">${escHtml(info.p)} — ${escHtml(info.name || '')}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:4px">${escHtml(info.fn || '')}</div>
      </div>`;
    }

    q.answer(ok, btn.dataset.p);
    // Delai un peu plus long pour lire l'explication
    SRS.update(vocabSrsKey(item), ok ? 1 : 0);
    Progress.recordActivity();
    if (q.next()) {
      setTimeout(qParticules, 1200);
    } else {
      setTimeout(() => renderQuizResults(q), 1200);
    }
  });
}

// --- Resultats ---

// Page de resultats unique pour tous les modes quiz
function renderQuizResults(quiz) {
  if (!quiz) return navigate('#quiz');
  _quizCleanup();
  const score = quiz.score, total = quiz.total;
  const pct = Math.round(score / total * 100);
  if (pct === 100 && total >= 10) localStorage.setItem('blokaja_perfect', 'true');
  const errors = quiz.answers.filter(a => !a.correct);

  let msg, mascot;
  if (pct >= 90) { msg = 'Excellent !'; mascot = MASCOT_HAPPY_SVG; }
  else if (pct >= 70) { msg = 'Tres bien !'; mascot = MASCOT_HAPPY_SVG; }
  else if (pct >= 50) { msg = 'Continue comme ca !'; mascot = MASCOT_SVG; }
  else { msg = 'Continue de reviser !'; mascot = MASCOT_SAD_SVG; }

  // Confetti pour les bons scores
  if (pct >= 80) setTimeout(showConfetti, 300);

  app.innerHTML = `
    <div class="page-center">
      <div class="mascot mascot-lg">${mascot}</div>
      <div class="quiz-score quiz-score-animated" style="margin-top:12px">${score}/${total}</div>
      <div class="text-title-md score-msg">${msg}</div>
      <div class="quiz-progress" style="margin:16px auto;max-width:300px"><div class="quiz-progress-fill" style="width:${pct}%;background:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--accent)' : 'var(--danger)'}"></div></div>
      <div style="font-size:14px;color:var(--text2)">${pct}% de bonnes reponses</div>
    </div>

    ${errors.length ? `
      <div class="section mt-16">
        <div class="section-title">Erreurs (${errors.length})</div>
        ${errors.map(e => `
          <div class="card mb-8 accent-border" style="border-color:var(--danger)">
            <div class="text-title-md">${escHtml(e.item.kr || e.item.inf || '')}</div>
            <div class="text-secondary">${escHtml(e.item.fr || '')}</div>
            ${e.userAnswer ? `<div class="text-caption mt-4" style="color:var(--danger)">Ta reponse : ${escHtml(String(e.userAnswer))}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="flex flex-col gap-8" style="padding:16px 0">
      <button class="btn btn-primary btn-block" id="restartBtn">Recommencer</button>
      ${errors.length ? '<button class="btn btn-secondary btn-block" id="reviewBtn">Reviser les erreurs</button>' : ''}
      <button class="btn btn-secondary btn-block" onclick="quitQuiz()">Retour au menu</button>
    </div>
  `;

  // Recommencer avec les memes parametres
  $('#restartBtn').addEventListener('click', () =>
    startQuiz(quiz.mode, quiz.ch !== undefined ? quiz.ch : -1, quiz.total, quiz.dir)
  );

  // Reviser uniquement les erreurs
  const rev = $('#reviewBtn');
  if (rev) rev.addEventListener('click', () => {
    curQuiz = new Quiz(quiz.mode, errors.map(e => e.item), quiz.dir);
    const renderers = { flashcards: qFlash, qcm: qQCM, ecriture: qEcriture, marathon: qFlash, dictee: qDictee, conjugaison: qConjugaison, particules: qParticules, association: qAssociation };
    (renderers[curQuiz.mode] || qFlash)();
  });
}


// ── 10b. REVISION DU JOUR ─────────────────────────

// Lance directement un quiz flashcard avec les items SRS a revoir
function startReviewSession() {
  setHeader('Révision du jour', true);
  const due = SRS.getDueItems();
  if (!due.length) {
    app.innerHTML = emptyStateHTML(MASCOT_HAPPY_SVG, 'Rien a reviser pour le moment', 'Apprends de nouveaux mots dans les chapitres, ils apparaitront ici quand il sera temps de les revoir.', '<button class="btn btn-secondary mt-16" onclick="location.hash=\'#cours\'">Retour aux cours</button>');
    return;
  }
  // Convertir les cles SRS en items pour le quiz (tous types)
  const items = [];
  due.forEach(d => {
    const k = d.key;
    let found = null;
    // Vocab / phrases (avec ou sans suffixe |ch pour homonymes)
    if (k.includes('|')) {
      const [kr, ch] = k.split('|');
      const chNum = +ch;
      found = DATA.vocabulary.find(v => v.kr === kr && v.ch === chNum);
      if (!found) found = DATA.phrases.find(p => p.kr === kr && p.ch === chNum);
    }
    if (!found) found = DATA.vocabulary.find(v => v.kr === k);
    if (!found) found = DATA.phrases.find(p => p.kr === k);
    // Verbes (prefix v:)
    if (!found && k.startsWith('v:')) found = DATA.verbs.find(v => v.inf === k.slice(2));
    // Expressions (prefix e:)
    if (!found && k.startsWith('e:')) found = DATA.expressions.find(e => (e.poli || e.inf || e.fr) === k.slice(2));
    // Adjectifs (prefix a:)
    if (!found && k.startsWith('a:')) found = DATA.adjectives.find(a => a.kr === k.slice(2));
    // Adverbes (prefix w:)
    if (!found && k.startsWith('w:')) found = DATA.adverbs.find(a => a.kr === k.slice(2));
    // Nombres (prefix n:)
    if (!found && k.startsWith('n:')) found = DATA.numbers.find(n => n.kr === k.slice(2));
    // Connecteurs (prefix c:)
    if (!found && k.startsWith('c:')) found = DATA.connectors.find(c => c.kr === k.slice(2));
    // Particules (prefix p:)
    if (!found && k.startsWith('p:')) found = DATA.particles.find(p => p.p === k.slice(2));
    // Hangeul (prefix h:)
    if (!found && k.startsWith('h:')) found = DATA.hangeul.find(h => h.l === k.slice(2));
    // Normaliser pour flashcard : besoin de kr et fr + srsKey original
    if (found) {
      const item = { kr: found.kr || found.inf || found.p || found.l || '', fr: found.fr || found.name || found.desc || '', rom: found.rom || '', _srsKey: k };
      if (item.kr && item.fr) items.push(item);
    }
  });
  if (!items.length) {
    app.innerHTML = '<div class="empty mt-24"><div class="empty-title">Rien à réviser</div><button class="btn btn-secondary mt-16" onclick="location.hash=\'#cours\'">Retour</button></div>';
    return;
  }
  curQuiz = new Quiz('flashcards', items.slice(0, 30), 'kr2fr');
  _quizGuardBack();
  qFlash(curQuiz);
}

// ── 10c. EXAMEN BLANC ─────────────────────────────

// Quiz melangeant tout : vocab + conjugaison + particules + expressions
function startExamBlanc() {
  setHeader('Examen blanc', true);
  const pool = [];
  // Vocab random
  const vocabPool = shuffle([...DATA.vocabulary]).slice(0, 15);
  vocabPool.forEach(v => pool.push({ kr: v.kr, fr: v.fr, rom: v.rom, ch: v.ch, type: 'vocab' }));
  // Verbes conjugaison
  const verbPool = shuffle(DATA.verbs.filter(v => v.poli || v.fam || v.passe)).slice(0, 5);
  verbPool.forEach(v => {
    const forms = [];
    if (v.poli) forms.push({ label: 'présent poli', form: v.poli });
    if (v.fam) forms.push({ label: 'présent informel', form: v.fam });
    if (v.passe) forms.push({ label: 'passé', form: v.passe });
    const f = forms[Math.floor(Math.random() * forms.length)];
    pool.push({ kr: v.inf, fr: v.fr + ' (' + f.label + ')', answer: f.form, type: 'conjugaison' });
  });
  // Expressions
  const exprPool = shuffle([...DATA.expressions]).slice(0, 5);
  exprPool.forEach(ex => {
    const kr = ex.poli || ex.inf || '';
    if (kr) pool.push({ kr, fr: ex.fr, rom: ex.rp || ex.ri || '', type: 'expression' });
  });
  // Particules (phrases a trous)
  const partPool = shuffle(DATA.particles.filter(p => p.ex && p.ex.length)).slice(0, 5);
  partPool.forEach(p => {
    if (p.ex && p.ex.length) {
      const ex = p.ex[0];
      const kr = typeof ex === 'object' ? ex.kr : (typeof ex === 'string' ? ex : '');
      const fr = typeof ex === 'object' ? ex.fr : '';
      if (kr) pool.push({ kr: kr, fr: fr || p.name || '', particle: p.p, type: 'particule' });
    }
  });

  if (pool.length < 10) {
    app.innerHTML = '<div class="empty mt-24"><div class="empty-title">Pas assez de données</div><button class="btn btn-secondary mt-16" onclick="history.back()">Retour</button></div>';
    return;
  }

  // Mode QCM sur le pool melange
  curQuiz = new Quiz('exam', shuffle(pool), 'kr2fr');
  _quizGuardBack();
  renderExamQuestion(curQuiz);
}

function renderExamQuestion(quiz) {
  const item = quiz.current();
  if (!item) { renderQuizResults(quiz); return; }

  const progress = `<div class="quiz-progress"><div class="quiz-progress-fill" style="width:${quiz.progress()*100}%"></div></div>
    <div style="text-align:center;font-size:13px;color:var(--text2);margin:8px 0">${quiz.idx+1} / ${quiz.total}</div>`;

  let questionHTML = '';
  let optionsHTML = '';

  if (item.type === 'conjugaison' && item.answer) {
    // Question conjugaison : affiche infinitif, demande la forme
    questionHTML = `<div class="quiz-question">${escHtml(item.kr)}</div><div class="text-body text-center mb-16">${escHtml(item.fr)}</div>`;
    const correct = item.answer;
    const distractors = DATA.verbs.filter(v => v.inf !== item.kr).map(v => v.poli || v.fam || v.passe).filter(Boolean);
    const choices = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
    optionsHTML = `<div class="quiz-options">${choices.map(c =>
      `<button class="quiz-option card" data-val="${escHtml(c)}" data-correct="${escHtml(correct)}">${escHtml(c)}</button>`
    ).join('')}</div>`;
  } else if (item.type === 'particule' && item.particle) {
    // Question particule : phrase avec trou — chercher la sous-particule presente dans la phrase
    const subParts = item.particle.includes('/') ? item.particle.split('/') : [item.particle];
    subParts.sort((a, b) => b.length - a.length);
    let foundP = subParts.find(sp => item.kr.includes(sp)) || item.particle;
    const phrase = item.kr.replace(foundP, '___');
    questionHTML = `<div class="quiz-question" style="font-size:20px">${escHtml(phrase)}</div><div class="text-body text-center mb-16">${escHtml(item.fr)}</div>`;
    const correct = foundP;
    const allParticles = [...new Set(DATA.particles.flatMap(p => p.p.includes('/') ? p.p.split('/') : [p.p]).filter(p => p.length > 0 && p.length <= 3 && p !== correct))];
    const choices = shuffle([correct, ...shuffle(allParticles).slice(0, 3)]);
    optionsHTML = `<div class="quiz-options">${choices.map(c =>
      `<button class="quiz-option card" data-val="${escHtml(c)}" data-correct="${escHtml(correct)}">${escHtml(c)}</button>`
    ).join('')}</div>`;
  } else {
    // Question vocab/expression standard : KR → FR
    questionHTML = `<div class="quiz-question">${escHtml(item.kr)}</div>${item.rom && !Settings.get('hideRom') ? `<div class="quiz-hint" style="font-style:normal">${escHtml(item.rom)}</div>` : ''}`;
    const correct = item.fr;
    const distractors = DATA.vocabulary.filter(v => v.fr !== correct).map(v => v.fr);
    const choices = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
    optionsHTML = `<div class="quiz-options">${choices.map(c =>
      `<button class="quiz-option card" data-val="${escHtml(c)}" data-correct="${escHtml(correct)}">${escHtml(c)}</button>`
    ).join('')}</div>`;
  }

  app.innerHTML = `${progress}${questionHTML}${optionsHTML}
    <div class="quiz-center"><button class="btn btn-secondary" onclick="quitQuiz()">Quitter</button></div>`;

  // Gestion de la reponse
  app.addEventListener('click', function _eq(e) {
    const btn = e.target.closest('.quiz-option');
    if (!btn || btn.classList.contains('correct') || btn.classList.contains('wrong')) return;
    app.removeEventListener('click', _eq);

    const val = btn.dataset.val;
    const correct = btn.dataset.correct;
    const ok = val === correct;

    btn.classList.add(ok ? 'correct' : 'wrong');
    if (!ok) {
      app.querySelectorAll('.quiz-option').forEach(b => {
        if (b.dataset.val === correct) b.classList.add('correct');
      });
    }

    let key;
    if (item.type === 'conjugaison') key = 'v:' + item.kr;
    else if (item.type === 'expression') key = 'e:' + item.kr;
    else if (item.type === 'particule') key = item.kr;
    else key = vocabSrsKey(item);
    handleQuizAnswer(curQuiz, key, ok, () => renderExamQuestion(curQuiz));
  });
}

// ── 10d. ONBOARDING ────────────────────────────────

function showOnboarding() {
  const steps = [
    {
      title: '한글 Bienvenue !',
      text: 'Blokaja t\'aide a reviser le coreen niveau A1. Vocabulaire, grammaire, conjugaisons, particules — tout y est.',
      icon: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>'
    },
    {
      title: 'Revise avec le SRS',
      text: 'Chaque mot a un niveau : Nouveau, Difficile, A revoir, Connu. L\'app te repropose les mots au bon moment grace a la repetition espacee.',
      icon: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/></svg>'
    },
    {
      title: '8 modes de quiz',
      text: 'Flashcards, QCM, ecriture, association, dictee, marathon, conjugaison et particules. Varie les plaisirs !',
      icon: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>'
    }
  ];

  let step = 0;
  function render() {
    const s = steps[step];
    const last = step === steps.length - 1;
    app.innerHTML = `
      <div class="onboarding">
        <div class="onboarding-dots">${steps.map((_, i) => `<div class="onboarding-dot ${i === step ? 'active' : ''}"></div>`).join('')}</div>
        <div class="onboarding-icon">${s.icon}</div>
        <div class="onboarding-title">${s.title}</div>
        <div class="onboarding-text">${s.text}</div>
        <button class="btn btn-primary btn-block" id="obNext">${last ? 'Commencer' : 'Suivant'}</button>
        ${!last ? '<button class="btn btn-secondary btn-block mt-8" id="obSkip">Passer</button>' : ''}
      </div>
    `;
    $('#obNext').addEventListener('click', () => {
      if (last) { finishOnboarding(); return; }
      step++;
      render();
    });
    const skip = $('#obSkip');
    if (skip) skip.addEventListener('click', finishOnboarding);
  }

  function finishOnboarding() {
    localStorage.setItem('blokaja_onboarded', '1');
    route();
  }

  render();
}


// ── 10e. MODE LECON GUIDEE ────────────────────────

// Lecon guidee : decouverte pas-a-pas + mini-quiz
function startLesson(chId) {
  setHeader('Lecon', true);

  // Items non vus (SRS level 0) du chapitre
  const newVocab = DATA.vocabulary.filter(v => v.ch === chId && v.fr && SRS.getLevel(vocabSrsKey(v)) === 0);
  const allVocab = DATA.vocabulary.filter(v => v.ch === chId && v.fr);
  const pool = newVocab.length >= 5 ? newVocab : allVocab;
  const items = shuffle(pool).slice(0, 5);

  if (!items.length) {
    app.innerHTML = '<div class="empty mt-24"><div class="empty-title">Pas de vocabulaire disponible</div><button class="btn btn-secondary mt-16" onclick="history.back()">Retour</button></div>';
    return;
  }

  let step = 0;
  let revealed = false;

  function renderStep() {
    const item = items[step];
    revealed = false;

    app.innerHTML = `
      <div style="padding:16px 0">
        <div class="lesson-dots">
          ${items.map((_, i) => `<div class="lesson-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}"></div>`).join('')}
        </div>
        <div class="text-caption text-center mb-16">Decouverte ${step + 1} / ${items.length}</div>
        <div class="lesson-card" id="lessonCard">
          <div class="lesson-kr">${escHtml(item.kr)} ${audioBtnHTML(item.kr)}</div>
          <div id="lessonReveal" class="lesson-reveal">
            ${item.rom ? `<div style="font-size:14px;color:var(--primary);font-style:italic;margin:8px 0" class="rom-text">${escHtml(item.rom)}</div>` : ''}
            <div style="font-size:20px;margin-top:12px">${escHtml(item.fr)}</div>
            ${item.theme ? `<span class="badge badge-vocab mt-8">${escHtml(item.theme)}</span>` : ''}
          </div>
          <div id="lessonTapHint" class="text-muted mt-24">Touche pour reveler</div>
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="btn btn-primary" id="lessonNext" style="display:none;min-width:160px">Suivant</button>
        </div>
        <div style="text-align:center;margin-top:12px">
          <button class="btn btn-secondary" onclick="history.back()">Quitter</button>
        </div>
      </div>
    `;

    // Auto-play audio
    setTimeout(() => speakKr(item.kr), 300);

    const card = $('#lessonCard');
    const nextBtn = $('#lessonNext');

    // Tap to reveal
    card.addEventListener('click', e => {
      if (e.target.closest('.audio-btn') || revealed) return;
      revealed = true;
      $('#lessonReveal').classList.add('visible');
      $('#lessonTapHint').style.display = 'none';
      nextBtn.style.display = '';
      // Marquer comme "vu" dans le SRS (level 1 = Difficile)
      if (SRS.getLevel(vocabSrsKey(item)) === 0) {
        SRS.update(vocabSrsKey(item), 0);
        Progress.recordActivity();
      }
    });

    // Next
    nextBtn.addEventListener('click', () => {
      step++;
      if (step < items.length) {
        renderStep();
      } else {
        startLessonQuiz();
      }
    });
  }

  function startLessonQuiz() {
    setHeader('Mini-quiz', true);
    app.innerHTML = `
      <div style="text-align:center;padding:32px 16px">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        <div class="heading-sheet" style="margin:16px 0">Bien joue !</div>
        <div class="text-body" style="margin-bottom:24px">Tu as decouvert ${items.length} mots. Teste-toi maintenant avec un mini-quiz !</div>
        <button class="btn btn-primary btn-block" id="startMiniQuiz">Commencer le quiz</button>
        <button class="btn btn-secondary btn-block mt-8" onclick="history.back()">Plus tard</button>
      </div>
    `;
    $('#startMiniQuiz').addEventListener('click', () => {
      curQuiz = new Quiz('flashcards', items, 'kr2fr');
      // Track lesson completion
      try {
        const count = JSON.parse(localStorage.getItem('blokaja_lessons') || '0');
        localStorage.setItem('blokaja_lessons', JSON.stringify(count + 1));
      } catch(e) {}
      qFlash();
    });
  }

  renderStep();
}


// ── 11. INIT ──────────────────────────────────────

// Charger la voix TTS coreenne
let koVoice = null;
if (window.speechSynthesis) {
  const loadVoices = () => {
    koVoice = speechSynthesis.getVoices().find(v => v.lang.startsWith('ko'));
  };
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
  loadVoices();
}

// Navigation par onglets
$$('.tab').forEach(t => t.addEventListener('click', () => {
  location.hash = '#' + t.dataset.tab;
}));

// Fermeture du bottom sheet via overlay ou Escape
$('#bottomSheetOverlay').addEventListener('click', closeBottomSheet);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#bottomSheet').classList.contains('visible')) closeBottomSheet();
});

// Bouton retour du header
$('#headerBack').addEventListener('click', () => history.back());

// Charger la progression au demarrage
Progress.load();

// Appliquer les settings (romanisation, dark mode)
applySettings();

// Toggle romanisation
$('#toggleRom').addEventListener('click', () => {
  const hidden = Settings.toggle('hideRom');
  applySettings();
  $('#toggleRom').classList.toggle('active', hidden);
  toast(hidden ? 'Romanisation masquee' : 'Romanisation affichee');
});
$('#toggleRom').classList.toggle('active', !!Settings.get('hideRom'));

// Toggle dark mode
$('#toggleDark').addEventListener('click', () => {
  const cur = Settings.get('darkMode');
  // cycle: null (auto) -> true (dark) -> false (light) -> null
  const next = cur === null ? true : cur === true ? false : null;
  Settings.set('darkMode', next);
  applySettings();
  const labels = { true: 'Mode sombre', false: 'Mode clair', null: 'Mode auto' };
  toast(labels[String(next)]);
});

// Ecouter le changement de theme systeme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (Settings.get('darkMode') === null) applySettings();
});

// Flush SRS avant fermeture de page
window.addEventListener('pagehide', () => SRS.flush());
window.addEventListener('beforeunload', () => SRS.flush());

// Delegation globale pour les boutons audio
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-speak]');
  if (btn) { e.stopPropagation(); speakKr(btn.dataset.speak); }
});

// Detecter les homonymes (meme kr, sens differents) pour disambiguer les cles SRS
(function buildCollisionSet() {
  const seen = {};
  [...DATA.vocabulary, ...DATA.phrases].forEach(item => {
    if (!item.kr || !item.fr) return;
    if (seen[item.kr] !== undefined && seen[item.kr] !== item.fr) {
      _srsCollisions.add(item.kr);
    }
    if (seen[item.kr] === undefined) seen[item.kr] = item.fr;
  });
})();

// Migration unique : copier les anciennes cles SRS vers les nouvelles cles disambiguees
(function migrateSrsCollisions() {
  if (localStorage.getItem('blokaja_srs_migrated_v2')) return;
  let changed = false;
  _srsCollisions.forEach(kr => {
    if (SRS.data[kr]) {
      const oldEntry = SRS.data[kr];
      [...DATA.vocabulary, ...DATA.phrases].filter(i => i.kr === kr && i.ch !== undefined).forEach(i => {
        const newKey = kr + '|' + i.ch;
        if (!SRS.data[newKey]) {
          SRS.data[newKey] = { ...oldEntry };
          changed = true;
        }
      });
      delete SRS.data[kr];
      changed = true;
    }
  });
  if (changed) {
    try { localStorage.setItem('blokaja_srs', JSON.stringify(SRS.data)); } catch(e) {}
  }
  localStorage.setItem('blokaja_srs_migrated_v2', '1');
})();

// Premier rendu (ou onboarding)
if (!localStorage.getItem('blokaja_onboarded')) {
  showOnboarding();
} else {
  route();
}
