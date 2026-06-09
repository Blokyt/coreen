#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Migrations de schema pour course_data.json (M1-M5, M7). Idempotent.

M1 : ajoute source="book" sur tous les items existants.
M2 : normalise les themes vocabulary en minuscules (fin des doublons de casse).
M3 : attribue une category aux time_expressions du ch3 (day_of_week / time_of_day / relative_time).
M4 : unifie le schema classifiers (number_system + used_with_fr partout).
M5 : deduplique les doublons intra-chapitre adjectives/adverbs (garde l'id le plus ancien).
M7 : recalcule meta.stats + meta.total_items.

Usage : python tools/migrate_schema.py [--apply]   (sans --apply : dry-run, affiche le resume)
"""
import json, sys, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'course_data.json')

ITEM_CATS = ['hangeul', 'vocabulary', 'verbs', 'grammar', 'particles', 'connectors',
             'expressions', 'dialogues', 'numbers', 'adjectives', 'adverbs',
             'classifiers', 'pronunciation_rules', 'culture', 'time_expressions']

# M3 : categorie par mot coreen (time_expressions ch3)
TE_CH3_CATEGORY = {
    '오늘': 'relative_time', '지금': 'relative_time',
    '아침': 'time_of_day', '점심': 'time_of_day', '오후': 'time_of_day',
    '저녁': 'time_of_day', '밤': 'time_of_day',
    '월요일': 'day_of_week', '화요일': 'day_of_week', '수요일': 'day_of_week',
    '목요일': 'day_of_week', '금요일': 'day_of_week', '토요일': 'day_of_week',
    '일요일': 'day_of_week',
}

# M4 : valeurs canoniques pour les classifiers non conformes
CLF_FIX = {
    '시':  ('native-korean', 'heures'),
    '분':  ('sino-korean',   'minutes'),
    '월':  ('sino-korean',   'mois'),
    '반':  ('native-korean', 'demi-heure (30 min)'),
    '일':  ('sino-korean',   'jours (dates)'),
}


def migrate(D):
    rep = collections.Counter()

    # M1 ---------------------------------------------------------------
    for cat in ITEM_CATS:
        for it in D.get(cat, []):
            if 'source' not in it:
                it['source'] = 'book'
                rep['M1_source_added'] += 1

    # M2 ---------------------------------------------------------------
    for it in D.get('vocabulary', []):
        t = it.get('theme')
        if isinstance(t, str) and t and t != t.lower():
            it['theme'] = t.lower()
            rep['M2_theme_lowered'] += 1

    # M3 ---------------------------------------------------------------
    for it in D.get('time_expressions', []):
        if it.get('chapter') == 3 and not it.get('category'):
            it['category'] = TE_CH3_CATEGORY.get(it.get('korean', ''), 'relative_time')
            rep['M3_category_added'] += 1

    # M4 ---------------------------------------------------------------
    for it in D.get('classifiers', []):
        # renommer system -> number_system, used_with -> used_with_fr
        if 'system' in it and 'number_system' not in it:
            it['number_system'] = it.pop('system'); rep['M4_renamed'] += 1
        if 'used_with' in it and 'used_with_fr' not in it:
            it['used_with_fr'] = it.pop('used_with'); rep['M4_renamed'] += 1
        else:
            it.pop('used_with', None)
        # combler les manquants via la table canonique
        kr = it.get('korean')
        if kr in CLF_FIX:
            ns, uw = CLF_FIX[kr]
            if not it.get('number_system'):
                it['number_system'] = ns; rep['M4_number_system_set'] += 1
            if not it.get('used_with_fr'):
                it['used_with_fr'] = uw; rep['M4_used_with_fr_set'] += 1

    # M5 ---------------------------------------------------------------
    for cat in ('adjectives', 'adverbs'):
        seen, kept = set(), []
        for it in D.get(cat, []):
            key = (it.get('infinitive') or it.get('korean'), it.get('chapter'))
            if key in seen:
                rep['M5_dup_removed'] += 1
                continue
            seen.add(key); kept.append(it)
        D[cat] = kept

    # M7 ---------------------------------------------------------------
    stats = {c: len(D.get(c, [])) for c in ITEM_CATS}
    D.setdefault('meta', {})
    D['meta']['stats'] = stats
    D['meta']['total_items'] = sum(stats.values())
    rep['M7_total_items'] = D['meta']['total_items']

    return rep


def main():
    apply = '--apply' in sys.argv
    with open(DATA, encoding='utf-8') as f:
        D = json.load(f)
    rep = migrate(D)
    print('=== Migration schema (M1-M5, M7) ===')
    for k in sorted(rep):
        print(f'  {k}: {rep[k]}')
    if apply:
        with open(DATA, 'w', encoding='utf-8') as f:
            json.dump(D, f, ensure_ascii=False, indent=2)
        print('--> ecrit dans data/course_data.json')
    else:
        print('(dry-run : relancer avec --apply pour ecrire)')


if __name__ == '__main__':
    main()
