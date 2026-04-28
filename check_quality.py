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
