# Card Quality Patch & Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 families of card bugs (Bug A: French answer leaking on front of verbs/adjectives ; Bug B: empty backs on 5 cards ; Bug C: 27 vocabulary cards missing romanization) and add a deterministic `check_quality.py` integrated into `rebuild-apk.py` to gate Play Store releases.

**Architecture:** Incremental construction of `check_quality.py` (Python stdlib only) by porting the JS card-rendering logic from `app.js`, then layering validation rules. Each rule is added with empirical verification against known bugs in the dataset. Once all rules are in place, the dataset is patched (5 backs + 27 romanizations) and `app.js` is patched (2 lines in `CARD` table). Final integration adds the check as step 1/5 of the build pipeline.

**Tech Stack:** Python 3 (stdlib only), vanilla JS (`app.js`), JSON data (`www/data/course_data.json`), Capacitor 8 build pipeline (`rebuild-apk.py`).

**Spec reference:** `docs/superpowers/specs/2026-04-29-card-quality-design.md`.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `check_quality.py` | **CREATE** (root) | Deterministic data-quality check: validation rules + console/JSON reporter + CLI |
| `app.js` | **MODIFY** (lines ~660-666) | Fix Bug A: change `fSub: getFr` → `fSub: getRom` for verbs/adjectives; add `bSub: getFr` for verbs |
| `www/data/course_data.json` | **MODIFY** | Patch Bug B (5 cards: 1 verb + 4 adjectives) and Bug C (27 vocabulary romanizations) |
| `rebuild-apk.py` | **MODIFY** (main + new function) | Add step 1/5 quality check, with `--skip-quality-check` flag (debug only) |
| `docs/superpowers/plans/2026-04-29-card-quality.md` | (this plan) | — |

The check_quality.py will grow to ~350 lines, structured in 6 sections (loader / accessors / renderer / rules / runner / CLI). Each task adds one bounded section.

---

## Verification Strategy

This project has no test framework (vanilla JS, no Jest/pytest). We adopt a pragmatic TDD-by-fixture approach:

- The current `course_data.json` *contains* the bugs identified in the audit. Each new validation rule must (a) detect its target bugs in the current dataset, (b) not produce false positives on healthy categories.
- After all rules are written, the dataset and `app.js` are patched. The check then must report **0 errors**.
- Every task ends with a verification command and an expected exit code or output snippet.

---

## Task 1: Bootstrap `check_quality.py` (CLI skeleton + JSON loader)

**Files:**
- Create: `check_quality.py`

- [ ] **Step 1: Create the file with CLI skeleton and JSON loader**

```python
#!/usr/bin/env python3
"""Blokaja deterministic quality check for course_data.json.

Validates card completeness, schema consistency, and rendering output
against the categories declared in app.js. Returns exit code 0 when no
errors are found (warnings are tolerated), 1 otherwise.
"""
import argparse
import json
import sys
from pathlib import Path

DATA_PATH = Path('www/data/course_data.json')

FLASHABLE = ['vocabulary', 'verbs', 'hangeul', 'numbers', 'expressions',
             'particles', 'time_expressions', 'classifiers', 'connectors',
             'adjectives', 'adverbs']
READABLE = ['grammar', 'culture', 'dialogues', 'pronunciation_rules']


def load_data():
    if not DATA_PATH.exists():
        print(f'ERROR: {DATA_PATH} not found', file=sys.stderr)
        sys.exit(2)
    with open(DATA_PATH, encoding='utf-8') as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description='Blokaja quality check')
    parser.add_argument('--json', action='store_true',
                        help='Output JSON instead of human-readable report')
    args = parser.parse_args()

    D = load_data()

    flashable_total = sum(len(D.get(c, [])) for c in FLASHABLE)
    readable_total = sum(len(D.get(c, [])) for c in READABLE)

    errors = []
    warnings = []

    if args.json:
        print(json.dumps({
            'ok': len(errors) == 0,
            'stats': {
                'flashable_total': flashable_total,
                'readable_total': readable_total,
                'errors_count': len(errors),
                'warnings_count': len(warnings),
            },
            'errors': errors,
            'warnings': warnings,
        }, ensure_ascii=False, indent=2))
    else:
        print('=== Blokaja Quality Check ===')
        print(f'Donnees : {DATA_PATH}')
        print(f'Cartes flashables : {flashable_total} - Lisibles : {readable_total}')
        print()
        print(f'ERREURS ({len(errors)})')
        print(f'WARNINGS ({len(warnings)})')
        print()
        if errors:
            print('ECHEC - corriger avant de builder une release.')
        else:
            print('OK - tous les controles sont passes.')

    sys.exit(0 if not errors else 1)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run smoke test**

Run: `python check_quality.py`
Expected output (on current dataset):
```
=== Blokaja Quality Check ===
Donnees : www/data/course_data.json
Cartes flashables : 1361 - Lisibles : 127

ERREURS (0)
WARNINGS (0)

