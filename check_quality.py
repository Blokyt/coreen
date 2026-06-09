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
    if c == 'verbs':       return get_fr(it, c)
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
    'vocabulary': ['korean', 'french', 'romanization', 'source', 'page', 'chapter', 'id'],
    # Les conjugaisons sont generees au runtime par conjugator.js a partir de
    # pos + irregular ; on exige donc `pos` plutot que des formes stockees.
    'verbs': ['infinitive', 'french', 'romanization', 'pos',
              'source', 'page', 'chapter', 'id'],
    'hangeul': ['letter', 'romanization', 'type', 'source', 'page', 'chapter', 'id'],
    'numbers': ['numeral', 'korean', 'system', 'romanization',
                'source', 'page', 'chapter', 'id'],
    'expressions': ['OR(korean_formal,korean_informal,'
                    'polite.korean,informal.korean)',
                    'french',
                    'OR(romanization_formal,romanization_informal,'
                    'polite.romanization,informal.romanization)',
                    'source', 'page', 'chapter', 'id'],
    'particles': ['particle', 'OR(function_fr,name_fr)',
                  'source', 'page', 'chapter', 'id'],
    'time_expressions': ['korean', 'french', 'romanization', 'category',
                         'source', 'page', 'chapter', 'id'],
    'classifiers': ['korean', 'french', 'romanization', 'number_system',
                    'used_with_fr', 'source', 'page', 'chapter', 'id'],
    'connectors': ['korean', 'french', 'romanization',
                   'source', 'page', 'chapter', 'id'],
    'adjectives': ['OR(korean,infinitive)', 'french', 'romanization',
                   'korean_polite', 'pos', 'source', 'page', 'chapter', 'id'],
    'adverbs': ['korean', 'french', 'romanization',
                'source', 'page', 'chapter', 'id'],
}

# Ensembles valides pour les nouveaux champs (E009-E011).
VALID_POS = {'verb', 'adj', 'copula', 'verb_exist'}
VALID_IRREGULAR = {None, 'ㅂ', 'ㄷ', 'ㄹ', 'ㅡ', '르', 'ㅅ', 'ㅎ', '이다', '하다'}
VALID_SOURCE = {'book', 'added', 'topik'}


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
            added = it.get('source') == 'added'
            for f in fields:
                if f == 'page' and added:
                    continue  # items hors-livre (source=added) : page non requise
                if not _has_field(it, f):
                    _err(errors, 'E006', cat, iid, f'champ requis : {f}')


def check_meta_fields(D, errors):
    """E009 pos invalide, E010 irregular invalide, E011 source invalide."""
    for cat in ('verbs', 'adjectives'):
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            pos = it.get('pos')
            if pos is not None and pos not in VALID_POS:
                _err(errors, 'E009', cat, iid, f'pos invalide : {pos!r}')
            if 'irregular' in it and it['irregular'] not in VALID_IRREGULAR:
                _err(errors, 'E010', cat, iid, f'irregular invalide : {it["irregular"]!r}')
    for cat in FLASHABLE:
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            src = it.get('source')
            if src is not None and src not in VALID_SOURCE:
                _err(errors, 'E011', cat, iid, f'source invalide : {src!r}')


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


# Dictionnaire W004 : forme_sans_accent -> forme_correcte.
# Règles de construction :
#   - Chaque entrée doit être SANS AMBIGUÏTÉ : le mot ASCII listée ne doit JAMAIS
#     être un mot français correct sans accent. Ex. "ou" (conjonction) est absent
#     car c'est un mot valide ; "ou" -> "où" serait un faux positif.
#   - Comparaison sur les mots entiers (\\b), insensible à la casse.
#   - En cas de doute sur un mot ambigu, NE PAS l'inclure.
import re as _re

