import type { NextConfig } from "next";
import { backendConfigIssues } from './src/lib/backend-config';

const backendIssues = backendConfigIssues(process.env);
if ([process.env.APP_ORIGIN, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY].some(Boolean)
  && backendIssues.length) {
  throw new Error(`Invalid backend configuration:\n- ${backendIssues.join('\n- ')}\nFix these variables in the correct Vercel project/environment and redeploy. See docs/ONLINE_SETUP.md. Values are intentionally omitted.`);
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
    ] }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
