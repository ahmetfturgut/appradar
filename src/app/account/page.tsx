import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { FormMessage } from "../../components/auth/auth-forms";
import { DeleteAccountForm } from "../../components/auth/delete-account-form";
import { accountDeletionConfig } from "../../lib/auth/delete-account";
import { deleteAccountAction } from "../../lib/auth/delete-account-action";
import { PageHeading } from "../../components/core/elements";
import { getViewer, requireViewer } from "../../lib/auth/server";
import { signOut } from "../../lib/auth/actions";
import { dateLabel } from "../../components/core/view-models";
import { AppearanceCard } from "../../components/appearance-card";

export const metadata: Metadata = { title: "Account" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const providerLabel = (provider: string) => provider === "google" ? "Google" : provider === "email" ? "Email and password" : provider;

export default async function AccountPage({ searchParams }: Props) {
  await requireViewer("/account");
  const viewer = await getViewer();
  const updated = (await searchParams).message === "password_updated";
  if (viewer.kind !== "user") return <>
    <PageHeading title="Account" description="Your AppRadar sign-in details." />
    <div className="flex max-w-2xl flex-col gap-5">
      <FormMessage status="info">Development demo: authentication is bypassed locally, so there is no signed-in account. No Supabase user or session is created.</FormMessage>
      <AppearanceCard />
    </div>
  </>;
  const { user } = viewer;
  const providers = [...new Set((user.identities ?? []).map(identity => identity.provider))];
  const rows: [string, React.ReactNode][] = [
    ["Email", user.email ?? "Not available"],
    ["Email verified", user.email_confirmed_at ? `Yes · ${dateLabel(user.email_confirmed_at)}` : "Not verified"],
    ["Sign-in methods", providers.length ? providers.map(providerLabel).join(", ") : "Not available"],
    ["Member since", dateLabel(user.created_at ?? null)],
    ["Last sign-in", dateLabel(user.last_sign_in_at ?? null)],
  ];
  return <>
    <PageHeading title="Account" description="Your AppRadar sign-in details." />
    <div className="flex max-w-2xl flex-col gap-5">
      {updated && <FormMessage status="success">Your password has been updated.</FormMessage>}
      <Card>
        <CardHeader className="border-b"><CardTitle role="heading" aria-level={2}>Profile</CardTitle><CardDescription>Managed by Supabase Auth. AppRadar stores no additional profile data.</CardDescription></CardHeader>
        <CardContent className="py-1">
          <dl className="m-0">{rows.map(([label, value]) => <div key={label} className="flex flex-col gap-0.5 border-b py-3 text-sm last:border-b-0 sm:flex-row sm:justify-between sm:gap-6"><dt className="text-muted-foreground">{label}</dt><dd className="m-0 font-medium break-all text-foreground sm:text-right">{value}</dd></div>)}</dl>
        </CardContent>
        <CardFooter className="flex-wrap gap-2 border-t">
          <Link href="/reset-password" className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-xs hover:bg-muted"><KeyRound className="size-4" />Change password</Link>
          <Link href="/forgot-password" className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-primary hover:underline">Reset password by email</Link>
          <form action={signOut}><button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-xs hover:bg-muted"><LogOut className="size-4" />Sign out</button></form>
        </CardFooter>
      </Card>
      <AppearanceCard />
      <Card className="border-destructive/25">
        <CardHeader><CardTitle role="heading" aria-level={2}>Delete account</CardTitle><CardDescription>Requires a verified email and a fresh password check.</CardDescription></CardHeader>
        <CardContent className="pb-5">{!user.email_confirmed_at
          ? <FormMessage status="info">Verify your email before deleting your account.</FormMessage>
          : accountDeletionConfig() ? <DeleteAccountForm action={deleteAccountAction} />
          : <FormMessage status="info">Account deletion is not configured. No deletion request has been submitted. <Link href="/en/contact" className="text-primary underline">Check support availability</Link>.</FormMessage>}</CardContent>
      </Card>
    </div>
  </>;
}
