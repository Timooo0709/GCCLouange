import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { loadPlanningNameIndex, resolveNamesToUids } from "@/lib/push/recipients";
import { loadPlanningData, culteServantsForDate } from "@/lib/planning/names";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rappels de service — exécuté chaque jour par Vercel Cron (cf. vercel.json).
// Prévient toute personne de service au Culte Franco à J-7 puis J-3.
// Idempotent : un document notifLog par (échéance, date, uid) évite tout doublon.

const REMINDERS: { tag: "J7" | "J3"; days: number }[] = [
  { tag: "J7", days: 7 },
  { tag: "J3", days: 3 },
];

function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
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

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = adminDb();
  const [planning, index] = await Promise.all([loadPlanningData(), loadPlanningNameIndex()]);

  const summary: Record<string, { date: string; sent: number; recipients: number }> = {};

  for (const { tag, days } of REMINDERS) {
    const date = isoInDays(days);
    const servants = culteServantsForDate(planning, date); // tous rôles : toute personne de service
    const names = [...new Set(servants.map((s) => s.name))];
    const { uids } = resolveNamesToUids(names, index);

    // Filtre les uid déjà notifiés pour cette (échéance, date)
    const fresh: string[] = [];
    await Promise.all(
      uids.map(async (u) => {
        const ref = db.collection("notifLog").doc(`rappel-${tag}-${date}-${u}`);
        if (!(await ref.get()).exists) fresh.push(u);
      })
    );

    if (!fresh.length) {
      summary[tag] = { date, sent: 0, recipients: 0 };
      continue;
    }

    const when = tag === "J7" ? "dans 1 semaine" : "dans 3 jours";
    const result = await sendPushToUids(fresh, {
      title: "Rappel de service",
      body: `Tu sers au culte ${when} (${formatFr(date)}).`,
      url: "/mes-services",
      tag: `rappel-${tag}-${date}`,
    });

    // Marque ces uid comme notifiés (idempotence)
    const batch = db.batch();
    for (const u of fresh) {
      batch.set(db.collection("notifLog").doc(`rappel-${tag}-${date}-${u}`), {
        tag,
        date,
        uid: u,
        at: Date.now(),
      });
    }
    await batch.commit();

    summary[tag] = { date, sent: result.sent, recipients: fresh.length };
  }

  return NextResponse.json({ ok: true, summary });
}
