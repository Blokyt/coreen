#!/usr/bin/env python3
"""Script de correction complète des données course_data.json.

Étapes :
  A. Accents manquants (W004) — remplace les formes sans accent dans les
     champs français uniquement, en préservant la casse.
  B. Corrections factuelles et romanisations fautives ciblées.
  C. Hangeul : romanisations RR et descriptions enrichies.

Usage :
  python fix_all.py --dry-run   # aperçu sans écriture
  python fix_all.py             # applique et écrit le fichier
"""
import argparse
import json
import re
import sys
from pathlib import Path

DATA_PATH = Path('data/course_data.json')

# ---------------------------------------------------------------------------
# ÉTAPE A : dictionnaire d'accents (union des deux maps existantes)
# ---------------------------------------------------------------------------
ACCENT_MAP = {
    # --- mots très courants dans ce corpus ---
    'ecole':         'école',
    'ecolier':       'écolier',
    'ecoliere':      'écolière',
    'geographie':    'géographie',
    'nationalite':   'nationalité',
    'nationalites':  'nationalités',
    'soeur':         'sœur',
    'ingredients':   'ingrédients',
    'ingredient':    'ingrédient',
    'utilise':       'utilisé',
    'eleve':         'élève',
    'eleves':        'élèves',
    'epinard':       'épinard',
    'epinards':      'épinards',
    'fenetre':       'fenêtre',
    'fenetres':      'fenêtres',
    'foret':         'forêt',
    'forets':        'forêts',
    'randonnee':     'randonnée',
    'randonnees':    'randonnées',
    'musee':         'musée',
    'musees':        'musées',
    'bibliotheque':  'bibliothèque',
    'bibliotheques': 'bibliothèques',
    'activite':      'activité',
    'activites':     'activités',
    'legume':        'légume',
    'legumes':       'légumes',
    'cinema':        'cinéma',
    'cinemas':       'cinémas',
    'ceremonie':     'cérémonie',
    'ceremonies':    'cérémonies',
    'serie':         'série',
    'series':        'séries',
    'dejeuner':      'déjeuner',
    'diner':         'dîner',
    'cuillere':      'cuillère',
    'cuilleres':     'cuillères',
    'mathematiques': 'mathématiques',
    'telephone':     'téléphone',
    'telephones':    'téléphones',
    'etudier':       'étudier',
    'ecouter':       'écouter',
    'ecrire':        'écrire',
    'deleguer':      'déléguer',
    'preferer':      'préférer',
    'repeter':       'répéter',
    'energie':       'énergie',
    'energies':      'énergies',
    'fevrier':       'février',
    'decembre':      'décembre',
    'numero':        'numéro',
    'numeros':       'numéros',
    'cafe':          'café',
    'cafes':         'cafés',
    'frere':         'frère',
    'freres':        'frères',
    'mere':          'mère',
    'meres':         'mères',
    'pere':          'père',
    'peres':         'pères',
    'hopital':       'hôpital',
    'hopitaux':      'hôpitaux',
    'hotel':         'hôtel',
    'hotels':        'hôtels',
    'theatre':       'théâtre',
    'theatres':      'théâtres',
    'probleme':      'problème',
    'problemes':     'problèmes',
    'systeme':       'système',
    'systemes':      'systèmes',
    'modele':        'modèle',
    'modeles':       'modèles',
    'regle':         'règle',
    'regles':        'règles',
    'piece':         'pièce',
    'pieces':        'pièces',
    'siecle':        'siècle',
    'siecles':       'siècles',
    'cheque':        'chèque',
    'cheques':       'chèques',
    'pres':          'près',
    'apres':         'après',
    'tres':          'très',
    'etre':          'être',
    'aout':          'août',
    'coreen':        'coréen',
    'coreens':       'coréens',
    'coreenne':      'coréenne',
    'coreennes':     'coréennes',
    'coree':         'Corée',
    'francais':      'français',
    'francaise':     'française',
    'francaises':    'françaises',
    'fete':          'fête',
    'fetes':         'fêtes',
    'prenom':        'prénom',
    'prenoms':       'prénoms',
    'vetement':      'vêtement',
    'vetements':     'vêtements',
    'phonetique':    'phonétique',
    'phonetiques':   'phonétiques',
    'aine':          'aîné',
    'aines':         'aînés',
    'ainee':         'aînée',
    'ainees':        'aînées',
    'maniere':       'manière',
    'manieres':      'manières',
    'recolte':       'récolte',
    'recoltes':      'récoltes',
    'presenter':     'présenter',
    'presente':      'présente',
    'presentee':     'présentée',
    'matiere':       'matière',
    'matieres':      'matières',
    'present':       'présent',
    'garcon':        'garçon',
    'garcons':       'garçons',
    'lecon':         'leçon',
    'lecons':        'leçons',
    'reponse':       'réponse',
    'reponses':      'réponses',
    'etudiant':      'étudiant',
    'etudiants':     'étudiants',
    'etudiante':     'étudiante',
    'etudiantes':    'étudiantes',
    'elegance':      'élégance',
    'evenement':     'événement',
    'evenements':    'événements',
    'interessee':    'intéressée',
    'interesse':     'intéressé',
    # suppléments
    'ecrit':         'écrit',
    'ecrite':        'écrite',
    'ecrits':        'écrits',
    'ecrites':       'écrites',
    'frequent':      'fréquent',
    'frequente':     'fréquente',
    'frequents':     'fréquents',
    'frequentes':    'fréquentes',
    'sautee':        'sautée',
    'sautees':       'sautées',
    'elementaire':   'élémentaire',
    'interessant':   'intéressant',
    'interessante':  'intéressante',
    'voila':         'voilà',
    'preter':        'prêter',
    'celebre':       'célèbre',
    'celebres':      'célèbres',
    'agee':          'âgée',
    'agees':         'âgées',
    'age':           'âge',
    'ages':          'âges',
    'cote':          'côté',
    'cotes':         'côtés',
    'hote':          'hôte',
    'reglement':     'règlement',
    'celebration':   'célébration',
    'celebrations':  'célébrations',
    'elementaire':   'élémentaire',
    'etape':         'étape',
    'etapes':        'étapes',
    'bebe':          'bébé',
    'bebes':         'bébés',
    # --- mots en "-ee" -> "-ée" (classe ratée par la 1re passe) ---
    # NB: "lee" est volontairement EXCLU (nom propre coréen, ne prend pas d'accent).
    'composee':      'composée',
    'composees':     'composées',
    'annee':         'année',
    'annees':        'années',
    'arrivee':       'arrivée',
    'arrivees':      'arrivées',
    'entree':        'entrée',
    'entrees':       'entrées',
    'journee':       'journée',
    'journees':      'journées',
    'utilisee':      'utilisée',
    'utilisees':     'utilisées',
    'figee':         'figée',
    'figees':        'figées',
    'adaptee':       'adaptée',
    'adaptees':      'adaptées',
    'appelee':       'appelée',
    'appelees':      'appelées',
    'pilee':         'pilée',
    'pilees':        'pilées',
    'organisee':     'organisée',
    'organisees':    'organisées',
    'enchantee':     'enchantée',
    'depassee':      'dépassée',
    'depassees':     'dépassées',
    'allee':         'allée',
    'allees':        'allées',
    'donnee':        'donnée',
    'donnees':       'données',
    'tamisee':       'tamisée',
    'tamisees':      'tamisées',
    'lycee':         'lycée',
    'lycees':        'lycées',
    'pratiquee':     'pratiquée',
    'pratiquees':    'pratiquées',
    'matinee':       'matinée',
    'matinees':      'matinées',
    'idee':          'idée',
    'idees':         'idées',
    'soiree':        'soirée',
    'soirees':       'soirées',
    'duree':         'durée',
    'durees':        'durées',
    # --- irréguliers (circonflexe / accent interne) ---
    'ancetre':       'ancêtre',
    'ancetres':      'ancêtres',
    'etrennes':      'étrennes',
    # "saute" n'apparaît dans ce corpus que dans "riz sauté" (vérifié) ; sûr ici.
    'saute':         'sauté',
    'sautes':        'sautés',
}
# Retire les faux positifs (valeur identique à la clé = déjà correct)
ACCENT_MAP = {k: v for k, v in ACCENT_MAP.items() if v != k}

