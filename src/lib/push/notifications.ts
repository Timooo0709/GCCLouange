// Persistance des notifications « cloche » — un document par envoi push ponctuel
// (manuel, rappel, diffusion). Lu côté client par useNotifications (REST) pour
// afficher dans la cloche les push qui n'ont AUCUNE autre trace persistée. Les
// notifications « setlist prête » et « annonce » ne passent pas par ici : elles
// apparaissent déjà dans la cloche via les collections setlists / annonces.
// Serveur uniquement (Admin SDK, contourne firestore.rules).

import { adminDb } from "./admin";

export type BellKind = "manual" | "reminder" | "broadcast";

export interface RecordNotificationInput {
  title: string;
  body: string;
  /** URL ouverte au clic (chemin interne) */
  url: string;
  kind: BellKind;
  /** Destinataires exacts (uid) ; ignoré si `everyone`. */
  recipients?: string[];
  /** Diffusion à tous les membres connectés (cloche visible par tout le monde). */
  everyone?: boolean;
}

/** Écrit l'entrée de cloche correspondant à un envoi push. N'écrit rien si
 *  personne n'est ciblé (ni destinataires, ni diffusion) — évite les docs
 *  orphelins, donc des lectures inutiles côté cloche. La date est un vrai
 *  timestamp Firestore (≠ notifLog qui stocke un nombre) pour permettre le tri
 *  et la requête incrémentale `createdAt > since` côté client. */
export async function recordNotification(input: RecordNotificationInput): Promise<void> {
  const recipients = [...new Set(input.recipients ?? [])];
  const everyone = input.everyone ?? false;
  if (!everyone && recipients.length === 0) return;
  await adminDb().collection("notifications").add({
    title: input.title,
    body: input.body,
    url: input.url,
    kind: input.kind,
    recipients,
    everyone,
    createdAt: new Date(),
  });
}