_ACCENT_MAP = {
    # ---- mots très courants dans ce corpus ----
    'ecole':        'école',
    'ecolier':      'écolier',
    'ecoliere':     'écolière',
    'geographie':   'géographie',
    'nationalite':  'nationalité',
    'nationalites': 'nationalités',
    'soeur':        'sœur',        # sans œ ligature → typo fréquente
    'ingredients':  'ingrédients',
    # -- verbe/participe courant --
    'utilise':      'utilisé',    # "est utilise" -> "est utilisé"
    # ---- accent manquant dans les données repérées ----
    'ecole':        'école',
    # ---- mots imposés par le cahier des charges ----
    'eleve':        'élève',
    'eleves':       'élèves',
    'epinard':      'épinard',
    'epinards':     'épinards',
    'fenetre':      'fenêtre',
    'fenetres':     'fenêtres',
    'foret':        'forêt',
    'forets':       'forêts',
    'randonnee':    'randonnée',
    'randonnees':   'randonnées',
    'musee':        'musée',
    'musees':       'musées',
    'bibliotheque': 'bibliothèque',
    'bibliotheques':'bibliothèques',
    'activite':     'activité',
    'activites':    'activités',
    'legume':       'légume',
    'legumes':      'légumes',
    'cinema':       'cinéma',
    'cinemas':      'cinémas',
    'ceremonie':    'cérémonie',
    'ceremonies':   'cérémonies',
    'serie':        'série',
    'series':       'séries',
    'dejeuner':     'déjeuner',
    'diner':        'dîner',
    'cuillere':     'cuillère',
    'cuilleres':    'cuillères',
    'mathematiques':'mathématiques',
    'telephone':    'téléphone',
    'telephones':   'téléphones',
    'etudier':      'étudier',
    'ecouter':      'écouter',
    'ecrire':       'écrire',
    'deleguer':     'déléguer',
    'preferer':     'préférer',
    'repeter':      'répéter',
    'energie':      'énergie',
    'energies':     'énergies',
    'fevrier':      'février',
    'decembre':     'décembre',
    'numero':       'numéro',
    'numeros':      'numéros',
    'cafe':         'café',
    'cafes':        'cafés',
    'frere':        'frère',
    'freres':       'frères',
    'mere':         'mère',
    'meres':        'mères',
    'pere':         'père',
    'peres':        'pères',
    'hopital':      'hôpital',
    'hopitaux':     'hôpitaux',
    'hotel':        'hôtel',
    'hotels':       'hôtels',
    'theatre':      'théâtre',
    'theatres':     'théâtres',
    'probleme':     'problème',
    'problemes':    'problèmes',
    'systeme':      'système',
    'systemes':     'systèmes',
    'modele':       'modèle',
    'modeles':      'modèles',
    'regle':        'règle',
    'regles':       'règles',
    'piece':        'pièce',
    'pieces':       'pièces',
    'siecle':       'siècle',
    'siecles':      'siècles',
    'cheque':       'chèque',
    'cheques':      'chèques',
    'pres':         'près',
    'apres':        'après',
    'tres':         'très',
    'etre':         'être',
    # -- autres mots courants sans ambiguïté --
    'aout':         'août',
    'coreen':       'coréen',
    'coreens':      'coréens',
    'coreenne':     'coréenne',
    'coreennes':    'coréennes',
    'coree':        'Corée',
    'francais':     'français',
    'francaise':    'française',
    'francaises':   'françaises',
    'fete':         'fête',
    'fetes':        'fêtes',
    'prenom':       'prénom',
    'prenoms':      'prénoms',
    'vetement':     'vêtement',
    'vetements':    'vêtements',
    'phonetique':   'phonétique',
    'aine':         'aîné',     # grande aîné -> grande aine (rare mais présent)
    'aines':        'aînés',
    'maniere':      'manière',
    'manieres':     'manières',
    'recoltes':     'récoltes',
    'presenter':    'présenter',
    'matiere':      'matière',
    'matieres':     'matières',
    'present':      'présent',   # "au present poli" -> "au présent poli"
    'garcon':       'garçon',
    'garcons':      'garçons',
    'lecon':        'leçon',
    'lecons':       'leçons',
    'reponse':      'réponse',
    'reponses':     'réponses',
    'question':     None,        # None = skip (pas d'accent attendu)
    'etudiant':     'étudiant',
    'etudiants':    'étudiants',
    'etudiante':    'étudiante',
    'etudiantes':   'étudiantes',
    'elegance':     'élégance',
    'evenement':    'événement',
    'evenements':   'événements',
    'interessee':   'intéressée',
    'interesse':    'intéressé',
}
# Retire les entrées "None" (marqueurs "ne pas lister")
_ACCENT_MAP = {k: v for k, v in _ACCENT_MAP.items() if v is not None}

