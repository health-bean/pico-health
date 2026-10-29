import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * API routes that must work without a Supabase session. Each one does its
 * own authentication instead (credentials, Stripe signature, CRON_SECRET),
 * or is public by design (the landing-page waitlist, rate limited).
 * Everything else under /api gets a 401 here before the handler runs —
 * handlers still verify via getSessionFromCookies(); this is defense in depth.
 */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];
const PUBLIC_API_ROUTES = ["/api/billing/webhook", "/api/waitlist"];

export function isPublicApiRoute(pathname: string): boolean {
  return (
    PUBLIC_API_ROUTES.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

/**
 * Refresh the Supabase auth session on every request and
 * redirect unauthenticated users away from protected routes
 * (pages redirect to /login; API routes get a 401 JSON response).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — IMPORTANT: don't remove this
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Signed-in people skip the landing page and the auth screens. The iOS app
  // opens /login, so this is also what takes a returning app user into the app.
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/log", request.url));
  }

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/signup", "/", "/forgot-password", "/reset-password", "/terms", "/privacy"];
  const isPublic =
    publicRoutes.includes(pathname) || pathname.startsWith("/api/auth/");

  if (!user && pathname.startsWith("/api/") && !isPublicApiRoute(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user && !isPublic) {
    // Check if this is a protected route
    const protectedPrefixes = [
      "/chat",
      "/log",
      "/reflect",
      "/insights",
      "/settings",
      "/admin",
      "/onboarding",
      "/reintroductions",
    ];
    const isProtected = protectedPrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}