OK - tous les controles sont passes.
```
Expected exit code: `0`.

- [ ] **Step 3: Smoke test JSON mode**

Run: `python check_quality.py --json`
Expected: valid JSON with `"ok": true`, `"flashable_total": 1361`, `"readable_total": 127`, empty `errors` and `warnings` arrays.

- [ ] **Step 4: Commit**

```bash
git add check_quality.py
git commit -m "feat: bootstrap check_quality.py with CLI and JSON loader"
```

---

## Task 2: Port JS accessors to Python

**Files:**
- Modify: `check_quality.py` (add helper functions)

The check needs to reproduce `getKr`, `getFr`, `getRom`, `verb_back`, `verb_extra`, `particle_sub`, `particle_extra`, `expr_sub`, `expr_rom`, and `normalize_expression` from `app.js:312-650`.

- [ ] **Step 1: Add accessor functions after `READABLE` constant**

Insert this block immediately after the `READABLE = [...]` line:

```python
# ========== JS accessors ported from app.js ==========

def normalize_expression(it):
    """Mirror app.js normalizeExpression()."""
    if 'korean_formal' in it:
        return {**it,
            'polite':   {'korean': it.get('korean_formal'),
                         'romanization': it.get('romanization_formal') or ''},
            'informal': {'korean': it.get('korean_informal'),
                         'romanization': it.get('romanization_informal') or ''}}
    if 'korean' in it and 'polite' not in it:
        return {**it, 'polite': {'korean': it['korean'],
                                 'romanization': it.get('romanization') or ''}}
    return it


def get_kr(it, c):
    if c == 'expressions':
        return (it.get('polite') or {}).get('korean') \
            or (it.get('informal') or {}).get('korean') or ''
    if c == 'verbs':       return it.get('infinitive') or ''
    if c == 'hangeul':     return it.get('letter') or ''
    if c == 'particles':   return it.get('particle') or ''
    if c == 'adjectives':  return it.get('infinitive') or it.get('korean') or ''
    return it.get('korean') or ''


def get_fr(it, c):
    if c == 'particles':
        return it.get('function_fr') or it.get('name_fr') or ''
    if c == 'numbers':
        n = it.get('numeral')
        sys_ = it.get('system')
        suf = ' (natif)' if sys_ == 'native-korean' else ' (sino)' if sys_ == 'sino-korean' else ''
        return ('' if n is None else str(n)) + suf
    if c == 'hangeul':
        return it.get('romanization') or ''
    return it.get('french') or ''


def get_rom(it, c):
    if c == 'expressions':
        return (it.get('polite') or {}).get('romanization') \
            or (it.get('informal') or {}).get('romanization') or ''
    return it.get('romanization') or ''


def verb_back(it):
    cj = it.get('conjugations') or {}
    return cj.get('polite_present') \
        or cj.get('informal_present') \
        or cj.get('polite_present_after_vowel') or ''
```

- [ ] **Step 2: Verify the file still runs**

Run: `python check_quality.py`
Expected: same OK output as Task 1, exit `0`.

- [ ] **Step 3: Commit**

```bash
git add check_quality.py
git commit -m "feat: port JS card accessors to Python in check_quality"
```

---

## Task 3: Port `buildFront` / `buildBack` to Python

**Files:**
- Modify: `check_quality.py`

Reproduce the declarative `CARD` table from `app.js:654-685` so we can simulate every flashable card's rendered output.

- [ ] **Step 1: Add `CARD_CONFIG` table and `build_front` / `build_back` functions**

Insert after the accessor block from Task 2:

```python
# ========== Declarative CARD table (mirrors app.js) ==========
# Each entry returns the strings used at each slot.

def _front_main(it, c):
    if c == 'expressions': return get_fr(it, c)
    if c == 'numbers':
        n = it.get('numeral')
        return '' if n is None else str(n)
    return get_kr(it, c)


def _front_sub(it, c):
    # POST-PATCH expectations: verbs/adjectives use romanization.
    if c in ('vocabulary', 'time_expressions', 'adverbs',
             'connectors', 'classifiers', 'verbs', 'adjectives'):
        return get_rom(it, c)
    return ''


def _back_main(it, c):
    if c in ('vocabulary', 'time_expressions', 'adverbs',
             'connectors', 'classifiers'):
        return get_fr(it, c)
    if c == 'verbs':       return verb_back(it)
    if c == 'adjectives':  return it.get('korean_polite') or ''
    if c == 'hangeul':     return get_rom(it, c)
    if c == 'numbers':     return get_kr(it, c)
    if c == 'particles':   return get_fr(it, c)
    if c == 'expressions': return get_kr(it, c)
    return ''


def build_front(it, c):
    """Return the front main string. Empty front = E004."""
    return _front_main(it, c)


def build_back(it, c):
    """Return the back main string. Empty back = E005."""
    return _back_main(it, c)
