import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicAuthConfig, supabaseKeyKind, supabaseKeyProjectRef } from "./config";
import { createSupabaseServerClient } from "./server";
import { isDevelopmentDemo } from "../ui/demo-mode";

export type DeleteAccountState = { status: "idle" | "error"; message?: string };
type Result = { status: "error" | "deleted"; message: string };
const error = (message: string): Result => ({ status: "error", message });
const unavailable = "Account deletion is unavailable. No deletion has been confirmed. Try again later or use the contact page for support availability.";
const deleted: Result = { status: "deleted", message: "Your account and watchlist have been deleted." };
const ephemeralAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** Server-only credentials; never accept a project, user ID or email from the deletion form. */
export function accountDeletionConfig(env: Record<string, string | undefined> = process.env) {
  const publicConfig = publicAuthConfig(env);
  const url = env.SUPABASE_URL?.trim(), key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!publicConfig || supabaseKeyKind(publicConfig.publishableKey) !== "publishable" || !url || !key || /\s/.test(key) || supabaseKeyKind(key) !== "secret") return null;
  try {
    const target = new URL(url), session = new URL(publicConfig.url);
    for (const parsed of [target, session]) {
      if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
      if (parsed.protocol !== "https:" && !(env.NODE_ENV === "development" && parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
    }
    if (target.origin !== session.origin) return null;
    for (const candidate of [key, publicConfig.publishableKey]) {
      const ref = supabaseKeyProjectRef(candidate);
      if (ref && target.hostname !== `${ref}.supabase.co`) return null;
    }
    return { ...publicConfig, url: target.origin, secretKey: key };
  } catch { return null; }
}

/** One request, one fresh password proof, one current-user Auth deletion. No catalog DML. */
export async function deleteCurrentAccount(form: FormData): Promise<Result> {
  if (isDevelopmentDemo()) return error("Account deletion is disabled in development demo mode.");
  if (form.get("confirmation") !== "DELETE" || form.get("acknowledge") !== "yes") return error("Type DELETE and confirm permanent account and watchlist deletion.");
  const password = form.get("password");
  if (typeof password !== "string" || !password.length || password.length > 72) return error("Enter your current password to reauthenticate.");
  const config = accountDeletionConfig();
  if (!config) return error(unavailable);
  let proofClient: ReturnType<typeof createClient> | null = null;
  try {
    const client = await createSupabaseServerClient();
    if (!client) return error(unavailable);
    // Deliberately not the React-cached viewer: verify this action's actual session with Auth.
    const verified = await client.auth.getUser();
    const user = verified.data.user;
    if (verified.error || !user || user.is_anonymous) return error("Sign in again before deleting your account.");
    if (!user.email || !user.email_confirmed_at) return error("Verify your account email before requesting deletion.");
    // Do not downgrade an MFA account to a password-only destructive operation.
    if (user.factors?.some(factor => factor.status === "verified")) return error("Self-service deletion is unavailable for MFA accounts. A verified support process is required.");

    proofClient = createClient(config.url, config.publishableKey, { auth: ephemeralAuth });
    const started = Date.now();
    const proof = await proofClient.auth.signInWithPassword({ email: user.email, password });
    if (proof.error || !proof.data.session || proof.data.user?.id !== user.id || !proof.data.user.email_confirmed_at || proof.data.user.is_anonymous) {
      return error("Reauthentication failed. Check your current password. If you use Google only, use password recovery to set a password first where supported.");
    }
    const stillValid = await client.auth.getUser();
    if (stillValid.error || stillValid.data.user?.id !== user.id || stillValid.data.user.email !== user.email || !stillValid.data.user.email_confirmed_at || stillValid.data.user.is_anonymous || stillValid.data.user.factors?.some(factor => factor.status === "verified") || Date.now() - started > 60_000) {
      return error("Your session or reauthentication changed or expired. Sign in and confirm again.");
    }

    const admin = createClient(config.url, config.secretKey, { auth: ephemeralAuth });
    let confirmed = false;
    try {
      const result = await admin.auth.admin.deleteUser(user.id, false);
      confirmed = !result.error;
    } catch { /* A lost response is ambiguous: verify this same user below, never replay deletion. */ }
    if (!confirmed) {
      try {
        const check = await admin.auth.admin.getUserById(user.id);
        confirmed = check.error?.code === "user_not_found";
        if (!confirmed) return error(check.data.user
          ? "Deletion was not completed. Your account remains. Reauthenticate to try again."
          : "The deletion result could not be confirmed. Sign in again to check your account before retrying.");
      } catch { return error("The deletion result could not be confirmed. Sign in again to check your account before retrying."); }
    }
    // Auth deletion + FK cascade is the destructive operation. A logout failure cannot undo it.
    try {
      const logout = await client.auth.signOut({ scope: "local" });
      if (logout.error) console.warn("appradar_account_deleted:session_cleanup_failed");
    } catch { console.warn("appradar_account_deleted:cookie_cleanup_failed"); }
    return deleted;
  } catch { return error(unavailable); }
  finally {
    // Password proof creates a temporary Auth session, never browser cookies. Revoke only that
    // session on failure too; do not sign out the user's other devices or retain proof tokens.
    if (proofClient) try {
      const logout = await proofClient.auth.signOut({ scope: "local" });
      if (logout.error) console.warn("appradar_account_delete:proof_cleanup_failed");
    } catch { console.warn("appradar_account_delete:proof_cleanup_failed"); }
  }
}
