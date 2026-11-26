import Link from "next/link";
import { dictionaries } from "../../lib/landing/dictionaries";
import { legalDictionaries, type LegalDocument } from "../../lib/landing/legal";
import type { LandingLocale } from "../../lib/landing/locale";
import { LandingLocaleSync } from "./locale-sync";
import { PublicFooter, PublicHeader } from "./public-chrome";

export function LegalPage({ locale, document, signedIn }: { locale: LandingLocale; document: LegalDocument; signedIn: boolean }) {
  const t = legalDictionaries[locale], page = t.documents[document];
  return <div className="min-h-screen bg-background text-foreground">
    <LandingLocaleSync locale={locale} />
    <a className="skip-link" href="#main">{dictionaries[locale].skip}</a>
    <PublicHeader locale={locale} signedIn={signedIn} document={document} />
    <main id="main" className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
      <p className="mb-4 text-xs font-semibold tracking-wide text-warning">{t.draft}</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
      <p className="mt-4 text-base/relaxed text-muted-foreground">{page.description}</p>
      <aside aria-label={t.draft} className="my-8 rounded-lg border border-warning/30 bg-warning/[0.06] p-5 text-sm/relaxed">{t.notice}</aside>
      <div className="divide-y">{page.sections.map(section => <section key={section.title} className="py-6"><h2 className="text-lg font-semibold">{section.title}</h2><p className="mt-3 text-sm/relaxed text-muted-foreground">{section.text}</p></section>)}</div>
      <section className="mt-6 rounded-lg border bg-muted p-5"><h2 className="text-base font-semibold">{t.unresolved}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm/relaxed text-muted-foreground">{page.missing.map(item => <li key={item}>{item}</li>)}</ul></section>
      {document === "contact" && <Link href="/account" className="mt-6 inline-flex rounded-md border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">{t.account}</Link>}
    </main>
    <PublicFooter locale={locale} />
  </div>;
}
