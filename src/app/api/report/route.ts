import { NextResponse, type NextRequest } from 'next/server';
import { handleReport, ValidationError, EmailServiceError } from '@/lib/report';

export async function POST(req: NextRequest) {
  try {
    // Configuration
    const recipientEmails = (process.env.MAIL_TO || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

    if (!recipientEmails.length) {
      return NextResponse.json(
        { error: 'No recipients configured' },
        { status: 500 }
      );
    }

    // Orchestrer
    const body = await req.json();
    const pageUrl = req.headers.get('referer');

    await handleReport({
      body,
      pageUrl,
      recipientEmails,
      fromEmail,
    });

    return NextResponse.json({ ok: true });

  } catch (err) {
    // Gestion d'erreurs unifiée
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    if (err instanceof EmailServiceError) {
      const status = err.code === 'NO_RECIPIENTS' ? 500 : 400;
      return NextResponse.json(
        { error: err.message },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}