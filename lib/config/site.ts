/**
 * Returns the absolute URL of the current site.
 *
 * In the browser, always prefer `window.location.origin` — this ensures
 * magic link `emailRedirectTo` targets the same host the user started from,
 * so PKCE code_verifier cookies stay in scope across the auth round-trip
 * (Vercel serves the same deployment under multiple aliases, and PKCE
 * cookies are scoped to the exact host).
 *
 * On the server, fall back to NEXT_PUBLIC_SITE_URL (dev/prod), VERCEL_URL
 * (preview), and finally localhost.
 */
export function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}
