# CLAUDE.md — GCC Louange

Site de partitions de louange pour l'église GCC. Spec complète dans `cahier-des-charges-site-louange.md`.

## Stack
Next.js 15 (static export) · TypeScript · Tailwind CSS + shadcn/ui · GitHub Pages

## Commandes
```bash
npm run dev          # Serveur de développement
npm run build        # build:index + next build (export statique)
npm run build:index  # Parse content/songs/*.cho → public/songs-index.json
npm run validate     # Lint des fichiers .cho et .json
```

## Architecture clé
- **Contenu** : fichiers `.cho` (ChordPro) dans `content/songs/`, setlists JSON dans `content/setlists/`
- **Index** : `scripts/build-index.ts` → `public/songs-index.json` (généré au build, utilisé côté client)
- **Pas de backend** : tout tourne dans le navigateur (transposition, PDF, recherche)
- **Hébergement** : GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)

## Formats importants
- ChordPro : `[accord]paroles` dans les lignes, `{directive: valeur}` en en-tête
- Chinois : `[C]caractères   pinyin` (3 espaces min entre chars et pinyin)
- Jianpu : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles

## Couleurs spec
- Accords : `#2563EB` (bleu)
- Sections : `#EA580C` (orange)
- Jianpu : `#B91C1C` (rouge foncé)

## Setlists
Tout le monde peut créer des setlists (pas seulement les responsables) en éditant les JSON dans `content/setlists/`.

## Règles
- Commits séparés par fichier (best practice de ce projet)
- Tester sur au moins 1 chant FR + 1 chant ZH avant de valider une étape
- Pas de mini-éditeur web en v1 (content-as-code uniquement)
