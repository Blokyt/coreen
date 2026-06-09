// conjugator.js — Moteur de conjugaison coréenne A1 pour Blokaja.
//
// Pur (pas de DOM). Chargé via <script src="conjugator.js"></script> AVANT app.js
// (les fonctions deviennent globales pour les autres scripts classiques), et
// require('../conjugator.js') sous bun:test via le module.exports en bas.
//
// API principale :
//   conjugate(dictForm, { irregular, pos, stem }) -> { presentInformal, presentPolite,
//     pastInformal, pastPolite, future, negShort, negMot, negLong,
//     honorificPolite, connectiveGo, connectiveSeo, conditional }
//
// Couvre : réguliers + irréguliers ㅂ / ㄷ / ㅡ / 르 / ㄹ / ㅅ / ㅎ / 하다, copule 이다.

// ───────────────────────── Constantes Unicode Hangeul ─────────────────────────
const HANGEUL_BASE = 0xAC00;
const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// Index de jungseong (voyelles) fréquents
const V = { A:0, AE:1, EO:4, E:5, YEO:6, O:8, WA:9, WAE:10, OE:11, U:13, WO:14, WI:16, EU:18, I:20 };
// Index de jongseong (finales) fréquents
const J = { NONE:0, L: JONGSEONG.indexOf('ㄹ'), B: JONGSEONG.indexOf('ㅂ'), D: JONGSEONG.indexOf('ㄷ'),
            S: JONGSEONG.indexOf('ㅅ'), H: JONGSEONG.indexOf('ㅎ'), SS: JONGSEONG.indexOf('ㅆ') };

// ───────────────────────── Helpers de décomposition ─────────────────────────
function isSyllable(ch) {
  if (!ch) return false;
  const c = ch.codePointAt(0);
  return c >= 0xAC00 && c <= 0xD7A3;
}
function decompose(ch) {
  const c = ch.codePointAt(0) - HANGEUL_BASE;
  if (c < 0 || c > 0xD7A3 - HANGEUL_BASE) return null;
  return { cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 };
}
function compose(cho, jung, jong) {
  return String.fromCodePoint(HANGEUL_BASE + (cho * 21 + jung) * 28 + jong);
}
function lastSyl(s) { return s ? s[s.length - 1] : ''; }
function getBatchim(s) { const d = decompose(lastSyl(s)); return d ? d.jong : 0; }
function hasBatchim(s) { return getBatchim(s) > 0; }
// Remplace la finale (batchim) de la dernière syllabe
function setJong(s, jongIdx) {
  const d = decompose(lastSyl(s));
  if (!d) return s;
  return s.slice(0, -1) + compose(d.cho, d.jung, jongIdx);
}
// Voyelle d'harmonie de la dernière syllabe : 아 si ㅏ/ㅗ, sinon 어
function harmony(s) {
  const d = decompose(lastSyl(s));
  if (!d) return '어';
  return (d.jung === V.A || d.jung === V.O) ? '아' : '어';
}

// ───────────────────────── Base 아/어 (어간 + connectif) ─────────────────────────
// Table de contraction quand le radical finit par une voyelle (syllabe ouverte).
// clé = index voyelle du radical -> { keep:true } (la voyelle absorbe 아/어)
//                                  | { to:index } (fusion en une nouvelle voyelle)
//                                  | absent -> on ajoute 아/어 en syllabe séparée
const CONTRACT = {
  [V.A]:   { keep: true },           // ㅏ + 아 → ㅏ   (가 → 가)
  [V.EO]:  { keep: true },           // ㅓ + 어 → ㅓ   (서 → 서)
  [V.AE]:  { keep: true },           // ㅐ + 어 → ㅐ   (보내 → 보내)
  [V.E]:   { keep: true },           // ㅔ + 어 → ㅔ   (세 → 세)
  [V.YEO]: { keep: true },           // ㅕ + 어 → ㅕ   (켜 → 켜)
  [V.O]:   { to: V.WA },             // ㅗ + 아 → ㅘ   (보 → 봐)
  [V.U]:   { to: V.WO },             // ㅜ + 어 → ㅝ   (추 → 춰)
  [V.I]:   { to: V.YEO },            // ㅣ + 어 → ㅕ   (마시 → 마셔)
  [V.OE]:  { to: V.WAE },            // ㅚ + 어 → ㅙ   (되 → 돼)
};