# Fields considered French (for W004 accent checking)
FR_FIELDS = {
    'french', 'title', 'title_fr', 'explanation', 'explanation_fr', 'body',
    'notes', 'description_fr', 'name_fr', 'function_fr', 'setting_fr',
    'register', 'register_formal', 'register_informal',
    'theme', 'word_type', 'verb_type', 'context', 'speaker',
    'contraction_note',
    'keywords', 'tags', 'rules', 'examples', 'lines',
    'pattern', 'pattern_informal', 'breakdown', 'condition',
}
KOREAN_FIELDS = {
    'korean', 'korean_formal', 'korean_informal', 'korean_polite',
    'romanization', 'romanization_formal', 'romanization_informal',
    'id', 'infinitive', 'stem', 'particle', 'letter', 'highlighted',
    'as_batchim', 'batchim_pronunciation', 'position_rule',
    'korean_before_counter', 'system',
}

# Build a regex that matches whole words (sorted longest-first to avoid partial replacement)
_sorted_keys = sorted(ACCENT_MAP.keys(), key=len, reverse=True)
ACCENT_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(k) for k in _sorted_keys) + r')\b',
    re.IGNORECASE,
)


def preserve_case(src: str, target: str) -> str:
    """Return target with the same initial-case pattern as src."""
    if src.isupper():
        return target.upper()
    if src and src[0].isupper():
        return target[0].upper() + target[1:]
    return target


