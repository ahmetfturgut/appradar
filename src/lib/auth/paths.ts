// Route policy shared by the proxy, the data-access layer and the auth pages.
// Pure functions only: no Supabase or Next imports, so it is unit-testable.

/** Signed-in area. Legacy screens (admin/settings/watchlist) are included so nothing is left open. */
export const PROTECTED_PREFIXES = ["/dashboard", "/explore", "/trending", "/new-releases", "/markets", "/opportunities", "/compare", "/apps", "/account", "/admin", "/settings", "/watchlist"] as const;
/** Signed-in users are sent away from these. */
export const GUEST_ONLY_PATHS = ["/login", "/signup"] as const;
/** Pages that render without the app shell (sidebar/header). */
export const PUBLIC_CHROMELESS_PATHS = ["/", "/login", "/signup", "/forgot-password", "/reset-password"] as const;
/** Internal destinations a `next` parameter may point to after authentication. */
const REDIRECT_TARGETS = [...PROTECTED_PREFIXES.filter(path => path !== "/admin"), "/reset-password"] as const;
export const DEFAULT_AFTER_LOGIN = "/dashboard";

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
export const isProtectedPath = (path: string) => PROTECTED_PREFIXES.some(prefix => matches(path, prefix));
export const isGuestOnlyPath = (path: string) => (GUEST_ONLY_PATHS as readonly string[]).includes(path);
export const isChromelessPath = (path: string) => (PUBLIC_CHROMELESS_PATHS as readonly string[]).includes(path) || matches(path, "/auth");

/**
 * Validates a post-login destination. Only same-origin, allowlisted app paths survive;
 * anything else (absolute URLs, protocol-relative `//host`, backslashes, control characters,
 * encoded tricks, unknown paths) falls back to the dashboard. Prevents open redirects.
 */
export function safeNextPath(value: unknown, fallback: string = DEFAULT_AFTER_LOGIN): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some(char => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f)) return fallback;
  let url: URL;
  try { url = new URL(value, "https://appradar.invalid"); } catch { return fallback; }
  if (url.origin !== "https://appradar.invalid") return fallback;
  if (!REDIRECT_TARGETS.some(prefix => matches(url.pathname, prefix))) return fallback;
  return `${url.pathname}${url.search}`;
}

/** `/login?next=…` for a protected path the visitor tried to open (query kept, so country/language/store survive). */
export function loginHref(path: string, search = ""): string {
  return `/login?next=${encodeURIComponent(safeNextPath(`${path}${search}`))}`;
}

export type RouteDecision = { action: "next" } | { action: "redirect"; to: string };
/** What the proxy does for a request. `hasUser` comes from a verified token, `demo` from the dev-only flag. */
export function routeDecision({ path, search, hasUser, demo }: { path: string; search: string; hasUser: boolean; demo: boolean }): RouteDecision {
  if (demo) return { action: "next" };
  if (isProtectedPath(path) && !hasUser) return { action: "redirect", to: loginHref(path, search) };
  if (isGuestOnlyPath(path) && hasUser) return { action: "redirect", to: safeNextPath(new URLSearchParams(search).get("next")) };
  return { action: "next" };
}
