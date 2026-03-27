#!/usr/bin/env node
/**
 * verify_data.js — Outil de vérification croisée data.js ↔ unified_data.json
 *
 * Usage:
 *   node tools/verify_data.js search <mot_coréen>        → cherche dans la source
 *   node tools/verify_data.js compare <mot_coréen>        → compare source vs data.js
 *   node tools/verify_data.js field <mot_coréen> <champ>  → affiche un champ précis de la source (french, romanization, theme...)
 *   node tools/verify_data.js duplicates                  → liste les doublons dans data.js
 *   node tools/verify_data.js divergences                 → liste TOUTES les divergences data.js vs source
 *   node tools/verify_data.js stats                       → statistiques globales
 *   node tools/verify_data.js numbers-check               → vérifie le bug des filtres nombres (sys field)
 *   node tools/verify_data.js particles-check             → vérifie le champ examples vs ex dans les particules
 */

const fs = require('fs');
const path = require('path');

const SOURCE_PATH = path.join(__dirname, '..', 'extraction_data', 'unified_data.json');
const DATA_JS_PATH = path.join(__dirname, '..', 'data.js');

// Charger la source JSON
let source;
try {
  source = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
} catch (e) {
  console.error('ERREUR: Impossible de lire unified_data.json:', e.message);
  process.exit(1);
}

// Extraire toutes les entrées de la source qui ont un champ "korean"
function getSourceEntries() {
  const entries = [];
  function walk(obj, path = '') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (obj && typeof obj === 'object') {
      if (obj.korean) {
        entries.push({ ...obj, _path: path });
      }
      // Recurse into nested objects/arrays
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'object' && val !== null) {
          walk(val, path ? `${path}.${key}` : key);
        }
      }
    }
  }
  walk(source);
  return entries;
}

// Charger data.js et extraire le DATA object
function getDataJsEntries() {
  const content = fs.readFileSync(DATA_JS_PATH, 'utf8');
  // Collect all kr/inf entries with their line numbers
  const lines = content.split('\n');
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match kr:"..." or inf:"..."
    const krMatch = line.match(/kr:"([^"]+)"/);
    const infMatch = line.match(/inf:"([^"]+)"/);
    const frMatch = line.match(/fr:"([^"]+)"/);
    const romMatch = line.match(/rom:"([^"]+)"/);
    const chMatch = line.match(/ch:(\d+)/);
    const themeMatch = line.match(/theme:"([^"]+)"/);

    if (krMatch || infMatch) {
      entries.push({
        korean: krMatch ? krMatch[1] : null,
        inf: infMatch ? infMatch[1] : null,
        french: frMatch ? frMatch[1] : null,
        rom: romMatch ? romMatch[1] : null,
        ch: chMatch ? parseInt(chMatch[1]) : null,
        theme: themeMatch ? themeMatch[1] : null,
        line: i + 1
      });
    }
  }
  return entries;
}

const cmd = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

if (!cmd) {
  console.log(`Usage:
  node tools/verify_data.js search <mot>        — cherche dans unified_data.json
  node tools/verify_data.js compare <mot>       — compare source vs data.js
  node tools/verify_data.js field <mot> <champ> — champ précis de la source
  node tools/verify_data.js duplicates          — doublons dans data.js
  node tools/verify_data.js divergences         — divergences data.js vs source
  node tools/verify_data.js stats               — statistiques
  node tools/verify_data.js numbers-check       — vérifie bug filtres nombres
  node tools/verify_data.js particles-check     — vérifie champ examples/ex`);
  process.exit(0);
}

if (cmd === 'search') {
  if (!arg1) { console.error('Usage: search <mot_coréen>'); process.exit(1); }
  const sourceEntries = getSourceEntries();
  const results = sourceEntries.filter(e => e.korean && e.korean.includes(arg1));
  console.log(`=== SOURCE: ${results.length} résultat(s) pour "${arg1}" ===`);
  results.forEach(r => {
    console.log(`  korean: "${r.korean}"`);
    console.log(`  french: "${r.french || ''}"`);
    console.log(`  romanization: "${r.romanization || ''}"`);
    console.log(`  theme: "${r.theme || ''}" | chapter: ${r.chapter ?? 'null'} | page: ${r.page || '?'}`);
    if (r.note) console.log(`  note: "${r.note}"`);
    console.log('  ---');
  });
}

