import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Divider, FormMessage, GoogleButton, SignupForm } from "../../../components/auth/auth-forms";
import { getViewer, isGoogleAuthEnabled } from "../../../lib/auth/server";
import { safeNextPath } from "../../../lib/auth/paths";
import { publicAuthConfig } from "../../../lib/auth/config";
import { AuthCard } from "../auth-card";

export const metadata: Metadata = { title: "Create account" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignupPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  const viewer = await getViewer();
  if (viewer.kind === "user") redirect(next);
  const configured = publicAuthConfig() !== null;
  const google = configured && await isGoogleAuthEnabled();
  return <AuthCard title="Create your account" description="Research the app market with stored, sourced store signals."
    footer={<>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">Sign in</Link></>}>
    {!configured && <FormMessage status="error">Sign-up is not available: authentication is not configured on this server.</FormMessage>}
    {google && <><GoogleButton next={next} /><Divider /></>}
    <SignupForm next={next} disabled={!configured} />
  </AuthCard>;
}
