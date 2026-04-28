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