```

- [ ] **Step 2: Verify the file still runs**

Run: `python check_quality.py`
Expected: same OK output, exit `0`.

- [ ] **Step 3: Commit**

```bash
git add check_quality.py
git commit -m "feat: port buildFront/buildBack rendering to check_quality"
```

---

## Task 4: Add structural rules E001 / E002 / E003

**Files:**
- Modify: `check_quality.py`

E001 = missing `id`, E002 = duplicate `id`, E003 = invalid `chapter`. These are independent of card content rendering.

- [ ] **Step 1: Add the rules helper section after the `build_back` function**

```python
# ========== Validation rules ==========

def _err(errors, code, cat, iid, msg):
    errors.append({'code': code, 'cat': cat, 'id': iid or '?', 'msg': msg})


def _warn(warnings, code, cat, iid, msg):
    warnings.append({'code': code, 'cat': cat, 'id': iid or '?', 'msg': msg})


def check_structural(D, errors):
    """E001 missing id, E002 duplicate id, E003 invalid chapter."""
    valid_chapters = {ch.get('number') for ch in D.get('chapters', [])}
    valid_chapters.add(-1)  # -1 = lexique

    seen_ids = {}  # id -> "cat/index" of first occurrence
    for cat in FLASHABLE:
        for idx, raw in enumerate(D.get(cat, [])):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id')

            if not iid:
                _err(errors, 'E001', cat, f'#{idx}', 'id manquant')
                continue

            if iid in seen_ids:
                _err(errors, 'E002', cat, iid,
                     f'id duplique (deja vu en {seen_ids[iid]})')
            else:
                seen_ids[iid] = f'{cat}#{idx}'

            ch = it.get('chapter')
            if ch is None or ch not in valid_chapters:
                _err(errors, 'E003', cat, iid,
                     f'chapter invalide : {ch!r}')
```

- [ ] **Step 2: Wire `check_structural` into `main()`**

In `main()`, find the lines `errors = []` and `warnings = []`. Insert `check_structural(D, errors)` immediately after them:

```python
    errors = []
    warnings = []

    check_structural(D, errors)
```

- [ ] **Step 3: Verify on current dataset**

Run: `python check_quality.py`
Expected: still 0 errors, exit `0` (current data has unique IDs and valid chapters; we'll discover bugs in later tasks).

- [ ] **Step 4: Sanity check by introducing a temporary fault**

Edit `www/data/course_data.json`: rename one `id` to match another (any duplicate). Save. Run `python check_quality.py`.
Expected: at least one E002 error reported, exit `1`.

Restore the file: `git checkout www/data/course_data.json`.

Re-run: `python check_quality.py` → 0 errors, exit `0`.

- [ ] **Step 5: Commit**

```bash
git add check_quality.py
git commit -m "feat: add E001/E002/E003 structural rules"
```

---

## Task 5: Add rendering rules E004 / E005

**Files:**
- Modify: `check_quality.py`

E004 = `build_front` returns empty. E005 = `build_back` returns empty. These are the rules that must catch the 5 known empty-back bugs (1 verb + 4 adjectives).

- [ ] **Step 1: Add `check_rendering` function after `check_structural`**

```python
def check_rendering(D, errors):
    """E004 empty front, E005 empty back (post-normalization)."""
    for cat in FLASHABLE:
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            if not build_front(it, cat):
                _err(errors, 'E004', cat, iid, 'recto vide')
            if not build_back(it, cat):
                _err(errors, 'E005', cat, iid, 'verso vide')
```

- [ ] **Step 2: Wire into `main()`**

Add this line in `main()` immediately after `check_structural(D, errors)`:

```python
    check_rendering(D, errors)
```

- [ ] **Step 3: Run and confirm the 5 known E005 bugs are detected**

Run: `python check_quality.py`
Expected: exit `1`, output contains 5 E005 errors:
- `[E005] verbs/vrb_ch0_001 : verso vide`
- `[E005] adjectives/adj_ch2_001 : verso vide`
- `[E005] adjectives/adj_ch6_001 : verso vide`
- `[E005] adjectives/adj_ch6_002 : verso vide`
- `[E005] adjectives/adj_ch6_003 : verso vide`

But errors are not yet printed by the reporter — only counted. Verify the count via:

Run: `python check_quality.py --json | python -c "import sys,json; d=json.load(sys.stdin); print('E005 count:', sum(1 for e in d['errors'] if e['code']=='E005'))"`
Expected: `E005 count: 5`.

- [ ] **Step 4: Commit**

```bash
git add check_quality.py
git commit -m "feat: add E004/E005 rendering rules — detects 5 empty-back cards"
```

---

## Task 6: Add schema rule E006

**Files:**
- Modify: `check_quality.py`

E006 verifies that each flashable card has the required fields declared by its category schema (per the spec).

- [ ] **Step 1: Add the schema table and `check_schema` function**

After `check_rendering`, insert:

```python
# Required fields per category (mirrors spec section "Schemas par categorie").
# Special markers: 'OR(a,b,...)' = at least one of these fields/paths must be truthy.
# 'PATH(a.b)' = nested path (dot-separated).

