import type { Role } from './guards';

/**
 * Single source of truth for role → home path mapping. Used by the
 * root page, the auth callback, and server-side role guards so a new
 * role only needs to be added here.
 */
export function roleHomePath(role: Role): string {
  switch (role) {
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/home';
  }
}
