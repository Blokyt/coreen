// Tests du moteur de conjugaison coréen (conjugator.js).
const { test, expect, describe } = require('bun:test');
const C = require('../conjugator.js');

// Table de cas : [forme du dictionnaire, irrégularité (ou undefined=auto), clé de forme, attendu]
const CASES = [
  // ── Réguliers avec batchim ──
  ['먹다', undefined, 'presentPolite',   '먹어요'],
  ['먹다', undefined, 'pastPolite',      '먹었어요'],
  ['먹다', undefined, 'presentInformal', '먹어'],
  ['읽다', undefined, 'pastPolite',      '읽었어요'],
  ['앉다', undefined, 'presentPolite',   '앉아요'],
  ['좋다', undefined, 'presentPolite',   '좋아요'],   // ㅎ final mais régulier
  ['놓다', undefined, 'presentPolite',   '놓아요'],   // verbe en ㅎ : régulier
  ['넣다', undefined, 'presentPolite',   '넣어요'],   // verbe en ㅎ : régulier
  // ── Réguliers ouverts : contractions ──
  ['가다', undefined, 'presentPolite',   '가요'],
  ['서다', undefined, 'presentPolite',   '서요'],
  ['오다', undefined, 'presentPolite',   '와요'],
  ['보다', undefined, 'pastPolite',      '봤어요'],
  ['주다', undefined, 'presentPolite',   '줘요'],
  ['배우다', undefined, 'presentPolite', '배워요'],
  ['마시다', undefined, 'presentPolite', '마셔요'],
  ['기다리다', undefined, 'presentPolite','기다려요'],
  ['보내다', undefined, 'presentPolite', '보내요'],
  ['되다', undefined, 'presentPolite',   '돼요'],
  ['쉬다', undefined, 'presentPolite',   '쉬어요'],   // ㅟ : pas de contraction
  // ── 하다 ──
  ['하다', undefined, 'presentPolite',   '해요'],
  ['공부하다', undefined, 'pastPolite',  '공부했어요'],
  ['운동하다', undefined, 'negShort',    '운동 안 해요'],
  ['공부하다', undefined, 'conditional', '공부하면'],
  // ── ㅡ irrégulier ──
  ['쓰다', 'ㅡ', 'presentPolite',  '써요'],
  ['크다', 'ㅡ', 'presentPolite',  '커요'],
  ['바쁘다', 'ㅡ', 'presentPolite','바빠요'],
  ['슬프다', 'ㅡ', 'presentPolite','슬퍼요'],
  ['예쁘다', 'ㅡ', 'presentPolite','예뻐요'],
  // ── 르 irrégulier ──
  ['모르다', '르', 'presentPolite','몰라요'],
  ['부르다', '르', 'presentPolite','불러요'],
  ['빠르다', '르', 'presentPolite','빨라요'],
  ['고르다', '르', 'presentPolite','골라요'],
  // ── ㄷ irrégulier ──
  ['듣다', 'ㄷ', 'presentPolite',  '들어요'],
  ['듣다', 'ㄷ', 'pastPolite',     '들었어요'],
  ['걷다', 'ㄷ', 'honorificPolite','걸으세요'],
  // ── ㅂ irrégulier ──
  ['맵다', 'ㅂ', 'presentPolite',  '매워요'],
  ['춥다', 'ㅂ', 'presentPolite',  '추워요'],
  ['쉽다', 'ㅂ', 'presentPolite',  '쉬워요'],
  ['돕다', 'ㅂ', 'presentPolite',  '도와요'],
  // ── ㅅ irrégulier ──
  ['낫다', 'ㅅ', 'presentPolite',  '나아요'],
  ['짓다', 'ㅅ', 'presentPolite',  '지어요'],
  // ── ㅎ irrégulier (adjectifs) ──
  ['그렇다', 'ㅎ', 'presentPolite','그래요'],
  ['빨갛다', 'ㅎ', 'presentPolite','빨개요'],
  ['파랗다', 'ㅎ', 'presentPolite','파래요'],
  // ── ㄹ (radical en ㄹ) ──
  ['놀다', 'ㄹ', 'presentPolite',  '놀아요'],
  ['살다', 'ㄹ', 'presentPolite',  '살아요'],
  ['만들다', 'ㄹ', 'honorificPolite','만드세요'],
  ['알다', 'ㄹ', 'honorificPolite','아세요'],
  ['살다', 'ㄹ', 'conditional',    '살면'],
  // ── Futur ──
  ['먹다', undefined, 'future', '먹을 거예요'],
  ['가다', undefined, 'future', '갈 거예요'],
  ['만들다', 'ㄹ', 'future',    '만들 거예요'],
  ['듣다', 'ㄷ', 'future',      '들을 거예요'],
  ['맵다', 'ㅂ', 'future',      '매울 거예요'],
  // ── Connectives ──
  ['먹다', undefined, 'connectiveGo',  '먹고'],
  ['듣다', 'ㄷ', 'connectiveGo',       '듣고'],   // ㄷ ne change pas devant 고
  ['가다', undefined, 'connectiveSeo', '가서'],
  ['맵다', 'ㅂ', 'connectiveSeo',      '매워서'],
  // ── Conditionnel ──
  ['먹다', undefined, 'conditional', '먹으면'],
  ['가다', undefined, 'conditional', '가면'],
  ['듣다', 'ㄷ', 'conditional',      '들으면'],
  // ── Overrides ──
  ['있다', undefined, 'negShort',        '없어요'],
  ['있다', undefined, 'honorificPolite', '계세요'],
  ['있다', undefined, 'presentPolite',   '있어요'],
  ['없다', undefined, 'presentPolite',   '없어요'],
  ['알다', 'ㄹ', 'negShort',             '몰라요'],
  ['이다', undefined, 'presentPolite',   '이에요'],
  ['아니다', undefined, 'presentPolite', '아니에요'],
  ['드시다', undefined, 'presentPolite', '드세요'],
];

