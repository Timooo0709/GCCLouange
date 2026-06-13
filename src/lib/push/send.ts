// Envoi de notifications Web Push (VAPID) + nettoyage des abonnements périmés.
// Serveur uniquement.

import webpush from "web-push";
import { adminDb } from "./admin";

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Clés VAPID manquantes");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:gcccfranco@gmail.com",
    publicKey,
    privateKey
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** URL ouverte au clic (relative à l'origine du site) */
  url?: string;
  /** Regroupe/remplace les notifs d'un même sujet (ex. id de setlist) */
  tag?: string;
}

interface SubDoc {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Tous les abonnements push des uid donnés (collection pushSubscriptions). */
async function subscriptionsForUids(uids: string[]): Promise<SubDoc[]> {
  if (!uids.length) return [];
  const db = adminDb();
  const out: SubDoc[] = [];
  // L'opérateur `in` accepte 30 valeurs max → on découpe.
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    const snap = await db
      .collection("pushSubscriptions")
      .where("uid", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (d.endpoint && d.p256dh && d.auth) {
        out.push({ id: doc.id, endpoint: d.endpoint, p256dh: d.p256dh, auth: d.auth });
      }
    }
  }
  return out;
}

/** Envoie `payload` à tous les appareils des uid. Renvoie le bilan d'envoi.
 *  Supprime les abonnements rejetés en 404/410 (désinstallés/expirés). */
export async function sendPushToUids(
  uids: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; recipients: number }> {
  const unique = [...new Set(uids)];
  if (!unique.length) return { sent: 0, failed: 0, recipients: 0 };
  configure();

  const db = adminDb();
  const subs = await subscriptionsForUids(unique);
  const body = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err) {
        failed++;
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db.collection("pushSubscriptions").doc(s.id).delete().catch(() => {});
        }
      }
    })
  );

  return { sent, failed, recipients: unique.length };
}
