#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Audit de complétude : compare l'extraction page-par-page existante
(extraction_data/raw/*_extracted.json + hunt/missing) au course_data.json final,
et liste tout item du LIVRE présent dans l'extraction mais ABSENT des données.

Ne modifie rien. Sortie : un rapport des candidats manquants par catégorie.

Usage : python tools/reconcile_extraction.py
"""
import json, glob, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'course_data.json')
RAW = os.path.join(ROOT, 'extraction_data', 'raw')

# champ-clé coréen par catégorie
KEYF = {'vocabulary': 'korean', 'verbs': 'infinitive', 'adjectives': 'infinitive',
        'expressions': 'korean', 'adverbs': 'korean', 'connectors': 'korean',
        'classifiers': 'korean', 'time_expressions': 'korean', 'particles': 'particle',
        'numbers': 'korean'}


def norm(s):
    return (s or '').strip().replace(' ', '')


def kr_of(it, cat):
    if cat in ('verbs', 'adjectives'):
        return it.get('infinitive') or it.get('korean') or ''
    if cat == 'expressions':
        return (it.get('korean') or it.get('korean_formal')
                or (it.get('polite') or {}).get('korean') or '')
    if cat == 'particles':
        return it.get('particle') or ''
    return it.get('korean') or ''


def main():
    D = json.load(open(DATA, encoding='utf-8'))
    # ensemble des coréens présents dans course_data, par catégorie
    have = {c: set(norm(kr_of(it, c)) for it in D.get(c, [])) for c in KEYF}
    # un mot peut migrer de catégorie : on garde aussi un index global vocabulaire+verbes
    have_any = set()
    for c in KEYF:
        have_any |= have[c]

    # collecte des items vus dans l'extraction brute
    seen = collections.defaultdict(dict)  # cat -> {kr_norm: item(+page)}
    files = sorted(glob.glob(os.path.join(RAW, '*_extracted.json')))
    files += sorted(glob.glob(os.path.join(RAW, '*missing*.json')))
    files += sorted(glob.glob(os.path.join(RAW, 'hunt_*.json')))
    for fp in files:
        try:
            raw = json.load(open(fp, encoding='utf-8'))
        except Exception:
            continue
        blocks = raw if isinstance(raw, list) else [raw]
        for blk in blocks:
            if not isinstance(blk, dict):
                continue
            for cat in KEYF:
                items = blk.get(cat) or blk.get('missing_' + cat) or []
                if not isinstance(items, list):
                    continue
                for it in items:
                    if not isinstance(it, dict):
                        continue
                    k = norm(kr_of(it, cat))
                    if k and k not in seen[cat]:
                        seen[cat][k] = it

    print('=== Audit de complétude (extraction page-par-page vs course_data) ===\n')
    total_missing = 0
    for cat in KEYF:
        miss = []
        for k, it in seen[cat].items():
            if k in have[cat]:
                continue
            # tolérance : présent dans une autre catégorie (migration) ?
            if cat in ('verbs', 'adjectives') and k in have_any:
                continue
            miss.append(it)
        if miss:
            total_missing += len(miss)
            print(f'## {cat} : {len(miss)} candidat(s) manquant(s)')
            for it in miss[:60]:
                kr = kr_of(it, cat)
                fr = it.get('french', '')
                rom = it.get('romanization', '')
                pg = it.get('page', '?')
                print(f'   {kr}  |  {fr}  |  {rom}  (p.{pg})')
            print()
    print(f'TOTAL candidats manquants : {total_missing}')
    print('(Revue manuelle requise : certains peuvent être des variantes/doublons déjà présents.)')


if __name__ == '__main__':
    main()
