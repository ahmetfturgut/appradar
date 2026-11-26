// Production configuration check. Pure (no Next.js imports) so the proxy, the CLI check and tests
// share it. Problems are `VARIABLE:reason` codes; values are never returned or logged.
import { supabaseKeyKind, supabaseKeyProjectRef } from "../auth/config.ts";

type Env = Record<string, string | undefined>;

/** Web deployments never run collection, retention or the demo; each must be unset or exactly "false". */
export const PRODUCTION_DISABLED_FLAGS = [
  "APPRADAR_DEMO_MODE", "COLLECTION_PAID_EXECUTION", "APIFY_COLLECTION_ENABLED",
  "POC_DATA_USE_CONFIRMED", "RETENTION_CLEANUP_EXECUTION",
] as const;

function parseUrl(value: string): URL | null {
  try { return new URL(value); } catch { return null; }
}
const isOriginOnly = (url: URL) => !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
const isPublicHost = (host: string) =>
  host.includes(".") && !/^[\d.]+$/.test(host) && !host.startsWith("[") && !/\.(localhost|local|test|invalid|internal)$/.test(host);

export function productionConfigProblems(env: Env): string[] {
  const problems: string[] = [];
  const value = (name: string) => env[name]?.trim() ?? "";
  const required = (name: string) => {
    if (!value(name)) problems.push(`${name}:missing`);
    return value(name);
  };

  // The deployment declares which Supabase project it may use; every URL and legacy JWT key must agree.
  // This is what stops a development URL or key from being used in production by mistake.
  let ref = required("APPRADAR_SUPABASE_PROJECT_REF");
  if (ref && !/^[a-z0-9]{15,40}$/.test(ref)) { problems.push("APPRADAR_SUPABASE_PROJECT_REF:invalid"); ref = ""; }

  for (const name of ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
    const raw = required(name);
    if (!raw) continue;
    const url = parseUrl(raw);
    if (!url || url.protocol !== "https:" || url.port || !isOriginOnly(url)) problems.push(`${name}:invalid`);
    else if (ref && url.hostname !== `${ref}.supabase.co`) problems.push(`${name}:project_mismatch`);
  }

  for (const [name, kind] of [["SUPABASE_SERVICE_ROLE_KEY", "secret"], ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable"]] as const) {
    const key = required(name);
    if (!key) continue;
    if (/\s/.test(key) || supabaseKeyKind(key) !== kind) problems.push(`${name}:wrong_key_type`);
    const keyRef = supabaseKeyProjectRef(key);
    if (ref && keyRef && keyRef !== ref) problems.push(`${name}:project_mismatch`);
  }

  const site = required("NEXT_PUBLIC_SITE_URL");
  if (site) {
    const url = parseUrl(site);
    if (!url || url.protocol !== "https:" || !isOriginOnly(url) || !isPublicHost(url.hostname)) problems.push("NEXT_PUBLIC_SITE_URL:invalid");
  }

  for (const name of PRODUCTION_DISABLED_FLAGS) {
    if (env[name] !== undefined && env[name] !== "" && env[name] !== "false") problems.push(`${name}:must_be_false`);
  }

  // NEXT_PUBLIC_ values are compiled into browser bundles.
  const secrets = [value("SUPABASE_SERVICE_ROLE_KEY"), value("APIFY_TOKEN")].filter(Boolean);
  for (const name of Object.keys(env).filter(n => n.startsWith("NEXT_PUBLIC_"))) {
    const exposed = value(name);
    if (exposed && (supabaseKeyKind(exposed) === "secret" || secrets.includes(exposed))) problems.push(`${name}:exposes_server_secret`);
  }
  return problems;
}
