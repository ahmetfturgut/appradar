"use client";
import Link from "next/link";
import { useActionState, useId } from "react";
import type { DeleteAccountState } from "../../lib/auth/delete-account";
import { FormMessage } from "./auth-forms";

const initial: DeleteAccountState = { status: "idle" };
const input = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export function DeleteAccountForm({ action }: { action: (state: DeleteAccountState, form: FormData) => Promise<DeleteAccountState> }) {
  const [state, submit, pending] = useActionState(action, initial);
  const id = useId();
  return <form action={submit} className="grid gap-4">
    <p id={`${id}-warning`} className="text-sm/relaxed text-muted-foreground">Permanently delete your sign-in account and saved watchlist. Other users and the shared app catalog are preserved. This cannot be undone. Backup and infrastructure log retention still require owner approval; immediate removal from them is not promised.</p>
    <p className="text-xs/relaxed text-muted-foreground">Enter your current password for a fresh identity check in this request. If you sign in with Google only, <Link href="/forgot-password" className="text-primary underline">use password recovery</Link> to set a password first where supported. If recovery is unavailable, check <Link href="/en/contact" className="text-primary underline">support availability</Link>.</p>
    {state.status === "error" && <FormMessage status="error">{state.message}</FormMessage>}
    <div className="grid gap-1.5"><label htmlFor={`${id}-password`} className="text-sm font-medium">Current password</label><input id={`${id}-password`} name="password" type="password" autoComplete="current-password" maxLength={72} required disabled={pending} className={input} /></div>
    <div className="grid gap-1.5"><label htmlFor={`${id}-confirmation`} className="text-sm font-medium">Type DELETE to confirm</label><input id={`${id}-confirmation`} name="confirmation" autoComplete="off" spellCheck={false} pattern="DELETE" maxLength={6} required disabled={pending} className={input} /></div>
    <label className="flex items-start gap-2 text-sm/relaxed"><input name="acknowledge" type="checkbox" value="yes" required disabled={pending} aria-describedby={`${id}-warning`} className="mt-1" />I confirm permanent deletion of my account and watchlist.</label>
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className="inline-flex min-h-10 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50">{pending ? "Verifying and deleting…" : "Permanently delete my account"}</button>
  </form>;
}
