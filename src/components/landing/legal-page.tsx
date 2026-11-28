import { ArrowRight, Info, LifeBuoy, Lightbulb, Mail, ShieldCheck, TriangleAlert, Flag } from "lucide-react";
import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/landing/config";
import { dictionaries } from "../../lib/landing/dictionaries";
import { contactCategories, contactHref, legalDictionaries, type ContactCategory, type LegalDocument } from "../../lib/landing/legal";
import type { LandingLocale } from "../../lib/landing/locale";
import { Card } from "../ui/card";
import { LandingLocaleSync } from "./locale-sync";
import { PublicFooter, PublicHeader } from "./public-chrome";

const categoryIcons: Record<ContactCategory, typeof Mail> = { support: LifeBuoy, feedback: Lightbulb, privacy: ShieldCheck, report: Flag };
// The sticky public header is taller on small screens (two rows of links).
const anchorOffset = "scroll-mt-44 lg:scroll-mt-24";

export function LegalPage({ locale, document, signedIn }: { locale: LandingLocale; document: LegalDocument; signedIn: boolean }) {
  const t = legalDictionaries[locale], page = t.documents[document];
  const long = document !== "contact";
  const entries = [...page.sections.map(section => ({ id: section.id, title: section.title })), { id: "open-items", title: t.unresolved }];
  const links = <ul className="space-y-1">{entries.map(entry => <li key={entry.id}><a href={`#${entry.id}`} className="block rounded py-1.5 text-sm/snug text-muted-foreground hover:text-foreground">{entry.title}</a></li>)}</ul>;

  return <div className="min-h-screen bg-background text-foreground">
    <LandingLocaleSync locale={locale} />
    <a className="skip-link" href="#main">{dictionaries[locale].skip}</a>
    <PublicHeader locale={locale} signedIn={signedIn} document={document} />
    <main id="main" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-3xl">
        <p className="mb-4 text-xs font-semibold tracking-wide text-warning">{t.draft}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-4 text-base/relaxed text-muted-foreground">{page.description}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t.updated}</p>
        <aside aria-label={t.draft} className="mt-6 flex gap-3 rounded-lg border border-warning/30 bg-warning/[0.06] p-4 text-sm/relaxed">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /><p>{t.notice}</p>
        </aside>
      </header>

      {document === "contact" && <>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">{contactCategories.map(id => {
          const category = t.categories[id], Icon = categoryIcons[id];
          return <li key={id} className="flex"><Card className="w-full shadow-none"><div className="flex h-full flex-col items-start p-5 sm:p-6">
            <span className="mb-4 grid size-10 place-items-center rounded-lg border bg-muted text-primary"><Icon className="size-5" aria-hidden="true" /></span>
            <h2 id={`contact-${id}`} className="text-lg font-semibold tracking-tight">{category.title}</h2>
            <p className="mt-2 text-sm/relaxed text-muted-foreground">{category.text}</p>
            <p className="mt-3 flex gap-2 text-xs/relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{category.include}</p>
            <div className="mt-auto pt-5">
              <a href={contactHref(category.subject)} aria-describedby={`contact-${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Mail className="size-4" aria-hidden="true" />{t.emailAction}</a>
            </div>
          </div></Card></li>;
        })}</ul>
        <p className="mt-6 text-sm text-muted-foreground"><a href={`mailto:${CONTACT_EMAIL}`} className="rounded font-medium break-all text-foreground underline underline-offset-4">{CONTACT_EMAIL}</a></p>
        <section className="mt-8 flex max-w-3xl flex-col items-start gap-3 rounded-lg border bg-muted p-5">
          <h2 className="text-base font-semibold">{t.account}</h2>
          <p className="text-sm/relaxed text-muted-foreground">{t.accountText}</p>
          <Link href="/account" prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-background">{t.account}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
      </>}

      <div className={long ? "mt-10 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14" : "mt-10"}>
        {long && <>
          <details className="mb-8 rounded-lg border bg-card px-4 lg:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-medium">{t.onThisPage}</summary>
            <nav aria-label={t.onThisPage} className="pb-3">{links}</nav>
          </details>
          <nav aria-label={t.onThisPage} className="sticky top-24 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto lg:block">
            <p className="mb-3 text-xs font-semibold tracking-wide text-foreground">{t.onThisPage}</p>{links}
          </nav>
        </>}
        <article className="max-w-3xl min-w-0">
          <div className="divide-y">{page.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={`${anchorOffset} py-7 first:pt-0`}>
            <h2 id={`${section.id}-title`} className="text-xl font-semibold tracking-tight">{section.title}</h2>
            {section.paragraphs?.map(text => <p key={text} className="mt-3 text-sm/7 break-words text-muted-foreground">{text}</p>)}
            {section.list && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm/7 break-words text-muted-foreground">{section.list.map(item => <li key={item}>{item}</li>)}</ul>}
            {section.note?.map(text => <p key={text} className="mt-3 text-sm/7 break-words text-muted-foreground">{text}</p>)}
            {document === "terms" && section.id === "privacy" && <Link href={`/${locale}/privacy`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-primary">{dictionaries[locale].footer.privacy}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
          </section>)}</div>
          <section id="open-items" aria-labelledby="open-items-title" className={`${anchorOffset} mt-6 rounded-lg border bg-muted p-5 sm:p-6`}>
            <h2 id="open-items-title" className="text-base font-semibold">{t.unresolved}</h2>
            {page.open.map(group => <div key={group.title} className="mt-4">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm/relaxed text-muted-foreground">{group.items.map(item => <li key={item}>{item}</li>)}</ul>
            </div>)}
          </section>
        </article>
      </div>
    </main>
    <PublicFooter locale={locale} />
  </div>;
}
