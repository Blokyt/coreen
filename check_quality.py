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

DATA_PATH = Path('data/course_data.json')

FLASHABLE = ['vocabulary', 'verbs', 'hangeul', 'numbers', 'expressions',
             'particles', 'time_expressions', 'classifiers', 'connectors',
             'adjectives', 'adverbs']
READABLE = ['grammar', 'culture', 'dialogues', 'pronunciation_rules']


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


# ========== Validation rules ==========

def _err(errors, code, cat, iid, msg):
    errors.append({'code': code, 'cat': cat, 'id': iid or '?', 'msg': msg})


def _warn(warnings, code, cat, iid, msg):
    warnings.append({'code': code, 'cat': cat, 'id': iid or '?', 'msg': msg})


def check_structural(D, errors):
    """E001 missing id, E002 duplicate id, E003 invalid chapter."""
    valid_chapters = {ch.get('number') for ch in D.get('chapters', [])}
    valid_chapters.add(-1)  # -1 = lexique

    seen_ids = {}  # id -> "cat#index" of first occurrence
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


# Required fields per category (mirrors spec section "Schemas par categorie").
# Special markers:
#   'OR(a,b,...)' = at least one of these fields/paths must be truthy.
#   'PATH(a.b)'   = nested path (dot-separated) — also valid inside OR(...).
FLASHABLE_SCHEMA = {
    'vocabulary': ['korean', 'french', 'romanization', 'page', 'chapter', 'id'],
    'verbs': ['infinitive', 'french', 'romanization',
              'OR(conjugations.polite_present,'
              'conjugations.informal_present,'
              'conjugations.polite_present_after_vowel,'
              'conjugations.polite_present_after_consonant)',
              'page', 'chapter', 'id'],
    'hangeul': ['letter', 'romanization', 'type', 'page', 'chapter', 'id'],
    'numbers': ['numeral', 'korean', 'system', 'romanization',
                'page', 'chapter', 'id'],
    'expressions': ['OR(korean_formal,korean_informal,'
                    'polite.korean,informal.korean)',
                    'french',
                    'OR(romanization_formal,romanization_informal,'
                    'polite.romanization,informal.romanization)',
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
    string. Numeric zero is allowed (e.g. chapter=0).
    """
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


def check_duplicates(D, errors):
    """E007 same (korean, french) pair within a category AND chapter.

    Cross-chapter duplicates are intentional: a word may live in its
    introducing chapter AND in the global lexique (chapter -1) as a SRS
    revision aid. Only flag duplicates within the same chapter.
    """
    for cat in FLASHABLE:
        seen = {}  # (chapter, korean, french) -> first iid
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            kr, fr = get_kr(it, cat), get_fr(it, cat)
            if not kr and not fr:
                continue  # already flagged by E004/E005
            key = (it.get('chapter'), kr, fr)
            if key in seen:
                _err(errors, 'E007', cat, iid,
                     f'doublon de contenu (meme paire que {seen[key]} '
                     f'dans le meme chapitre)')
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


def _is_clean_rom(s):
    """Accept ASCII + Latin-1 supplement (covers French diacritics like
    o, e, e, ø used intentionally in hangeul romanizations)."""
    return all(ord(ch) <= 0xFF for ch in s)


# High-confidence stripped-accent French forms. Used by W004 to flag
# regressions after the initial accent restoration. Keep this list to
# unambiguous words only (no risk of false positive on correct French).
import re as _re
ACCENT_STRIPPED = _re.compile(
    r'\b(aout|apres|coreen|coreens|coreenne|coreennes|etre|francais|francaise|'
    r'francaises|cafe|cafes|frere|freres|mere|meres|pere|peres|fete|fetes|'
    r'tres|decembre|fevrier|prenom|prenoms|nationalite|vetement|vetements|'
    r'phonetique|coree|aine|aines|maniere|presenter|recoltes|ecrire)\b',
    _re.IGNORECASE,
)

# Fields whose string content is French (eligible for W004).
_FR_FIELDS = {
    'french', 'title', 'title_fr', 'explanation', 'explanation_fr', 'body',
    'notes', 'description_fr', 'name_fr', 'function_fr', 'setting_fr',
    'register', 'register_formal', 'register_informal', 'theme',
    'context', 'contraction_note',
}
_KO_FIELDS = {
    'korean', 'korean_formal', 'korean_informal', 'korean_polite',
    'romanization', 'romanization_formal', 'romanization_informal',
    'id', 'infinitive', 'stem', 'particle', 'letter', 'highlighted',
    'as_batchim', 'batchim_pronunciation', 'position_rule',
    'korean_before_counter', 'system',
}


def _walk_fr(node, fr_ctx, hits):
    """Yield (path, stripped_word, snippet) for any FR string with
    a high-confidence stripped-accent token."""
    if isinstance(node, dict):
        for k, v in node.items():
            sub = fr_ctx
            if k in _KO_FIELDS:
                sub = False
            elif k in _FR_FIELDS or k.endswith('_fr'):
                sub = True
            _walk_fr(v, sub, hits)
    elif isinstance(node, list):
        for item in node:
            _walk_fr(item, fr_ctx, hits)
    elif isinstance(node, str) and fr_ctx:
        for m in ACCENT_STRIPPED.finditer(node):
            hits.append((m.group(0), node))


def check_warnings(D, warnings):
    """W001 missing romanization on a category that expects one,
    W002 page missing/<=0, W003 suspicious romanization (above Latin-1),
    W004 accent-stripped French token detected (regression guard)."""
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

            # W003 suspicious romanization (above Latin-1 supplement)
            rom = get_rom(it, cat)
            if rom and not _is_clean_rom(rom):
                _warn(warnings, 'W003', cat, iid,
                      f'romanisation suspecte : {rom!r}')

            # W004 accent-stripped French token in any FR field
            hits = []
            _walk_fr(it, False, hits)
            for word, snippet in hits:
                _warn(warnings, 'W004', cat, iid,
                      f'accent strippé : {word!r} (...{snippet[:60]}...)')

    # W004 also applies to readable categories (grammar/culture/dialogues/...)
    for cat in READABLE:
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            hits = []
            _walk_fr(it, True, hits)  # readable items: assume FR by default
            for word, snippet in hits:
                _warn(warnings, 'W004', cat, iid,
                      f'accent strippé : {word!r} (...{snippet[:60]}...)')

    # W005 vocab item with both theme AND notes empty (pedagogical thinness)
    for it in D.get('vocabulary', []):
        iid = it.get('id') or '?'
        if not it.get('theme') and not it.get('notes'):
            _warn(warnings, 'W005', 'vocabulary', iid,
                  'thème ET notes vides (item peu contextualisé)')

    # W006 hangeul item with description_fr too short to be pedagogically useful
    for it in D.get('hangeul', []):
        iid = it.get('id') or '?'
        desc = it.get('description_fr') or ''
        if len(desc) < 25:
            _warn(warnings, 'W006', 'hangeul', iid,
                  f'description_fr courte ({len(desc)} chars) : {desc!r}')


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

    check_structural(D, errors)
    check_rendering(D, errors)
    check_schema(D, errors)
    check_duplicates(D, errors)
    check_readable(D, errors)
    check_warnings(D, warnings)

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

    sys.exit(0 if not errors else 1)


if __name__ == '__main__':
    main()
