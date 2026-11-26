// Server-only. Reads the catalog through PostgREST with the service role key, which bypasses RLS:
// it must never reach a client bundle, and only allowlisted public tables and read RPCs are reachable.
import { supabaseRpc, type Rpc } from "../persistence/rpc.ts";

export class ReadError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

/** Public catalog tables only. private.* (jobs, provider runs, budgets) is never read here. */
const TABLES = new Set([
  "apps", "developers", "app_listings", "app_snapshots", "discovery_snapshots", "discovery_entries",
  "reviews", "review_observations", "keyword_snapshots", "keyword_entries",
]);
const READ_RPC = /^appradar_read_[a-z_]+$/;

export interface SelectResult { rows: Record<string, unknown>[]; total: number | null }

export interface ReadClient {
  select(table: string, query: Record<string, string>, options?: { count?: boolean }): Promise<SelectResult>;
  /** Exact row count only (HEAD request). */
  count(table: string, query: Record<string, string>): Promise<number>;
  rpc(name: string, args: Record<string, unknown>): Promise<unknown>;
  /** Reference time for expiry filters, as an ISO string. */
  now(): string;
}

export interface ReadSettings { url: string; serviceRoleKey: string }

export function readSettingsFromEnv(env: NodeJS.ProcessEnv = process.env): ReadSettings {
  const url = env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  // No silent mock fallback: callers must surface this as an unavailable data source.
  if (!url || !serviceRoleKey) throw new ReadError("supabase_not_configured");
  return { url, serviceRoleKey };
}

function totalFrom(header: string | null): number | null {
  const match = header?.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function createReadClient(settings: ReadSettings = readSettingsFromEnv(), fetcher: typeof fetch = fetch, clock = () => new Date()): ReadClient {
  if (typeof window !== "undefined") throw new ReadError("server_only");
  const base = new URL(settings.url);
  const local = base.hostname === "127.0.0.1" || base.hostname === "localhost";
  if (base.protocol !== "https:" && !local) throw new ReadError("supabase_url_must_be_https");
  const key = settings.serviceRoleKey;
  if (/[\r\n]/.test(key)) throw new ReadError("invalid_service_role_configuration");
  const rpc: Rpc = supabaseRpc(settings, fetcher);

  const request = async (table: string, query: Record<string, string>, method: "GET" | "HEAD", count: boolean) => {
    if (!TABLES.has(table)) throw new ReadError("table_not_readable");
    const url = new URL(`/rest/v1/${table}`, base);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    let response: Response;
    try {
      response = await fetcher(url, {
        method, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json", ...(count ? { Prefer: "count=exact" } : {}) },
      });
    } catch {
      throw new ReadError("read_network_error");
    }
    if (!response.ok) {
      // Only a status/SQLSTATE-like code is surfaced; bodies can echo row content.
      const body: unknown = method === "GET" ? await response.json().catch(() => null) : null;
      const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" && /^[A-Z0-9]{5,10}$/.test(body.code) ? body.code : String(response.status);
      throw new ReadError(`read_rejected_${code}`);
    }
    return response;
  };

  return {
    async select(table, query, options = {}) {
      const response = await request(table, query, "GET", options.count === true);
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new ReadError("read_unexpected_shape");
      return { rows: rows as Record<string, unknown>[], total: options.count ? totalFrom(response.headers.get("content-range")) : null };
    },
    async count(table, query) {
      const response = await request(table, { ...query, limit: "1" }, "HEAD", true);
      const total = totalFrom(response.headers.get("content-range"));
      if (total == null) throw new ReadError("read_count_unavailable");
      return total;
    },
    async rpc(name, args) {
      if (!READ_RPC.test(name)) throw new ReadError("rpc_not_readable");
      try {
        return await rpc(name, args);
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String(error.code) : "";
        // Migration 20261126000800 not applied yet: say so instead of degrading silently.
        if (code.endsWith("PGRST202") || code.endsWith("_404")) throw new ReadError("read_function_unavailable");
        throw new ReadError(code.replace(/^persistence_/, "read_") || "read_rpc_failed");
      }
    },
    now: () => clock().toISOString(),
  };
}

let shared: ReadClient | null = null;
/** Lazily built from SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Throws ReadError when not configured. */
export function defaultReadClient(): ReadClient {
  shared ??= createReadClient();
  return shared;
}
