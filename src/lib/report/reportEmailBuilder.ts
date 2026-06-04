import type { ReportInput } from './reportValidator';

export interface EmailContent {
  subject: string;
  text: string;
}

export function buildReportEmail(
  report: ReportInput,
  pageUrl: string | null
): EmailContent {
  const subject = `Signalement : ${report.title}`;
  
  const text = `
Problème : ${report.title}
Description : ${report.description || 'Aucune description fournie'}
Signalé par : ${report.userEmail || 'Anonyme'}
Page : ${pageUrl || 'Inconnue'}
  `.trim();

  return { subject, text };
}