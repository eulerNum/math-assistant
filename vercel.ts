// vercel.ts — replaces vercel.json per https://vercel.com/docs/project-configuration/vercel-ts
// Using untyped fallback: @vercel/config package exists on npm (v0.1.0) but its
// subpath export '@vercel/config/v1' does not resolve types at this time.
// TODO: restore typed import once @vercel/config/v1 exports VercelConfig.
// Do NOT create vercel.json as a fallback — Vercel CLI reads vercel.ts directly.

const vercelConfig = {
  framework: 'nextjs',
  buildCommand: 'npm run build',
};

export default vercelConfig;
