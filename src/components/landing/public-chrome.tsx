import { Radar } from "lucide-react";
import Link from "next/link";
import { dictionaries } from "../../lib/landing/dictionaries";
import { landingHref, type LandingLocale } from "../../lib/landing/locale";
import { legalDocuments, type LegalDocument } from "../../lib/landing/legal";

const container = "mx-auto max-w-6xl px-5 sm:px-8";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function PublicHeader({ locale, signedIn, document }: { locale: LandingLocale; signedIn: boolean; document?: LegalDocument }) {
  const t = dictionaries[locale];
  const ctaHref = signedIn ? "/dashboard" : "/signup";
  const ctaLabel = signedIn ? t.nav.dashboard : t.nav.getStarted;
  return <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <nav aria-label={t.nav.primary} className={`${container} flex min-h-18 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3`}>
        <a href={landingHref(locale)} aria-label={t.nav.home} className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-[-0.02em]"><span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Radar className="size-4" strokeWidth={2.2} aria-hidden="true" /></span>AppRadar</a>
        <div className="order-3 flex w-full items-center justify-center gap-6 pt-2 text-sm text-muted-foreground sm:order-none sm:w-auto sm:pt-0"><a href={`${landingHref(locale)}#features`} className="rounded py-2 hover:text-foreground">{t.nav.features}</a><a href={`${landingHref(locale)}#how-it-works`} className="rounded py-2 hover:text-foreground">{t.nav.how}</a></div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div role="group" aria-label={t.nav.language} className="flex gap-0.5 rounded-md border p-0.5 text-xs font-medium">{(["en", "tr"] as const).map(lang => <a key={lang} href={`${landingHref(lang)}${document ? `/${document}` : ""}`} hrefLang={lang} aria-label={lang === "en" ? t.nav.english : t.nav.turkish} aria-current={locale === lang ? "page" : undefined} className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm px-1.5 ${locale === lang ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{lang.toUpperCase()}</a>)}</div>
          {!signedIn && <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center rounded-md px-1 text-xs font-medium hover:text-primary sm:px-2 sm:text-sm">{t.nav.signIn}</Link>}
          <Link href={ctaHref} prefetch={false} className={`${primary} hidden px-4 sm:inline-flex`}>{ctaLabel}</Link>
        </div>
      </nav>
    </header>;
}

export function PublicFooter({ locale }: { locale: LandingLocale }) {
  const t = dictionaries[locale];
  return <footer className="border-t"><div className={`${container} flex flex-col gap-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between`}><span className="flex items-center gap-2 font-medium text-foreground"><Radar className="size-4 text-primary" aria-hidden="true" />AppRadar</span><ul className="flex flex-wrap gap-x-5 gap-y-3 text-xs" aria-label={t.footer.legal}>{legalDocuments.map(document => <li key={document}><Link href={`/${locale}/${document}`} className="rounded py-2 hover:text-foreground" title={t.footer.unpublished}>{t.footer[document]} <span>({t.footer.pending})</span></Link></li>)}</ul></div></footer>;
}
