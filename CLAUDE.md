# CLAUDE.md — GCC Louange

Site de partitions de louange pour l'église GCC. Spec complète dans `cahier-des-charges-site-louange.md`.
Specs de fonctionnalités en attente : `docs/` (ex. `docs/spec-ajouter-un-chant.md`).

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
- Jianpu simple : `{jianpu: 3 3 5 6 5}` sur la ligne juste au-dessus des paroles
- Partition 简谱 complète : bloc `{start_of_jianpu}…{end_of_jianpu}` (syntaxe
  détaillée dans `../Guidelines Chordpro/03-syntaxe-jianpu.md`), rendue en SVG
  par `src/components/jianpu/JianpuScore.tsx`

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
