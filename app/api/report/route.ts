import { Resend } from 'resend'
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { title, description, userEmail } = await req.json()

  // Validation basique
  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Titre trop court' }, { status: 400 })
  }

  await resend.emails.send({
    from: 'noreply@resend.dev',
    to: (process.env.MAIL_TO ?? '').split(',').map(e => e.trim()).filter(Boolean),
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