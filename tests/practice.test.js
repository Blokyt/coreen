// Tests des fonctions pures de practice.js (nombres, heure, date, exercices).
const { test, expect, describe } = require('bun:test');
// buildConjugationExercise utilise le moteur global `conjugate`.
globalThis.conjugate = require('../conjugator.js').conjugate;
const P = require('../practice.js');

describe('nombres sino-coréens', () => {
  const cases = [[0,'영'],[1,'일'],[5,'오'],[10,'십'],[11,'십일'],[15,'십오'],[20,'이십'],
    [25,'이십오'],[100,'백'],[105,'백오'],[1000,'천'],[10000,'만'],[15000,'만오천'],
    [30000,'삼만'],[50000,'오만']];
  for (const [n, exp] of cases) test(`sinoNum(${n})=${exp}`, () => expect(P.sinoNum(n)).toBe(exp));
});

describe('nombres natifs', () => {
  const cases = [[1,false,'하나'],[1,true,'한'],[2,true,'두'],[3,true,'세'],[10,false,'열'],
    [11,false,'열하나'],[20,false,'스물'],[20,true,'스무'],[21,true,'스물한'],[5,false,'다섯']];
  for (const [n, b, exp] of cases) test(`nativeNum(${n},${b})=${exp}`, () => expect(P.nativeNum(n, b)).toBe(exp));
});

describe('heure / date / comptage', () => {
  test('7h45', () => expect(P.timeKorean(7, 45)).toBe('일곱 시 사십오 분'));
  test('2h15', () => expect(P.timeKorean(2, 15)).toBe('두 시 십오 분'));
  test('9h30 (반)', () => expect(P.timeKorean(9, 30)).toBe('아홉 시 반'));
  test('1h00', () => expect(P.timeKorean(1, 0)).toBe('한 시'));
  test('14/6 -> 유월', () => expect(P.dateKorean(6, 14)).toBe('유월 십사일'));
  test('1/10 -> 시월', () => expect(P.dateKorean(10, 1)).toBe('시월 일일'));
  test('5/3', () => expect(P.dateKorean(3, 5)).toBe('삼월 오일'));
  test('5 명 (natif)', () => expect(P.countKorean(5, { korean: '명', number_system: 'native-korean' })).toBe('다섯 명'));
  test('5 분 (sino)', () => expect(P.countKorean(5, { korean: '분', number_system: 'sino-korean' })).toBe('오 분'));
  test('3 그릇 (natif)', () => expect(P.countKorean(3, { korean: '그릇', number_system: 'native-korean' })).toBe('세 그릇'));
});

describe('checkAnswer / buildChoices', () => {
  test('insensible aux espaces', () => {
    const ex = { answer: '일곱 시 사십오 분', answer_alts: [] };
    expect(P.checkAnswer(ex, '일곱시 사십오분')).toBe(true);
    expect(P.checkAnswer(ex, '여덟 시')).toBe(false);
  });
  test('buildChoices : 4 choix uniques contenant la réponse', () => {
    const c = P.buildChoices('가요', ['먹어요', '해요', '봐요', '가요']);
    expect(c.length).toBe(4);
    expect(c).toContain('가요');
    expect(new Set(c).size).toBe(4);
  });
});

describe('buildConjugationExercise', () => {
  test('passé poli de 가다', () => {
    const ex = P.buildConjugationExercise({ id: 'v1', infinitive: '가다', irregular: null, french: 'aller', chapter: 1 },
      { key: 'pastPolite', label: 'passé poli' });
    expect(ex.answer).toBe('갔어요');
    expect(ex.choices).toContain('갔어요');
    expect(ex.choices.length).toBeGreaterThanOrEqual(2);
  });
  test('présent poli de 맵다 (ㅂ irrégulier)', () => {
    const ex = P.buildConjugationExercise({ id: 'a1', infinitive: '맵다', irregular: 'ㅂ', french: 'épicé', chapter: 5 },
      { key: 'presentPolite', label: 'présent poli' });
    expect(ex.answer).toBe('매워요');
  });
});
