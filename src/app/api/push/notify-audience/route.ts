import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids, sendPushToAll } from "@/lib/push/send";
import { uidsForCategory } from "@/lib/push/recipients";
import { ADMIN_EMAILS } from "@/lib/access";
import { NOTIFY_ALL, isValidAudience } from "@/lib/push/audiences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Notification manuelle à une audience (tout le monde / un culte / un groupe / une
// classe EDD). Réservée aux admins et aux comptes dont `notify` couvre l'audience.
// Sert aux annonces de changement de planning et de planning du trimestre.

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

  // 2. Validation de la requête
  const { audience, title, body } = (await req.json().catch(() => ({}))) as {
    audience?: string;
    title?: string;
    body?: string;
  };
  if (!audience || !isValidAudience(audience)) {
    return NextResponse.json({ error: "Audience invalide" }, { status: 400 });
  }
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
  }

  // 3. Autorisation : admin, ou `notify` du profil couvre l'audience (ou "*")
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);
  if (!isAdmin) {
    const me = (await adminDb().collection("users").doc(uid).get()).data() as
      | { notify?: string[] }
      | undefined;
    const rights = me?.notify ?? [];
    if (!rights.includes(NOTIFY_ALL) && !rights.includes(audience)) {
      return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
    }
  }

  // 4. Envoi
  const payload = {
    title: title.trim(),
    body: body.trim(),
    url: "/mes-services",
    tag: `manual-${Date.now()}`,
  };
  const result =
    audience === NOTIFY_ALL
      ? await sendPushToAll(payload)
      : await sendPushToUids(await uidsForCategory(audience), payload);

  return NextResponse.json({ ok: true, ...result });
}