# Compile un pattern global pour un matching efficace
_ACCENT_PATTERN = _re.compile(
    r'\b(' + '|'.join(_re.escape(k) for k in sorted(_ACCENT_MAP, key=len, reverse=True)) + r')\b',
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
    """Accumule (mot_fautif, correction, snippet) pour chaque token FR
    qui correspond à une forme sans accent connue."""
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
        for m in _ACCENT_PATTERN.finditer(node):
            token = m.group(0)
            correction = _ACCENT_MAP.get(token.lower())
            if correction:
                hits.append((token, correction, node))


def check_warnings(D, warnings):
    """W001 missing romanization on a category that expects one,
    W002 page missing/<=0, W003 suspicious romanization (above Latin-1),
    W004 accent-stripped French token detected (regression guard),
    W005 vocab item with no theme and no notes,
    W006 hangeul description_fr too short,
    W007 romanization conflict (same korean, different romanization),
    W008 french field identical to romanization field,
    W009 whitespace hygiene (leading/trailing/double space or tab),
    W010 invalid hangul character (mojibake U+FFFD or isolated jamo)."""
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

            # W002 page missing/invalid (sauf items hors-livre source=added)
            page = it.get('page')
            if it.get('source') == 'added':
                pass  # page volontairement absente sur les ajouts hors-livre
            elif page is None or (isinstance(page, (int, float)) and page <= 0):
                _warn(warnings, 'W002', cat, iid, f'page invalide : {page!r}')

            # W003 suspicious romanization (above Latin-1 supplement)
            rom = get_rom(it, cat)
            if rom and not _is_clean_rom(rom):
                _warn(warnings, 'W003', cat, iid,
                      f'romanisation suspecte : {rom!r}')

            # W004 accent-stripped French token in any FR field
            hits = []
            _walk_fr(it, False, hits)
            for word, correction, snippet in hits:
                _warn(warnings, 'W004', cat, iid,
                      f'accent manquant : {word!r} -> {correction!r} '
                      f'(...{snippet[:60]}...)')

    # W004 also applies to readable categories (grammar/culture/dialogues/...)
    for cat in READABLE:
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            hits = []
            _walk_fr(it, True, hits)  # readable items: assume FR by default
            for word, correction, snippet in hits:
                _warn(warnings, 'W004', cat, iid,
                      f'accent manquant : {word!r} -> {correction!r} '
                      f'(...{snippet[:60]}...)')

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

    # W007 romanization conflict : même coréen canonique, romanisations différentes
    _check_w007(D, warnings)

    # W008 french identique à romanization (probablement copié-collé par erreur)
    _check_w008(D, warnings)

    # W009 hygiène des espaces dans tous les champs texte
    _check_w009(D, warnings)

    # W010 validité du hangul dans les champs coréens
    _check_w010(D, warnings)

    # W011-W015 : champs de schéma étendu (pos/irregular/source/thèmes)
    _check_meta_warnings(D, warnings)


def _check_meta_warnings(D, warnings):
    # W011 thème vocabulary avec majuscule résiduelle (garde-fou M2)
    for it in D.get('vocabulary', []):
        iid = it.get('id') or '?'
        t = it.get('theme') or ''
        if t and t[0].isupper():
            _warn(warnings, 'W011', 'vocabulary', iid, f'thème avec majuscule : {t!r}')
    # W012 pos absent / W013 irregular absent / W014 aucune conjugaison disponible
    for cat in ('verbs', 'adjectives'):
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            if not it.get('pos'):
                _warn(warnings, 'W012', cat, iid, 'champ pos absent (moteur de conjugaison inactif)')
            if 'irregular' not in it:
                _warn(warnings, 'W013', cat, iid, 'champ irregular absent')
            cj = it.get('conjugations') or {}
            has_engine = bool(it.get('pos')) and ('irregular' in it)
            has_stored = bool(cj.get('polite_present') or cj.get('informal_present')
                              or cj.get('polite_present_after_vowel'))
            has_override = bool(it.get('conjugations_override'))
            if not (has_engine or has_stored or has_override):
                _warn(warnings, 'W014', cat, iid, 'aucune conjugaison disponible')
    # W015 source=added mais page renseignée (incohérent : devrait être source=book)
    for cat in FLASHABLE:
        for it in D.get(cat, []):
            iid = it.get('id') or '?'
            if it.get('source') == 'added' and it.get('page'):
                _warn(warnings, 'W015', cat, iid, f'source=added mais page={it.get("page")!r}')


# ---------------------------------------------------------------------------
# W007 : romanisation en conflit (même coréen canonique, rom différentes)
# ---------------------------------------------------------------------------

def _check_w007(D, warnings):
    for cat in FLASHABLE:
        seen = {}  # korean_canonical -> (romanization, id_premiere_occurrence)
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            kr = get_kr(it, cat)
            rom = get_rom(it, cat)
            if not kr or not rom:
                continue
            if kr in seen:
                first_rom, first_id = seen[kr]
                if first_rom != rom:
                    _warn(warnings, 'W007', cat, iid,
                          f'romanisation en conflit : {rom!r} '
                          f'(1re occurrence {first_id} -> {first_rom!r})')
            else:
                seen[kr] = (rom, iid)


# ---------------------------------------------------------------------------
# W008 : french == romanization (cas-insensitif) ou french purement ASCII
#         correspondant à une translittération
# ---------------------------------------------------------------------------

def _check_w008(D, warnings):
    for cat in FLASHABLE:
        for raw in D.get(cat, []):
            it = normalize_expression(raw) if cat == 'expressions' else raw
            iid = it.get('id') or '?'
            fr = (it.get('french') or '').strip()
            rom = get_rom(it, cat).strip()
            if not fr or not rom:
                continue
            if fr.lower() == rom.lower():
                _warn(warnings, 'W008', cat, iid,
                      f'french identique à romanization : {fr!r}')


# ---------------------------------------------------------------------------
# W009 : hygiène des chaînes (espace en début/fin, double espace, tabulation)
# ---------------------------------------------------------------------------

def _ws_issues(s):
    """Retourne la liste des problèmes de whitespace dans la chaîne s."""
    problems = []
    if s != s.strip():
        problems.append('espace en début/fin')
    if '  ' in s:
        problems.append('double espace')
    if '\t' in s:
        problems.append('tabulation')
    return problems


def _walk_ws(node, issues, path=''):
    """Parcourt récursivement node et accumule les problèmes de whitespace."""
    if isinstance(node, dict):
        for k, v in node.items():
            _walk_ws(v, issues, f'{path}.{k}' if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _walk_ws(v, issues, f'{path}[{i}]')
    elif isinstance(node, str):
        problems = _ws_issues(node)
        if problems:
            issues.append((path, ', '.join(problems), node))


def _check_w009(D, warnings):
    for cat in FLASHABLE + READABLE:
        for raw in D.get(cat, []):
            iid = raw.get('id') or '?'
            issues = []
            _walk_ws(raw, issues)
            for field, problem, val in issues:
                _warn(warnings, 'W009', cat, iid,
                      f'whitespace : {problem} dans champ {field!r} '
                      f'({val[:40]!r})')


# ---------------------------------------------------------------------------
# W010 : validité du hangul dans les champs coréens
#         - U+FFFD : caractère de remplacement (mojibake)
#         - jamo isolés (U+1100-U+11FF, U+3130-U+318F) hors catégorie hangeul
# ---------------------------------------------------------------------------

_KO_TEXT_FIELDS = {
    'korean', 'korean_formal', 'korean_informal', 'korean_polite',
    'infinitive', 'letter', 'particle', 'korean_before_counter', 'highlighted',
}


def _hangul_issues(text, cat):
    """Retourne la liste des caractères problématiques dans text."""
    problems = []
    for i, ch in enumerate(text):
        cp = ord(ch)
        if cp == 0xFFFD:
            problems.append(f'U+FFFD (remplacement mojibake) pos {i}')
        if cat != 'hangeul' and (0x1100 <= cp <= 0x11FF or 0x3130 <= cp <= 0x318F):
            problems.append(f'jamo isolé U+{cp:04X} ({ch!r}) pos {i}')
    return problems


def _walk_ko(node, cat, issues):
    """Parcourt récursivement node, inspecte les champs coréens connus."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in _KO_TEXT_FIELDS and isinstance(v, str) and v:
                probs = _hangul_issues(v, cat)
                for p in probs:
                    issues.append((k, v[:40], p))
            else:
                _walk_ko(v, cat, issues)
    elif isinstance(node, list):
        for item in node:
            _walk_ko(item, cat, issues)


def _check_w010(D, warnings):
    for cat in FLASHABLE + READABLE:
        for raw in D.get(cat, []):
            iid = raw.get('id') or '?'
            issues = []
            _walk_ko(raw, cat, issues)
            for field, snippet, problem in issues:
                _warn(warnings, 'W010', cat, iid,
                      f'hangul invalide : {problem} dans {field!r} ({snippet!r})')


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
    check_meta_fields(D, errors)
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
