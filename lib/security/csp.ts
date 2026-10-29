/**
 * Content-Security-Policy for every response (wired up in next.config.ts).
 *
 * Deliberately "right rather than strict":
 *
 * - script-src uses 'unsafe-inline'. Next.js App Router emits inline
 *   bootstrap/flight scripts; the strict alternative is a per-request nonce
 *   from middleware, which forces every page to render dynamically (no static
 *   optimisation, no CDN caching of HTML). Not worth it yet — XSS is still
 *   limited by 'self' origins and object-src/base-uri/frame-ancestors.
 *   'unsafe-eval' is added in development only (React dev tooling needs it).
 * - style-src 'unsafe-inline': React style={{...}} props, next/font and
 *   Tailwind's runtime-free output all rely on inline styles.
 * - connect-src: the app's own API plus the Supabase project (REST/auth over
 *   https, realtime over wss). Every other third party (Anthropic, Stripe API,
 *   USDA, APNs/FCM, Upstash) is called server-side only.
 * - Stripe Checkout / Billing Portal and Google OAuth (via Supabase
 *   /auth/v1/authorize) are top-level navigations, which CSP does not govern.
 *   No Stripe.js is loaded. form-action is 'self' (all forms are JS-handled).
 * - Fonts: next/font self-hosts Google Fonts under /_next/static -> 'self'.
 * - Images: capture photo previews are blob:/data: URLs; avatars may be
 *   remote (e.g. Google profile photos) -> https:.
 * - Capacitor: the native app loads https://picohealth.app (server.url), so
 *   this policy applies inside the WebView too. The Capacitor bridge is
 *   injected natively (WKUserScript on iOS, document-start script / JS
 *   interface on Android) and talks over message handlers, not the network,
 *   so CSP does not block it. capacitor://localhost and https://localhost are
 *   allowed for images/media only, in case a plugin ever hands back a
 *   convertFileSrc() URL.
 */
export function buildCsp({
  supabaseUrl,
  isDev,
}: {
  supabaseUrl?: string;
  isDev: boolean;
}): string {
  const supabase: string[] = [];
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      supabase.push(u.origin);
      supabase.push(`${u.protocol === "http:" ? "ws:" : "wss:"}//${u.host}`);
    } catch {
      // Malformed env var: leave Supabase out rather than emit a broken header.
    }
  }

  const nativeLocal = ["capacitor://localhost", "https://localhost"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", ...nativeLocal],
    "media-src": ["'self'", "blob:", ...nativeLocal],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...supabase,
      // Dev: Turbopack HMR websocket.
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
