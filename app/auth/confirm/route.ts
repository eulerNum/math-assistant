import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { roleHomePath } from '@/lib/auth/redirects';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// token_hash + verifyOtp is the Supabase-recommended pattern for email magic
// links in SSR: unlike PKCE exchangeCodeForSession, it does NOT require the
// code_verifier cookie to be present on the browser that clicks the link, so
// users can request the link in browser A and click it in browser B (e.g. the
// Gmail mobile app). The old /auth/callback PKCE route is kept as a fallback
// for magic links that were already sent before this migration.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_token_hash`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
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
