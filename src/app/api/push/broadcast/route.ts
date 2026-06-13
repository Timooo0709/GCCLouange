import { NextResponse, type NextRequest } from "next/server";
import { sendPushToAll } from "@/lib/push/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diffusion d'une notification à TOUS les abonnés (toute personne ayant activé
// les notifications). Action sensible → protégée par CRON_SECRET.
//
// Exemple :
//   curl -X POST https://<site>/api/push/broadcast \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"title":"Annonce","body":"Message à tous","url":"/"}'

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { title, body, url } = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    url?: string;
  };
  if (!title || !body) {
    return NextResponse.json({ error: "title et body sont requis" }, { status: 400 });
  }

  const result = await sendPushToAll({ title, body, url: url || "/" });
  return NextResponse.json({ ok: true, ...result });
}
