import { Resend } from 'resend'
import { NextResponse } from "next/server";

const resend = new Resend(process.env.NEXT_PUBLIC_RESEND_API_KEY)

export async function POST(req: Request) {
  const { title, description, userEmail } = await req.json()
  
  // Validation basique
  if (!title || title.length < 3) {
    return NextResponse.json({ error: 'Titre trop court' }, { status: 400 })
  }
  
  const result = await resend.emails.send({
    from: 'noreply@resend.dev',
    to: process.env.MAIL_TO!,
    subject: `🐛 Signalement : ${title}`,
    text: `
      Problème : ${title}
      Description : ${description}
      Signalé par : ${userEmail || 'Anonyme'}
      Page : ${req.headers.get('referer')}
    `
  })
  console.log(  'COUCOU',result)
  return NextResponse.json({ ok: true })
}