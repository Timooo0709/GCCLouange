import { NextResponse } from "next/server";
import { loadSong } from "@/lib/content/loadSongs";
import { Resend } from 'resend'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const song = loadSong(slug);
    return NextResponse.json(song);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}


const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { title, description, userEmail } = await req.json()
  console.log("Reçu :", { title, description, userEmail })
  // Validation basique
  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Titre trop court' }, { status: 400 })
  }

  await resend.emails.send({
    from: 'noreply@tondomaine.com',
    to: process.env.MAIL_TO!,
    subject: `🐛 Signalement : ${title}`,
    text: `
      Problème : ${title}
      Description : ${description}
      Signalé par : ${userEmail || 'Anonyme'}
      Page : ${req.headers.get('referer')}
    `
  })

  return NextResponse.json({ ok: true })
}