FLASHABLE_SCHEMA = {
    'vocabulary': ['korean', 'french', 'romanization', 'page', 'chapter', 'id'],
    'verbs': ['infinitive', 'french', 'romanization',
              'OR(conjugations.polite_present,conjugations.informal_present)',
              'page', 'chapter', 'id'],
    'hangeul': ['letter', 'romanization', 'type', 'page', 'chapter', 'id'],
    'numbers': ['numeral', 'korean', 'system', 'romanization',
                'page', 'chapter', 'id'],
    'expressions': ['OR(korean_formal,polite.korean)',
                    'french',
                    'OR(romanization_formal,romanization_informal,polite.romanization,informal.romanization)',
                    'page', 'chapter', 'id'],
    'particles': ['particle', 'OR(function_fr,name_fr)',
                  'page', 'chapter', 'id'],
    'time_expressions': ['korean', 'french', 'romanization',
                         'page', 'chapter', 'id'],
    'classifiers': ['korean', 'french', 'romanization',
                    'page', 'chapter', 'id'],
    'connectors': ['korean', 'french', 'romanization',
                   'page', 'chapter', 'id'],
    'adjectives': ['OR(korean,infinitive)', 'french', 'romanization',
                   'korean_polite', 'page', 'chapter', 'id'],
    'adverbs': ['korean', 'french', 'romanization',
                'page', 'chapter', 'id'],
}


def _path_get(d, path):
    """Resolve dot-path on a dict. Returns None if any segment is missing."""
    cur = d
    for seg in path.split('.'):
        if not isinstance(cur, dict) or seg not in cur:
            return None
        cur = cur[seg]
    return cur


def _has_field(it, spec):
    """Truthy on at least one field for OR(...), single field otherwise.

    A field is satisfied when its resolved value is not None and not the empty
    string. Numeric zero is allowed (e.g. chapter=0)."""
    if spec.startswith('OR(') and spec.endswith(')'):
        fields = [f.strip() for f in spec[3:-1].split(',')]
        return any(_has_field(it, f) for f in fields)
    val = _path_get(it, spec)
    return val is not None and val != ''


def check_schema(D, errors):
    for cat, fields in FLASHABLE_SCHEMA.items():
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            for f in fields:
                if not _has_field(it, f):
                    _err(errors, 'E006', cat, iid, f'champ requis : {f}')
```

- [ ] **Step 2: Wire into `main()`**

Add after `check_rendering(D, errors)`:

```python
    check_schema(D, errors)
```

- [ ] **Step 3: Run and analyze**

Run: `python check_quality.py --json | python -c "import sys,json,collections; d=json.load(sys.stdin); c=collections.Counter(e['code'] for e in d['errors']); print(c)"`
Expected (current state): a `Counter({'E006': N, 'E005': 5})` where N includes the 27 missing-romanization vocabulary cards, the 5 cards with missing required fields (verbs.conjugations, adjectives.korean_polite). Total E006 should be at least 32.

Note: it is acceptable if E006 reports more than expected (e.g. an unexpected missing field discovers a real issue). Inspect the output and decide whether to (a) fix the data later, (b) relax the schema. Document any deviations.

- [ ] **Step 4: Commit**

```bash
git add check_quality.py
git commit -m "feat: add E006 schema rule with per-category required fields"
```

---

## Task 7: Add E007 (duplicate content) and E008 (empty readable)

**Files:**
- Modify: `check_quality.py`

E007 = same `(korean, french)` pair appears twice in the same category. E008 = a `READABLE` item has no displayable content.

- [ ] **Step 1: Add `check_duplicates` and `check_readable` functions**

```python
def check_duplicates(D, errors):
    """E007 same (korean, french) pair within a category."""
    for cat in FLASHABLE:
        seen = {}
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            key = (get_kr(it, cat), get_fr(it, cat))
            if not key[0] and not key[1]:
                continue  # already flagged by E004/E005
            if key in seen:
                _err(errors, 'E007', cat, iid,
                     f'doublon de contenu (meme paire que {seen[key]})')
            else:
                seen[key] = iid


def check_readable(D, errors):
    """E008 readable item with no displayable text."""
    for cat in READABLE:
        for idx, it in enumerate(D.get(cat, [])):
            iid = it.get('id') or f'#{idx}'
            if cat == 'dialogues':
                lines = it.get('lines') or []
                if not lines or not any((l.get('korean') or l.get('french'))
                                        for l in lines):
                    _err(errors, 'E008', cat, iid, 'dialogue sans lignes')
                continue
            body = (it.get('explanation') or it.get('explanation_fr')
                    or it.get('body') or '')
            if not body:
                _err(errors, 'E008', cat, iid, 'aucun contenu lisible')
```

- [ ] **Step 2: Wire into `main()`**

Add after `check_schema(D, errors)`:

```python
    check_duplicates(D, errors)
    check_readable(D, errors)
