"use client";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { requestPasswordReset, signInWithGoogle, signInWithPassword, signUpWithPassword, updatePassword, type AuthFormState } from "../../lib/auth/actions";

const initial: AuthFormState = { status: "idle" };
const inputClass = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15";

export function FormMessage({ status, children }: { status: "error" | "success" | "info"; children: React.ReactNode }) {
  const Icon = status === "error" ? CircleAlert : CircleCheck;
  return <div role={status === "error" ? "alert" : "status"} className={cn("flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px]/relaxed",
    status === "error" ? "border-destructive/25 bg-destructive/[0.05] text-destructive" : status === "success" ? "border-success/25 bg-success/[0.06] text-success" : "border-border bg-muted text-muted-foreground")}>
    <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div className="min-w-0">{children}</div>
  </div>;
}

function Field({ label, name, type = "text", error, autoComplete, defaultValue, hint, disabled, trailing }: { label: string; name: string; type?: string; error?: string | undefined; autoComplete?: string; defaultValue?: string | undefined; hint?: string; disabled?: boolean; trailing?: React.ReactNode }) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const [reveal, setReveal] = useState(false);
  const password = type === "password";
  return <div className="grid gap-1.5">
    <div className="flex items-center justify-between gap-2"><label htmlFor={id} className="text-[13px] font-medium text-foreground">{label}</label>{trailing}</div>
    <div className="relative">
      <input id={id} name={name} type={password && reveal ? "text" : type} required autoComplete={autoComplete} defaultValue={defaultValue} disabled={disabled}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={cn(inputClass, password && "pr-10")} {...(type === "email" ? { inputMode: "email" as const, maxLength: 254, spellCheck: false } : {})} {...(password ? { maxLength: 72 } : {})} />
      {password && <button type="button" onClick={() => setReveal(value => !value)} aria-label={reveal ? "Hide password" : "Show password"} aria-pressed={reveal} disabled={disabled} className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">{reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
    </div>
    {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p id={`${id}-error`} className="text-xs font-medium text-destructive">{error}</p>}
  </div>;
}

function Submit({ children, pending, disabled }: { children: React.ReactNode; pending: boolean; disabled?: boolean }) {
  return <button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60">
    {pending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{children}
  </button>;
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending || undefined} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60">
    {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>}
    Continue with Google
  </button>;
}

export function GoogleButton({ next }: { next: string }) {
  return <form action={signInWithGoogle}><input type="hidden" name="next" value={next} /><GoogleSubmit /></form>;
}

export function Divider() {
  return <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>;
}

export function LoginForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(signInWithPassword, initial);
  return <form action={action} noValidate className="grid gap-4">
    <input type="hidden" name="next" value={next} />
    {state.message && <FormMessage status={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage>}
    <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} error={state.fieldErrors?.email} disabled={disabled} />
    <Field label="Password" name="password" type="password" autoComplete="current-password" error={state.fieldErrors?.password} disabled={disabled}
      trailing={<Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>} />
    <Submit pending={pending} disabled={disabled}>{pending ? "Signing in…" : "Sign in"}</Submit>
  </form>;
}

export function SignupForm({ next, disabled }: { next: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(signUpWithPassword, initial);
  if (state.status === "success") return <FormMessage status="success"><strong className="font-semibold">Verify your email.</strong> {state.message}</FormMessage>;
  return <form action={action} noValidate className="grid gap-4">
    <input type="hidden" name="next" value={next} />
    {state.message && <FormMessage status="error">{state.message}</FormMessage>}
    <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} error={state.fieldErrors?.email} disabled={disabled} />
    <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." error={state.fieldErrors?.password} disabled={disabled} />
    <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={state.fieldErrors?.confirmPassword} disabled={disabled} />
    <Submit pending={pending} disabled={disabled}>{pending ? "Creating account…" : "Create account"}</Submit>
  </form>;
}

export function ForgotPasswordForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  if (state.status === "success") return <FormMessage status="success">{state.message}</FormMessage>;
  return <form action={action} noValidate className="grid gap-4">
    {state.message && <FormMessage status="error">{state.message}</FormMessage>}
    <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} error={state.fieldErrors?.email} disabled={disabled} />
    <Submit pending={pending} disabled={disabled}>{pending ? "Sending link…" : "Send reset link"}</Submit>
  </form>;
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return <form action={action} noValidate className="grid gap-4">
    {state.message && <FormMessage status="error">{state.message}</FormMessage>}
    <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters." error={state.fieldErrors?.password} />
    <Field label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" error={state.fieldErrors?.confirmPassword} />
    <Submit pending={pending}>{pending ? "Updating password…" : "Update password"}</Submit>
  </form>;
}
