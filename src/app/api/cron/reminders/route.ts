import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { loadPlanningNameIndex, resolveNamesToUids, filterUidsByNotifPref } from "@/lib/push/recipients";
import {
  loadPlanningData,
  servantsForDate,
  rehearsalsForDate,
  normalizeName,
} from "@/lib/planning/names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rappels — exécuté chaque jour par Vercel Cron (cf. vercel.json).
// - Service (tous services) : rappel à J-7, J-3 puis J-1.
// - Répétition Campus : mêmes échéances, message avec heure + lieu.
// Idempotent : un document notifLog par (échéance, date, uid) évite tout doublon.

const REMINDERS: { tag: "J7" | "J3" | "J1"; days: number }[] = [
  { tag: "J7", days: 7 },
  { tag: "J3", days: 3 },
  { tag: "J1", days: 1 },
];

// Date ISO à J+`days`. Calculée en UTC : sûr car le cron tourne à 08:00 UTC
// (≥ 09:00 à Paris), heure à laquelle la date UTC est déjà la date du jour à Paris.
function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function whenLabel(tag: "J7" | "J3" | "J1"): string {
  return tag === "J7" ? "dans 1 semaine" : tag === "J3" ? "dans 3 jours" : "demain";
}

function formatFr(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(d);
}

/** Retient les uid pas encore notifiés pour cette clé notifLog `${prefix}-${uid}`. */
async function freshUids(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefix: string
): Promise<string[]> {
  const fresh: string[] = [];
  await Promise.all(
    uids.map(async (u) => {
      if (!(await db.collection("notifLog").doc(`${prefix}-${u}`).get()).exists) fresh.push(u);
    })
  );
  return fresh;
}

/** Marque ces uid comme notifiés (clé `${prefix}-${uid}`). */
async function markNotified(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefix: string,
  meta: Record<string, unknown>
): Promise<void> {
  const batch = db.batch();
  for (const u of uids) {
    batch.set(db.collection("notifLog").doc(`${prefix}-${u}`), { ...meta, uid: u, at: Date.now() });
  }
  await batch.commit();
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = adminDb();
  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);

  const summary: Record<string, { date: string; service: number; repet: number }> = {};

  for (const { tag, days } of REMINDERS) {
    const date = isoInDays(days);
    const when = whenLabel(tag);

    // ── Rappels de service (tous services) ──
    const names = [...new Set(servantsForDate(planning, date).map((s) => s.name))];
    const { uids } = resolveNamesToUids(names, index);
    const prefUids = await filterUidsByNotifPref(uids, "reminders");
    const fresh = await freshUids(db, prefUids, `rappel-${tag}-${date}`);
    if (fresh.length) {
      await sendPushToUids(fresh, {
        title: "Rappel de service",
        body: `Tu sers ${when} (${formatFr(date)}).`,
        url: "/mes-services",
        tag: `rappel-${tag}-${date}`,
      });
      await markNotified(db, fresh, `rappel-${tag}-${date}`, { tag, date, kind: "service" });
    }

    // ── Rappels de répétition Campus (heure + lieu, message par personne) ──
    const rehByUid = new Map<string, { time: string; location: string }>();
    for (const r of rehearsalsForDate(planning, date)) {
      for (const u of index.get(normalizeName(r.name)) ?? []) {
        if (!rehByUid.has(u)) rehByUid.set(u, { time: r.time, location: r.location });
      }
    }
    const rehPrefUids = await filterUidsByNotifPref([...rehByUid.keys()], "reminders");
    const rehFresh = await freshUids(db, rehPrefUids, `repet-${tag}-${date}`);
    if (rehFresh.length) {
      await Promise.all(
        rehFresh.map((u) => {
          const m = rehByUid.get(u)!;
          const extra = `${m.time ? ` à ${m.time}` : ""}${m.location ? `, ${m.location}` : ""}`;
          return sendPushToUids([u], {
            title: "Répétition Campus",
            body: `Répétition ${when} (${formatFr(date)})${extra}.`,
            url: "/mes-services",
            tag: `repet-${tag}-${date}`,
          });
        })
      );
      await markNotified(db, rehFresh, `repet-${tag}-${date}`, { tag, date, kind: "repet" });
    }

    summary[tag] = { date, service: fresh.length, repet: rehFresh.length };
  }

  return NextResponse.json({ ok: true, summary });
}
