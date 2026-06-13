import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { loadPlanningNameIndex, resolveNamesToUids } from "@/lib/push/recipients";
import { loadPlanningData, culteServantsForDate, LOUANGE_TEAM_ROLES } from "@/lib/planning/names";
import { ADMIN_EMAILS } from "@/lib/access";
import { PERFORMER_ROLES } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notif « setlist prête » : déclenchée par le bouton Valider du président de
// séance, sur une setlist du Culte Franco contenant ≥ 4 chants. Prévient les
// musiciens, la régie et les choristes de service ce dimanche-là.
//
// Cible : Culte Franco uniquement. Anti-spam : une notif par setlist, ré-envoi
// possible au plus une fois toutes les 24 h.

const MIN_SONGS = 4;
const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

  const { setlistId } = (await req.json().catch(() => ({}))) as { setlistId?: string };
  if (!setlistId) return NextResponse.json({ error: "setlistId manquant" }, { status: 400 });

  const db = adminDb();

  // 2. Chargement de la setlist
  const snap = await db.collection("setlists").doc(setlistId).get();
  if (!snap.exists) return NextResponse.json({ error: "Setlist introuvable" }, { status: 404 });
  const sl = snap.data() as {
    title?: string;
    leader?: string;
    category?: string;
    date?: string;
    ownerId?: string;
    items?: { type?: string }[];
  };

  if (sl.category !== "Culte Francophone") {
    return NextResponse.json(
      { error: "Notification réservée aux setlists du Culte Franco" },
      { status: 400 }
    );
  }

  // 3. Au moins 4 vrais chants (les transitions ne comptent pas)
  const songCount = (sl.items ?? []).filter((i) => i?.type !== "transition").length;
  if (songCount < MIN_SONGS) {
    return NextResponse.json(
      { error: `La setlist doit contenir au moins ${MIN_SONGS} chants` },
      { status: 400 }
    );
  }

  // 4. Autorisation : propriétaire, admin, ou exécutant du Culte Franco
  const isAdmin = !!email && ADMIN_EMAILS.includes(email);
  const isOwner = sl.ownerId === uid;
  let isPerformer = false;
  if (!isAdmin && !isOwner) {
    const me = (await db.collection("users").doc(uid).get()).data() as
      | { roles?: string[]; lieux?: string[] }
      | undefined;
    isPerformer =
      !!me &&
      (me.roles ?? []).some((r) => (PERFORMER_ROLES as string[]).includes(r)) &&
      (me.lieux ?? []).includes("Culte Francophone");
  }
  if (!isAdmin && !isOwner && !isPerformer) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 5. Anti-spam (1 envoi / 24 h pour cette setlist)
  const logRef = db.collection("notifLog").doc(`setlist-${setlistId}`);
  const logSnap = await logRef.get();
  const lastSentAt = logSnap.exists ? (logSnap.data()?.lastSentAt as number | undefined) : undefined;
  if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Une notification a déjà été envoyée pour cette setlist aujourd'hui." },
      { status: 429 }
    );
  }

  // 6. Destinataires : équipe louange du culte de cette date
  const dateISO = (sl.date ?? "").slice(0, 10);
  const planning = await loadPlanningData();
  const servants = culteServantsForDate(planning, dateISO).filter((s) =>
    LOUANGE_TEAM_ROLES.has(s.role)
  );
  const names = [...new Set(servants.map((s) => s.name))];
  const index = await loadPlanningNameIndex();
  const { uids, unresolved } = resolveNamesToUids(names, index);
  if (unresolved.length) {
    console.warn(`[notify-setlist] noms non appariés (${dateISO}):`, unresolved);
  }

  // 7. Envoi
  const result = await sendPushToUids(uids, {
    title: `Setlist prête — ${sl.title ?? "Culte"}`,
    body: `${sl.leader || "Le président"} a préparé la setlist du culte (${songCount} chants).`,
    url: `/setlists/${setlistId}`,
    tag: `setlist-${setlistId}`,
  });

  await logRef.set(
    { lastSentAt: Date.now(), setlistId, recipients: result.recipients },
    { merge: true }
  );

  return NextResponse.json({ ok: true, ...result });
}
