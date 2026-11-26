import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Divider, FormMessage, GoogleButton, LoginForm } from "../../../components/auth/auth-forms";
import { getViewer, isGoogleAuthEnabled } from "../../../lib/auth/server";
import { safeNextPath } from "../../../lib/auth/paths";
import { publicAuthConfig } from "../../../lib/auth/config";
import { AuthCard, authNotice } from "../auth-card";

export const metadata: Metadata = { title: "Sign in" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const viewer = await getViewer();
  if (viewer.kind === "user") redirect(next);
  const configured = publicAuthConfig() !== null;
  const google = configured && await isGoogleAuthEnabled();
  const notice = authNotice(params);
  return <AuthCard title="Sign in to AppRadar" description="Welcome back. Pick up your research where you left off."
    footer={<>New to AppRadar? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">Create an account</Link></>}>
    {notice && <FormMessage status={notice.status}>{notice.text}</FormMessage>}
    {!configured && <FormMessage status="error">Authentication is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on the server.</FormMessage>}
    {viewer.kind === "demo" && <FormMessage status="info">Development demo: protected pages are reachable without signing in. <Link href="/dashboard" className="font-medium text-primary hover:underline">Open the dashboard</Link></FormMessage>}
    {google && <><GoogleButton next={next} /><Divider /></>}
    <LoginForm next={next} disabled={!configured} />
  </AuthCard>;
}
