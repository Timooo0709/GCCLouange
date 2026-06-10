# Spec — Fonctionnalité « Ajouter un chant » (EN ATTENTE)

> Statut : **mise de côté, non implémentée** (décision du 10 juin 2026).
> Design validé par questions/réponses ; ce document fige tous les détails
> pour reprendre le chantier plus tard sans re-réfléchir.

## Objectif

Permettre d'ajouter un chant au site en fournissant simplement **le nom du
chant + sa partition (PDF ou image)**. Le fichier `.cho` est créé par un
agent IA suivant les Guidelines Chordpro ; pour un chant chinois dont la
partition contient du jianpu, le **bloc 简谱** est généré dans la même
passe. Exigence : fidélité totale (structure, accords, paroles) — d'où une
étape de relecture humaine avant publication.

## Décisions prises (avec alternatives écartées)

| Question | Décision | Alternatives écartées |
|---|---|---|
| Moteur de conversion | **File d'attente + agent en arrière-plan** | API Claude appelée en direct par le site (coût/clé API, conversion pendant l'attente) ; conversion 100 % déterministe (impossible à 100 % : pas d'OMR jianpu fiable, règles éditoriales = jugement) |
| Exécutant de l'agent | **Manuel via notification** : le site notifie, Timothée lance une session Claude Code qui traite la file | Claude Code GitHub Action (événementiel, clé API en secret) ; routine Claude Code planifiée (/schedule, polling) ; worker dédié Agent SDK (~5 €/mois, ops) |
| Validation | **Relecture sur le site** avant publication | Publication directe (erreurs en prod) ; PR GitHub seule (réservé aux utilisateurs GitHub) |
| Stockage des chants validés | **Commit dans le repo** (content-as-code conservé) | Firestore (2 sources de vérité, perte du Git) ; hybride |
| Stockage de l'upload | **Commit dans le repo** (dossier inbox) | Firebase Storage (nouveau service) ; Firestore base64 (limite 1 Mo) |
| 简谱 | **Automatique si jianpu détecté** dans la partition | Case à cocher ; à la demande après coup |
| Accès / délai | **Connectés uniquement · quelques heures acceptables** | Immédiat (impose l'API directe) ; ouvert à tous avec modération |

## Flux complet

1. **Soumission** (utilisateur connecté)
   Formulaire : nom du chant, partition (PDF ou image·s), champs
   facultatifs (artiste, tonalité, langue). Une route serveur pousse via
   l'API GitHub :
   - `content/inbox/<slug>/partition.pdf` (ou `page-1.jpg`, `page-2.jpg`…)
   - `content/inbox/<slug>/request.json` : `{ title, language?, artist?,
     key?, submittedBy, submittedAt }`
   **Le commit EST la file d'attente** : archivage Git, partition source
   conservée à côté du futur .cho, zéro nouveau service.

2. **Notification**
   Email à Timothée à chaque soumission — réutiliser la tuyauterie
   existante `src/lib/report/` (`reportEmailService`). Coût quasi nul.

3. **Conversion (manuelle)**
   Session Claude Code : l'agent lit `content/inbox/`, suit
   `../Guidelines Chordpro/00-runbook-agents.md` (mission B « créer un
   .cho », + mission C « créer le 简谱 » si jianpu détecté) : scripts
   pixel, zooms, règles éditoriales (`CHORDPRO_GUIDELINES.md`), test
   d'alignement. Résultat : commit du `.cho` sur une **branche** (jamais
   main), déplacement de la partition de `inbox/` vers `Partitions/` (ou
   suppression de l'inbox au merge).

4. **Relecture sur le site**
   Vercel crée automatiquement une **preview deployment** par branche →
   la relecture côte à côte (rendu .cho / partition source) se fait sur
   l'URL de preview, sans interface de validation à développer.
   Corrections éventuelles = éditer le .cho (texte). Puis merge.

5. **Publication**
   Merge → rebuild Vercel → chant en ligne en ~2-3 min, historique Git
   complet.

## Pourquoi ce design

- **Évolutif sans refonte** : pour automatiser plus tard, brancher une
  Claude Code GitHub Action déclenchée par le commit dans `content/inbox/`
  — la file d'attente et le format `request.json` ne changent pas.
- **Zéro infra nouvelle** : un token GitHub en variable d'environnement
  Vercel, c'est tout. Pas de Storage, pas de worker, pas de clé API
  exposée au navigateur.
- **Qualité = le processus déjà validé** sur 爱赢了 : guidelines + scripts
  + relecture humaine.

## Points ouverts (à trancher à la reprise)

1. **Statut visible** : afficher « chants en cours d'ajout » sur le site
   (lecture du dossier inbox) ou invisible jusqu'à publication ?
2. **Garde-fous upload** : taille max (~10 Mo), formats acceptés
   (pdf/png/jpg), vérification du token Firebase **côté serveur** sur la
   route d'upload, détection de doublon (slug existant → proposer un
   signalement plutôt qu'une re-soumission).
3. **Qui valide** : Timothée seul, ou le soumetteur peut relire sa propre
   demande sur la preview ?
4. **Multi-pages** : accepter plusieurs fichiers par chant (partition de
   2 pages, photos multiples) — probablement oui.

## Estimation d'implémentation (le jour venu)

- Formulaire + route serveur d'upload GitHub : 1 session de travail ;
- Email de notification : réutilisation de `src/lib/report/` — trivial ;
- Section « traiter l'inbox » dans `00-runbook-agents.md` : petite ;
- (Optionnel) liste des demandes en attente sur le site.

## Références

- `../Guidelines Chordpro/00-runbook-agents.md` — runbook de l'agent
  (missions B et C, critères d'acceptation) ;
- `../Guidelines Chordpro/05-creer-un-cho.md` — création d'un .cho ;
- `../Guidelines Chordpro/04-transcription-jianpu.md` — transcription 简谱 ;
- `CHORDPRO_GUIDELINES.md` — règles éditoriales du projet ;
- `src/lib/report/` — service email réutilisable pour la notification.
