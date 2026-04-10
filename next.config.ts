import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  // Pin workspace root so Turbopack doesn't pick up a stray lockfile
  // from a parent directory. https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
  turbopack: {
    root: import.meta.dirname,
    resolveAlias: {
      // Workaround: directory name has a space ("math assistant") which causes
      // Turbopack's CSS resolver to look in the parent directory.
      tailwindcss: resolve(import.meta.dirname, "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
