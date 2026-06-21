import { NextResponse, type NextRequest } from "next/server";
import { validateReport, ValidationError } from "@/lib/report";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { adminUids } from "@/lib/push/recipients";
import { sendPushToUids } from "@/lib/push/send";
import { REPORT_KINDS, type ReportKind } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit en mémoire : 5 signalements / 10 min par IP. Par instance
// serverless (remis à zéro à froid) — suffisant pour stopper le spam naïf
// sans dépendance externe.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  if (hits.size > 1000) hits.clear();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Trop de signalements, réessaie plus tard." }, { status: 429 });
    }

    // 1. Authentification : signalement réservé aux membres connectés.
    const authz = req.headers.get("authorization") ?? "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

    let uid: string;
    let email: string;
    try {
      const decoded = await verifyIdToken(token);
      uid = decoded.uid;
      email = (decoded.email ?? "").toLowerCase();
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. Validation du contenu (titre / description, limites partagées avec le form).
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const report = validateReport(body);
    const kind: ReportKind = REPORT_KINDS.includes(body.kind as ReportKind)
      ? (body.kind as ReportKind)
      : "site";
    const songSlug = kind === "song" && typeof body.songSlug === "string" ? body.songSlug : "";
    const songTitle = kind === "song" && typeof body.songTitle === "string" ? body.songTitle.slice(0, 200) : "";
    const pageUrl = req.headers.get("referer") ?? "";

    const db = adminDb();

    // 3. Nom affiché de l'auteur (profil), email en repli.
    const userSnap = await db.collection("users").doc(uid).get();
    const u = userSnap.data() as { firstName?: string; lastName?: string } | undefined;
    const authorName = [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim() || email || "Inconnu";

    // 4. Enregistrement du signalement (inbox /admin).
    const docRef = await db.collection("reports").add({
      kind,
      title: report.title,
      description: report.description ?? "",
      songSlug,
      songTitle,
      pageUrl,
      status: "pending",
      authorId: uid,
      authorName,
      authorEmail: email,
      createdAt: new Date(),
    });

    // 5. Notification push aux admins (best-effort : le signalement est déjà
    //    enregistré, un échec d'envoi ne doit pas faire échouer la requête).
    try {
      const admins = await adminUids();
      await sendPushToUids(admins, {
        title: kind === "song" ? `Signalement chant — ${songTitle || report.title}` : "Signalement site",
        body: report.title,
        url: "/admin",
        tag: `report-${docRef.id}`,
      });
    } catch (e) {
      console.warn("[report] échec de la notification aux admins:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
