/** Card used by every authentication page (shadcn Card styling via the shared tokens). */
export function AuthCard({ title, description, children, footer }: { title: string; description: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return <section className="rounded-xl border bg-card p-6 shadow-xs sm:p-8" aria-labelledby="auth-title">
    <h1 id="auth-title" className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    <div className="mt-6 grid gap-5">{children}</div>
    {footer && <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">{footer}</div>}
  </section>;
}

const ERRORS: Record<string, string> = {
  auth_not_configured: "Authentication is not configured on this server yet.",
  callback_failed: "We couldn’t complete sign-in. Please try again.",
  link_expired: "This link is invalid or has expired. Request a new one.",
  oauth_unavailable: "Google sign-in is not available right now.",
  oauth_failed: "Google sign-in could not be started. Please try again.",
};
const MESSAGES: Record<string, string> = {
  signed_out: "You have been signed out.",
  account_deleted: "Your account and watchlist have been deleted. Shared app catalog data is preserved.",
};
/** Only fixed, known codes are rendered; query text is never reflected. */
export const authNotice = (params: Record<string, string | string[] | undefined>) => {
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const message = typeof params.message === "string" ? MESSAGES[params.message] : undefined;
  return error ? { status: "error" as const, text: error } : message ? { status: "success" as const, text: message } : null;
};
