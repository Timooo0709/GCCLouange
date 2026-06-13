// Abonnement aux notifications Web Push côté navigateur.
// L'abonnement est stocké dans Firestore via l'API REST (comme le reste du
// projet) : collection pushSubscriptions, un document par appareil, id
// `{uid}__{hashEndpoint}` (mirroir des règles, cf. firestore.rules).

import { FS_BASE, authHeader, toFsFields } from "@/lib/firebase/setlists";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** L'app tourne-t-elle en mode « installée » (ajoutée à l'écran d'accueil) ?
 *  Sur iOS, le push n'est possible QUE dans ce mode. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return !!(await reg.pushManager.getSubscription());
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hashEndpoint(endpoint: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Demande la permission, abonne l'appareil et enregistre l'abonnement.
 *  Lève une erreur si non supporté ou permission refusée. */
export async function subscribeToPush(uid: string): Promise<void> {
  if (!isPushSupported()) throw new Error("Notifications non supportées sur cet appareil");

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Clé VAPID publique absente");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permission refusée");

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));

  const json = sub.toJSON();
  const id = `${uid}__${await hashEndpoint(sub.endpoint)}`;
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/pushSubscriptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      fields: toFsFields({
        uid,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        ua: navigator.userAgent,
        createdAt: new Date().toISOString(),
      }),
    }),
  });
  if (!res.ok) throw new Error("Enregistrement de l'abonnement échoué");
}

/** Désabonne l'appareil et supprime son document Firestore. */
export async function unsubscribeFromPush(uid: string): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const id = `${uid}__${await hashEndpoint(sub.endpoint)}`;
  await sub.unsubscribe().catch(() => {});
  const headers = await authHeader();
  await fetch(`${FS_BASE}/pushSubscriptions/${id}`, { method: "DELETE", headers }).catch(() => {});
}