def fix_accents(s: str) -> str:
    def _sub(m):
        original = m.group(0)
        target = ACCENT_MAP[original.lower()]
        return preserve_case(original, target)
    return ACCENT_PATTERN.sub(_sub, s)


def walk_and_fix(node, fr_context: bool, diffs: list, path: str = ''):
    """Walk the JSON tree and apply accent fixes to French fields.
    Modifies dicts/lists in place. Returns the (possibly new) node for strings."""
    if isinstance(node, dict):
        for k in list(node.keys()):
            v = node[k]
            sub_fr = fr_context
            if k in KOREAN_FIELDS:
                sub_fr = False
            elif k in FR_FIELDS or k.endswith('_fr'):
                sub_fr = True
            node[k] = walk_and_fix(v, sub_fr, diffs, f'{path}.{k}' if path else k)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            node[i] = walk_and_fix(item, fr_context, diffs, f'{path}[{i}]')
    elif isinstance(node, str):
        if fr_context:
            new = fix_accents(node)
            if new != node:
                diffs.append((path, node, new))
                return new
    return node


# ---------------------------------------------------------------------------
# ÉTAPE B : corrections ponctuelles (facts + romanisations)
# ---------------------------------------------------------------------------
STEP_B_PATCHES = {
    # (category, id): {field: new_value, ...}
    # Erreurs factuelles
    ('vocabulary', 'voc_ch2_013'): {'french': 'crayon'},
    ('vocabulary', 'voc_ch4_086'): {'french': 'Royaume-Uni'},
    ('vocabulary', 'voc_lex_058'): {'french': 'pain aux haricots rouges sucrés'},
    ('vocabulary', 'voc_ch5_008'): {'french': 'pain aux haricots rouges sucrés'},
    ('vocabulary', 'voc_ch4_042'): {'romanization': 'Cheonggyecheon'},
    # Romanisations fautives
    ('vocabulary', 'voc_lex_230'): {'romanization': 'dakgogi'},
    ('vocabulary', 'voc_lex_281'): {'romanization': 'teuraem'},
    ('vocabulary', 'voc_lex_288'): {'romanization': 'twiniji'},
    ('vocabulary', 'voc_ch2_051'): {'romanization': 'hwaiteubodeu'},
    ('vocabulary', 'voc_ch0_186'): {'romanization': 'seunoubodeu'},
    ('vocabulary', 'voc_ch0_151'): {'romanization': 'remon'},
    ('vocabulary', 'voc_ch2_071'): {'romanization': 'sillaehwa'},
    ('vocabulary', 'voc_lex_247'): {'romanization': 'gimchibokkeum-bap'},
    # Traductions ambiguës
    ('vocabulary', 'voc_lex_018'): {'french': 'baguettes (pour manger)'},
    ('vocabulary', 'voc_lex_177'): {'french': 'noraebang (karaoké coréen)'},
    ('vocabulary', 'voc_ch4_024'): {'french': 'noraebang (karaoké coréen)'},
}

