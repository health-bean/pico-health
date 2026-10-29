import type { NextConfig } from "next";
import { buildCsp } from "./lib/security/csp";

// Built once at build/start time; NEXT_PUBLIC_SUPABASE_URL is inlined at build.
const contentSecurityPolicy = buildCsp({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  isDev: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Handout links (picohealth.app/join?ref=seattle) land on the home page;
  // the query string, and so the ref code, carries through.
  async redirects() {
    return [{ source: "/join", destination: "/", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
