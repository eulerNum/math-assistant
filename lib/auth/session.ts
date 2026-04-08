import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser, Role } from './guards';

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

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile.role as Role,
  };
}

async function requireRole(required: Role): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== required) {
    redirect(user.role === 'teacher' ? '/teacher/dashboard' : '/student/home');
  }
  return user;
}

export async function requireTeacher(): Promise<AuthUser> {
  return requireRole('teacher');
}

export async function requireStudent(): Promise<AuthUser> {
  return requireRole('student');
}
