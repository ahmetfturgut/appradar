// Server-only. The service role key bypasses RLS and must never reach a client bundle.
import { supabaseApiKeyHeaders } from "../auth/api-headers.ts";

export type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export class PersistenceError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export interface WriteOptions { expiresAt: string }

export function supabaseRpc(settings: { url: string; serviceRoleKey: string }, fetcher: typeof fetch = fetch): Rpc {
  if (typeof window !== "undefined") throw new PersistenceError("server_only");
  const base = new URL(settings.url);
  const local = base.hostname === "127.0.0.1" || base.hostname === "localhost";
  if (base.protocol !== "https:" && !local) throw new PersistenceError("supabase_url_must_be_https");
  const key = settings.serviceRoleKey;
  if (!key.trim() || /[\r\n]/.test(key)) throw new PersistenceError("invalid_service_role_configuration");
  return async (name, args) => {
    // No automatic retry: every function is idempotent, so the caller can safely repeat the batch.
    let response: Response;
    try {
      response = await fetcher(new URL(`/rest/v1/rpc/${name}`, base), {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
        headers: { ...supabaseApiKeyHeaders(key), "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    } catch {
      throw new PersistenceError("persistence_network_error");
    }
    if (!response.ok) {
      // Only the SQLSTATE is surfaced; error bodies can echo private row content.
      const body: unknown = await response.json().catch(() => null);
      const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" && /^[A-Z0-9]{5,10}$/.test(body.code) ? body.code : String(response.status);
      throw new PersistenceError(`persistence_rejected_${code}`);
    }
    return response.json();
  };
}
