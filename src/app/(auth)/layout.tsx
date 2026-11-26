import Link from "next/link";
import { Radar } from "lucide-react";

/** Minimal frame for authentication pages: logo, one card, no app chrome. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-muted">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="flex h-16 items-center px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-[-0.02em] text-foreground"><span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Radar className="size-4" strokeWidth={2.2} /></span>AppRadar</Link>
    </header>
    <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
      <div className="w-full max-w-[400px]">{children}</div>
    </main>
  </div>;
}
