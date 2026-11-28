import { supabaseKeyKind } from "./config.ts";

/** API keys always use `apikey`; only legacy JWT keys are also valid Bearer credentials. */
export function supabaseApiKeyHeaders(key: string): { apikey: string; Authorization?: string } {
  const kind = supabaseKeyKind(key);
  const isNewKey = (kind === "secret" && key.startsWith("sb_secret_"))
    || (kind === "publishable" && key.startsWith("sb_publishable_"));
  return isNewKey ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}
