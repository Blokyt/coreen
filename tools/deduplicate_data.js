/**
 * deduplicate_data.js
 *
 * Removes entries from phrases, adverbs, and connectors whose `kr` value
 * already exists in the vocabulary array, and fixes 3 romanisation errors.
 *
 * Usage: node tools/deduplicate_data.js
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data.js');

// --- Read and parse ---
const raw = fs.readFileSync(DATA_PATH, 'utf-8');

// Extract the header comment (lines 1-4)
const lines = raw.split('\n');
const headerLines = lines.slice(0, 4);
const header = headerLines.join('\n');

// Extract the DATA object by evaluating the JS
// We wrap it so `const DATA = ...` becomes an expression we can capture
const evalCode = raw.replace(/^const DATA\s*=\s*/, 'var DATA = ') + '\nDATA;';
const DATA = eval(evalCode);

// --- Collect stats before ---
const beforeCounts = {
  vocabulary: DATA.vocabulary.length,
  phrases: DATA.phrases.length,
  adverbs: DATA.adverbs.length,
  connectors: DATA.connectors.length,
};
console.log('=== BEFORE ===');
console.log(`vocabulary:  ${beforeCounts.vocabulary}`);
console.log(`phrases:     ${beforeCounts.phrases}`);
console.log(`adverbs:     ${beforeCounts.adverbs}`);
console.log(`connectors:  ${beforeCounts.connectors}`);

// --- Build vocabulary kr Set ---
const vocabKrSet = new Set(DATA.vocabulary.map(v => v.kr));

// --- Remove duplicates ---
const removedPhrases = DATA.phrases.filter(p => vocabKrSet.has(p.kr));
const removedAdverbs = DATA.adverbs.filter(a => vocabKrSet.has(a.kr));
const removedConnectors = DATA.connectors.filter(c => vocabKrSet.has(c.kr));

DATA.phrases = DATA.phrases.filter(p => !vocabKrSet.has(p.kr));
DATA.adverbs = DATA.adverbs.filter(a => !vocabKrSet.has(a.kr));
DATA.connectors = DATA.connectors.filter(c => !vocabKrSet.has(c.kr));

console.log('\n=== REMOVED DUPLICATES ===');
if (removedPhrases.length > 0) {
  console.log(`phrases removed (${removedPhrases.length}):`);
  removedPhrases.forEach(p => console.log(`  - ${p.kr} (${p.fr})`));
}
if (removedAdverbs.length > 0) {
  console.log(`adverbs removed (${removedAdverbs.length}):`);
  removedAdverbs.forEach(a => console.log(`  - ${a.kr} (${a.fr})`));
}
if (removedConnectors.length > 0) {
  console.log(`connectors removed (${removedConnectors.length}):`);
  removedConnectors.forEach(c => console.log(`  - ${c.kr} (${c.fr})`));
}
if (removedPhrases.length + removedAdverbs.length + removedConnectors.length === 0) {
  console.log('(none found)');
}

// --- Fix romanisation errors ---
const romFixes = [
  { kr: '숲', wrong: 'soup', correct: 'sup' },
  { kr: '지리', wrong: 'djili', correct: 'jiri' },
  { kr: '볼펜', wrong: 'bol pen', correct: 'bolpen' },
];

console.log('\n=== ROMANISATION FIXES ===');
for (const fix of romFixes) {
  const entry = DATA.vocabulary.find(v => v.kr === fix.kr);
  if (entry) {
    if (entry.rom === fix.wrong) {
      entry.rom = fix.correct;
      console.log(`  ${fix.kr}: "${fix.wrong}" -> "${fix.correct}"`);
    } else {
      console.log(`  ${fix.kr}: already "${entry.rom}" (expected "${fix.wrong}" to fix)`);
    }
  } else {
    console.log(`  ${fix.kr}: NOT FOUND in vocabulary!`);
  }
}

// --- Stats after ---
const afterCounts = {
  vocabulary: DATA.vocabulary.length,
  phrases: DATA.phrases.length,
  adverbs: DATA.adverbs.length,
  connectors: DATA.connectors.length,
};
console.log('\n=== AFTER ===');
console.log(`vocabulary:  ${afterCounts.vocabulary} (unchanged)`);
console.log(`phrases:     ${afterCounts.phrases} (was ${beforeCounts.phrases}, removed ${beforeCounts.phrases - afterCounts.phrases})`);
console.log(`adverbs:     ${afterCounts.adverbs} (was ${beforeCounts.adverbs}, removed ${beforeCounts.adverbs - afterCounts.adverbs})`);
console.log(`connectors:  ${afterCounts.connectors} (was ${beforeCounts.connectors}, removed ${beforeCounts.connectors - afterCounts.connectors})`);

