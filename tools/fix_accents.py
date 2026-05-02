#!/usr/bin/env python3
"""Fix accent-stripped French strings in data/course_data.json.

Walks every string value in the data file, applies a conservative dictionary
of unambiguous accent restorations using word-boundary regex, and writes the
result back. Only touches French-language fields (not korean, romanization,
ids, infinitives, themes, etc.).

Usage:
    python tools/fix_accents.py --dry-run   # preview
    python tools/fix_accents.py             # write
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / 'data' / 'course_data.json'

# Fields whose string content is French (and therefore eligible for accent fixes).
# Anything not in this set is left untouched (korean, romanization, ids, etc.).
FR_FIELDS = {
    'french', 'title', 'title_fr', 'explanation', 'explanation_fr', 'body',
    'notes', 'description_fr', 'name_fr', 'function_fr', 'setting_fr',
    'register', 'register_formal', 'register_informal',
    'theme', 'word_type', 'verb_type', 'context', 'speaker',
    'contraction_note',
}

# Fields to NEVER touch even if string-typed.
KOREAN_FIELDS = {
    'korean', 'korean_formal', 'korean_informal', 'korean_polite',
    'romanization', 'romanization_formal', 'romanization_informal',
    'id', 'infinitive', 'stem', 'particle', 'letter', 'highlighted',
    'as_batchim', 'batchim_pronunciation', 'position_rule',
    'korean_before_counter', 'system',
}

# Replacements: stripped form → accented form (lowercase keys).
# Case is preserved automatically by the regex callback.
REPLACEMENTS = {
    # months / time
    'aout': 'août',
    'decembre': 'décembre',
    'fevrier': 'février',
    'ete': 'été',
    # adverbs / prepositions
    'apres': 'après',
    'tres': 'très',
    'a partir': 'à partir',
    'a cote': 'à côté',
    'voila': 'voilà',
    # common verbs
    'etre': 'être',
    'ecrire': 'écrire',
    'preter': 'prêter',
    # adjectives / nationalities
    'coreen': 'coréen',
    'coreens': 'coréens',
    'coreene': 'coréenne',  # typo, lone-n form
    'coreenne': 'coréenne',
    'coreenes': 'coréennes',  # typo, lone-n form
    'coreennes': 'coréennes',
    'francais': 'français',
    'francaise': 'française',
    'francaises': 'françaises',
    'phonetique': 'phonétique',
    'phonetiques': 'phonétiques',
    'celebre': 'célèbre',
    'celebres': 'célèbres',
    'agee': 'âgée',
    'agees': 'âgées',
    'age': 'âge',
    'ages': 'âges',
    # nouns: family
    'frere': 'frère',
    'freres': 'frères',
    'mere': 'mère',
    'meres': 'mères',
    'pere': 'père',
    'peres': 'pères',
    # nouns: places / things
    'cafe': 'café',
    'cafes': 'cafés',
    'cote': 'côté',
    'cotes': 'côtés',
    'hote': 'hôte',
    'hotel': 'hôtel',
    'hotels': 'hôtels',
    'reglement': 'règlement',
    'regle': 'règle',
    'regles': 'règles',
    'celebration': 'célébration',
    'celebrations': 'célébrations',
    # education / culture
    'etudiant': 'étudiant',
    'etudiants': 'étudiants',
    'etudiante': 'étudiante',
    'etudiantes': 'étudiantes',
    'elementaire': 'élémentaire',
    'interessant': 'intéressant',
    'interessante': 'intéressante',
    'fete': 'fête',
    'fetes': 'fêtes',
    # country
    'coree': 'corée',
    # family relations / age
    'aine': 'aîné',
    'aines': 'aînés',
    'ainee': 'aînée',
    'ainees': 'aînées',
    # common nouns
    'prenom': 'prénom',
    'prenoms': 'prénoms',
    'nationalite': 'nationalité',
    'nationalites': 'nationalités',
    'vetement': 'vêtement',
    'vetements': 'vêtements',
    'maniere': 'manière',
    'manieres': 'manières',
    # adjectives / past participles
    'meme': 'même',
    'memes': 'mêmes',
    'presenter': 'présenter',
    'presente': 'présente',
    'presentee': 'présentée',
    'ecrit': 'écrit',
    'ecrite': 'écrite',
    'ecrits': 'écrits',
    'ecrites': 'écrites',
    'frequent': 'fréquent',
    'frequente': 'fréquente',
    'frequents': 'fréquents',
    'frequentes': 'fréquentes',
    'sautee': 'sautée',
    'sautees': 'sautées',
    'recolte': 'récolte',
    'recoltes': 'récoltes',
}

# Build a single regex that matches any of the keys with word boundaries.
# Sort by length descending so longer matches win (e.g. 'coreenne' before 'coreen').
_keys = sorted(REPLACEMENTS.keys(), key=len, reverse=True)
PATTERN = re.compile(r'\b(' + '|'.join(re.escape(k) for k in _keys) + r')\b', re.IGNORECASE)


def preserve_case(src: str, target: str) -> str:
    """Return target with the case-pattern of src (initial-cap, all-upper, all-lower)."""
    if src.isupper():
        return target.upper()
    if src[0].isupper():
        return target[0].upper() + target[1:]
    return target


def fix_string(s: str, counter: Counter) -> str:
    def _sub(m):
        original = m.group(0)
        target = REPLACEMENTS[original.lower()]
        counter[original.lower()] += 1
        return preserve_case(original, target)
    return PATTERN.sub(_sub, s)


def walk(node, path: str, fr_context: bool, counter: Counter, diffs: list):
    if isinstance(node, dict):
        for k, v in node.items():
            sub_fr = fr_context
            if k in KOREAN_FIELDS:
                sub_fr = False
            elif k in FR_FIELDS or k.endswith('_fr'):
                sub_fr = True
            walk(v, f'{path}.{k}' if path else k, sub_fr, counter, diffs)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            walk(item, f'{path}[{i}]', fr_context, counter, diffs)
    elif isinstance(node, str):
        if not fr_context:
            return
        new = fix_string(node, counter)
        if new != node:
            diffs.append((path, node, new))


def fix_in_place(node, fr_context: bool):
    """Apply fix in-place to mutable structures."""
    if isinstance(node, dict):
        for k in list(node.keys()):
            v = node[k]
            sub_fr = fr_context
            if k in KOREAN_FIELDS:
                sub_fr = False
            elif k in FR_FIELDS or k.endswith('_fr'):
                sub_fr = True
            if isinstance(v, str) and sub_fr:
                node[k] = fix_string(v, Counter())  # we already counted in walk()
            else:
                fix_in_place(v, sub_fr)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            if isinstance(item, str) and fr_context:
                node[i] = fix_string(item, Counter())
            else:
                fix_in_place(item, fr_context)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='preview changes without writing')
    ap.add_argument('--show-diffs', type=int, default=20, help='number of diffs to print (default 20)')
    args = ap.parse_args()

    if not DATA_PATH.exists():
        print(f'ERROR: {DATA_PATH} not found', file=sys.stderr)
        sys.exit(1)

    raw = DATA_PATH.read_text(encoding='utf-8')
    data = json.loads(raw)

    counter = Counter()
    diffs = []
    walk(data, '', False, counter, diffs)

    print(f'Found {len(diffs)} strings with stripped accents.')
    print(f'Total replacements (per stripped form):')
    for k, n in sorted(counter.items(), key=lambda kv: -kv[1]):
        print(f'  {k!r:20s} -> {REPLACEMENTS[k]!r:20s} : {n}')

    print(f'\nFirst {min(args.show_diffs, len(diffs))} diffs:')
    for path, before, after in diffs[:args.show_diffs]:
        print(f'  {path}:')
        print(f'    -  {before[:100]}')
        print(f'    +  {after[:100]}')

    if args.dry_run:
        print('\n[dry-run] no file written.')
        return

    fix_in_place(data, False)
    new_text = json.dumps(data, ensure_ascii=False, indent=2)
    DATA_PATH.write_text(new_text + '\n', encoding='utf-8')
    print(f'\nWrote {DATA_PATH} ({len(new_text)} chars).')


if __name__ == '__main__':
    main()
