// Fusionne les items A1 hors-livre (data/added_items.json, produit par le
// workflow a1-augmentation) dans data/course_data.json.
// - dedupe contre l'existant (par coreen, dans la meme categorie)
// - attribue des IDs neufs ({prefixe}_add_###)
// - mappe vers le schema de chaque categorie ; source="added", chapter=-1, page=null
// - verbes/adjectifs : pos + irregular (detectes) + korean_polite (moteur), conjugaison verifiee
//
// Usage : bun tools/merge_added.js            (rapport)
//         bun tools/merge_added.js --apply    (ecrit course_data.json)
const fs = require('fs');
const path = require('path');
const C = require(path.join(__dirname, '..', 'conjugator.js'));

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'course_data.json');
const ADDED = path.join(ROOT, 'data', 'added_items.json');
const apply = process.argv.includes('--apply');

const D = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const added = JSON.parse(fs.readFileSync(ADDED, 'utf8'));

const PREFIX = { vocabulary: 'voc', verbs: 'vrb', expressions: 'exp', adjectives: 'adj',
                 adverbs: 'adv', classifiers: 'clf', connectors: 'con' };

function canon(it, cat) {
  if (cat === 'verbs' || cat === 'adjectives') return it.infinitive || it.korean;
  if (cat === 'expressions') return it.polite ? it.polite.korean : (it.korean_formal || it.korean);
  return it.korean;
}
function asciiRom(s) { return (s || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '').trim(); }

const report = { added: {}, skipped_dup: {}, skipped_bad: {} };
let grandTotal = 0;

for (const cat of Object.keys(added)) {
  if (!PREFIX[cat]) { continue; }
  D[cat] = D[cat] || [];
  // index existant (coreen canonique) + prochain numero de sequence pour le prefixe
  const existing = new Set(D[cat].map(it => canon(it, cat)));
  let seq = 0;
  for (const it of D[cat]) {
    const m = /_add_(\d+)$/.exec(it.id || '');
    if (m) seq = Math.max(seq, Number(m[1]));
  }
  const batchSeen = new Set();
  report.added[cat] = 0; report.skipped_dup[cat] = 0; report.skipped_bad[cat] = 0;

  for (const raw of (added[cat] || [])) {
    const kr = (raw.korean || '').trim();
    if (!kr) { report.skipped_bad[cat]++; continue; }
    if (existing.has(kr) || batchSeen.has(kr)) { report.skipped_dup[cat]++; continue; }

    let item = null;
    const base = { romanization: asciiRom(raw.romanization), page: null, chapter: -1, source: 'added' };

    if (cat === 'verbs' || cat === 'adjectives') {
      if (!kr.endsWith('다')) { report.skipped_bad[cat]++; continue; }
      const irr = C.detectIrregular(kr);
      let forms;
      try { forms = C.conjugate(kr, irr !== null ? { irregular: irr } : {}); } catch (e) { forms = null; }
      if (!forms || !forms.presentPolite) { report.skipped_bad[cat]++; continue; }
      if (cat === 'verbs') {
        item = { infinitive: kr, french: raw.french, ...base, pos: 'verb', irregular: irr };
      } else {
        item = { infinitive: kr, korean: kr, french: raw.french, korean_polite: forms.presentPolite,
                 ...base, pos: 'adj', irregular: irr };
      }
    } else if (cat === 'vocabulary') {
      item = { korean: kr, french: raw.french, ...base, theme: (raw.theme || 'divers').toLowerCase(),
               word_type: raw.word_type || 'noun', notes: '' };
    } else if (cat === 'expressions') {
      item = { polite: { korean: kr, romanization: asciiRom(raw.romanization) },
               french: raw.french, register_formal: 'poli', ...base };
      delete item.romanization; // porte par polite.romanization
    } else if (cat === 'classifiers') {
      item = { korean: kr, french: raw.french, ...base,
               number_system: raw.number_system || 'native-korean',
               used_with_fr: raw.used_with_fr || raw.french };
    } else { // adverbs, connectors
      item = { korean: kr, french: raw.french, ...base };
    }
    if (!item.french) { report.skipped_bad[cat]++; continue; }

    seq++;
    item.id = `${PREFIX[cat]}_add_${String(seq).padStart(3, '0')}`;
    if (raw.example_kr) item.examples = [{ korean: raw.example_kr, french: raw.example_fr || '' }];
    D[cat].push(item);
    existing.add(kr); batchSeen.add(kr);
    report.added[cat]++; grandTotal++;
  }
}

// recompute meta
const ITEM_CATS = ['hangeul','vocabulary','verbs','grammar','particles','connectors','expressions',
  'dialogues','numbers','adjectives','adverbs','classifiers','pronunciation_rules','culture','time_expressions'];
D.meta.stats = {}; ITEM_CATS.forEach(c => D.meta.stats[c] = (D[c] || []).length);
D.meta.total_items = ITEM_CATS.reduce((s, c) => s + (D[c] || []).length, 0);

console.log('=== merge_added ===');
for (const cat of Object.keys(report.added)) {
  console.log(`  ${cat}: +${report.added[cat]} (dup ignorés ${report.skipped_dup[cat]}, invalides ${report.skipped_bad[cat]})`);
}
console.log(`  TOTAL ajoutés : ${grandTotal} | total_items=${D.meta.total_items}`);

if (apply) {
  fs.writeFileSync(DATA, JSON.stringify(D, null, 2) + '\n', 'utf8');
  console.log('--> écrit dans data/course_data.json');
} else {
  console.log('(rapport seul : relancer avec --apply)');
}