else if (cmd === 'compare') {
  if (!arg1) { console.error('Usage: compare <mot_coréen>'); process.exit(1); }
  const sourceEntries = getSourceEntries();
  const dataEntries = getDataJsEntries();

  const srcResults = sourceEntries.filter(e => e.korean && e.korean.includes(arg1));
  const djsResults = dataEntries.filter(e =>
    (e.korean && e.korean.includes(arg1)) || (e.inf && e.inf.includes(arg1))
  );

  console.log(`=== "${arg1}" — SOURCE (${srcResults.length} entrées) vs DATA.JS (${djsResults.length} entrées) ===\n`);

  console.log('--- SOURCE (unified_data.json) ---');
  srcResults.forEach(r => {
    console.log(`  "${r.korean}" → fr:"${r.french || ''}" rom:"${r.romanization || ''}" ch:${r.chapter ?? '?'} p:${r.page || '?'}`);
  });

  console.log('\n--- DATA.JS ---');
  djsResults.forEach(r => {
    const k = r.korean || r.inf || '';
    console.log(`  L${r.line}: "${k}" → fr:"${r.french || ''}" rom:"${r.rom || ''}" ch:${r.ch ?? '?'}`);
  });

  // Check for french translation mismatches
  console.log('\n--- DIVERGENCES ---');
  let found = false;
  for (const djs of djsResults) {
    const k = djs.korean || djs.inf || '';
    // Find exact match in source
    const srcExact = srcResults.find(s => s.korean === k);
    if (srcExact) {
      // Compare french
      const srcFr = (srcExact.french || '').toLowerCase().trim();
      const djsFr = (djs.french || '').toLowerCase().trim();
      if (srcFr && djsFr && srcFr !== djsFr) {
        console.log(`  FRENCH DIFF L${djs.line}: data.js="${djs.french}" vs source="${srcExact.french}"`);
        found = true;
      }
      // Compare romanization (ignore [auto] prefix)
      const srcRom = (srcExact.romanization || '').replace(/^\[auto\]\s*/, '').toLowerCase().trim();
      const djsRom = (djs.rom || '').toLowerCase().trim().replace(/[.!]$/, '');
      if (srcRom && djsRom && srcRom !== djsRom) {
        console.log(`  ROM DIFF L${djs.line}: data.js="${djs.rom}" vs source="${srcExact.romanization}"`);
        found = true;
      }
    }
  }
  if (!found) console.log('  (aucune divergence détectée)');
}

else if (cmd === 'field') {
  if (!arg1 || !arg2) { console.error('Usage: field <mot> <champ>'); process.exit(1); }
  const sourceEntries = getSourceEntries();
  const results = sourceEntries.filter(e => e.korean && e.korean.includes(arg1));
  results.forEach(r => {
    console.log(`"${r.korean}" → ${arg2}: "${r[arg2] || '(absent)'}"`);
  });
}

else if (cmd === 'duplicates') {
  const dataEntries = getDataJsEntries();
  const seen = {};
  const dupes = [];
  for (const e of dataEntries) {
    const k = e.korean || e.inf || '';
    if (!k) continue;
    if (seen[k]) {
      dupes.push({ korean: k, lines: [seen[k].line, e.line], fr1: seen[k].french, fr2: e.french, rom1: seen[k].rom, rom2: e.rom });
    }
    if (!seen[k]) seen[k] = e;
  }
  console.log(`=== ${dupes.length} doublons trouvés dans data.js ===`);
  dupes.forEach(d => {
    const romDiff = d.rom1 !== d.rom2 ? ' ⚠️ ROM DIFF' : '';
    const frDiff = d.fr1 !== d.fr2 ? ' ⚠️ FR DIFF' : '';
    console.log(`  "${d.korean}" → L${d.lines[0]} & L${d.lines[1]}${romDiff}${frDiff}`);
    if (romDiff) console.log(`    rom: "${d.rom1}" vs "${d.rom2}"`);
    if (frDiff) console.log(`    fr: "${d.fr1}" vs "${d.fr2}"`);
  });
}

else if (cmd === 'divergences') {
  const sourceEntries = getSourceEntries();
  const dataEntries = getDataJsEntries();

  // Build source lookup by exact korean
  const srcByKr = {};
  for (const s of sourceEntries) {
    if (s.korean) {
      if (!srcByKr[s.korean]) srcByKr[s.korean] = [];
      srcByKr[s.korean].push(s);
    }
  }

  let frDiffs = [];
  let romDiffs = [];
  let notInSource = [];

  for (const d of dataEntries) {
    const k = d.korean || d.inf || '';
    if (!k || k.length < 2) continue;

    const srcList = srcByKr[k];
    if (!srcList || srcList.length === 0) {
      // Not found by exact match — might be a reformulation
      continue;
    }

    // Compare against first source entry
    const src = srcList[0];

    // French comparison
    const srcFr = (src.french || '').toLowerCase().trim();
    const djsFr = (d.french || '').toLowerCase().trim();
    if (srcFr && djsFr && srcFr !== djsFr) {
      frDiffs.push({ korean: k, line: d.line, datajs: d.french, source: src.french, page: src.page });
    }

    // Romanization comparison
    const srcRom = (src.romanization || '').replace(/^\[auto\]\s*/, '').toLowerCase().trim();
    const djsRom = (d.rom || '').toLowerCase().trim().replace(/[.!]$/, '');
    if (srcRom && djsRom && srcRom !== djsRom) {
      romDiffs.push({ korean: k, line: d.line, datajs: d.rom, source: src.romanization, page: src.page });
    }
  }

  console.log(`=== DIVERGENCES TRADUCTION (${frDiffs.length}) ===`);
  frDiffs.forEach(d => {
    console.log(`  L${d.line} "${d.korean}" → data.js: "${d.datajs}" | source (p.${d.page}): "${d.source}"`);
  });

  console.log(`\n=== DIVERGENCES ROMANISATION (${romDiffs.length}) ===`);
  romDiffs.forEach(d => {
    console.log(`  L${d.line} "${d.korean}" → data.js: "${d.datajs}" | source (p.${d.page}): "${d.source}"`);
  });
}

