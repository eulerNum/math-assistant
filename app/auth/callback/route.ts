import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { roleHomePath } from '@/lib/auth/redirects';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Retry loop: handle_new_user trigger may not have committed the profile row yet
  const delays = [100, 200, 400, 800];
  let profile: { role: string } | null = null;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(profileError.message)}`,
      );
    }

    if (data) {
      profile = data;
      break;
    }

    if (attempt < delays.length) {
      await sleep(delays[attempt]);
    }
  }

  if (!profile) {
    return NextResponse.redirect(`${origin}/login?error=profile_not_ready`);
  }

  const role = profile.role === 'teacher' ? 'teacher' : 'student';
  return NextResponse.redirect(`${origin}${roleHomePath(role)}`);
}
