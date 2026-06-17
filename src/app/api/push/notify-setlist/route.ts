import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { loadPlanningNameIndex, resolveNamesToUids, filterUidsByNotifPref } from "@/lib/push/recipients";
import { loadPlanningData, servantsForDate, normalizeName } from "@/lib/planning/names";
import { ADMIN_EMAILS, categoryLevel } from "@/lib/access";
import type { ServiceRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Notif « setlist prête » : sur une setlist (toute catégorie) contenant ≥ 4
// chants. Prévient les musiciens, la régie et les choristes de service à cette
// date (hors présidence et orateur). Deux déclencheurs :
//   - Manuel (bouton « Prévenir l'équipe ») : ré-envoi possible 1 fois / 24 h.
//   - Auto (`auto: true`, à la sauvegarde de la setlist) : envoi UNE seule fois,
//     dès que l'équipe a été touchée. Tant que personne n'est joignable (noms du
//     planning non encore appariés à un compte), la prochaine sauvegarde réessaie.

const MIN_SONGS = 4;
const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
// Rôles destinataires : exécutants hors présidence (auteur/leader) et hors
// orateur/traduction (serviceRole null dans servantsForDate).
const TEAM_ROLES: ServiceRole[] = ["chanteur", "musicien", "regie"];

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

  const { setlistId, auto } = (await req.json().catch(() => ({}))) as {
    setlistId?: string;
    auto?: boolean;
  };
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
    moment?: "matin" | "soir";
    ownerId?: string;
    isPrivate?: boolean;
    items?: { type?: string }[];
  };

  if (!sl.category) {
    return NextResponse.json({ error: "Catégorie de setlist manquante" }, { status: 400 });
  }

  // Une setlist privée (brouillon personnel) ne notifie jamais l'équipe planifiée.
  if (sl.isPrivate) {
    if (auto) return NextResponse.json({ ok: true, skipped: "private" });
    return NextResponse.json({ error: "Cette setlist est privée." }, { status: 400 });
  }

  // 3. Au moins 4 vrais chants (les transitions ne comptent pas)
  const songCount = (sl.items ?? []).filter((i) => i?.type !== "transition").length;
  if (songCount < MIN_SONGS) {
    // En auto, une setlist pas encore prête n'est pas une erreur : on l'ignore.
    if (auto) return NextResponse.json({ ok: true, skipped: "below-min" });
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
      | { serviceRoles?: Record<string, ServiceRole[]> }
      | undefined;
    const serviceRoles = me?.serviceRoles ?? {};
    const rolesAtCat = serviceRoles[sl.category];
    // Exécutant = niveau create/edit sur la catégorie (la régie seule en lecture est exclue).
    isPerformer = !!rolesAtCat && categoryLevel(sl.category, rolesAtCat) !== "view";
  }
  if (!isAdmin && !isOwner && !isPerformer) {
    return NextResponse.json({ error: "Action non autorisée" }, { status: 403 });
  }

  // 5. Anti-spam selon le déclencheur.
  const logRef = db.collection("notifLog").doc(`setlist-${setlistId}`);
  const logSnap = await logRef.get();
  const lastSentAt = logSnap.exists ? (logSnap.data()?.lastSentAt as number | undefined) : undefined;
  const lastRecipients = logSnap.exists ? (logSnap.data()?.recipients as number | undefined) : undefined;
  if (auto) {
    // Auto : une seule fois, dès lors que l'équipe a déjà été touchée.
    if (lastSentAt && (lastRecipients ?? 0) > 0) {
      return NextResponse.json({ ok: true, skipped: "already-sent" });
    }
  } else if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
    // Manuel : 1 envoi / 24 h.
    return NextResponse.json(
      { error: "Une notification a déjà été envoyée pour cette setlist aujourd'hui." },
      { status: 429 }
    );
  }

  // 6. Destinataires : équipe (musiciens, régie, choristes) de service à cette date
  //    dans la catégorie de la setlist. Campus : départage matin/soir par moment
  //    (setlists récentes liées à la séance), sinon par président (anciennes setlists).
  const dateISO = (sl.date ?? "").slice(0, 10);
  const planning = await loadPlanningData();
  const wantLeader = normalizeName(sl.leader ?? "");
  const team = servantsForDate(planning, dateISO).filter(
    (s) =>
      s.category === sl.category &&
      !!s.serviceRole &&
      TEAM_ROLES.includes(s.serviceRole) &&
      (sl.category !== "Campus" ||
        (sl.moment ? s.moment === sl.moment : normalizeName(s.leader) === wantLeader))
  );
  const names = [...new Set(team.map((s) => s.name))];
  const index = await loadPlanningNameIndex();
  const { uids, unresolved } = resolveNamesToUids(names, index);
  if (unresolved.length) {
    console.warn(`[notify-setlist] noms non appariés (${dateISO}):`, unresolved);
  }
  const prefUids = await filterUidsByNotifPref(uids, "setlists");

  // 7. Envoi
  const result = await sendPushToUids(prefUids, {
    title: `Setlist prête — ${sl.title || sl.category}`,
    body: `${sl.leader || "Le responsable"} a préparé la setlist (${songCount} chants).`,
    url: `/setlists/${setlistId}`,
    tag: `setlist-${setlistId}`,
  });

  // En auto sans destinataire joignable, on ne mémorise rien : la prochaine
  // sauvegarde réessaiera et le bouton manuel reste utilisable.
  if (!auto || result.recipients > 0) {
    await logRef.set(
      { lastSentAt: Date.now(), setlistId, recipients: result.recipients },
      { merge: true }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
