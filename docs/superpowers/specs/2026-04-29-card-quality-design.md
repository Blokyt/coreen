# Card quality patch & deterministic verification

**Date :** 2026-04-29
**Auteur :** session de brainstorming Vicente Spada / Claude
**Statut :** Approuvé — prêt pour writing-plans

## Contexte

Test manuel de l'app Blokaja avant mise en ligne sur le Play Store : trois familles de bugs identifiés sur les flashcards.

1. **Verso vide ou cassé** sur certaines cartes.
2. **Réponse française visible au recto** (au lieu de la romanisation) pour les verbes et adjectifs.
3. **Romanisation absente** sur 27 cartes du vocabulaire.

L'utilisateur veut (a) un patch ciblé qui corrige ces trois familles et (b) un script de vérification déterministe pour empêcher la régression et garantir la qualité du contenu avant chaque build release.

## Audit déterministe (état initial)

Audit Python sur `www/data/course_data.json` (1361 cartes flashables, 11 catégories) :

| Bug | Cartes touchées |
|---|---|
| **A** Français au recto (`fSub: getFr`) | 64 verbs + 12 adjectives |
| **B** Verso vide (champ source manquant) | 1 verb (`vrb_ch0_001`) + 4 adjectives (`adj_ch2_001`, `adj_ch6_001`, `adj_ch6_002`, `adj_ch6_003`) |
| **C** Romanisation manquante | 27 vocabulary (`voc_ch0_020` à `voc_ch0_046`) |

Catégories sans bug détecté : hangeul, numbers, expressions, particles, time_expressions, classifiers, connectors, adverbs.

## Décisions de design

### Bug A — Réponse au recto

**Décision :** remplacer `fSub: getFr` par `fSub: getRom` pour verbs et adjectives. La romanisation (déjà présente dans les données) prend la place de la traduction française au recto. La traduction reste accessible au verso.

**Justification :** cohérence avec les autres catégories (vocabulary, time_expressions, classifiers, connectors, adverbs utilisent toutes ce pattern). Aucune information n'est perdue car `bSub: getFr` est ajouté au verso des verbes (le verso des adjectifs avait déjà ce champ).

### Bug B — Verso vide

**Décision :** patcher les données plutôt que d'ajouter du fallback dans le code. Pour 5 cartes l'édition est triviale et préserve la cohérence du schéma.

Champs à ajouter dans `www/data/course_data.json` :

| Carte | Mot | Champ ajouté | Valeur |
|---|---|---|---|
| `vrb_ch0_001` | 쓰다 | `conjugations` | `{ "polite_present": "써요", "informal_present": "써", "polite_past": "썼어요", "polite_negative": "안 써요" }` |
| `adj_ch2_001` | 어때 | `korean_polite` | `"어때요"` |
| `adj_ch6_001` | 행복하다 | `korean_polite` | `"행복해요"` |
| `adj_ch6_002` | 슬프다 | `korean_polite` | `"슬퍼요"` |
| `adj_ch6_003` | 화가 나다 | `korean_polite` | `"화가 나요"` |

### Bug C — Romanisations manquantes

**Décision :** ajouter la romanisation aux 27 cartes vocabulary. Convention Revised Romanization (cohérente avec le reste du JSON, ex: `annyeonghaseyo` pour 안녕하세요).

