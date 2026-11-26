"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, getViewer, isGoogleAuthEnabled, siteOrigin } from "./server";
import { publicAuthConfig } from "./config";
import { safeNextPath } from "./paths";

/**
 * Authentication Server Actions. Each one is a public endpoint: it validates input with zod,
 * talks to Supabase Auth with the publishable key only, and returns fixed, non-reflective
 * messages. Passwords, tokens and raw provider errors are never logged or echoed back.
 */
export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword", string>>;
  email?: string;
};

const email = z.string().trim().min(1, "Enter your email address.").max(254, "Email address is too long.").email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.").max(72, "Use 72 characters or fewer.");
const field = (data: FormData, name: string) => { const value = data.get(name); return typeof value === "string" ? value : ""; };

const NOT_CONFIGURED: AuthFormState = { status: "error", message: "Sign-in is not available: authentication is not configured on this server." };

type FieldErrors = NonNullable<AuthFormState["fieldErrors"]>;
function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password" || key === "confirmPassword") && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Maps Supabase Auth error codes to fixed copy. Unknown errors get a generic message. */
function authMessage(error: { code?: string | undefined; status?: number | undefined }): string {
  switch (error.code) {
    case "invalid_credentials": return "Email or password is incorrect.";
    case "email_not_confirmed": return "Confirm your email address first. Check your inbox for the verification link.";
    case "weak_password": return "Choose a stronger password.";
    case "same_password": return "Choose a password you have not used for this account.";
    case "signup_disabled": return "New sign-ups are currently disabled.";
    case "email_address_invalid": return "Enter a valid email address.";
    case "over_request_rate_limit": case "over_email_send_rate_limit": return "Too many attempts. Wait a moment and try again.";
    case "session_not_found": case "session_expired": return "Your session has expired. Request a new link and try again.";
  }
  if (error.status === 429) return "Too many attempts. Wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

/** Redacted operator signal: flow and error code only, never an address, token or provider message. */
function logAuthFailure(flow: string, error: { code?: string | undefined; status?: number | undefined }) {
  const code = error.code && /^[a-z0-9_]{1,64}$/.test(error.code) ? error.code : String(Number(error.status) || 0);
  console.warn(`appradar_auth_failed:${flow}:${code}`);
}

/**
 * Supabase's per-address email cooldown only fires for addresses that get mail, so reporting it
 * would reveal which addresses have accounts. Flows that send mail answer it like a success.
 */
const isEmailSendLimit = (error: { code?: string | undefined }) => error.code === "over_email_send_rate_limit";

export async function signInWithPassword(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.").max(72, "Use 72 characters or fewer.") }).safeParse({ email: field(data, "email"), password: field(data, "password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: field(data, "email") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ...NOT_CONFIGURED, email: parsed.data.email };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authMessage(error), email: parsed.data.email };
  redirect(safeNextPath(field(data, "next")));
}

export async function signUpWithPassword(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email, password, confirmPassword: z.string() })
    .refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." })
    .safeParse({ email: field(data, "email"), password: field(data, "password"), confirmPassword: field(data, "confirmPassword") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: field(data, "email") };
  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  if (!supabase || !origin) return { ...NOT_CONFIGURED, email: parsed.data.email };
  const next = safeNextPath(field(data, "next"));
  const { data: result, error } = await supabase.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    logAuthFailure("sign_up", error);
    if (!isEmailSendLimit(error)) return { status: "error", message: authMessage(error), email: parsed.data.email };
  }
  // Email confirmation disabled in Supabase: a session exists immediately.
  if (result.session) redirect(next);
  // Same message whether or not the address was already registered (no account enumeration).
  return { status: "success", message: "Check your inbox. If this address can be registered, we sent a link to verify it and finish creating your account.", email: parsed.data.email };
}

export async function requestPasswordReset(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const parsed = z.object({ email }).safeParse({ email: field(data, "email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), email: field(data, "email") };
  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  if (!supabase || !origin) return { ...NOT_CONFIGURED, email: parsed.data.email };
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}` });
  if (error) {
    logAuthFailure("password_reset", error);
    // The request limit is per caller, not per address, so it is safe to show.
    if (!isEmailSendLimit(error) && (error.status === 429 || error.code === "over_request_rate_limit")) return { status: "error", message: authMessage(error), email: parsed.data.email };
  }
  // Identical response for known and unknown addresses.
  return { status: "success", message: "If an account exists for this address, a password reset link is on its way. The link expires after a short time.", email: parsed.data.email };
}

export async function updatePassword(_: AuthFormState, data: FormData): Promise<AuthFormState> {
  const parsed = z.object({ password, confirmPassword: z.string() })
    .refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." })
    .safeParse({ password: field(data, "password"), confirmPassword: field(data, "confirmPassword") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };
  const viewer = await getViewer();
  if (viewer.kind !== "user") return { status: "error", message: "Your reset link is invalid or has expired. Request a new one." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authMessage(error) };
  // A new password must end sessions opened with the old one elsewhere; this one stays signed in.
  const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
  if (revokeError) logAuthFailure("revoke_sessions", revokeError);
  redirect("/account?message=password_updated");
}

export async function signInWithGoogle(data: FormData): Promise<void> {
  const next = safeNextPath(field(data, "next"));
  const back = (code: string) => `/login?error=${code}&next=${encodeURIComponent(next)}`;
  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  if (!supabase || !origin || !(await isGoogleAuthEnabled())) redirect(back("oauth_unavailable"));
  const { data: result, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  // Compare origins, not prefixes: `https://ref.supabase.co.example` must not pass.
  if (error || !result.url || new URL(result.url).origin !== new URL(publicAuthConfig()!.url).origin) redirect(back("oauth_failed"));
  redirect(result.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut({ scope: "local" });
  redirect("/login?message=signed_out");
}
