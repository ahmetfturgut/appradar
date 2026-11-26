import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS, publicAuthConfig } from "./lib/auth/config";
import { isGuestOnlyPath, isProtectedPath, routeDecision } from "./lib/auth/paths";
import { productionConfigProblems } from "./lib/config/production";
import { isDevelopmentDemo } from "./lib/ui/demo-mode";
import { LANDING_LOCALE_COOKIE, LANDING_LOCALE_HEADER, landingHref, landingLocaleFromPath, preferredLandingLocale } from "./lib/landing/locale";

/**
 * Next.js 16 Proxy (formerly middleware). In production it first refuses to serve (503) while the
 * configuration is missing or invalid. Then two jobs:
 *  1. Keep the Supabase session cookies fresh (official @supabase/ssr pattern: getAll/setAll on
 *     request + response, then `getClaims()` which verifies the JWT and refreshes if needed).
 *  2. Optimistic routing: unauthenticated → /login?next=…, signed-in users away from /login and /signup.
 * This is not the security boundary. Pages, server actions, route handlers and the catalog
 * data layer verify the user again with `getUser()` (src/lib/auth/server.ts).
 */
let reportedProblems = "";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
  }
  if (process.env.NODE_ENV === "production") {
    const problems = productionConfigProblems(process.env).join(",");
    if (problems) {
      // Variable names and reason codes only, once per server instance.
      if (problems !== reportedProblems) console.error(`appradar_config_invalid:${problems}`);
      reportedProblems = problems;
      return new NextResponse("Service unavailable", { status: 503, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
    }
  }
  // Public-page localization only. Overwrite incoming values so HTML language is
  // derived from the URL, never from a caller-supplied header or a store filter.
  const landingLocale = landingLocaleFromPath(pathname);
  request.headers.set(LANDING_LOCALE_HEADER, landingLocale ?? "en");

  // Cookie-aware `/` → `/en` or `/tr` must happen here. A page-level `redirect()` is caught by the
  // root Suspense boundary and degrades to a client meta-refresh (product loading flash).
  if (pathname === "/") {
    const locale = preferredLandingLocale(request.cookies.get(LANDING_LOCALE_COOKIE)?.value);
    const redirect = NextResponse.redirect(new URL(landingHref(locale), request.url));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  const demo = isDevelopmentDemo(); // false whenever NODE_ENV !== "development"
  const config = publicAuthConfig();
  let response = NextResponse.next({ request });
  let hasUser = false;
  let sessionWritten = false;

  // Every page reads the session (root layout), and Server Components cannot persist a rotated refresh
  // token, so refresh on all of them. /auth/* is left to its route handler, which owns the PKCE cookie.
  if (!demo && config && !pathname.startsWith("/auth/")) {
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet, cacheHeaders) {
          sessionWritten = true;
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(cacheHeaders ?? {})) response.headers.set(key, value);
        },
      },
    });
    try {
      const { data } = await supabase.auth.getClaims();
      hasUser = !!data?.claims?.sub && data.claims.is_anonymous !== true;
      // A locally valid token can belong to a revoked session. Pages verify with getUser(), so the
      // guest-only redirect must agree with them or /login and /dashboard redirect to each other.
      if (hasUser && isGuestOnlyPath(pathname)) {
        const verified = await supabase.auth.getUser();
        hasUser = !verified.error && !!verified.data.user;
      }
    } catch {
      hasUser = false; // Unreadable or forged session cookie: treat as signed out.
    }
  }

  const decision = routeDecision({ path: pathname, search, hasUser, demo });
  if (decision.action === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    // Carry refreshed/cleared auth cookies onto the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    // Auth redirects and session cookies must never land in a shared CDN cache.
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  // force-dynamic covers the App Router; this keeps proxies/CDNs from sharing session-aware HTML.
  if (isProtectedPath(pathname) || isGuestOnlyPath(pathname) || pathname === "/reset-password" || pathname.startsWith("/auth/") || hasUser || sessionWritten) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  if (landingLocale) {
    response.cookies.set(LANDING_LOCALE_COOKIE, landingLocale, { path: "/", maxAge: 31_536_000, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  // Skip static assets and the Next internals; everything else passes through the proxy.
  matcher: ["/((?!_next/static|_next/image|__nextjs|favicon\\.ico|icon\\.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)"],
};
