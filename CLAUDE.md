# Blokaja - App d'apprentissage du coreen

## Stack

- Vanilla HTML/CSS/JS (pas de framework, pas de bundler)
- Capacitor 8 pour le packaging Android (APK/AAB)
- Donnees chargees depuis `data/course_data.json` au runtime
- Persistence via `localStorage` (cle: `blokaja4`)
- UI en francais, contenu base sur un manuel de coreen

## Architecture

```
conjugator.js   # Moteur de conjugaison coreenne (charge AVANT app.js)
app.js          # Logique SRS, UI, navigation, recherche
practice.js     # Modes d'entrainement (charge APRES app.js)
index.html      # SPA unique, pas de routing
styles.css      # Tous les styles (dark theme, CSS variables)
data/           # course_data.json + exercises.json (source des donnees)
www/            # Copie des assets web pour Capacitor (webDir, genere au build)
android/        # Projet Android genere par Capacitor
  keystore/     # Keystore de signature release (hors git)
  keystore.properties  # Credentials du keystore (hors git)
```

Ordre de chargement dans index.html : `conjugator.js` -> `app.js` -> `practice.js`
(scripts classiques, fonctions globales partagees ; pas de modules ES).

## Commandes

```bash
# Dev : servir depuis www/ (contient le data/)
cd www && python -m http.server 8080

# Build debug APK
python rebuild-apk.py

# Build release AAB (Play Store)
python rebuild-apk.py --release

# Sync des fichiers web vers www/ + build Android
# (le script rebuild-apk.py fait les deux)
```

## SRS Engine (Anki SM-2)

Le moteur SRS (Anki SM-2) est dans `app.js`. Points cles :

- **4 grades** : Again (1), Hard (2), Good (3), Easy (4)
- **Etats** : 0=new, 1=learning, 2=review, 3=relearning
- **Format carte** : `P[id] = { st, e, iv, due, step, reps, lapses }`
- **Intervalles en minutes** (pas en jours)
- **Ease** : init 2.5, min 1.3, pas de plafond. Again -0.20, Hard -0.15, Good 0, Easy +0.15
- **Fuzz** : applique sur les intervalles >2 jours pour eviter le clustering
- **Limite quotidienne** : cap DUR (au-dela, plus aucune nouvelle carte servie), configurable via settings (`blokaja4_settings`)
- **Selection** : `pickNext(items, recent)` choisit a chaque appel la carte eligible la plus prioritaire (reviews en retard > learning > nouvelles > pas encore dues), exclut suspendues + nouvelles au-dela du cap, et evite de re-montrer une carte vue dans les `RECENT_GUARD` (8) derniers tirages. PLUS de deck mutable a doublons (ancien bug : 5 cartes en boucle, nouvelles jamais servies en illimite). Couvert par `tests/scheduler.test.js`.
- **Fin de session** : quand il ne reste que des cartes pas encore dues, un bilan s'affiche (bouton « Continuer quand meme » pour forcer).

## Moteur de conjugaison (`conjugator.js`)

Module pur (pas de DOM), testable via `require` sous bun. `conjugate(dictForm, {irregular, pos, stem})`
genere toutes les formes A1 : present (poli/informel), passe, futur, negation (courte/못/longue),
honorifique, connectives (-고/-아서), conditionnel (-(으)면).