```

- [ ] **Step 3: Run and inspect**

Run: `python check_quality.py --json | python -c "import sys,json,collections; d=json.load(sys.stdin); c=collections.Counter(e['code'] for e in d['errors']); print(c)"`
Expected: counter includes E007 if the dataset has duplicates (it may or may not — record the count). E008 should be 0 if all readable items have content.

If E007 reveals genuine duplicates that should be merged, list them but **do not** edit the data in this task — that is a content decision. Note them for a follow-up. If they look intentional (e.g. same word in two chapters as deliberate revision), consider relaxing the rule to scope-by-chapter.

For this plan, treat any unexpected E007/E008 as content findings to surface to the user before patching. If found, pause and confirm before proceeding to Task 8.

- [ ] **Step 4: Commit**

```bash
git add check_quality.py
git commit -m "feat: add E007 duplicate-content and E008 empty-readable rules"
```

---

## Task 8: Add warnings W001 / W002 / W003 / W004

**Files:**
- Modify: `check_quality.py`

Warnings are non-blocking. They surface lower-severity content gaps.

- [ ] **Step 1: Add `check_warnings` function**

```python
ROM_OK_RE = None  # lazy compile

def _is_ascii_rom(s):
    return all(ord(ch) < 128 for ch in s)


def check_warnings(D, warnings):
    """W001 missing romanization on a category that expects one,
    W002 page missing/<=0, W003 non-ASCII romanization, W004 empty notes."""
    for cat in FLASHABLE:
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'

            # W001 missing rom for expectant categories
            if cat in ('vocabulary', 'time_expressions', 'adverbs',
                       'connectors', 'classifiers', 'verbs', 'adjectives',
                       'hangeul'):
                if not get_rom(it, cat):
                    _warn(warnings, 'W001', cat, iid, 'romanisation absente')

            # W002 page missing/invalid
            page = it.get('page')
            if page is None or (isinstance(page, (int, float)) and page <= 0):
                _warn(warnings, 'W002', cat, iid, f'page invalide : {page!r}')

            # W003 non-ASCII romanization
            rom = get_rom(it, cat)
            if rom and not _is_ascii_rom(rom):
                _warn(warnings, 'W003', cat, iid,
                      f'romanisation non-ASCII : {rom!r}')

            # W004 empty notes
            if 'notes' in it and not it.get('notes'):
                _warn(warnings, 'W004', cat, iid, 'champ notes vide')
```

- [ ] **Step 2: Wire into `main()`**

Add after `check_readable(D, errors)`:

```python
    check_warnings(D, warnings)
```

- [ ] **Step 3: Verify the 27 W001 vocabulary cards are flagged**

Run: `python check_quality.py --json | python -c "import sys,json; d=json.load(sys.stdin); print('W001 count:', sum(1 for w in d['warnings'] if w['code']=='W001'))"`
Expected: at least 27 (the known vocabulary cards). Plus any W001 from cards that share the same gap.

- [ ] **Step 4: Commit**

```bash
git add check_quality.py
git commit -m "feat: add W001-W004 warnings (non-blocking)"
```

---

## Task 9: Format console output (full reporter) and finalize JSON output

**Files:**
- Modify: `check_quality.py`

Replace the placeholder reporter from Task 1 with one that prints each error/warning.

- [ ] **Step 1: Replace the reporter section in `main()`**

Find the block in `main()` starting with `if args.json:` and replace it with:

```python
    if args.json:
        print(json.dumps({
            'ok': len(errors) == 0,
            'stats': {
                'flashable_total': flashable_total,
                'readable_total': readable_total,
                'errors_count': len(errors),
                'warnings_count': len(warnings),
            },
            'errors': errors,
            'warnings': warnings,
        }, ensure_ascii=False, indent=2))
    else:
        print('=== Blokaja Quality Check ===')
        print(f'Donnees : {DATA_PATH}')
        print(f'Cartes flashables : {flashable_total} - Lisibles : {readable_total}')
        print()
        print(f'ERREURS ({len(errors)})')
        for e in errors:
            print(f"  [{e['code']}] {e['cat']}/{e['id']} : {e['msg']}")
        print()
        print(f'WARNINGS ({len(warnings)})')
        for w in warnings:
            print(f"  [{w['code']}] {w['cat']}/{w['id']} : {w['msg']}")
        print()
        if errors:
            print('ECHEC - corriger avant de builder une release.')
        else:
            print('OK - tous les controles sont passes.')
