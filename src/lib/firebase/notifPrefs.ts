"use client";

// Préférences de notification par type, doc auto-géré notifPrefs/{uid}.
// Lecture/écriture via l'API REST Firestore (comme le reste du projet).

import { FS_BASE, authHeader, toFsFields, fromFsValue, type RawDoc } from "@/lib/firebase/setlists";
import { DEFAULT_NOTIF_PREFS, NOTIF_TYPES, type NotifPrefs } from "@/types/user";

export async function getNotifPrefs(uid: string): Promise<NotifPrefs> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/notifPrefs/${uid}`, { headers });
  // Doc absent (404) ou accès refusé → valeurs par défaut (tout activé).
  if (!res.ok) return { ...DEFAULT_NOTIF_PREFS };
  const raw = (await res.json()) as RawDoc;
  const out = { ...DEFAULT_NOTIF_PREFS };
  for (const k of NOTIF_TYPES) {
    const v = raw.fields?.[k];
    if (v !== undefined) out[k] = fromFsValue(v) !== false;
  }
  return out;
}

export async function saveNotifPrefs(uid: string, prefs: NotifPrefs): Promise<void> {
  const headers = await authHeader();
  // PATCH sans updateMask crée ou remplace le document notifPrefs/{uid}.
  const res = await fetch(`${FS_BASE}/notifPrefs/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...prefs }) }),
  });
  if (!res.ok) throw new Error("Enregistrement des préférences échoué");
}
