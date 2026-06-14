// Résolution « noms du planning Google Sheet » → comptes (uid).
// Serveur uniquement.

import { adminDb } from "./admin";
import { normalizeName } from "@/lib/planning/names";
import { legacyServiceRoles } from "@/lib/access";
import type { LegacyServiceProfile, ServiceRole } from "@/types/user";

/** Index normalize(planningName) → uid(s). Plusieurs comptes peuvent partager
 *  une même graphie (rare) : on garde une liste. Lit tous les profils (Admin). */
export async function loadPlanningNameIndex(): Promise<Map<string, string[]>> {
  const snap = await adminDb().collection("users").get();
  const map = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const pn = (doc.data().planningName as string | undefined)?.trim();
    if (!pn) continue;
    const key = normalizeName(pn);
    const arr = map.get(key) ?? [];
    arr.push(doc.id);
    map.set(key, arr);
  }
  return map;
}

/** Convertit une liste de noms de planning en uid (dédupliqués).
 *  Les noms sans compte correspondant sont ignorés (choix produit) et renvoyés
 *  dans `unresolved` pour un éventuel log serveur. */
export function resolveNamesToUids(
  names: string[],
  index: Map<string, string[]>
): { uids: string[]; unresolved: string[] } {
  const uids = new Set<string>();
  const unresolved: string[] = [];
  for (const name of names) {
    const hit = index.get(normalizeName(name));
    if (hit?.length) hit.forEach((u) => uids.add(u));
    else unresolved.push(name);
  }
  return { uids: [...uids], unresolved };
}

/** uid des comptes qui servent dans `category` (clé de serviceRoles, avec repli
 *  legacy pour les profils pas encore réécrits). Cible des annonces poussées par
 *  section. Serveur uniquement (Admin, lit tous les profils). */
export async function uidsForCategory(category: string): Promise<string[]> {
  const snap = await adminDb().collection("users").get();
  const out: string[] = [];
  for (const doc of snap.docs) {
    const d = doc.data() as LegacyServiceProfile & {
      serviceRoles?: Record<string, ServiceRole[]>;
    };
    const sr = d.serviceRoles ?? legacyServiceRoles(d);
    if (category in sr) out.push(doc.id);
  }
  return out;
}