```

- [ ] **Step 2: Run and inspect output**

Run: `python check_quality.py 2>&1 | head -60`
Expected: a list of E005 (5 lines) and E006 (32+ lines) errors followed by the warnings header.

Run: `python check_quality.py; echo "Exit: $?"`
Expected: exit `1` (errors present in current pre-patch state).

- [ ] **Step 3: Commit**

```bash
git add check_quality.py
git commit -m "feat: format console reporter with full error/warning lines"
```

---

## Task 10: Verification gate — current dataset failure profile

**Files:**
- Read: `check_quality.py`, `www/data/course_data.json`

This is a verification-only task: confirm the check reports the *exact* set of bugs catalogued in the spec on the pre-patch dataset.

- [ ] **Step 1: Capture the baseline failure profile**

Run:
```bash
python check_quality.py --json > /tmp/baseline.json
python -c "
import json,collections
with open('/tmp/baseline.json') as f: d=json.load(f)
ec = collections.Counter(e['code'] for e in d['errors'])
wc = collections.Counter(w['code'] for w in d['warnings'])
print('Errors:', dict(ec))
print('Warnings:', dict(wc))
print('Total errors:', len(d['errors']))
print('Total warnings:', len(d['warnings']))
"
```

Expected:
- `E005` = exactly 5 (the empty backs).
- `E006` ≥ 32 (verb conjugations missing for 1 + adjective korean_polite for 4 + 27 vocab missing romanization).
- `W001` ≥ 27.
- No `E001/E002/E003/E004/E007/E008` unless surfacing genuine new findings.

- [ ] **Step 2: Surface any unexpected findings**

If E001/E002/E003/E004/E007/E008 fire on the current dataset, **stop and ask the user** before patching — these are surprises beyond the spec scope. List them and let the user decide whether to extend the spec, fix the rule, or fix the data.

If the failure profile matches the spec, proceed to Task 11.

- [ ] **Step 3: No commit** (verification only)

---

## Task 11: Patch `app.js` — Bug A (front shows romanization)

**Files:**
- Modify: `app.js` (lines ~660-666 in the `CARD` table)

- [ ] **Step 1: Update the `verbs` and `adjectives` entries**

Find this block in `app.js`:

```js
  verbs: {
    label: 'Verbe', fMain: getKr, fSub: getFr,
    bMain: verbBack, bExtra: verbExtra,
  },
  adjectives: {
    label: 'Adjectif', fMain: getKr, fSub: getFr,
    bMain: it => it.korean_polite || '', bSub: getFr,
  },
```

Replace with:

```js
  verbs: {
    label: 'Verbe', fMain: getKr, fSub: getRom,
    bMain: verbBack, bSub: getFr, bExtra: verbExtra,
  },
  adjectives: {
    label: 'Adjectif', fMain: getKr, fSub: getRom,
    bMain: it => it.korean_polite || '', bSub: getFr,
  },
```

Diff: `fSub: getFr` → `fSub: getRom` for both, plus addition of `bSub: getFr` for verbs only (adjectives already had it).

- [ ] **Step 2: Verify by inspection**

Run: `grep -n "label: 'Verbe'" app.js`
Expected: one match showing the new declaration.

Run: `grep -n "fSub: getRom" app.js`
Expected: at least 2 matches (verbs and adjectives).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "fix(cards): show romanization (not French) on verb/adjective fronts"
```

---

## Task 12: Patch data — 5 empty backs (Bug B)

**Files:**
- Modify: `www/data/course_data.json`

Five cards need new fields. Use a Python script to perform the edits deterministically.

- [ ] **Step 1: Write and run a patch script**

Create a temporary file `_patch_b.py` at the repo root:

```python
import json
from pathlib import Path

p = Path('www/data/course_data.json')
D = json.loads(p.read_text(encoding='utf-8'))

PATCHES = {
    # verbs
    'vrb_ch0_001': {
        'conjugations': {
            'polite_present': '써요',
            'informal_present': '써',
            'polite_past': '썼어요',
            'polite_negative': '안 써요',
        }
    },
    # adjectives
    'adj_ch2_001': {'korean_polite': '어때요'},
    'adj_ch6_001': {'korean_polite': '행복해요'},
    'adj_ch6_002': {'korean_polite': '슬퍼요'},
    'adj_ch6_003': {'korean_polite': '화가 나요'},
}

applied = []
for cat in ('verbs', 'adjectives'):
    for it in D.get(cat, []):
        if it.get('id') in PATCHES:
            it.update(PATCHES[it['id']])
            applied.append(it['id'])

missing = [k for k in PATCHES if k not in applied]
if missing:
    raise SystemExit(f'Missing IDs in dataset: {missing}')

p.write_text(json.dumps(D, ensure_ascii=False, indent=2) + '\n',
             encoding='utf-8')
print(f'Patched {len(applied)} cards: {applied}')
```

Run: `python _patch_b.py`
Expected: `Patched 5 cards: ['vrb_ch0_001', 'adj_ch2_001', 'adj_ch6_001', 'adj_ch6_002', 'adj_ch6_003']`.

- [ ] **Step 2: Verify the check now reports 0 E005 and 0 E006 from these 5 cards**

Run: `python check_quality.py --json | python -c "import sys,json; d=json.load(sys.stdin); print('E005:', sum(1 for e in d['errors'] if e['code']=='E005'))"`
Expected: `E005: 0`.

- [ ] **Step 3: Cleanup**

```bash
rm _patch_b.py
```

- [ ] **Step 4: Commit**

```bash
git add www/data/course_data.json
git commit -m "fix(data): patch 5 empty backs (1 verb conjugation + 4 adjectives korean_polite)"
```

---

## Task 13: Patch data — 27 vocabulary romanizations (Bug C)

**Files:**
- Modify: `www/data/course_data.json`

- [ ] **Step 1: Write and run a patch script**