// Construit la base 아/어 (présent informel, sans 요), en appliquant l'irrégularité.
function aeoBase(stem, irregular) {
  // 하다 : 하 → 해
  if (stem.endsWith('하')) return stem.slice(0, -1) + '해';

  if (irregular === 'ㅡ') return _euDrop(stem);
  if (irregular === '르') return _reuStem(stem);
  if (irregular === 'ㅂ') {
    const d = decompose(lastSyl(stem));
    const open = setJong(stem, J.NONE);                 // retire le ㅂ
    return open + (d.jung === V.O ? '와' : '워');        // 돕→도와, sinon 매워
  }
  if (irregular === 'ㄷ') {
    const lifted = setJong(stem, J.L);                  // ㄷ → ㄹ
    return lifted + harmony(lifted);                    // 듣→들→들어
  }
  if (irregular === 'ㅅ') {
    const open = setJong(stem, J.NONE);                 // retire le ㅅ
    return open + harmony(open);                        // 낫→나→나아 (pas de contraction)
  }
  if (irregular === 'ㅎ') {
    const d = decompose(lastSyl(stem));
    return stem.slice(0, -1) + compose(d.cho, V.AE, J.NONE); // 그렇→그래, 빨갛→빨개
  }
  // Régulier (et ㄹ, qui ne change pas devant 아/어)
  if (hasBatchim(stem)) return stem + harmony(stem);
  // Syllabe ouverte : contraction éventuelle
  const d = decompose(lastSyl(stem));
  const rule = CONTRACT[d.jung];
  if (rule && rule.keep) return stem;
  if (rule && rule.to !== undefined) return stem.slice(0, -1) + compose(d.cho, rule.to, J.NONE);
  return stem + harmony(stem);                          // ex. 쉬 → 쉬어
}

// ㅡ irrégulier : élision du ㅡ, harmonie depuis la syllabe précédente
function _euDrop(stem) {
  const d = decompose(lastSyl(stem));
  const rest = stem.slice(0, -1);
  const h = rest ? harmony(rest) : '어';
  const newJung = (h === '아') ? V.A : V.EO;
  return rest + compose(d.cho, newJung, J.NONE);
}

// 르 irrégulier : ㄹ ajouté à la syllabe précédente, 르 → 라/러
function _reuStem(stem) {
  const prev = stem[stem.length - 2];
  const dp = decompose(prev);
  const withL = stem.slice(0, -2) + compose(dp.cho, dp.jung, J.L); // 모 → 몰
  const h = harmony(withL);
  const newJung = (h === '아') ? V.A : V.EO;
  return withL + compose(CHOSEONG.indexOf('ㄹ'), newJung, J.NONE); // + 라/러
}

// ───────────────────────── Passé (았/었) ─────────────────────────
function pastStem(stem, irregular) {
  const base = aeoBase(stem, irregular);
  return setJong(base, J.SS); // ajoute ㅆ à la dernière syllabe (먹어 → 먹었)
}

// ───────────────────────── Formes en 으 (futur, conditionnel, honorifique) ──────
// Retourne { s, eu } : s = radical transformé, eu = true si un 으 tampon est requis
// même quand s finit par une voyelle (cas ㅅ irrégulier) ou par un ㄹ issu de ㄷ.
function _euStem(stem, irregular) {
  if (stem.endsWith('하')) return { s: stem, eu: false };
  if (irregular === 'ㅂ') return { s: setJong(stem, J.NONE) + (decompose(lastSyl(stem)).jung === V.O ? '오' : '우'), eu: false };
  if (irregular === 'ㄷ') return { s: setJong(stem, J.L), eu: true };  // 듣→들, 들으-
  if (irregular === 'ㅅ') return { s: setJong(stem, J.NONE), eu: true }; // 낫→나, 나으-
  if (irregular === 'ㅎ') { const d = decompose(lastSyl(stem)); return { s: stem.slice(0, -1) + compose(d.cho, d.jung, J.NONE), eu: false }; } // 그렇→그러
  return { s: stem, eu: false };
}

function future(stem, irregular) {
  if (irregular === 'ㄹ' && getBatchim(stem) === J.L) return stem + ' 거예요'; // 살 거예요, 만들 거예요
  const { s, eu } = _euStem(stem, irregular);
  let base;
  if (eu) base = s + '을';                              // 들을, 나을
  else if (hasBatchim(s)) base = s + '을';              // 먹을
  else base = setJong(s, J.L);                          // 갈, 쓸, 모를, 더울, 그럴, 할
  return base + ' 거예요';
}

function conditional(stem, irregular) {
  if (irregular === 'ㄹ') return stem + '면';           // 살면, 만들면 (ㄹ conservé)
  const { s, eu } = _euStem(stem, irregular);
  if (eu) return s + '으면';                            // 들으면, 나으면
  if (hasBatchim(s)) return s + '으면';                 // 먹으면
  return s + '면';                                      // 가면, 쓰면, 더우면, 하면
}

function honorific(stem, irregular) {
  if (irregular === 'ㄹ') return setJong(stem, J.NONE) + '세요'; // 살→사세요, 만들→만드세요
  const { s, eu } = _euStem(stem, irregular);
  if (eu) return s + '으세요';                          // 들으세요, 나으세요
  if (hasBatchim(s)) return s + '으세요';               // 읽으세요
  return s + '세요';                                    // 가세요, 쓰세요, 하세요
}

