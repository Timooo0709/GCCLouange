import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const emailsString = process.env.MAIL_TO;

    if (!emailsString || emailsString.trim() === "") {
      return NextResponse.json({ error: "Aucun destinataire configuré." }, { status: 500 });
    }

    // Récupération du body
    const { title, description, userEmail } = await req.json();
    const toEmails = emailsString.split(',');

    // Validation basique
    if (!title || title.length < 3) {
      return NextResponse.json({ error: 'Titre trop court' }, { status: 400 });
    }

    // Envoi de l'e-mail
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // 💡 Note : 'noreply@resend.dev' n'existe pas par défaut, utilise onboarding@resend.dev en test
      to: toEmails,
      subject: `🐛 Signalement : ${title}`,
      text: `
        Problème : ${title}
        Description : ${description || 'Aucune description fournie'}
        Signalé par : ${userEmail || 'Anonyme'}
        Page : ${req.headers.get('referer') || 'Inconnue'}
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });

  } catch (err: any) {
    // 🟢 Correction : Ajout du bloc catch manquant pour éviter le crash du serveur
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}