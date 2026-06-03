import { validateReport } from './reportValidator';
import { buildReportEmail } from './reportEmailBuilder';
import { sendEmail } from './reportEmailService';

export interface HandleReportOptions {
  body: unknown;
  pageUrl: string | null;
  recipientEmails: string[];
  fromEmail: string;
}

export async function handleReport(options: HandleReportOptions): Promise<void> {
  const report = validateReport(options.body);

  const email = buildReportEmail(report, options.pageUrl);

  await sendEmail({
    to: options.recipientEmails,
    from: options.fromEmail,
    subject: email.subject,
    text: email.text,
  });
}