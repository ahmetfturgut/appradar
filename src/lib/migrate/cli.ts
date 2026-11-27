// Production database preparation. Nothing is written without --apply.
//   APPRADAR_DEVELOPMENT_PROJECT_REF=<dev ref> APPRADAR_MIGRATION_DATABASE_URL=<secret> \
//   node --import tsx src/lib/migrate/cli.ts --target-ref <new project ref>            offline: inventory + target checks
//   ... --status     read-only: what is recorded, what is pending
//   ... --apply      apply pending migrations, one transaction each, stop on first error
//   ... --verify     read-only schema, RLS and privilege checks
// The connection string comes only from the environment. It is never printed or passed as an argument.
// Requires the `psql` client (PostgreSQL 15+).
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { apply, inspect, loadInventory, MigrationError, parseTarget, type ManifestEntry, type Sql, type Target } from "./runner.ts";

/** Every development ref we can see: the declared one and whatever .env.local points at. */
export function developmentRefs(env: Record<string, string | undefined>, envLocal: string | null): string[] {
  const declared = env.APPRADAR_DEVELOPMENT_PROJECT_REF?.trim();
  if (!declared) throw new MigrationError("APPRADAR_DEVELOPMENT_PROJECT_REF_missing");
  const local = [...(envLocal ?? "").matchAll(/^\s*(?:export\s+)?(?:NEXT_PUBLIC_)?SUPABASE_URL\s*=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/gm)].map(m => m[1]!);
  return [...new Set([declared, ...local])];
}

/** psql gets the credentials through its environment, with every inherited PG* variable removed. */
export function psqlInvocation(target: Target, env: Record<string, string | undefined>, transaction: boolean) {
  return {
    args: ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", ...(transaction ? ["--single-transaction"] : []), "-f", "-"],
    env: {
      PATH: env.PATH ?? "", HOME: env.HOME ?? "",
      PGHOST: target.host, PGPORT: target.port, PGUSER: target.user, PGPASSWORD: target.password,
      PGDATABASE: target.database, PGSSLMODE: target.sslmode, PGCONNECT_TIMEOUT: "15", PGAPPNAME: "appradar-migrate",
    },
  };
}

/** First error line only, with the password removed. */
export function sanitizeError(stderr: string, password: string): string {
  const line = stderr.split("\n").find(l => /ERROR|FATAL|error:/.test(l)) ?? "psql failed";
  return [password, encodeURIComponent(password)].reduce((text, secret) => text.split(secret).join("***"), line).slice(0, 300);
}

/** The only process wrapper. Exported so the local rehearsal exercises it; target checks happen in main(). */
export function psql(target: Target, env: Record<string, string | undefined>): Sql {
  return (script, options = {}) => new Promise((resolve, reject) => {
    const call = psqlInvocation(target, env, options.transaction === true);
    const child = spawn("psql", call.args, { env: call.env as unknown as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", chunk => { out += chunk; });
    child.stderr.on("data", chunk => { err += chunk; });
    child.on("error", error => reject(new MigrationError((error as NodeJS.ErrnoException).code === "ENOENT" ? "psql_not_found" : "psql_failed_to_start")));
    child.on("close", code => code === 0 ? resolve(out) : reject(new MigrationError("sql_failed", sanitizeError(err, target.password))));
    child.stdin.on("error", () => { /* psql exited early; the close handler reports it */ });
    child.stdin.end(script);
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    "target-ref": { type: "string" }, status: { type: "boolean", default: false },
    apply: { type: "boolean", default: false }, verify: { type: "boolean", default: false },
  } });
  const env = process.env;
  const targetRef = values["target-ref"];
  if (!targetRef) throw new MigrationError("target_ref_required");
  if ([values.status, values.apply, values.verify].filter(Boolean).length > 1) throw new MigrationError("choose_one_of_status_apply_verify");
  const connection = env.APPRADAR_MIGRATION_DATABASE_URL?.trim();
  if (!connection) throw new MigrationError("APPRADAR_MIGRATION_DATABASE_URL_missing");
  const envLocal = await readFile(".env.local", "utf8").catch(() => null);
  const target = parseTarget(connection, targetRef, developmentRefs(env, envLocal));

  const manifest = JSON.parse(await readFile("supabase/migrations.manifest.json", "utf8")) as ManifestEntry[];
  const files = await readdir("supabase/migrations");
  const sources = new Map(await Promise.all(files.filter(f => f.endsWith(".sql")).map(async f => [f, await readFile(join("supabase/migrations", f), "utf8")] as const)));
  const inventory = loadInventory(manifest, files, file => sources.get(file)!);
  const summary = { targetRef: target.ref, migrations: inventory.length };

  if (!values.status && !values.apply && !values.verify) {
    return { ...summary, offline: true, order: inventory.map(m => m.file), next: "--status, then --apply, then --verify" };
  }
  const sql = psql(target, env);
  if (values.apply) return { ...summary, ...(await apply(sql, inventory, await readFile("supabase/bootstrap/ledger.sql", "utf8"), line => console.error(line))) };
  const state = await inspect(sql, inventory);
  if (values.status) return { ...summary, applied: state.applied.map(m => m.file), pending: state.pending.map(m => m.file) };
  if (state.pending.length) throw new MigrationError("verify_requires_all_migrations_applied", `${state.pending.length} pending`);
  const output = await sql(await readFile("supabase/bootstrap/verify.sql", "utf8"));
  if (!output.includes("verification_passed")) throw new MigrationError("verification_did_not_pass");
  return { ...summary, recorded: state.applied.length, verification: "passed" };
}

if (process.argv[1]?.endsWith("cli.ts") && process.argv[1].includes("migrate")) {
  main().then(
    result => console.log(JSON.stringify(result, null, 2)),
    (error: unknown) => { console.error(error instanceof MigrationError ? error.message : "migration_tool_failed"); process.exitCode = 1; },
  );
}
