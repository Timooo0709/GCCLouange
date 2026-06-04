export interface ReportInput {
  title: string;
  description?: string;
  userEmail?: string;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
  }
}

export function validateReport(data: unknown): ReportInput {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('body', 'Invalid input');
  }

  const { title, description, userEmail } = data as any;

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    throw new ValidationError('title', 'Title must be at least 3 characters');
  }

  if (userEmail && typeof userEmail !== 'string') {
    throw new ValidationError('userEmail', 'Invalid email format');
  }

  return {
    title: title.trim(),
    description: description?.trim() || '',
    userEmail: userEmail?.trim() || '',
  };
}