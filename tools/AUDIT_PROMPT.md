# PROMPT D'AUDIT — Blokaja v2

> Copie ce prompt tel quel dans une nouvelle conversation Claude Code
> depuis le répertoire `C:\Users\bloki\Desktop\Programmation\coreen`

---

Tu es un expert en applications d'apprentissage des langues, en UX/UI mobile-first.
Tu vas auditer l'application "Blokaja v2", une PWA en vanilla JS pour apprendre le coréen (public francophone A1).

## RÈGLE ABSOLUE SUR LES DONNÉES

**La source de vérité est `extraction_data/unified_data.json`** (extraction du manuel "Kaja, Hanguk!" - Belin Éducation).

Tu disposes d'un script de vérification : `node tools/verify_data.js`

Commandes disponibles :
```
node tools/verify_data.js search <mot_coréen>        → cherche dans la source
node tools/verify_data.js compare <mot_coréen>       → compare source vs data.js
node tools/verify_data.js field <mot_coréen> <champ>  → un champ précis
node tools/verify_data.js duplicates                  → doublons dans data.js
node tools/verify_data.js divergences                 → toutes divergences data.js vs source
node tools/verify_data.js stats                       → statistiques
node tools/verify_data.js numbers-check               → vérifie bug filtres nombres
node tools/verify_data.js particles-check             → vérifie bug particules exam
```

### Ce que tu NE DOIS JAMAIS faire :
- **NE JAMAIS "corriger" une romanisation, traduction, ou orthographe coréenne** sans avoir d'abord exécuté `node tools/verify_data.js compare <mot>` et constaté une divergence avec la source
- **NE JAMAIS invoquer tes propres connaissances linguistiques** pour dire qu'une donnée est fausse. Le coréen n'est pas ton domaine. La source (le livre scolaire) fait autorité.
- Les romanisations marquées `[auto]` dans la source sont auto-générées — elles SONT la référence même si elles ne suivent pas le standard académique
- Les différences d'accents (é/è/ê vs e) entre source et data.js sont des AMÉLIORATIONS, pas des erreurs

### Ce que tu PEUX signaler :
- **Divergences de CONTENU** entre data.js et la source (mot traduit différemment, sens modifié) — uniquement après vérification via le script
- **Bugs de CODE** dans app.js (logique cassée, filtres qui ne marchent pas, etc.) — vérifiables par lecture du code, indépendants des données
- **Doublons** dans data.js qui ont des valeurs contradictoires (deux entrées pour le même mot avec des romanisations ou traductions différentes)

---

## FICHIERS À LIRE

Lis ces fichiers dans cet ordre :
1. `app.js` (~2900 lignes) — logique applicative
2. `data.js` (~3255 lignes) — données coréennes
3. `styles.css` (~2034 lignes) — styles
4. `index.html` (~91 lignes) — structure
5. `sw.js` (~63 lignes) — service worker

## ANALYSE À EFFECTUER

### 1. BUGS DE CODE (priorité max)
Cherche les incohérences entre le code app.js et la structure des données data.js :
- **Exécute `node tools/verify_data.js numbers-check`** pour vérifier le bug des filtres nombres
- **Exécute `node tools/verify_data.js particles-check`** pour vérifier le bug de l'examen blanc
- Vérifie la fonction `srsKey()` (app.js ~L215) et son usage dans les quiz (flashcards ~L2036, QCM ~L2128, écriture ~L2201, dictée ~L2327, association ~L2243)
- Vérifie `getDueItems()` (app.js ~L278) : les items level 3 sont-ils révisés ?
- Vérifie le mode marathon : est-il vraiment "sans fin" comme décrit ?
- Vérifie le mode écriture : comment les réponses sont-elles comparées ?
- Vérifie la navigation : le back browser pendant un quiz est-il protégé ?

### 2. DIVERGENCES DONNÉES (via le script)
- **Exécute `node tools/verify_data.js divergences`** et filtre les résultats :
  - IGNORE les différences d'accents (é vs e, etc.)
  - SIGNALE uniquement les vrais changements de sens
- **Exécute `node tools/verify_data.js duplicates`** et signale ceux avec `⚠️ ROM DIFF` ou `⚠️ FR DIFF`

### 3. UI/UX
- Thème sombre : éléments oubliés ?
- Touch targets mobiles (≥ 48px)
- Safe areas (notch, barre nav)
- Clavier virtuel masque-t-il les inputs ?
- Accessibilité : aria-label, navigation clavier

### 4. PERFORMANCE
- Poids data.js et stratégie de cache SW
- Taille SRS localStorage à terme
- Debounce recherche

### 5. PÉDAGOGIE
- Le SRS est-il correctement intégré dans le parcours ?
- 8 modes de quiz : complémentarité ou redondance ?
- La romanisation est-elle trop présente par défaut ?
- Feedback utilisateur : suffisant ?
- Exercices manquants pour le A1 ?

## FORMAT DE SORTIE

Pour chaque section :
1. Tableau récapitulatif (✅/⚠️/❌)
2. Problèmes concrets avec références (fichier:ligne)
3. Suggestions classées : 🔴 Critique / 🟡 Important / 🟢 Nice-to-have
4. Effort estimé : [S]imple / [M]oyen / [C]omplexe

## IMPORTANT
- PAS de refactoring architectural (pas de frameworks, TypeScript, modules ES6)
- Concentre-toi sur l'UTILISATEUR FINAL
- Si quelque chose fonctionne bien, dis-le
- **Chaque affirmation sur les données doit être vérifiée via le script avant d'être émise**
