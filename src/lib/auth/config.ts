// Public Supabase Auth settings. Only the project URL and the publishable (anon) key are used for
// user authentication; the service-role key stays in lib/read + lib/persistence (server only).

export interface PublicAuthConfig { url: string; publishableKey: string }

/** Refuses anything that looks like a privileged key, so a misconfiguration cannot ship it to browsers. */
function isPrivilegedKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const payload = key.split(".")[1];
  if (!payload) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))?.role === "service_role"; } catch { return false; }
}

export function publicAuthConfig(env: Record<string, string | undefined> = process.env): PublicAuthConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url || !publishableKey || /[\r\n]/.test(publishableKey) || isPrivilegedKey(publishableKey)) return null;
  try {
    const parsed = new URL(url);
    const local = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !local) return null;
  } catch { return null; }
  return { url, publishableKey };
}