Create `_patch_c.py`:

```python
import json
from pathlib import Path

p = Path('www/data/course_data.json')
D = json.loads(p.read_text(encoding='utf-8'))

ROMAN = {
    'voc_ch0_020': 'ai',
    'voc_ch0_021': 'yeou',
    'voc_ch0_022': 'yoyo',
    'voc_ch0_023': 'oi',
    'voc_ch0_024': 'uyu',
    'voc_ch0_025': 'gogi',
    'voc_ch0_026': 'gagu',
    'voc_ch0_027': 'na',
    'voc_ch0_028': 'nuna',
    'voc_ch0_029': 'namu',
    'voc_ch0_030': 'miso',
    'voc_ch0_031': 'ko',
    'voc_ch0_032': 'kuki',
    'voc_ch0_033': 'gudu',
    'voc_ch0_034': 'radio',
    'voc_ch0_035': 'beoteo',
    'voc_ch0_036': 'tomato',
    'voc_ch0_037': 'rubi',
    'voc_ch0_038': 'dari',
    'voc_ch0_039': 'binu',
    'voc_ch0_040': 'dubu',
    'voc_ch0_041': 'podo',
    'voc_ch0_042': 'pija',
    'voc_ch0_043': 'syeocheu',
    'voc_ch0_044': 'beoseu',
    'voc_ch0_045': 'saja',
    'voc_ch0_046': 'juseu',
}

applied = []
for it in D.get('vocabulary', []):
    if it.get('id') in ROMAN:
        it['romanization'] = ROMAN[it['id']]
        applied.append(it['id'])

missing = [k for k in ROMAN if k not in applied]
if missing:
    raise SystemExit(f'Missing IDs in dataset: {missing}')

p.write_text(json.dumps(D, ensure_ascii=False, indent=2) + '\n',
             encoding='utf-8')
print(f'Patched {len(applied)} vocabulary romanizations')
```

Run: `python _patch_c.py`
Expected: `Patched 27 vocabulary romanizations`.

- [ ] **Step 2: Verify the check now reports 0 errors**

Run: `python check_quality.py`
Expected output: `OK - tous les controles sont passes.`, exit `0`.

If errors remain, surface them before proceeding — they may indicate a real new issue.

- [ ] **Step 3: Verify warnings have dropped**

Run: `python check_quality.py --json | python -c "import sys,json; d=json.load(sys.stdin); print('W001:', sum(1 for w in d['warnings'] if w['code']=='W001'))"`
Expected: `W001: 0` (the 27 vocabulary cards are no longer flagged; if other cards still emit W001 those are pre-existing gaps to surface).

- [ ] **Step 4: Cleanup**

```bash
rm _patch_c.py
```

- [ ] **Step 5: Commit**

```bash
git add www/data/course_data.json
git commit -m "fix(data): add Revised Romanization to 27 hangeul-exercise vocab cards"
```

---

## Task 14: Integrate `check_quality.py` into `rebuild-apk.py`

**Files:**
- Modify: `rebuild-apk.py`

Add step 1/5 quality check, with `--skip-quality-check` flag (debug builds only; ignored on `--release`).

- [ ] **Step 1: Add the `quality_check` function**

Find the line `def sync_web_assets(project_root, web_dir):` in `rebuild-apk.py` and insert the new function immediately *before* it:

```python
def quality_check(project_root, strict=True):
    """Run check_quality.py before the build pipeline.

    On release builds (strict=True), any failure aborts. The
    --skip-quality-check flag only applies to debug builds.
    """
    log_step("1/5", "Quality check (data integrity)")

    success, stdout, stderr = run_cmd(
        "python check_quality.py",
        cwd=project_root,
        timeout=30,
    )
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)

    if success:
        log_success("Quality check passed")
        return

    if strict:
        log_error("Quality check failed - aborting build")
        log_warning("Use --skip-quality-check to bypass (debug builds only)")
        sys.exit(1)

    log_warning("Quality check failed - continuing anyway (debug + skip flag)")
```

- [ ] **Step 2: Update step labels in existing functions**

In `sync_web_assets`, change `log_step("1/4", ...)` to `log_step("2/5", ...)`.

In `capacitor_sync`, change `log_step("2/4", ...)` to `log_step("3/5", ...)`.

In `build_apk`, change `log_step("3/4", ...)` to `log_step("4/5", ...)`.

In `locate_and_copy_apk`, change `log_step("4/4", ...)` to `log_step("5/5", ...)`.

- [ ] **Step 3: Add CLI flag and wire into `main()`**

In `main()`, find:
```python
    parser.add_argument('--release', action='store_true',
                        help="Build a signed release AAB for Play Store")
    args = parser.parse_args()
```

Replace with:
```python
    parser.add_argument('--release', action='store_true',
                        help="Build a signed release AAB for Play Store")
    parser.add_argument('--skip-quality-check', action='store_true',
                        help="Skip data quality check (debug builds only; "
                             "ignored on --release)")
    args = parser.parse_args()

    skip_qc = args.skip_quality_check
    if args.release and skip_qc:
        skip_qc = False
        log_warning("--skip-quality-check ignored on --release builds")
```