| ID | Coréen | Romanisation |
|---|---|---|
| voc_ch0_020 | 아이 | ai |
| voc_ch0_021 | 여우 | yeou |
| voc_ch0_022 | 요요 | yoyo |
| voc_ch0_023 | 오이 | oi |
| voc_ch0_024 | 우유 | uyu |
| voc_ch0_025 | 고기 | gogi |
| voc_ch0_026 | 가구 | gagu |
| voc_ch0_027 | 나 | na |
| voc_ch0_028 | 누나 | nuna |
| voc_ch0_029 | 나무 | namu |
| voc_ch0_030 | 미소 | miso |
| voc_ch0_031 | 코 | ko |
| voc_ch0_032 | 쿠키 | kuki |
| voc_ch0_033 | 구두 | gudu |
| voc_ch0_034 | 라디오 | radio |
| voc_ch0_035 | 버터 | beoteo |
| voc_ch0_036 | 토마토 | tomato |
| voc_ch0_037 | 루비 | rubi |
| voc_ch0_038 | 다리 | dari |
| voc_ch0_039 | 비누 | binu |
| voc_ch0_040 | 두부 | dubu |
| voc_ch0_041 | 포도 | podo |
| voc_ch0_042 | 피자 | pija |
| voc_ch0_043 | 셔츠 | syeocheu |
| voc_ch0_044 | 버스 | beoseu |
| voc_ch0_045 | 사자 | saja |
| voc_ch0_046 | 주스 | juseu |

## Patch app.js (Bug A)

Modification dans la table `CARD` (`app.js` autour des lignes 660-666).

```diff
- verbs: { label: 'Verbe', fMain: getKr, fSub: getFr,
-          bMain: verbBack, bExtra: verbExtra },
+ verbs: { label: 'Verbe', fMain: getKr, fSub: getRom,
+          bMain: verbBack, bSub: getFr, bExtra: verbExtra },

- adjectives: { label: 'Adjectif', fMain: getKr, fSub: getFr,
-               bMain: it => it.korean_polite || '', bSub: getFr },
+ adjectives: { label: 'Adjectif', fMain: getKr, fSub: getRom,
+               bMain: it => it.korean_polite || '', bSub: getFr },
```

Note : le fichier source à éditer est `app.js` à la racine. Le script `rebuild-apk.py` synchronise vers `www/app.js` au moment du build.

## Script `check_quality.py`

### Architecture

Fichier Python autonome (stdlib uniquement) à la racine du projet.

```
check_quality.py
├─ Section 1 : chargement du JSON
├─ Section 2 : portage Python des accesseurs JS
│   (normalize_expression, get_kr, get_fr, get_rom, verb_back, etc.)
├─ Section 3 : portage Python de buildFront / buildBack
├─ Section 4 : règles de validation (catalogue)
├─ Section 5 : runner (collecte + tri + rapport)
└─ Section 6 : CLI (--json, exit code)
```

### Catalogue de règles

**Erreurs bloquantes (E)** — exit code 1 si présentes :

