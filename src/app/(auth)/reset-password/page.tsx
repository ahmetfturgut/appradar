import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage, ResetPasswordForm } from "../../../components/auth/auth-forms";
import { getViewer } from "../../../lib/auth/server";
import { AuthCard } from "../auth-card";

export const metadata: Metadata = { title: "Set a new password" };

/** Reached from the recovery email (the callback creates a short-lived session) or from /account. */
export default async function ResetPasswordPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "user") return <AuthCard title="Link invalid or expired" description="Password reset links work once and expire after a short time.">
    <FormMessage status="error">{viewer.kind === "unconfigured" ? "Authentication is not configured on this server." : viewer.kind === "demo" ? "Development demo: there is no signed-in account to update." : "Request a new reset link to continue."}</FormMessage>
    <Link href="/forgot-password" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Request a new link</Link>
  </AuthCard>;
  return <AuthCard title="Set a new password" description={<>For <span className="font-medium text-foreground">{viewer.user.email}</span>. You’ll stay signed in afterwards.</>}>
    <ResetPasswordForm />
  </AuthCard>;
}
