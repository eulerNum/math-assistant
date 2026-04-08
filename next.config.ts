import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin workspace root so Turbopack doesn't pick up a stray lockfile
  // from a parent directory. https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
