export interface ReportInput {
  title: string;
  description?: string;
  userEmail?: string;
}

// Limites partagées avec le formulaire (AlertButton) — le contenu part tel
// quel vers les boîtes des admins, on borne donc strictement ce qui y entre.
export const REPORT_LIMITS = {
  title: 200,
  description: 5000,
  email: 254,
} as const;

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function validateReport(data: unknown): ReportInput {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('body', 'Invalid input');
  }

  const { title, description, userEmail } = data as Record<string, unknown>;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new ValidationError('title', 'Title must be at least 3 characters');
  }
  if (title.length > REPORT_LIMITS.title) {
    throw new ValidationError('title', `Title must be at most ${REPORT_LIMITS.title} characters`);
  }

  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new ValidationError('description', 'Invalid description');
  }
  if (typeof description === 'string' && description.length > REPORT_LIMITS.description) {
    throw new ValidationError('description', `Description must be at most ${REPORT_LIMITS.description} characters`);
  }

  if (userEmail && typeof userEmail !== 'string') {
    throw new ValidationError('userEmail', 'Invalid email format');
  }
  if (typeof userEmail === 'string' && userEmail.trim() &&
      (userEmail.length > REPORT_LIMITS.email || !/^\S+@\S+\.\S+$/.test(userEmail.trim()))) {
    throw new ValidationError('userEmail', 'Invalid email format');
  }

  return {
    // Le titre devient le sujet de l'email — jamais de saut de ligne
    title: title.trim().replace(/[\r\n]+/g, ' '),
    description: typeof description === 'string' ? description.trim() : '',
    userEmail: typeof userEmail === 'string' ? userEmail.trim() : '',
  };
}
