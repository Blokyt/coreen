# Blokaja - App d'apprentissage du coreen

## Stack

- Vanilla HTML/CSS/JS (pas de framework, pas de bundler)
- Capacitor 8 pour le packaging Android (APK/AAB)
- Donnees chargees depuis `data/course_data.json` au runtime
- Persistence via `localStorage` (cle: `blokaja4`)
- UI en francais, contenu base sur un manuel de coreen

## Architecture

```
app.js          # Toute la logique (SRS, UI, navigation, recherche)
index.html      # SPA unique, pas de routing
styles.css      # Tous les styles (dark theme, CSS variables)
www/            # Copie des assets web pour Capacitor (webDir)
  data/         # course_data.json (source de toutes les donnees)
android/        # Projet Android genere par Capacitor
  keystore/     # Keystore de signature release (hors git)
  keystore.properties  # Credentials du keystore (hors git)
```

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

Le moteur SRS est dans `app.js` (lignes ~28-230). Points cles :

- **4 grades** : Again (1), Hard (2), Good (3), Easy (4)
- **Etats** : 0=new, 1=learning, 2=review, 3=relearning
- **Format carte** : `P[id] = { st, e, iv, due, step, reps, lapses }`
- **Intervalles en minutes** (pas en jours)
- **Ease** : init 2.5, min 1.3, pas de plafond. Again -0.20, Hard -0.15, Good 0, Easy +0.15
- **Fuzz** : applique sur les intervalles >2 jours pour eviter le clustering
- **Limite quotidienne** : configurable via settings (localStorage `blokaja4_settings`)
- **Priorite** : reviews en retard > learning > nouvelles cartes

## Gotchas

- Les fichiers source (`app.js`, `index.html`, `styles.css`) sont a la racine ET copies dans `www/`. Le script `rebuild-apk.py` synchronise racine -> www. **Toujours editer les fichiers a la racine**, pas dans `www/`.
- `www/data/course_data.json` est la seule copie du fichier de donnees -- il n'existe PAS a la racine dans `data/`.
- Pour tester dans le navigateur, servir depuis `www/` (pas la racine) car le JSON est la-bas.
- Le build release necessite `android/keystore.properties` et `android/keystore/blokaja-release.keystore` -- ces fichiers sont hors git.
- Les categories `FLASHABLE` (avec SRS) vs `READABLE` (lecture seule) sont definies dans les constantes en haut de `app.js`.

## Categories de contenu

- **Flashable** (SRS) : vocabulary, verbs, hangeul, numbers, expressions, particles, time_expressions, classifiers, connectors, adjectives, adverbs
- **Readable** (pas de SRS) : grammar, culture, dialogues, pronunciation_rules

## Config Capacitor

- `appId`: `com.blokaja.coreen`
- `appName`: `Blokaja`
- `webDir`: `www`
- `targetSdkVersion`: 36

## Style de code

- Vanilla JS, fonctions globales, pas de modules
- `$()` = `document.querySelector`, `$$()` = `document.querySelectorAll`
- Noms courts pour le stockage : `st`, `e`, `iv`, `due`, `step`, `reps`, `lapses`
- Pas de tests automatises
- Commits en anglais avec prefixes conventionnels (feat, fix, refactor)

## Workflow

- **Committer souvent** : chaque modification logique = un commit. Ne pas accumuler.
- **En fin de grosse session** (ajout de fonctionnalite, refacto importante) : toujours terminer par `python rebuild-apk.py` pour synchroniser www/ et verifier que le build passe, puis commit final.
