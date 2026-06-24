// Publication des plannings par trimestre.
//
// Les pages planning (Culte, Groupes) lisent le Google Sheet en direct : dès
// qu'une cellule du trimestre suivant est remplie, elle s'affiche. Pour ne
// révéler un trimestre que lorsqu'il est prêt, on garde dans Firestore la liste
// des trimestres « publiés » par planning et par année
// (planningReleases/{key}_{year}, champ `published: string[]`). Un trimestre
// futur non publié est masqué aux membres ; le trimestre courant et les passés
// restent toujours visibles (filet de sécurité).
//
// Module PUR (aucune dépendance Firebase/serveur) : importable par les pages
// client, le panneau de publication ET la route serveur /api/planning/release.

import { NOTIFY_ALL } from "@/lib/push/audiences"

export interface PublishablePlanning {
  /** Clé stable : id Firestore + sélecteur de groupe de la page Groupes. */
  key: string
  /** Libellé affiché (panneau de publication, texte de notification). */
  label: string
  /** Audience qui reçoit la notif à la publication (NOTIFY_ALL ou une catégorie). */
  notifyAudience: string
  /** Droit `notify` requis pour publier (en plus des admins). */
  permission: string
}

// Périmètre actuel : Culte Franco + les 3 groupes. Les clés des groupes
// correspondent au sélecteur de la page Groupes ("paix" | "fidelite" | "bonte").
export const PUBLISHABLE_PLANNINGS: PublishablePlanning[] = [
  { key: "culte",    label: "Culte Franco",    notifyAudience: NOTIFY_ALL,        permission: "Culte Francophone" },
  { key: "paix",     label: "Groupe Paix",     notifyAudience: "Groupe Paix",     permission: "Groupe Paix" },
  { key: "fidelite", label: "Groupe Fidélité", notifyAudience: "Groupe Fidélité", permission: "Groupe Fidélité" },
  { key: "bonte",    label: "Groupe Bonté",    notifyAudience: "Groupe Bonté",    permission: "Groupe Bonté" },
]

export function getPlanning(key: string): PublishablePlanning | undefined {
  return PUBLISHABLE_PLANNINGS.find((p) => p.key === key)
}

export const TRI_ORDER = ["T1", "T2", "T3", "T4"] as const
export type Tri = (typeof TRI_ORDER)[number]

export function triRank(tri: string): number {
  return TRI_ORDER.indexOf(tri as Tri)
}

/** Admins + porteurs du droit notif « tout le monde » + porteurs du droit notif
 *  propre à ce planning peuvent le publier. */
export function canPublishPlanning(
  planning: PublishablePlanning,
  isAdmin: boolean,
  notifyRights: string[]
): boolean {
  return isAdmin || notifyRights.includes(NOTIFY_ALL) || notifyRights.includes(planning.permission)
}

export interface TriVisibility {
  tri: string
  /** Affiché à l'utilisateur courant ? (membre : courant/passé OU publié ; publieur : toujours) */
  visible: boolean
  /** Trimestre futur non encore publié → badge « Non publié » (vu par les publieurs uniquement). */
  unpublished: boolean
}

/** Décide, pour chaque trimestre, sa visibilité et l'état « non publié ».
 *  Règle membre : visible si `triRank(tri) <= triRank(courant)` (le trimestre
 *  courant et les passés s'affichent toujours) OU s'il est publié. Un publieur
 *  (`canPublish`) voit tout, les trimestres futurs non publiés étant marqués
 *  pour relecture avant publication. */
export function triVisibilities(
  available: readonly string[],
  published: string[],
  currentTri: string,
  canPublish: boolean
): TriVisibility[] {
  const cur = triRank(currentTri)
  return available.map((tri) => {
    const futureUnpublished = triRank(tri) > cur && !published.includes(tri)
    return { tri, visible: canPublish || !futureUnpublished, unpublished: futureUnpublished }
  })
}

// ─── Lecture publique de l'état de publication (REST Firestore, sans auth) ─────
// Les pages planning sont consultées sans compte → lecture publique du doc
// planningReleases/{key}_{year}. Doc absent / erreur réseau = rien de publié.

const FS_DOCS =
  "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents"

export async function getPublishedQuarters(key: string, year: number): Promise<string[]> {
  try {
    const res = await fetch(`${FS_DOCS}/planningReleases/${key}_${year}`, { cache: "no-store" })
    if (!res.ok) return []
    const raw = (await res.json()) as {
      fields?: { published?: { arrayValue?: { values?: { stringValue?: string }[] } } }
    }
    return (raw.fields?.published?.arrayValue?.values ?? [])
      .map((v) => v.stringValue ?? "")
      .filter(Boolean)
  } catch {
    return []
  }
}