| Code | Description |
|---|---|
| E001 | Carte flashable sans `id` |
| E002 | `id` dupliqué (toutes catégories confondues) |
| E003 | `chapter` invalide (n'existe pas dans `D.chapters`, sauf `-1` = lexique) |
| E004 | `buildFront()` retourne une chaîne vide |
| E005 | `buildBack()` retourne une chaîne vide |
| E006 | Champs requis manquants selon le schéma de la catégorie |
| E007 | Doublon de contenu : deux cartes avec même `(korean, french)` dans une même catégorie |
| E008 | Pour `READABLE` : aucun contenu lisible (`body`/`explanation`/`explanation_fr`/`lines` tous vides) |

**Warnings (W)** — non bloquants, signalés dans la sortie :

| Code | Description |
|---|---|
| W001 | Romanisation absente sur une catégorie où elle est attendue |
| W002 | Champ `page` manquant ou ≤ 0 |
| W003 | Romanisation contenant des caractères non-ASCII (suspect) |
| W004 | `notes` vide |

### Schémas par catégorie (E006)

| Catégorie | Champs requis |
|---|---|
| vocabulary | korean, french, romanization, page, chapter, id |
| verbs | infinitive, french, romanization, conjugations.polite_present (ou .informal_present), page, chapter, id |
| hangeul | letter, romanization, type, page, chapter, id |
| numbers | numeral, korean, system, romanization, page, chapter, id |
| expressions | (korean_formal+korean_informal) OU polite.korean ; french ; au moins une romanisation parmi (romanization_formal, romanization_informal, polite.romanization, informal.romanization) ; page, chapter, id |
| particles | particle, function_fr (ou name_fr), page, chapter, id |
| time_expressions | korean, french, romanization, page, chapter, id |
| classifiers | korean, french, romanization, page, chapter, id |
| connectors | korean, french, romanization, page, chapter, id |
| adjectives | (korean ou infinitive), french, romanization, korean_polite, page, chapter, id |
| adverbs | korean, french, romanization, page, chapter, id |
| grammar / culture | title, (explanation OR explanation_fr OR body), page |
| dialogues | title_fr, lines (≥1), page |
| pronunciation_rules | title, (explanation OR body), page |

### Sortie console

État OK :
```
=== Blokaja Quality Check ===
Données : www/data/course_data.json
Cartes flashables : 1361 · Lisibles : 127

ERREURS (0)
WARNINGS (0)

OK — tous les contrôles sont passés.
```

État KO :
```
ERREURS (3)
  [E005] adjectives/adj_ch6_001 (행복하다) : verso vide
  [E006] verbs/vrb_ch0_001 : conjugations.polite_present manquant
  ...

WARNINGS (12)
  [W004] vocabulary/voc_ch0_005 : champ notes vide
  ...

ECHEC — corriger avant de builder une release.
```

### Sortie JSON (`--json`)

```json
{
  "ok": false,
  "stats": {
    "flashable_total": 1361,
    "readable_total": 127,
    "errors_count": 3,
    "warnings_count": 12
  },
  "errors": [
    { "code": "E005", "cat": "adjectives", "id": "adj_ch6_001", "msg": "verso vide" }
  ],
  "warnings": [
    { "code": "W004", "cat": "vocabulary", "id": "voc_ch0_005", "msg": "champ notes vide" }
  ]
}
```

### Exit codes

- `0` : aucune erreur (warnings tolérés).
- `1` : au moins une erreur.

## Intégration `rebuild-apk.py`

Pipeline étendu de 4 → 5 étapes :

```
[1/5] Quality check         (← nouveau)
[2/5] Syncing web assets    (= ancien 1/4)
[3/5] Running Capacitor sync (= ancien 2/4)
[4/5] Building APK/AAB      (= ancien 3/4)
[5/5] Locating output       (= ancien 4/4)
```

Comportement :

- **Mode debug (défaut)** : check bloquant. Flag `--skip-quality-check` disponible pour les cas d'urgence (édition de données en cours).
- **Mode `--release`** : check bloquant inconditionnel. Si `--skip-quality-check` est passé en plus de `--release`, le flag est ignoré et un warning est affiché. La qualité passe avant tout en production.

Code d'intégration approximatif :

```python
def quality_check(project_root, strict=True):
    log_step("1/5", "Quality check (data integrity)")
    success, stdout, stderr = run_cmd("python check_quality.py", cwd=project_root, timeout=30)
    print(stdout)
    if not success and strict:
        log_error("Quality check failed — aborting build")
        log_warning("Use --skip-quality-check to bypass (debug builds only)")
        sys.exit(1)
    if success:
        log_success("Quality check passed")
```

## Ce qui n'est pas dans le périmètre

- Vérification orthographique du français (pas de dictionnaire, hors périmètre).
- Validation du Hangeul (caractères mal saisis) : pourrait être ajouté plus tard.
- Tests UI / capture d'écran automatisée : hors périmètre, l'app reste vanilla JS sans framework de test.
- Tests SRS : moteur déjà refactorisé récemment, l'audit ne couvre que le contenu.

## Critères de succès

1. Tous les versos affichent du contenu non-vide après le patch (vérifiable via `check_quality.py`).
2. Les recto des verbes/adjectifs affichent la romanisation, plus le français.
3. `python check_quality.py` retourne exit 0 sur l'état post-patch (0 erreur).
4. `python rebuild-apk.py --release` lance le check qualité et bloque sur erreur.
5. Le moteur SRS et le format de stockage `localStorage` ne sont pas modifiés (zéro régression utilisateur).
