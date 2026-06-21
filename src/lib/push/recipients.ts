// Résolution « noms du planning Google Sheet » → comptes (uid).
// Serveur uniquement.

import { adminDb } from "./admin";
import { normalizeName } from "@/lib/planning/names";
import { ADMIN_EMAILS } from "@/lib/access";
import type { ServiceRole, NotifType } from "@/types/user";

/** uid des comptes administrateurs (ADMIN_EMAILS). Cible des notifications de
 *  signalement. Serveur uniquement (Admin, lit tous les profils). */
export async function adminUids(): Promise<string[]> {
  const wanted = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase()));
  const snap = await adminDb().collection("users").get();
  const out: string[] = [];
  for (const doc of snap.docs) {
    const email = (doc.data().email as string | undefined)?.toLowerCase();
    if (email && wanted.has(email)) out.push(doc.id);
  }
  return out;
}

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

/** uid des comptes qui servent dans `category` (clé de serviceRoles). Cible des
 *  annonces poussées par section. Serveur uniquement (Admin, lit tous les profils). */
export async function uidsForCategory(category: string): Promise<string[]> {
  const snap = await adminDb().collection("users").get();
  const out: string[] = [];
  for (const doc of snap.docs) {
    const sr = (doc.data().serviceRoles ?? {}) as Record<string, ServiceRole[]>;
    if (category in sr) out.push(doc.id);
  }
  return out;
}

/** Ensemble des uid servant dans au moins une des `categories` (clés de serviceRoles).
 *  Sert à valider qu'un expéditeur a le droit de notifier des personnes précises
 *  (elles doivent appartenir à une catégorie qu'il peut notifier). Lit tous les
 *  profils une seule fois. Serveur uniquement. */
export async function uidsForCategories(categories: string[]): Promise<Set<string>> {
  const wanted = new Set(categories);
  const out = new Set<string>();
  if (!wanted.size) return out;
  const snap = await adminDb().collection("users").get();
  for (const doc of snap.docs) {
    const sr = (doc.data().serviceRoles ?? {}) as Record<string, ServiceRole[]>;
    if (Object.keys(sr).some((c) => wanted.has(c))) out.add(doc.id);
  }
  return out;
}

/** Retire les uid ayant désactivé ce type de notification (doc notifPrefs/{uid}).
 *  Absence de doc ou de champ = activé (défaut). Sert à respecter les préférences
 *  sur les envois AUTOMATIQUES (rappels, setlist prête, annonce) — pas les envois
 *  manuels. Serveur uniquement (Admin). */
export async function filterUidsByNotifPref(uids: string[], type: NotifType): Promise<string[]> {
  if (!uids.length) return [];
  const db = adminDb();
  const snaps = await db.getAll(...uids.map((u) => db.collection("notifPrefs").doc(u)));
  // On garde tout uid qui n'a pas EXPLICITEMENT mis ce type à false.
  return snaps.filter((s) => !(s.exists && s.data()?.[type] === false)).map((s) => s.id);
}
