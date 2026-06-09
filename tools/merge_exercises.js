// Fusionne les exercices de grammaire (data/new_exercises.json, produit par le
// workflow grammar-exercises) dans data/exercises.json.
// - valide (answer present ; mcq => 3 distracteurs distincts sans la bonne reponse)
// - dedupe par (chapter, context_kr|prompt_kr, answer)
// - attribue des IDs exg_ch{N}_### sequentiels par chapitre
//
// Usage : bun tools/merge_exercises.js [--apply]
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'data', 'exercises.json');
const NEW = path.join(ROOT, 'data', 'new_exercises.json');
const apply = process.argv.includes('--apply');

const cur = JSON.parse(fs.readFileSync(EX, 'utf8'));
const incoming = JSON.parse(fs.readFileSync(NEW, 'utf8'));
const list = cur.grammar_exercises;
const newOnes = incoming.exercises || incoming.grammar_exercises || [];

const keyOf = e => `${e.chapter}|${(e.context_kr || e.prompt_kr || '').replace(/\s+/g, '')}|${(e.answer || '').replace(/\s+/g, '')}`;
const seen = new Set(list.map(keyOf));
const seqByCh = {};
for (const e of list) {
  const m = /^exg_ch(\d+)_(\d+)$/.exec(e.id || '');
  if (m) { const c = m[1]; seqByCh[c] = Math.max(seqByCh[c] || 0, Number(m[2])); }
}

let added = 0, dup = 0, bad = 0;
for (const e of newOnes) {
  if (e.chapter == null || !e.answer || !e.prompt_fr || !e.mode) { bad++; continue; }
  if (e.mode === 'mcq') {
    const ds = [...new Set((e.distractors || []).filter(x => x && x !== e.answer))];
    if (ds.length < 3) { bad++; continue; }
    e.distractors = ds.slice(0, 3);
  } else {
    e.distractors = [];
  }
  const k = keyOf(e);
  if (seen.has(k)) { dup++; continue; }
  seen.add(k);
  const ch = e.chapter;
  seqByCh[ch] = (seqByCh[ch] || 0) + 1;
  const out = {
    id: `exg_ch${ch}_${String(seqByCh[ch]).padStart(3, '0')}`,
    grammar_id: e.grammar_id || null, chapter: ch, mode: e.mode, label: e.label || 'Grammaire',
    prompt_fr: e.prompt_fr, prompt_kr: e.prompt_kr || null, context_kr: e.context_kr || null,
    context_fr: e.context_fr || null, answer: e.answer, answer_alts: e.answer_alts || [],
    distractors: e.distractors, explanation: e.explanation || '', tts_answer: e.tts_answer || null,
  };
  list.push(out); added++;
}

list.sort((a, b) => (a.chapter - b.chapter) || a.id.localeCompare(b.id));
console.log(`=== merge_exercises ===`);
console.log(`  +${added} exercices (dup ${dup}, invalides ${bad}) | total = ${list.length}`);
if (apply) {
  fs.writeFileSync(EX, JSON.stringify(cur, null, 2) + '\n', 'utf8');
  console.log('--> écrit dans data/exercises.json');
} else {
  console.log('(rapport seul : relancer avec --apply)');
}
