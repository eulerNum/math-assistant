import { describe, it, expect } from 'vitest';
import {
  assertRole,
  UnauthorizedError,
  ForbiddenError,
  type AuthUser,
} from '../guards';

const teacher: AuthUser = { id: 't1', email: 'teacher@example.com', role: 'teacher' };
const student: AuthUser = { id: 's1', email: 'student@example.com', role: 'student' };

describe('assertRole', () => {
  it('allows teacher when required=teacher', () => {
    expect(() => assertRole(teacher, 'teacher')).not.toThrow();
  });

  it('allows student when required=student', () => {
    expect(() => assertRole(student, 'student')).not.toThrow();
  });

  it('throws UnauthorizedError when user is null', () => {
    expect(() => assertRole(null, 'teacher')).toThrow(UnauthorizedError);
  });

  it('throws ForbiddenError with required=teacher when student hits teacher route', () => {
    try {
      assertRole(student, 'teacher');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as ForbiddenError).required).toBe('teacher');
    }
  });

  it('throws ForbiddenError with required=student when teacher hits student route', () => {
    try {
      assertRole(teacher, 'student');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenError);
      expect((err as ForbiddenError).required).toBe('student');
    }
  });

  it('narrows the type — after assertRole, user.id is accessible', () => {
    const u: AuthUser | null = teacher;
    assertRole(u, 'teacher');
    // TS should narrow u to AuthUser here
    expect(u.id).toBe('t1');
  });
});
