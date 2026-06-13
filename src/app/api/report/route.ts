import { NextResponse, type NextRequest } from 'next/server';
import { handleReport, ValidationError, EmailServiceError } from '@/lib/report';

// Rate limit en mémoire : 5 signalements / 10 min par IP. Par instance
// serverless (remis à zéro à froid) — suffisant pour stopper le spam naïf
// vers les boîtes des admins sans dépendance externe.
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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many reports, try again later' },
        { status: 429 }
      );
    }

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