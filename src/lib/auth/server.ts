import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { isDevelopmentDemo } from "../ui/demo-mode";
import { AUTH_COOKIE_OPTIONS, publicAuthConfig } from "./config";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./paths";

/**
 * Data-access layer for authentication (see Next.js "Creating a Data Access Layer").
 * Identity is always verified with the Supabase Auth server (`getUser()`), never trusted from
 * an unverified cookie. Tokens, passwords and cookies are never logged.
 */
export type Viewer =
  | { kind: "user"; user: User }
  | { kind: "demo" }            // NODE_ENV=development + APPRADAR_DEMO_MODE=true only; no Supabase user exists
  | { kind: "anonymous" }
  | { kind: "unconfigured" };   // NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY missing or unsafe

/** One client per request, wired to Next's cookie store (official @supabase/ssr pattern). */
export async function createSupabaseServerClient() {
  const config = publicAuthConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        // Server Components cannot write cookies; the proxy refreshes the session on every request,
        // and Server Actions / Route Handlers (where this succeeds) persist sign-in changes.
        try { for (const { name, value, options } of toSet) store.set(name, value, options); } catch { /* read-only render */ }
      },
    },
  });
}

export const getViewer = cache(async (): Promise<Viewer> => {
  if (isDevelopmentDemo()) return { kind: "demo" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { kind: "unconfigured" };
  const { data, error } = await supabase.auth.getUser();
  // Supabase "anonymous sign-ins" are not accounts here, even if the project enables them.
  return !error && data.user && !data.user.is_anonymous ? { kind: "user", user: data.user } : { kind: "anonymous" };
});

/**
 * Guard for protected pages, server actions and data reads. Redirects to /login (keeping a
 * validated `next`) unless a verified user exists or the development-only demo bypass is active.
 * Call it outside try/catch blocks: `redirect()` works by throwing.
 */
export async function requireViewer(nextPath?: string): Promise<Extract<Viewer, { kind: "user" | "demo" }>> {
  const viewer = await getViewer();
  if (viewer.kind === "user" || viewer.kind === "demo") return viewer;
  redirect(nextPath ? `/login?next=${encodeURIComponent(safeNextPath(nextPath))}` : "/login");
}

/** Verified user only (no demo bypass): for operations that touch the real Auth account. */
export async function requireUser(nextPath = DEFAULT_AFTER_LOGIN): Promise<User> {
  const viewer = await getViewer();
  if (viewer.kind === "user") return viewer.user;
  redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
}

/**
 * Absolute origin for auth email links and OAuth callbacks. Production requires an explicit
 * NEXT_PUBLIC_SITE_URL (https); the Host header is only trusted in development.
 * Supabase additionally rejects redirect URLs that are not on its allowlist.
 */
export async function siteOrigin(): Promise<string | null> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
      if (url.protocol === "https:" || local) return url.origin;
    } catch { /* fall through */ }
    return null;
  }
  if (process.env.NODE_ENV !== "development") return null;
  const host = (await headers()).get("host");
  return host && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) ? `http://${host}` : null;
}

let googleCache: { value: boolean; at: number } | null = null;
/**
 * Google sign-in is offered only when the Supabase project reports the provider as enabled
 * (public GET /auth/v1/settings). Any failure hides the button instead of showing a broken option.
 */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  const config = publicAuthConfig();
  if (!config) return false;
  if (googleCache && Date.now() - googleCache.at < 5 * 60_000) return googleCache.value;
  let value: boolean;
  try {
    const response = await fetch(new URL("/auth/v1/settings", config.url), { headers: { apikey: config.publishableKey }, cache: "no-store", signal: AbortSignal.timeout(4000) });
    const body: unknown = response.ok ? await response.json() : null;
    value = !!body && typeof body === "object" && "external" in body && !!(body.external as Record<string, unknown> | null)?.google;
  } catch { value = false; }
  googleCache = { value, at: Date.now() };
  return value;
}