# ---------------------------------------------------------------------------
# ÉTAPE C : hangeul romanisations RR + descriptions enrichies
# ---------------------------------------------------------------------------
STEP_C_PATCHES = {
    # id: {field: new_value, ...}
    'han_ch0_006': {
        'romanization': 'o',
        'description_fr': "Voyelle : se prononce comme « o » fermé (proche de « eau »)",
    },
    'han_ch0_007': {
        'romanization': 'yo',
        'description_fr': "Voyelle iotisée : « yo » (comme « yoyo »)",
    },
    'han_ch0_008': {
        'romanization': 'u',
        'description_fr': "Voyelle : se prononce comme « ou » en français",
    },
    'han_ch0_009': {
        'romanization': 'yu',
        'description_fr': "Voyelle iotisée : « you » (comme « you » anglais)",
    },
    'han_ch0_012': {
        'romanization': 'k',
        'description_fr': "Consonne aspirée : « k » expiré, plus soufflé que ㄱ",
    },
    'han_ch0_015': {
        'romanization': 't',
        'description_fr': "Consonne aspirée : « t » expiré, plus soufflé que ㄷ",
    },
    'han_ch0_019': {
        'romanization': 'p',
        'description_fr': "Consonne aspirée : « p » expiré, plus soufflé que ㅂ",
    },
    'han_ch0_021': {
        'romanization': 'j',
        'description_fr': "Affriquée : proche de « dj », transcrite « j » en RR",
    },
    'han_ch0_022': {
        'romanization': 'ch',
        'description_fr': "Affriquée aspirée : « tch » soufflé, transcrite « ch » en RR",
    },
    # Descriptions courtes (W006) — pas de changement de romanization
    'han_ch0_013': {
        'description_fr': "Consonne nasale, proche du « n » français",
    },
    'han_ch0_014': {
        'description_fr': "Consonne occlusive : « d » en initiale, « t » en finale",
    },
    'han_ch0_016': {
        'description_fr': "Consonne latérale : « r » entre voyelles, « l » en finale",
    },
    'han_ch0_017': {
        'description_fr': "Consonne nasale labiale, comme le « m » français",
    },
    'han_ch0_018': {
        'description_fr': "Occlusive labiale : « b » en initiale, « p » en finale",
    },
    'han_ch0_020': {
        'description_fr': "Sifflante : « s », devient « ch » devant ㅣ",
    },
    'han_ch0_024': {
        'description_fr': "Consonne aspirée, proche du « h » expiré",
    },
}

FLASHABLE = ['vocabulary', 'verbs', 'hangeul', 'numbers', 'expressions',
             'particles', 'time_expressions', 'classifiers', 'connectors',
             'adjectives', 'adverbs']
READABLE = ['grammar', 'culture', 'dialogues', 'pronunciation_rules']


def apply_step_b(data: dict, dry_run: bool) -> list:
    """Apply targeted factual and romanization patches. Returns list of (id, field, old, new)."""
    changes = []
    for cat in FLASHABLE:
        for item in data.get(cat, []):
            iid = item.get('id')
            key = (cat, iid)
            if key in STEP_B_PATCHES:
                for field, new_val in STEP_B_PATCHES[key].items():
                    old_val = item.get(field)
                    if old_val != new_val:
                        changes.append((iid, field, old_val, new_val))
                        if not dry_run:
                            item[field] = new_val
    return changes


def apply_step_c(data: dict, dry_run: bool) -> list:
    """Apply hangeul RR romanization + description patches."""
    changes = []
    for item in data.get('hangeul', []):
        iid = item.get('id')
        if iid in STEP_C_PATCHES:
            for field, new_val in STEP_C_PATCHES[iid].items():
                old_val = item.get(field)
                if old_val != new_val:
                    changes.append((iid, field, old_val, new_val))
                    if not dry_run:
                        item[field] = new_val
    return changes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='preview without writing')
    args = ap.parse_args()

    if not DATA_PATH.exists():
        print(f'ERROR: {DATA_PATH} not found', file=sys.stderr)
        sys.exit(1)

    data = json.loads(DATA_PATH.read_text(encoding='utf-8'))

    print('=== ÉTAPE A : accents manquants ===')
    accent_diffs = []
    walk_and_fix(data, False, accent_diffs)
    print(f'  {len(accent_diffs)} chaînes avec accents à corriger.')
    for path, before, after in accent_diffs[:20]:
        print(f'  {path}:')
        print(f'    - {before[:80]}')
        print(f'    + {after[:80]}')
    if len(accent_diffs) > 20:
        print(f'  ... et {len(accent_diffs) - 20} autres.')

    print()
    print('=== ÉTAPE B : corrections factuelles + romanisations ===')
    b_changes = apply_step_b(data, dry_run=args.dry_run)
    for iid, field, old, new in b_changes:
        print(f'  {iid}.{field}: {old!r} -> {new!r}')

    print()
    print('=== ÉTAPE C : hangeul RR + descriptions ===')
    c_changes = apply_step_c(data, dry_run=args.dry_run)
    for iid, field, old, new in c_changes:
        print(f'  {iid}.{field}: {old!r} -> {new!r}')

    if args.dry_run:
        print()
        print('[dry-run] Aucun fichier écrit.')
        return

    # Étape A was already applied in-place by walk_and_fix (modifies dicts/lists)
    # B and C also applied in-place above

    new_text = json.dumps(data, ensure_ascii=False, indent=2)
    DATA_PATH.write_text(new_text + '\n', encoding='utf-8')
    print()
    total = len(accent_diffs) + len(b_changes) + len(c_changes)
    print(f'Écrit {DATA_PATH}  ({total} modifications appliquées).')


if __name__ == '__main__':
    main()
