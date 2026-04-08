import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser, Role } from './guards';
import { roleHomePath } from './redirects';

function parseRole(value: unknown): Role | null {
  return value === 'teacher' || value === 'student' ? value : null;
}

async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = parseRole(profile?.role);
  if (!role) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role,
  };
}

async function requireRole(required: Role): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== required) {
    redirect(roleHomePath(user.role));
  }
  return user;
}

export async function requireTeacher(): Promise<AuthUser> {
  return requireRole('teacher');
}

export async function requireStudent(): Promise<AuthUser> {
  return requireRole('student');
}
