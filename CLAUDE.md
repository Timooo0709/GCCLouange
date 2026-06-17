# CLAUDE.md — GCC Louange

Site de partitions de louange pour l'église GCC. Spec complète dans `cahier-des-charges-site-louange.md`.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Firebase Auth + Firestore · Resend (emails) · Vercel

## Commandes
```bash
npm run dev          # Serveur de développement
npm run build        # build:index + next build
npm run build:index  # Parse content/songs/*.cho → public/songs-index.json
npm run validate     # Valide les fichiers .cho (métadonnées, parsing)
npm run lint         # ESLint (flat config, eslint.config.mjs)
npx tsc --noEmit     # Vérification TypeScript (c'est ce que fait la CI)
```

## Architecture clé
- **Chants** : fichiers `.cho` (ChordPro) dans `content/songs/`, parsés au build → `public/songs-index.json` (utilisé côté client pour liste/recherche)
- **Setlists, profils, annonces** : Firestore — voir `src/lib/firebase/`
- **Firestore = API REST uniquement** (`fetch` + token Firebase Auth). Jamais le SDK WebChannel côté navigateur (bloqué sur certains réseaux). Seul `firebase/auth` est utilisé du SDK.
- **Comptes & rôles** : profils dans `users/{uid}` (rôles, lieux de service, EDD, groupe). Permissions client dans `src/lib/access.ts`, miroir serveur dans `firestore.rules`.
- **`firestore.rules`** : versionné ici mais doit être **publié manuellement dans la console Firebase** pour prendre effet. La liste des admins doit rester synchronisée avec `ADMIN_EMAILS` dans `src/lib/access.ts`.
- **Confidentialité (choix assumé)** : les rules autorisent `read: if signedIn()` sur **toutes** les setlists et tous les profils. Le filtrage `isPrivate` / visibilité par service (`canSeeSetlist`, `src/lib/access.ts`) est **côté client uniquement** — un membre connecté peut techniquement lire en REST une setlist privée ou un profil. Acceptable pour un outil interne de confiance ; ne pas re-signaler comme faille sans nouvelle demande de durcissement.
- **Routes API** : `/api/song/[slug]` (contenu d'un chant), `/api/report` (signalement par email via Resend — env `RESEND_API_KEY`, `MAIL_TO`, `EMAIL_FROM` sur Vercel)
- **Planning** : Google Sheet public lu en CSV (`src/lib/planning/sheets.ts`) + données statiques (`data.ts`)
- **PWA** : service worker `public/sw.js` (cache-first assets, stale-while-revalidate pages, API exclue)
- **Hébergement** : Vercel. La CI GitHub (`.github/workflows/deploy.yml`) fait typecheck + validate.

## Formats importants
- ChordPro : `[accord]paroles` dans les lignes, `{directive: valeur}` en en-tête — guidelines détaillées dans `CHORDPRO_GUIDELINES.md`
- Chinois : `[C]caractères   pinyin` (3 espaces min entre chars et pinyin)
- Jianpu : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles

## Couleurs spec
- Accords : `#2563EB` (bleu)
- Sections : `#EA580C` (orange)
- Jianpu : `#B91C1C` (rouge foncé)

## Règles
- Commits séparés par fichier (best practice de ce projet)
- Tester sur au moins 1 chant FR + 1 chant ZH avant de valider une étape
- Toute modif des permissions doit être faite en double : `src/lib/access.ts` (client) **et** `firestore.rules` (serveur)

## Comportement (guidelines Karpathy)

### Penser avant de coder
- Expliciter les hypothèses avant d'implémenter. Si incertain, demander.
- Si plusieurs interprétations existent, les présenter — ne pas choisir silencieusement.
- Si une approche plus simple existe, la proposer. Pousser en arrière si justifié.
- Si quelque chose est flou, s'arrêter et nommer ce qui est confus.

### Simplicité d'abord
- Minimum de code qui résout le problème. Rien de spéculatif.
- Pas de features au-delà de ce qui est demandé.
- Pas d'abstractions pour du code à usage unique.
- Pas de gestion d'erreurs pour des scénarios impossibles.

### Changements chirurgicaux
- Ne toucher que ce qui est nécessaire. Ne pas "améliorer" le code adjacent.
- Correspondre au style existant, même si on ferait différemment.
- Si du code mort est repéré, le mentionner — ne pas le supprimer.
- Nettoyer uniquement les imports/variables rendus orphelins par SES propres changements.

### Exécution orientée objectif
- Définir des critères de succès vérifiables avant de commencer.
- Pour les tâches multi-étapes, énoncer un plan bref avec vérification à chaque étape.
