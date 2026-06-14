import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { uidsForCategory } from "@/lib/push/recipients";
import { ADMIN_EMAILS } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notif « nouvelle annonce » : déclenchée à la création d'une annonce. Prévient
// les comptes qui servent dans la section de l'annonce (clé de serviceRoles).
// Anti-doublon : une notif par annonce (notifLog).

export async function POST(req: NextRequest) {
  // 1. Authentification de l'appelant
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

  const { annonceId } = (await req.json().catch(() => ({}))) as { annonceId?: string };
  if (!annonceId) return NextResponse.json({ error: "annonceId manquant" }, { status: 400 });

  const db = adminDb();

  // 2. Chargement de l'annonce (on ne fait pas confiance au client)
  const snap = await db.collection("annonces").doc(annonceId).get();
  if (!snap.exists) return NextResponse.json({ error: "Annonce introuvable" }, { status: 404 });
  const a = snap.data() as { section?: string; title?: string; authorId?: string };
  const section = a.section ?? "";
  if (!section) return NextResponse.json({ error: "Section manquante" }, { status: 400 });

  // 3. Autorisation : admin, auteur de l'annonce, ou droit de publier la section
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);
  const isAuthor = a.authorId === uid;
  let canPublish = false;
  if (!isAdmin && !isAuthor) {
    const me = (await db.collection("users").doc(uid).get()).data() as
      | { annonces?: string[] }
      | undefined;
    canPublish = !!me && (me.annonces ?? []).includes(section);
  }
  if (!isAdmin && !isAuthor && !canPublish) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 4. Anti-doublon : une seule notif par annonce
  const logRef = db.collection("notifLog").doc(`annonce-${annonceId}`);
  if ((await logRef.get()).exists) {
    return NextResponse.json({ error: "Annonce déjà notifiée" }, { status: 429 });
  }

  // 5. Destinataires : comptes servant dans la section, puis envoi
  const uids = await uidsForCategory(section);
  const result = await sendPushToUids(uids, {
    title: `Annonce — ${section}`,
    body: a.title || "Nouvelle annonce",
    url: "/annonces",
    tag: `annonce-${annonceId}`,
  });

  await logRef.set({ at: Date.now(), annonceId, section, recipients: result.recipients });

  return NextResponse.json({ ok: true, ...result });
}