- Helpers Hangeul Unicode : `decompose`/`compose` (base 0xAC00), `hasBatchim`, `harmony`.
- Irreguliers geres : ㅂ / ㄷ / ㅡ / 르 / ㄹ / ㅅ / ㅎ (liste blanche d'adjectifs) / 하다, copule 이다/아니다.
- `detectIrregular(dictForm)` deduit le type ; surcharges `CONJUGATION_OVERRIDES` pour 있다/없다/알다/드시다.
- **Les conjugaisons ne sont PAS stockees** dans course_data.json : chaque verbe/adjectif porte
  `pos` (verb|adj|copula|verb_exist) + `irregular` (null|"ㅂ"|...), le moteur fait le reste.
  `engineConj(it)` dans app.js lit ces champs ; repli sur `conjugations` legacy si le moteur manque.
- Couvert par `tests/conjugator.test.js` (~94 cas, chaque irregulier + helpers).

## Modes d'entrainement (`practice.js`, en plus du SRS)

Hub `#screen-practice` + ecran `#screen-exercise`. 4 modes, progression dans `blokaja4_practice`
(separe du SRS, qui n'est pas touche) :

- **Conjugaison** : genere depuis verbs/adjectives via le moteur (QCM, distracteurs = autres formes).
- **QCM** : vocabulaire (kr->fr) et particules (phrase a trou) depuis les donnees.
- **Generateurs** : heure/date/prix/compteur, generes au runtime (distracteurs natif vs sino).
- **Grammaire** : `data/exercises.json` (charge a la demande). Schema d'un exercice :
  `{id, grammar_id, chapter, mode(mcq|free_input), label, prompt_fr, prompt_kr?, context_kr?, answer, answer_alts?, distractors, explanation, tts_answer?}`.

## Reglages (localStorage `blokaja4_settings`)

- `newPerDay` (cap dur ; 0 = illimite), `autoSpeak` (TTS coreen au flip), `showRomanization` (sinon un bouton « Indice » la revele sans retourner la carte), `direction` (`kr-fr` | `fr-kr` | `mixed`), `typing` (mode saisie auto-test, accepte la romanisation).
- TTS : plugin natif `@capacitor-community/text-to-speech` (vraie voix coreenne sur Android) avec repli Web Speech dans le navigateur. `speakKr()` dans `app.js`.
- Streak quotidien : `blokaja4_streak`. Carte suspendue : flag `suspended` dans `blokaja4`. Compteur de nouvelles du jour : `blokaja4_newcount`.

## Gotchas

- Les fichiers source (`app.js`, `index.html`, `styles.css`) ET les donnees (`data/course_data.json`) vivent a la RACINE. `rebuild-apk.py` les copie vers `www/` au build. **Toujours editer a la racine**, jamais dans `www/` (genere, gitignore).
- La copie canonique des donnees est `data/course_data.json` (RACINE) ; `www/data/...` en est une copie generee. `check_quality.py` et `fix_all.py` operent sur la racine.
- Pour tester dans le navigateur, servir depuis la RACINE (`python -m http.server 8080`) : elle contient index.html, app.js, styles.css et `data/`.
- `rebuild-apk.py` a une LISTE EN DUR des fichiers web copies vers `www/` (`sync_web_assets`). Tout nouveau fichier web (ex: `conjugator.js`, `practice.js`, `data/exercises.json`) DOIT y etre ajoute, sinon il manque dans l'APK.
- `cap sync` ne regenere PAS les icones Android. Apres avoir change `icon-512.png`, lancer `python generate_icons.py` (Pillow) AVANT le build pour reecrire `android/app/src/main/res/mipmap-*`. (`@capacitor/assets` est installe mais son `sharp` ne compile pas sous Windows ici.)
- Le build release necessite `android/keystore.properties` et `android/keystore/blokaja-release.keystore` -- hors git.
- Les categories `FLASHABLE` (avec SRS) vs `READABLE` (lecture seule) sont definies dans les constantes en haut de `app.js`.

## Categories de contenu

- **Flashable** (SRS) : vocabulary, verbs, hangeul, numbers, expressions, particles, time_expressions, classifiers, connectors, adjectives, adverbs
- **Readable** (pas de SRS) : grammar, culture, dialogues, pronunciation_rules
- Chaque item porte `source` (`book` | `added` | `topik`). `book` = manuel Kaja ; `added` = ajouts
  A1/TOPIK-I hors-livre (`chapter:-1`, `page:null`). Verbes/adjectifs : `pos` + `irregular` (moteur).
- `data/exercises.json` = exercices de grammaire (mode Grammaire), distinct de course_data.json.

## Config Capacitor

- `appId`: `blokaja.app`
- `appName`: `Blokaja`
- `webDir`: `www`
- `targetSdkVersion`: 36

## Style de code

- Vanilla JS, fonctions globales, pas de modules
- `$()` = `document.querySelector`, `$$()` = `document.querySelectorAll`
- Noms courts pour le stockage : `st`, `e`, `iv`, `due`, `step`, `reps`, `lapses`
- Tests : `bun test tests/` (SRS + scheduler ~43, conjugueur ~94, practice ~39). `check_quality.py` = controle data (erreurs E001-E011 bloquantes, warnings W001-W015). Tous deux tournent en etape 1-2 de `rebuild-apk.py`.
- Commits en anglais avec prefixes conventionnels (feat, fix, refactor)

## Workflow

- **Committer souvent** : chaque modification logique = un commit. Ne pas accumuler.
- **En fin de grosse session** (ajout de fonctionnalite, refacto importante) : toujours terminer par `python rebuild-apk.py` pour synchroniser www/ et verifier que le build passe, puis commit final.
