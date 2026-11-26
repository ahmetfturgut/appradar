// Public Supabase Auth settings. Only the project URL and the publishable (anon) key are used for
// user authentication; the service-role key stays in lib/read + lib/persistence (server only).

export interface PublicAuthConfig { url: string; publishableKey: string }

function jwtClaims(key: string): Record<string, unknown> | null {
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims && typeof claims === "object" ? claims as Record<string, unknown> : null;
  } catch { return null; }
}

/** Classifies a Supabase API key by its shape only (no verification, no network). */
export function supabaseKeyKind(key: string): "secret" | "publishable" | "unknown" {
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "publishable";
  const role = jwtClaims(key)?.role;
  return role === "service_role" ? "secret" : role === "anon" ? "publishable" : "unknown";
}

/** Legacy JWT keys carry their project ref; the newer sb_ keys do not. */
export function supabaseKeyProjectRef(key: string): string | null {
  const ref = jwtClaims(key)?.ref;
  return typeof ref === "string" ? ref : null;
}

/** Refuses a privileged key, so a misconfiguration cannot ship it to browsers. */
export function publicAuthConfig(env: Record<string, string | undefined> = process.env): PublicAuthConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url || !publishableKey || /[\r\n]/.test(publishableKey) || supabaseKeyKind(publishableKey) === "secret") return null;
  try {
    const parsed = new URL(url);
    const local = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !local) return null;
  } catch { return null; }
  return { url, publishableKey };
}

/**
 * Session cookie attributes. AppRadar only uses server-side Supabase clients, so the auth cookie
 * can be HttpOnly (not readable by page scripts) on top of the library's SameSite=Lax default.
 */
export const AUTH_COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