Then find the pipeline block:
```python
    try:
        sync_web_assets(project_root, web_dir)
        capacitor_sync(project_root)
        build_apk(project_root, app_name, release=release)
        output_path = locate_and_copy_apk(project_root, app_name, release=release)
```

Replace the first line of `try:` block with:
```python
    try:
        quality_check(project_root, strict=not skip_qc)
        sync_web_assets(project_root, web_dir)
        capacitor_sync(project_root)
        build_apk(project_root, app_name, release=release)
        output_path = locate_and_copy_apk(project_root, app_name, release=release)
```

- [ ] **Step 4: Smoke test the new pipeline (without actually running gradle)**

Run with a deliberately broken state to confirm the gate works:
```bash
python -c "
import json
from pathlib import Path
p = Path('www/data/course_data.json')
D = json.loads(p.read_text(encoding='utf-8'))
# Wipe one polite_present to trigger E005
for it in D['verbs']:
    if it.get('id') == 'vrb_ch0_001':
        it.pop('conjugations', None)
        break
p.write_text(json.dumps(D, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
"
python check_quality.py; echo "Exit: $?"
```
Expected: at least 1 E005, exit `1`.

Restore the data:
```bash
git checkout www/data/course_data.json
python check_quality.py; echo "Exit: $?"
```
Expected: 0 errors, exit `0`.

- [ ] **Step 5: Smoke test --skip-quality-check flag**

Re-introduce the same break, then run:
```bash
python rebuild-apk.py --skip-quality-check 2>&1 | head -30
```
Expected: step 1/5 reports failure, then warning "continuing anyway", then step 2/5 starts. (You can Ctrl-C once step 2/5 begins; we are not actually building gradle here.)

Then:
```bash
python rebuild-apk.py --release --skip-quality-check 2>&1 | head -30
```
Expected: warning "skip-quality-check ignored on --release builds", then step 1/5 fails, then `Quality check failed - aborting build`, exit `1`.

Restore data: `git checkout www/data/course_data.json`.

- [ ] **Step 6: Commit**

```bash
git add rebuild-apk.py
git commit -m "feat(build): gate rebuild-apk.py with check_quality.py as step 1/5"
```

---

## Task 15: Final integration test — full debug build

**Files:**
- None modified (run-only)

Confirm the full pipeline succeeds end-to-end on the patched, healthy state.

- [ ] **Step 1: Run a full debug build**

Run: `python rebuild-apk.py`

Expected: 5 steps complete successfully, ending with `Build Complete!` and a `Blokaja.apk` file at the repo root. The first step output should be `Quality check passed`.

- [ ] **Step 2: Manually browse a few cards to validate the UI fix**

Run a local dev server: `cd www && python -m http.server 8080`

In a browser, open `http://localhost:8080`, navigate to **Verbes** and **Adjectifs**, start the flashcard mode, and verify:

- The recto of a verb shows the Korean infinitive + romanization (no French).
- The verso of `vrb_ch0_001` (쓰다) shows `써요` (the polite form), not an empty string.
- The recto of an adjective shows the Korean + romanization.
- The verso of `adj_ch6_001` (행복하다) shows `행복해요`, not empty.
- A vocabulary card (e.g. `voc_ch0_025` = 고기) shows `gogi` as romanization on the recto.

If anything looks off in the UI, stop and surface the discrepancy before continuing — it indicates a logic gap not caught by the deterministic check.

- [ ] **Step 3: No commit** (test-only)

---

## Task 16: Wrap-up — final state verification + push

**Files:**
- None modified

- [ ] **Step 1: Final check run**

Run: `python check_quality.py`
Expected: `OK - tous les controles sont passes.`, exit `0`.

- [ ] **Step 2: Inspect git log**

Run: `git log --oneline -10`
Expected: see the 6 commits from this plan plus the spec commit at the top.

- [ ] **Step 3: Push (with user confirmation)**

Confirm with the user before pushing. If confirmed:
```bash
git push origin main
```

---

## Self-Review Notes

**Spec coverage:**
- Bug A → Task 11 ✓
- Bug B → Task 12 ✓
- Bug C → Task 13 ✓
- Catalog of E001-E008 → Tasks 4-7 ✓
- Catalog of W001-W004 → Task 8 ✓
- Per-category schemas → Task 6 ✓
- Console + JSON output → Tasks 1, 9 ✓
- `rebuild-apk.py` integration with `--skip-quality-check` and `--release` strict mode → Task 14 ✓
- Success criteria (UI verification) → Task 15 ✓

**No placeholders:** verified — every code step shows the full code.

**Type/name consistency:** `errors`, `warnings`, `_err`, `_warn`, `check_*` functions — names referenced in later tasks match Task 1's declarations.

**Out-of-spec discoveries:** Task 7 and Task 10 explicitly call out that any unexpected E001-E008 finding should pause execution and surface to the user before patching, instead of being silently fixed.
