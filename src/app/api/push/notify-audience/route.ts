import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids, sendPushToAll } from "@/lib/push/send";
import { uidsForCategory, uidsForCategories } from "@/lib/push/recipients";
import { ADMIN_EMAILS } from "@/lib/access";
import { NOTIFY_ALL, isValidAudience } from "@/lib/push/audiences";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Notification manuelle, soit à une AUDIENCE (tout le monde / un culte / un groupe /
// une classe EDD), soit à des PERSONNES précises (liste d'uids). Réservée aux admins
// et aux comptes dont `notify` couvre la cible. Sert aux annonces de changement de
// planning et de planning du trimestre.

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
  const { audience, uids: targetUids, title, body, url } = (await req.json().catch(() => ({}))) as {
    audience?: string;
    uids?: string[];
    title?: string;
    body?: string;
    url?: string;
  };
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
  }
  // url : chemin interne sûr uniquement (pas d'URL externe / open redirect).
  const safeUrl =
    typeof url === "string" && /^\/[a-zA-Z0-9/_-]*$/.test(url) ? url : "/mes-services";
  const payload = {
    title: title.trim(),
    body: body.trim(),
    url: safeUrl,
    tag: `manual-${Date.now()}`,
  };

  // Anti-doublon : rejette un envoi identique (même expéditeur + titre + message)
  // répété dans la minute — évite double-clics et boucles. Marqué après succès.
  const dupKey = createHash("sha1")
    .update(`${uid}:${title.trim()}:${body.trim()}`)
    .digest("hex")
    .slice(0, 24);
  const dupRef = adminDb().collection("notifLog").doc(`audience-${dupKey}`);
  const dupSnap = await dupRef.get();
  if (dupSnap.exists && Date.now() - ((dupSnap.data()?.at as number) ?? 0) < 60_000) {
    return NextResponse.json(
      { error: "Notification identique déjà envoyée il y a moins d'une minute." },
      { status: 429 }
    );
  }

  // 3. Droits de l'expéditeur
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);
  let rights: string[] = [];
  if (!isAdmin) {
    const me = (await adminDb().collection("users").doc(uid).get()).data() as
      | { notify?: string[] }
      | undefined;
    rights = me?.notify ?? [];
  }
  const canAll = isAdmin || rights.includes(NOTIFY_ALL);

  // 4a. Mode « personnes précises »
  if (Array.isArray(targetUids) && targetUids.length > 0) {
    const wanted = [...new Set(targetUids.filter((u) => typeof u === "string"))];
    if (!canAll) {
      // L'expéditeur ne peut cibler que des personnes de ses catégories autorisées.
      const allowed = await uidsForCategories(rights.filter((r) => r !== NOTIFY_ALL));
      if (wanted.some((u) => !allowed.has(u))) {
        return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
      }
    }
    const result = await sendPushToUids(wanted, payload);
    await dupRef.set({ at: Date.now(), uid });
    return NextResponse.json({ ok: true, ...result });
  }

  // 4b. Mode « audience »
  if (!audience || !isValidAudience(audience)) {
    return NextResponse.json({ error: "Audience invalide" }, { status: 400 });
  }
  if (!isAdmin && !rights.includes(NOTIFY_ALL) && !rights.includes(audience)) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }
  const result =
    audience === NOTIFY_ALL
      ? await sendPushToAll(payload)
      : await sendPushToUids(await uidsForCategory(audience), payload);
  await dupRef.set({ at: Date.now(), uid });
  return NextResponse.json({ ok: true, ...result });
}
