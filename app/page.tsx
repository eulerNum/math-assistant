import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { roleHomePath } from '@/lib/auth/redirects';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  redirect(roleHomePath(profile?.role === 'teacher' ? 'teacher' : 'student'));
}
