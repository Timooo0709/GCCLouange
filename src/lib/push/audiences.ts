// Audiences des notifications manuelles (envoyées par les personnes autorisées via
// le champ profil `notify`). Importable côté client (composer, admin) et serveur
// (route notify-audience) — constantes pures, aucune dépendance serveur.

import { SERVICE_LIEUX, GROUPES } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { categoryLabel } from "@/lib/serviceColors";

/** Sentinelle « tout le monde » (tous les abonnés). */
export const NOTIFY_ALL = "*";

/** Catégories ciblables individuellement, groupées pour l'UI. */
export const NOTIFY_GROUPS: { label: string; audiences: string[] }[] = [
  { label: "Cultes", audiences: [...SERVICE_LIEUX] },
  { label: "Groupes", audiences: [...GROUPES] },
  { label: "EDD", audiences: [...EDD_CLASSES] },
];

/** Toutes les catégories ciblables (hors « tout le monde »). */
export const NOTIFY_CATEGORIES: string[] = NOTIFY_GROUPS.flatMap((g) => g.audiences);

/** Audience valide ? (« tout le monde » ou une catégorie connue) */
export function isValidAudience(a: string): boolean {
  return a === NOTIFY_ALL || NOTIFY_CATEGORIES.includes(a);
}

/** Libellé lisible d'une audience (« tout le monde » ou une catégorie). */
export function audienceLabel(a: string): string {
  return a === NOTIFY_ALL ? "Tout le monde" : categoryLabel(a);
}
