import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm, FormMessage } from "../../../components/auth/auth-forms";
import { publicAuthConfig } from "../../../lib/auth/config";
import { AuthCard } from "../auth-card";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const configured = publicAuthConfig() !== null;
  return <AuthCard title="Reset your password" description="Enter the email address for your account and we’ll send you a link to set a new password."
    footer={<Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
    {!configured && <FormMessage status="error">Password reset is not available: authentication is not configured on this server.</FormMessage>}
    <ForgotPasswordForm disabled={!configured} />
  </AuthCard>;
}
