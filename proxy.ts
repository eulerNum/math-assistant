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

export const proxyConfig = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
