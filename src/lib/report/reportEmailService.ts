import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string[];
  from: string;
  subject: string;
  text: string;
}

export class EmailServiceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!options.to.length) {
    throw new EmailServiceError('NO_RECIPIENTS', 'No recipients configured');
  }

  const { error } = await resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });

  if (error) {
    throw new EmailServiceError('SEND_FAILED', error.message);
  }
}