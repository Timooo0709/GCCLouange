import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids, sendPushToAll } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { uidsForCategory } from "@/lib/push/recipients";
import { ADMIN_EMAILS } from "@/lib/access";
import { NOTIFY_ALL } from "@/lib/push/audiences";
import { getPlanning, canPublishPlanning, TRI_ORDER } from "@/lib/planning/releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Publication d'un trimestre de planning (Culte / groupes). Révèle l'onglet du
// trimestre côté membres (flag planningReleases/{key}_{year}.published[]) et, à
// la PREMIÈRE publication, envoie une notification push à l'audience du planning
// (Culte → tout le monde ; groupe → membres du groupe). Réservé aux admins et aux
// comptes dont le droit `notify` couvre ce planning. `publish:false` re-masque le
// trimestre (sans notification, sans re-notif à une republication).

export async function POST(req: NextRequest) {
  // 1. Authentification
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let uid: string;
  let email: string;
  try {
    const decoded = await verifyIdToken(token);
    uid = decoded.uid;
    email = (decoded.email ?? "").toLowerCase();
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // 2. Requête
  const { key, tri, publish, year } = (await req.json().catch(() => ({}))) as {
    key?: string;
    tri?: string;
    publish?: boolean;
    year?: number;
  };
  const planning = key ? getPlanning(key) : undefined;
  if (!planning) return NextResponse.json({ error: "Planning inconnu" }, { status: 400 });
  if (!tri || !(TRI_ORDER as readonly string[]).includes(tri)) {
    return NextResponse.json({ error: "Trimestre invalide" }, { status: 400 });
  }
  const yr = Number.isInteger(year) ? (year as number) : new Date().getFullYear();
  const doPublish = publish !== false;

  // 3. Droits de l'expéditeur
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);
  let rights: string[] = [];
  if (!isAdmin) {
    const me = (await adminDb().collection("users").doc(uid).get()).data() as
      | { notify?: string[] }
      | undefined;
    rights = me?.notify ?? [];
  }
  if (!canPublishPlanning(planning, isAdmin, rights)) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 4. Mise à jour du flag de publication
  const ref = adminDb().collection("planningReleases").doc(`${planning.key}_${yr}`);
  const snap = await ref.get();
  const current = ((snap.data()?.published as string[] | undefined) ?? []).filter((t) =>
    (TRI_ORDER as readonly string[]).includes(t)
  );
  const already = current.includes(tri);
  const next = doPublish
    ? [...new Set([...current, tri])].sort()
    : current.filter((t) => t !== tri);
  if (next.length !== current.length || (!doPublish && already)) {
    await ref.set({ published: next, updatedAt: new Date(), updatedBy: uid }, { merge: true });
  }

  // 5. Notification — uniquement à la première publication (jamais au masquage,
  // jamais à une republication d'un trimestre déjà publié).
  let notified = false;
  let sent = 0;
  if (doPublish && !already) {
    const payload = {
      title: `Planning ${tri} en ligne`,
      body: `Le planning ${planning.label} du ${tri} est disponible.`,
      url: "/planning",
      tag: `release-${planning.key}-${yr}-${tri}`,
    };
    const base = { title: payload.title, body: payload.body, url: payload.url };
    if (planning.notifyAudience === NOTIFY_ALL) {
      const result = await sendPushToAll(payload);
      sent = result.sent;
      await recordNotification({ ...base, kind: "broadcast", everyone: true });
    } else {
      const catUids = await uidsForCategory(planning.notifyAudience);
      const result = await sendPushToUids(catUids, payload);
      sent = result.sent;
      await recordNotification({ ...base, kind: "broadcast", recipients: catUids });
    }
    notified = true;
  }

  return NextResponse.json({ ok: true, published: next, notified, sent });
}
