// Which database a collection command may touch. Collection exists only for the development project:
// there is no approved production collection, so there is no production path and no override flag.
import { supabaseKeyKind, supabaseKeyProjectRef } from "../auth/config.ts";
import { supabaseRpc, type Rpc } from "../persistence/rpc.ts";

type Env = Record<string, string | undefined>;

export const PROJECT_REF = /^[a-z0-9]{15,40}$/;

/**
 * Is this operator environment positively identified as the development project? Reason codes only.
 * Used by every command that can pay a provider (and, with the key checks below, mutate a database).
 * The operator declares the project in APPRADAR_DEVELOPMENT_PROJECT_REF; every configured Supabase URL
 * must agree with it. Anything unknown, mismatched or production fails closed.
 */
export function developmentEnvironmentProblems(env: Env): string[] {
  const value = (name: string) => env[name]?.trim() ?? "";
  const problems: string[] = [];
  if (value("NODE_ENV") === "production") problems.push("production_environment");

  const ref = value("APPRADAR_DEVELOPMENT_PROJECT_REF");
  if (!ref) problems.push("APPRADAR_DEVELOPMENT_PROJECT_REF_missing");
  else if (!PROJECT_REF.test(ref)) problems.push("APPRADAR_DEVELOPMENT_PROJECT_REF_invalid");
  const known = PROJECT_REF.test(ref) ? ref : null;
  if (known && value("APPRADAR_SUPABASE_PROJECT_REF") === known) problems.push("development_ref_is_declared_production_ref");

  const isDevelopmentOrigin = (raw: string) => {
    try {
      const url = new URL(raw);
      return url.protocol === "https:" && !url.port && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash
        && url.hostname === `${known}.supabase.co`;
    } catch { return false; }
  };
  const url = value("SUPABASE_URL");
  if (!url) problems.push("SUPABASE_URL_missing");
  else if (!known || !isDevelopmentOrigin(url)) problems.push("SUPABASE_URL_not_development_project");
  const publicUrl = value("NEXT_PUBLIC_SUPABASE_URL");
  if (publicUrl && (!known || !isDevelopmentOrigin(publicUrl))) problems.push("NEXT_PUBLIC_SUPABASE_URL_not_development_project");

  const key = value("SUPABASE_SERVICE_ROLE_KEY");
  const keyRef = key ? supabaseKeyProjectRef(key) : null;
  if (keyRef && keyRef !== known) problems.push("SUPABASE_SERVICE_ROLE_KEY_project_mismatch");
  return problems;
}

/** Database mutation additionally requires a server key of the right kind. */
export function collectionTargetProblems(env: Env): string[] {
  const problems = developmentEnvironmentProblems(env);
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!key) problems.push("SUPABASE_SERVICE_ROLE_KEY_missing");
  else if (supabaseKeyKind(key) !== "secret") problems.push("SUPABASE_SERVICE_ROLE_KEY_wrong_key_type");
  return problems;
}

/** For tools that pay a provider but never touch a database. Call before the token is read. */
export function assertDevelopmentEnvironment(env: Env): void {
  const problems = developmentEnvironmentProblems(env);
  if (problems.length) throw new Error(`collection_target_closed:${problems.join(",")}`);
}

/** The only way a mutating command obtains a database client. Throws before any request is possible. */
export function developmentCollectionRpc(env: Env, fetcher: typeof fetch = fetch): Rpc {
  const problems = collectionTargetProblems(env);
  if (problems.length) throw new Error(`collection_target_closed:${problems.join(",")}`);
  return supabaseRpc({ url: env.SUPABASE_URL!.trim(), serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!.trim() }, fetcher);
}