// ───────────────────────── Négation ─────────────────────────
function negShort(stem, irregular, presentPol) {
  // noun + 하다 → noun 안 해요
  if (stem.endsWith('하') && stem.length > 1) return stem.slice(0, -1) + ' 안 해요';
  return '안 ' + presentPol;
}
function negMot(stem, presentPol) {
  if (stem.endsWith('하') && stem.length > 1) return stem.slice(0, -1) + ' 못 해요';
  return '못 ' + presentPol;
}
function negLong(stem) { return stem + '지 않아요'; }

// ───────────────────────── Surcharges manuelles ─────────────────────────
const CONJUGATION_OVERRIDES = {
  '이다':   { presentInformal:'이야', presentPolite:'이에요', pastInformal:'이었어', pastPolite:'이었어요',
              future:'일 거예요', negShort:'아니에요', negMot:null, negLong:null,
              honorificPolite:'이세요', connectiveGo:'이고', connectiveSeo:'이어서', conditional:'이면' },
  '아니다': { presentInformal:'아니야', presentPolite:'아니에요', pastInformal:'아니었어', pastPolite:'아니었어요',
              future:'아닐 거예요', negShort:null, negMot:null, negLong:null,
              honorificPolite:'아니세요', connectiveGo:'아니고', connectiveSeo:'아니어서', conditional:'아니면' },
  '있다':   { negShort:'없어요', honorificPolite:'계세요' },
  '없다':   { negShort:null, negMot:null, honorificPolite:'안 계세요' },
  '알다':   { negShort:'몰라요' },
  '드시다': { presentInformal:'드셔', presentPolite:'드세요', pastInformal:'드셨어', pastPolite:'드셨어요',
              honorificPolite:'드세요', future:'드실 거예요', conditional:'드시면' },
  '맛없다': { },
};

// ───────────────────────── Détection automatique de l'irrégularité ─────────────
// Listes blanches (les seules qui priment sur l'heuristique de la finale).
const IRREG_D_WHITELIST = new Set(['듣다','걷다','묻다','싣다','깨닫다','긷다']);
const IRREG_S_WHITELIST = new Set(['낫다','짓다','붓다','잇다','긋다','젓다']);
const REG_B_WHITELIST   = new Set(['잡다','뽑다','씹다','입다','접다','좁다','넓다','업다','굽다','곱씹다']);
const COPULA = new Set(['이다','아니다']);

function detectIrregular(dictForm) {
  if (!dictForm || !dictForm.endsWith('다')) return null;
  if (COPULA.has(dictForm)) return '이다';
  const stem = dictForm.slice(0, -1);
  const d = decompose(lastSyl(stem));
  if (!d) return null;
  if (stem.endsWith('하')) return '하다';
  const jong = d.jong, jung = d.jung;
  if (jong === J.NONE && jung === V.EU) return stem.endsWith('르') ? '르' : 'ㅡ';
  if (jong === J.B) return REG_B_WHITELIST.has(dictForm) ? null : 'ㅂ';
  if (jong === J.D) return IRREG_D_WHITELIST.has(dictForm) ? 'ㄷ' : null;
  if (jong === J.S) return IRREG_S_WHITELIST.has(dictForm) ? 'ㅅ' : null;
  if (jong === J.L) return 'ㄹ';
  if (jong === J.H && dictForm !== '좋다') return 'ㅎ'; // 좋다 est régulier
  return null;
}

// ───────────────────────── API publique ─────────────────────────
function getStem(dictForm) { return dictForm.endsWith('다') ? dictForm.slice(0, -1) : dictForm; }

function conjugate(dictForm, opts = {}) {
  let { irregular = undefined, stem = null } = opts;
  const s = stem || getStem(dictForm);
  if (irregular === undefined) irregular = detectIrregular(dictForm);
  if (irregular === '하다') irregular = null;            // 하다 géré dans aeoBase via le radical 하

  const base = aeoBase(s, irregular);
  const past = pastStem(s, irregular);
  const presentPolite = base + '요';

  const out = {
    presentInformal: base,
    presentPolite,
    pastInformal:    past + '어',
    pastPolite:      past + '어요',
    future:          future(s, irregular),
    negShort:        negShort(s, irregular, presentPolite),
    negMot:          negMot(s, presentPolite),
    negLong:         negLong(s),
    honorificPolite: honorific(s, irregular),
    connectiveGo:    s + '고',
    connectiveSeo:   base + '서',
    conditional:     conditional(s, irregular),
  };

  const ov = CONJUGATION_OVERRIDES[dictForm];
  if (ov) for (const k of Object.keys(ov)) out[k] = ov[k];
  return out;
}

// Exposition globale (navigateur) + export module (tests bun / node)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    conjugate, detectIrregular, getStem, aeoBase, pastStem, future, conditional, honorific,
    decompose, compose, hasBatchim, getBatchim, harmony, setJong, isSyllable,
    CHOSEONG, JUNGSEONG, JONGSEONG, CONJUGATION_OVERRIDES,
  };
}
