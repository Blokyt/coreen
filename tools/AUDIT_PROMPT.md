# PROMPT D'AUDIT — Blokaja v2

> Copie ce prompt tel quel dans une nouvelle conversation Claude Code
> depuis le répertoire `C:\Users\bloki\Desktop\Programmation\coreen`

---

Tu es un expert en applications d'apprentissage des langues, en UX/UI mobile-first.
Tu vas auditer l'application "Blokaja v2", une PWA en vanilla JS pour apprendre le coréen (public francophone A1).

## CONTEXTE DE L'APP

L'app est une **single-page app** (vanilla JS, pas de framework) avec :
- **7 chapitres** (0=Hangeul, 1-6=leçons) contenant vocab, verbes, grammaire, expressions, particules, nombres, connecteurs, culture, hangeul
- **Modes de quiz** : QCM (`qQcm`), flashcards (`qFlash`), écriture libre (`qWrite`), marathon (`qMarathon`), exam blanc (`startExamBlanc`)
- **Système SRS** (répétition espacée) avec clés préfixées par type : `v:`, `e:`, `a:`, `w:`, `n:`, `c:`, `p:`, `h:` + clés nues pour le vocabulaire
- **Révision du jour** (`startReviewSession`) : résout les clés SRS → items de DATA
- **Sections de DATA** : `vocabulary`, `verbs`, `grammar`, `phrases`, `numbers`, `particles`, `culture`, `expressions`, `hangeul`, `connectors`, `adjectives`, `adverbs`

## PHILOSOPHIE DE L'AUDIT

**L'app fonctionne et est utilisée.** L'objectif n'est pas de lister 100 améliorations possibles mais de trouver les **vrais bugs** qui cassent l'expérience utilisateur. Ne propose pas de refactoring, pas de changement d'architecture, pas de suggestions cosmétiques.

Règle d'or : **si ça marche et que l'utilisateur ne voit pas le problème, ce n'est pas un bug.**

## RÈGLE ABSOLUE SUR LES DONNÉES

