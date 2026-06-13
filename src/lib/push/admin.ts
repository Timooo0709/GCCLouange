// Firebase Admin — accès Firestore privilégié côté serveur (routes API + cron).
// Contourne firestore.rules : sert à lire tous les abonnements push / profils et
// à écrire le journal de notifications. À n'importer QUE depuis du code serveur.

import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccountJson {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant");
  // Accepte le JSON brut ou encodé en base64 (recommandé sur Vercel).
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json) as ServiceAccountJson;
}

function adminApp(): App {
  if (getApps().length) return getApp();
  const sa = loadServiceAccount();
  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

/** Vérifie un ID token Firebase Auth (en-tête Authorization du client). */
export function verifyIdToken(token: string): Promise<DecodedIdToken> {
  return getAuth(adminApp()).verifyIdToken(token);
}