// --- Serialize back to file ---
// We need to reproduce the original format as closely as possible.
// Strategy: re-read the original file and do targeted replacements for
// phrases, adverbs, connectors arrays, and the 3 romanisation fixes.

// Actually, let's take a smarter approach: work with the raw text directly.
// We'll find each array section and rebuild it.

let output = raw;

// Fix romanisation in the raw text
output = output.replace(
  /(\{kr:"숲",[^}]*rom:)"soup"/,
  '$1"sup"'
);
output = output.replace(
  /(\{kr:"지리",[^}]*rom:)"djili"/,
  '$1"jiri"'
);
output = output.replace(
  /(\{kr:"볼펜",[^}]*rom:)"bol pen"/,
  '$1"bolpen"'
);

// For arrays that need deduplication, we need to remove entries.
// We'll find the start and end of each array section and rebuild.

function removeEntriesFromArray(text, arrayName, krValuesToRemove) {
  if (krValuesToRemove.size === 0) return text;

  // Find the array in text
  const arrayStartRegex = new RegExp(`(\\s+${arrayName}:\\s*\\[)\\n`);
  const match = text.match(arrayStartRegex);
  if (!match) {
    console.error(`Could not find array: ${arrayName}`);
    return text;
  }

  const startIdx = text.indexOf(match[0]);

  // Find matching closing bracket - we need to count bracket depth
  let depth = 0;
  let arrayContentStart = startIdx + match[0].length;
  // Go back to find the '['
  let bracketStart = text.indexOf('[', startIdx);
  let i = bracketStart;
  let endIdx = -1;

  for (; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx === -1) {
    console.error(`Could not find end of array: ${arrayName}`);
    return text;
  }

  // Extract the array content (between [ and ])
  const arrayContent = text.substring(bracketStart + 1, endIdx);

  // Parse individual entries - split by top-level objects
  // Each entry is either a single-line {kr:...} or multi-line { \n kr:... \n }
  const entries = [];
  let current = '';
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;

  for (let j = 0; j < arrayContent.length; j++) {
    const ch = arrayContent[j];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\' && inString) {
      current += ch;
      escapeNext = true;
      continue;
    }

    if (ch === '"' && !escapeNext) {
      inString = !inString;
    }

    if (!inString) {
      if (ch === '{') {
        if (braceDepth === 0) {
          // Start of a new entry - keep leading whitespace
        }
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          current += ch;
          entries.push(current);
          current = '';
          continue;
        }
      }
    }

    if (braceDepth > 0) {
      current += ch;
    }
  }

  // Filter entries: remove those whose kr value is in the removal set
  const filteredEntries = entries.filter(entry => {
    // Extract kr value from the entry text
    const krMatch = entry.match(/kr:"([^"]*)"/);
    if (!krMatch) return true; // keep if we can't parse
    return !krValuesToRemove.has(krMatch[1]);
  });

  const removedCount = entries.length - filteredEntries.length;
  console.log(`\n${arrayName}: ${entries.length} entries -> ${filteredEntries.length} entries (removed ${removedCount})`);

  // Rebuild the array content
  // Reconstruct with proper formatting
  let newArrayContent = '\n';
  for (let k = 0; k < filteredEntries.length; k++) {
    const entry = filteredEntries[k].trim();
    // Check if it's multiline
    if (entry.includes('\n')) {
      newArrayContent += '    ' + entry;
    } else {
      newArrayContent += '    ' + entry;
    }
    if (k < filteredEntries.length - 1) {
      newArrayContent += ',\n';
    } else {
      newArrayContent += '\n';
    }
  }
  newArrayContent += '  ';

  // Replace in text
  const before = text.substring(0, bracketStart + 1);
  const after = text.substring(endIdx);
  return before + newArrayContent + after;
}

// Build sets of kr values to remove for each array
const phrasesKrToRemove = new Set(removedPhrases.map(p => p.kr));
const adverbsKrToRemove = new Set(removedAdverbs.map(a => a.kr));
const connectorsKrToRemove = new Set(removedConnectors.map(c => c.kr));

output = removeEntriesFromArray(output, 'phrases', phrasesKrToRemove);
output = removeEntriesFromArray(output, 'adverbs', adverbsKrToRemove);
output = removeEntriesFromArray(output, 'connectors', connectorsKrToRemove);

// Write output
fs.writeFileSync(DATA_PATH, output, 'utf-8');
console.log('\n=== DONE ===');
console.log(`Written to ${DATA_PATH}`);
