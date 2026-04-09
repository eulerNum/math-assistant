import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith('/teacher') || pathname.startsWith('/student');
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return response;
}

// Next.js 16 proxy.ts expects the export to be named `config` (not `proxyConfig`).
// With the wrong name the matcher is silently ignored and proxy runs on every
// request — including static assets — wasting compute and sometimes touching
// auth cookies on irrelevant paths.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
