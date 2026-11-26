import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient, siteOrigin } from "../../../lib/auth/server";
import { safeNextPath } from "../../../lib/auth/paths";

/**
 * Single landing point for Supabase Auth links:
 *  - `?code=…`                       OAuth (Google) and PKCE email links → exchangeCodeForSession
 *  - `?token_hash=…&type=…`          email templates using {{ .TokenHash }} (works across devices)
 * `next` is validated against the internal allowlist, so the callback cannot become an open redirect.
 * Errors redirect with a fixed code; provider error text is never reflected.
 */
const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  // Redirect on the configured/validated origin so session cookies stay on the same host.
  const origin = (await siteOrigin()) ?? url.origin;
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const fail = (code: string) => redirect(`/login?error=${code}&next=${encodeURIComponent(next)}`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth_not_configured");
  if (url.searchParams.get("error")) return fail(url.searchParams.get("error_code") === "otp_expired" ? "link_expired" : "callback_failed");

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  let ok = false;
  if (code && code.length <= 512) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && tokenHash.length <= 512 && type && OTP_TYPES.has(type)) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) return fail("link_expired");
  // Recovery links must land on the password form regardless of `next`.
  const destination = type === "recovery" ? "/reset-password" : next;
  return redirect(destination);
}