describe('conjugaison', () => {
  for (const [dict, irr, form, expected] of CASES) {
    const opts = irr === undefined ? {} : { irregular: irr };
    test(`${dict} → ${form} = ${expected}`, () => {
      expect(C.conjugate(dict, opts)[form]).toBe(expected);
    });
  }
});

describe('détection automatique', () => {
  const D = [
    ['가다', null], ['먹다', null], ['하다', '하다'], ['공부하다', '하다'],
    ['쓰다', 'ㅡ'], ['모르다', '르'], ['듣다', 'ㄷ'], ['받다', null],
    ['맵다', 'ㅂ'], ['잡다', null], ['낫다', 'ㅅ'], ['웃다', null],
    ['놀다', 'ㄹ'], ['좋다', null], ['그렇다', 'ㅎ'], ['이다', '이다'],
    ['놓다', null], ['넣다', null], ['빨갛다', 'ㅎ'], ['어떻다', 'ㅎ'],
  ];
  for (const [dict, exp] of D) {
    test(`detectIrregular(${dict}) = ${exp}`, () => {
      expect(C.detectIrregular(dict)).toBe(exp);
    });
  }
});

describe('helpers Hangeul', () => {
  test('decompose 먹', () => { const d = C.decompose('먹'); expect(C.JONGSEONG[d.jong]).toBe('ㄱ'); });
  test('hasBatchim 먹 / 가', () => { expect(C.hasBatchim('먹')).toBe(true); expect(C.hasBatchim('가')).toBe(false); });
  test('compose(0,0,0) = 가', () => { expect(C.compose(0, 0, 0)).toBe('가'); });
  test('harmony 가 / 먹', () => { expect(C.harmony('가')).toBe('아'); expect(C.harmony('먹')).toBe('어'); });
  test('setJong 가 + ㅆ = 갔', () => { expect(C.setJong('가', C.JONGSEONG.indexOf('ㅆ'))).toBe('갔'); });
});
