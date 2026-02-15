# Build APK — Korean Revision App

Guide complet pour empaqueter l'app web en APK Android avec Capacitor.

---

## Pré-requis

- **Node.js** (deja installe)
- **Android Studio** : https://developer.android.com/studio
  - Pendant l'install, accepter le SDK Android (API 33 ou 34)
  - Apres install, noter le chemin SDK (generalement `C:\Users\bloki\AppData\Local\Android\Sdk`)
  - Ajouter la variable d'environnement `ANDROID_HOME` pointant vers ce chemin
  - Ajouter `%ANDROID_HOME%\platform-tools` au PATH

---

## Etape 1 — Creer le dossier `www/`

Capacitor sert les fichiers depuis un dossier web. On copie uniquement les fichiers utiles (pas le PDF de 58 Mo ni le JSON inutilise).

```bash
mkdir www
cp revision.html www/index.html
cp styles.css www/
cp app.js www/
```

**Fichiers exclus volontairement :**
- `kaja.pdf` (58 Mo, jamais reference par l'app)
- `kaja_data.json` (jamais charge, les donnees sont dans `app.js`)

---

## Etape 2 — Telecharger les polices Google Fonts pour usage hors-ligne

L'app utilise 3 polices depuis le CDN Google. Pour fonctionner hors-ligne sur Android, il faut les embarquer.

### 2.1 Telecharger les fichiers `.woff2`

Aller sur https://gwfh.mranftl.com/fonts et telecharger :

| Police | Poids | Charset |
|--------|-------|---------|
| **DM Sans** | 300, 400, 500 | Latin |
| **Cormorant Garamond** | 300, 400, 600 (normal) + 300, 400 (italic) | Latin |
| **Noto Sans KR** | 300, 400, 500, 700 | Korean |

Choisir le format **woff2** uniquement (Modern Browsers).

### 2.2 Placer les fichiers

```
www/
  fonts/
    dm-sans/
      dm-sans-v15-latin-300.woff2
      dm-sans-v15-latin-400.woff2
      dm-sans-v15-latin-500.woff2
    cormorant-garamond/
      cormorant-garamond-v16-latin-300.woff2
      cormorant-garamond-v16-latin-400.woff2
      cormorant-garamond-v16-latin-600.woff2
      cormorant-garamond-v16-latin-300italic.woff2
      cormorant-garamond-v16-latin-400italic.woff2
    noto-sans-kr/
      noto-sans-kr-v36-korean-300.woff2
      noto-sans-kr-v36-korean-400.woff2
      noto-sans-kr-v36-korean-500.woff2
      noto-sans-kr-v36-korean-700.woff2
```

### 2.3 Creer `www/fonts.css`

```css
/* DM Sans */
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./fonts/dm-sans/dm-sans-v15-latin-300.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/dm-sans/dm-sans-v15-latin-400.woff2') format('woff2');
}
@font-face {
  font-family: 'DM Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./fonts/dm-sans/dm-sans-v15-latin-500.woff2') format('woff2');
}

/* Cormorant Garamond */
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./fonts/cormorant-garamond/cormorant-garamond-v16-latin-300.woff2') format('woff2');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/cormorant-garamond/cormorant-garamond-v16-latin-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('./fonts/cormorant-garamond/cormorant-garamond-v16-latin-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 300;
  font-display: swap;
  src: url('./fonts/cormorant-garamond/cormorant-garamond-v16-latin-300italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Cormorant Garamond';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/cormorant-garamond/cormorant-garamond-v16-latin-400italic.woff2') format('woff2');
}

/* Noto Sans KR */
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 300;
  font-display: swap;
  src: url('./fonts/noto-sans-kr/noto-sans-kr-v36-korean-300.woff2') format('woff2');
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('./fonts/noto-sans-kr/noto-sans-kr-v36-korean-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('./fonts/noto-sans-kr/noto-sans-kr-v36-korean-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Noto Sans KR';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('./fonts/noto-sans-kr/noto-sans-kr-v36-korean-700.woff2') format('woff2');
}
```

### 2.4 Modifier `www/index.html`

Remplacer les lignes 7-8 :

```html
<!-- SUPPRIMER : -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">

<!-- AJOUTER : -->
<link rel="stylesheet" href="fonts.css">
```

---

## Etape 3 — Initialiser le projet Capacitor

```bash
# Initialiser package.json
npm init -y

# Installer Capacitor
npm install @capacitor/core
npm install -D @capacitor/cli

# Initialiser la config Capacitor
npx cap init "Korean Revision" "com.bloki.koreanrevision" --web-dir www

# Ajouter la plateforme Android
npm install @capacitor/android
npx cap add android
```

---

## Etape 4 — Synchroniser les fichiers web

```bash
npx cap sync android
```

Ceci copie tout le contenu de `www/` dans `android/app/src/main/assets/public/`.

---

## Etape 5 — Personnaliser le theme Android

Modifier `android/app/src/main/res/values/styles.xml` pour que la barre de statut et la barre de navigation correspondent au theme sombre de l'app :

```xml
<style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
    <item name="android:statusBarColor">#0A0806</item>
    <item name="android:navigationBarColor">#141008</item>
    <item name="android:windowLightStatusBar">false</item>
</style>
```

---

## Etape 6 — Build l'APK

### Option A : Via Android Studio (recommande pour la premiere fois)

```bash
npx cap open android
```

Puis dans Android Studio :
1. Attendre que le **Gradle sync** se termine
2. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
3. L'APK sera a : `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B : En ligne de commande

```bash
cd android
./gradlew assembleDebug
```

L'APK debug sera a `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Etape 7 — Installer sur le telephone

```bash
# Via ADB (telephone branche en USB, debogage USB active)
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Ou simplement transferer le fichier `.apk` sur le telephone et l'ouvrir.

---

## Taille estimee de l'APK

| Composant | Taille |
|-----------|--------|
| index.html | 15 Ko |
| styles.css | 27 Ko |
| app.js | 65 Ko |
| Polices (woff2) | 3-5 Mo |
| Runtime Capacitor + WebView | 2-3 Mo |
| **Total estime** | **5-8 Mo** |

---

## Commandes de mise a jour

Quand tu modifies les fichiers web (html/css/js), il faut re-synchroniser :

```bash
# Copier les fichiers modifies dans www/ si necessaire
cp styles.css www/
cp app.js www/

# Puis synchroniser avec Android
npx cap sync android

# Puis rebuild dans Android Studio ou :
cd android && ./gradlew assembleDebug
```

---

## Fichier .gitignore a creer

```
node_modules/
android/
www/fonts/
*.apk
```

---

## Notes

- **Fonctionne 100% hors-ligne** : toutes les donnees sont dans `app.js`, pas de requetes reseau
- **PDF exclu** : le `kaja.pdf` (58 Mo) n'est pas reference par l'app et alourdirait inutilement l'APK
- **Compatibilite** : Android 7+ (WebView base Chromium supporte tous les CSS/JS utilises)
- **Icone de l'app** : remplacer les fichiers dans `android/app/src/main/res/mipmap-*/` par ton propre icone