**La source de vérité est `extraction_data/unified_data.json`** (extraction du manuel "Kaja, Hanguk!" — Belin Éducation).

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
node tools/verify_data.js particles-check             → vérifie champs examples/ex des particules
```

### Ce que tu NE DOIS JAMAIS faire :
- **NE JAMAIS "corriger" une romanisation, traduction, ou orthographe coréenne** sans avoir d'abord exécuté `node tools/verify_data.js compare <mot>` et constaté une divergence avec la source
- **NE JAMAIS invoquer tes propres connaissances linguistiques** pour dire qu'une donnée est fausse. Le coréen n'est pas ton domaine. La source (le livre scolaire) fait autorité.
- Les romanisations marquées `[auto]` dans la source sont auto-générées — elles SONT la référence même si elles ne suivent pas le standard académique
- Les différences d'accents (é/è/ê vs e) entre source et data.js sont des AMÉLIORATIONS, pas des erreurs

### Ce que tu PEUX signaler :
- **Bugs de CODE** dans app.js (logique cassée, filtres qui ne marchent pas, etc.) — vérifiables par lecture du code, indépendants des données
- **Divergences de CONTENU** entre data.js et la source (mot traduit différemment, sens modifié) — uniquement après vérification via le script
- **Doublons** dans data.js qui ont des valeurs contradictoires (deux entrées pour le même mot avec des romanisations ou traductions différentes)

### Ce qui N'EST PAS un problème (faux positifs connus) :
- Les mots qui apparaissent dans **vocabulary ET verbs** (ex: 쓰다) sont normaux — sections différentes, clés SRS différentes (`vocabSrsKey` vs `v:` prefix)
- Les nombres qui apparaissent dans **vocabulary** (avec `fr`) ET **numbers** (avec `val`) sont normaux — structures différentes pour usage différent
- Les doublons entre **vocabulary et phrases** sont souvent voulus (mot seul + mot en contexte)
- ~90% des divergences du script sont des différences d'accents → les ignorer en bloc

---

## FICHIERS À LIRE

Lis ces fichiers dans cet ordre :
1. `app.js` — logique applicative (~3000 lignes)
2. `data.js` — données coréennes (~3000 lignes, 12 sections dans l'objet DATA)
3. `styles.css` — styles
4. `index.html` — structure HTML
5. `sw.js` — service worker (cache offline)

## ANALYSE À EFFECTUER

### 1. BUGS DE CODE (priorité max)

Cherche les bugs qui **cassent le fonctionnement** pour l'utilisateur :

**Vérifications automatiques :**
- Exécute `node tools/verify_data.js numbers-check`
- Exécute `node tools/verify_data.js particles-check`

**Cohérence des clés SRS (critique) :**
- Vérifie que `srsKey()` (ligne ~216) et `quizSrsKey()` (ligne ~1994) produisent des clés **cohérentes** pour tous les types. Attention : `quizSrsKey` ne gère pas tous les préfixes que `srsKey` gère (expr `e:`, nombre `n:`, particule `p:`, hangeul `h:`) — est-ce un bug ou est-ce que ces types ne passent jamais par `quizSrsKey` ?
- Vérifie que `SRS.getDueItems()` retrouve bien tous les types d'items
- Vérifie que `startReviewSession()` (ligne ~2744) résout correctement **tous** les préfixes de clés SRS (`v:`, `e:`, `a:`, `w:`, `n:`, `c:`, `p:`, `h:` + clés nues) vers les items de DATA

**Logique de quiz :**
- Vérifie la comparaison des réponses en mode écriture (alternatives `/`, ponctuation, accents)
- Vérifie que le mode marathon (`qMarathon`) recharge bien de nouveaux items quand le pool est épuisé
- Vérifie que `startExamBlanc()` (ligne ~2799) construit un pool représentatif (pas que du vocab)
- Vérifie la cohérence des quality SRS entre les modes (`handleQuizAnswer` vs appels directs à `SRS.record`)

**Service worker :**
- Vérifie que la liste `ASSETS` dans `sw.js` correspond aux fichiers réellement présents à la racine

### 2. DIVERGENCES DONNÉES (rapide)
- Exécute `node tools/verify_data.js divergences`
- IGNORE les ~90% de différences d'accents
- Signale UNIQUEMENT les vrais changements de sens (max 5-10 items)
- Exécute `node tools/verify_data.js duplicates`
- Signale UNIQUEMENT les doublons dans la MÊME section (ex: 2 fois le même mot dans vocabulary) avec des valeurs contradictoires

### 3. UX MOBILE (rapide)
Vérifie uniquement :
- Touch targets < 44px quelque part ?
- Safe areas (notch) oubliées ?
- Clavier virtuel qui masque un input ?
- Thème sombre : élément oublié qui reste blanc ?

Ne pas auditer : accessibilité clavier avancée, ARIA, lecteurs d'écran — c'est une app mobile.

## FORMAT DE SORTIE

**Maximum 15 items au total.** Pas de liste infinie.

Pour chaque bug/problème trouvé :
1. **Quoi** : description en 1-2 phrases
2. **Où** : fichier:ligne
3. **Impact** : 🔴 Casse l'app / 🟡 Gêne l'utilisateur / 🟢 Cosmétique
4. **Fix** : correction suggérée en 1-2 phrases

Termine par un résumé : **X bugs critiques, Y importants, Z cosmétiques.**

## IMPORTANT
- PAS de refactoring (pas de frameworks, TypeScript, modules ES6)
- PAS de suggestions d'architecture, de performance, de "bonnes pratiques"
- PAS de section "pédagogie" — l'app est déjà utilisée et le parcours est validé
- Si tout va bien dans une catégorie, dis juste "RAS" — pas besoin de tableau détaillé
- **Chaque affirmation sur les données doit être vérifiée via le script avant d'être émise**
- **Quand tu trouves un bug de CODE, corrige-le directement** (sauf données coréennes — celles-ci doivent être validées avec l'utilisateur)