else if (cmd === 'numbers-check') {
  const dataContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // Find sys values in data.js numbers section
  const sysValues = new Set();
  const numRegex = /sys:"([^"]+)"/g;
  let m;
  while ((m = numRegex.exec(dataContent)) !== null) {
    sysValues.add(m[1]);
  }

  // Find filter values in app.js (renderNombres)
  const filterValues = [];
  const filterRegex = /(?:n\.sys\s*===\s*'([^']+)'|===\s*'(sino-korean|native-korean)'|data-nsys="([^"]*)")/g;
  while ((m = filterRegex.exec(appContent)) !== null) {
    const val = m[1] || m[2] || m[3];
    if (val && !filterValues.includes(val)) filterValues.push(val);
  }

  console.log('=== NUMBERS SYS FIELD CHECK ===');
  console.log('Valeurs sys dans les données:', [...sysValues]);
  console.log('Valeurs filtrées dans le code:', filterValues);

  const mismatches = filterValues.filter(f => !sysValues.has(f));
  if (mismatches.length) {
    console.log('❌ MISMATCH! Le code filtre par:', mismatches, 'mais ces valeurs N\'EXISTENT PAS dans les données.');
    console.log('   → Les pills de filtre afficheront 0 résultats.');
  } else {
    console.log('✅ Pas de mismatch.');
  }
}

else if (cmd === 'particles-check') {
  const dataContent = fs.readFileSync(DATA_JS_PATH, 'utf8');
  const appContent = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

  // Check if particles use "ex" or "examples" in DATA
  const hasEx = /particles:[\s\S]*?ex:\[/m.test(dataContent);
  const hasExamples = /particles:[\s\S]*?examples:\[/m.test(dataContent);

  // Check what the exam code looks for in APP
  const examUsesExamples = /p\.examples/.test(appContent);
  const examUsesEx = /p\.ex\b/.test(appContent);

  console.log('=== PARTICLES FIELD CHECK ===');
  console.log('Données particles utilisent "ex":', hasEx);
  console.log('Données particles utilisent "examples":', hasExamples);
  console.log('Code exam (startExamBlanc) cherche "p.examples":', examUsesExamples);
  console.log('Code rendu (renderParticles) cherche "p.ex":', examUsesEx);

  if (hasEx && !hasExamples && examUsesExamples) {
    console.log('❌ MISMATCH! Les données ont "p.ex" mais startExamBlanc() cherche "p.examples" → 0 questions particules dans l\'exam.');
  }
  if (hasEx && examUsesEx) {
    console.log('✅ renderParticles() utilise correctement "p.ex".');
  }
}

else if (cmd === 'stats') {
  const sourceEntries = getSourceEntries();
  const dataEntries = getDataJsEntries();

  console.log('=== STATISTIQUES ===');
  console.log(`Source (unified_data.json): ${sourceEntries.length} entrées avec champ "korean"`);
  console.log(`data.js: ${dataEntries.length} entrées (kr ou inf)`);

  // Data.js sections
  const content = fs.readFileSync(DATA_JS_PATH, 'utf8');
  const vocabCount = (content.match(/vocabulary:\s*\[/)) ? content.split('vocabulary:')[1].split('],')[0].split('{kr:').length - 1 : '?';
  const verbCount = (content.match(/verbs:\s*\[/)) ? content.split('verbs:')[1].split('],')[0].split('{inf:').length - 1 : '?';

  console.log(`\nSections data.js (approximatif):`);
  console.log(`  vocabulary: ~${vocabCount} entrées`);
  console.log(`  verbs: ~${verbCount} entrées`);

  // Chapters in source
  const chapters = {};
  sourceEntries.forEach(e => {
    const ch = e.chapter ?? 'null';
    chapters[ch] = (chapters[ch] || 0) + 1;
  });
  console.log('\nRépartition source par chapitre:', chapters);
}

else {
  console.error(`Commande inconnue: ${cmd}`);
  process.exit(1);
}
