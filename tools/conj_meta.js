// M6 : attribue `pos` + `irregular` aux verbes et adjectifs, en reutilisant le
// moteur teste (conjugator.js). Verifie que chaque presentPolite genere est non
// vide et compare aux conjugaisons stockees du livre pour reperer les divergences.
//
// Usage : bun tools/conj_meta.js          (rapport seul)
//         bun tools/conj_meta.js --apply  (ecrit pos+irregular dans course_data.json)
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'conjugator.js'));

const DATA = path.join(__dirname, '..', 'data', 'course_data.json');
const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const apply = process.argv.includes('--apply');

const COPULA = new Set(['이다', '아니다']);
const EXIST = new Set(['있다', '없다']);

function posFor(cat, dict) {
  if (COPULA.has(dict)) return 'copula';
  if (EXIST.has(dict)) return 'verb_exist';
  return cat === 'adjectives' ? 'adj' : 'verb';
}

const mismatches = [];
const empties = [];
let assigned = 0;

for (const cat of ['verbs', 'adjectives']) {
  for (const it of D[cat]) {
    const dict = it.infinitive || (typeof it.korean === 'string' && it.korean.endsWith('다') ? it.korean : null);
    if (!dict) { empties.push(`${cat}/${it.id} (pas de forme en 다: ${it.korean || it.infinitive})`); continue; }
    const irr = C.detectIrregular(dict);
    const pos = posFor(cat, dict);
    const f = C.conjugate(dict, irr !== null ? { irregular: irr } : {});
    if (!f.presentPolite) empties.push(`${cat}/${it.id} ${dict}`);
    // comparaison aux formes stockees
    const cj = it.conjugations || {};
    const checks = [['polite_present', f.presentPolite], ['polite_past', f.pastPolite]];
    for (const [key, gen] of checks) {
      const stored = cj[key];
      if (stored && gen && stored.replace(/\s+/g, '') !== gen.replace(/\s+/g, '')) {
        mismatches.push(`${cat}/${it.id} ${dict} [${key}] stocke=${stored} ≠ moteur=${gen}`);
      }
    }
    if (apply) {
      it.pos = pos;
      it.irregular = irr; // null = regulier
      assigned++;
    }
  }
}

console.log(`=== M6 pos+irregular ===`);
console.log(`verbes+adjectifs traites : ${D.verbs.length + D.adjectives.length}`);
console.log(`\n-- presentPolite vide (${empties.length}) --`);
empties.forEach(e => console.log('  ' + e));
console.log(`\n-- divergences moteur vs stocke (${mismatches.length}) --`);
mismatches.forEach(m => console.log('  ' + m));

if (apply) {
  fs.writeFileSync(DATA, JSON.stringify(D, null, 2) + '\n', 'utf8');
  console.log(`\n--> ecrit (${assigned} items pos+irregular)`);
} else {
  console.log(`\n(rapport seul : relancer avec --apply pour ecrire)`);
}
