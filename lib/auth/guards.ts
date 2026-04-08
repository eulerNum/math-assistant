export type Role = 'teacher' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly required: Role;
  constructor(required: Role) {
    super(`Forbidden: requires role '${required}'`);
    this.name = 'ForbiddenError';
    this.required = required;
  }
}

/**
 * Pure role assertion — throws UnauthorizedError if user is null,
 * ForbiddenError if user.role !== required. Used as the single source
 * of truth for role checks (wrapped by requireTeacher/requireStudent
 * server helpers in lib/auth/session.ts — Step D).
 */
export function assertRole(
  user: AuthUser | null,
  required: Role,
): asserts user is AuthUser {
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.role !== required) {
    throw new ForbiddenError(required);
  }
}
