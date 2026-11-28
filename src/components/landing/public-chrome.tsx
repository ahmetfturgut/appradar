import { Radar } from "lucide-react";
import Link from "next/link";
import { dictionaries } from "../../lib/landing/dictionaries";
import { landingHref, type LandingLocale } from "../../lib/landing/locale";
import { legalDocuments, type LegalDocument } from "../../lib/landing/legal";
import { LANDING_BRAND, UMBRELLA_BRAND, landingAction } from "../../lib/landing/config";

const container = "mx-auto max-w-6xl px-5 sm:px-8";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function PublicHeader({ locale, signedIn, document }: { locale: LandingLocale; signedIn: boolean; document?: LegalDocument }) {
  const t = dictionaries[locale];
  const action = landingAction(signedIn);
  return <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <nav aria-label={t.nav.primary} className={`${container} flex min-h-18 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 sm:gap-x-4`}>
        <a href={landingHref(locale)} aria-label={t.nav.home} className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-[-0.02em]"><span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Radar className="size-4" strokeWidth={2.2} aria-hidden="true" /></span>{LANDING_BRAND.name}</a>
        <div className="order-3 grid w-full grid-cols-2 gap-x-4 pt-2 text-center text-xs text-muted-foreground sm:flex sm:justify-center sm:gap-6 lg:order-none lg:w-auto lg:pt-0">
          <a href={`${landingHref(locale)}#market-check`} className="inline-flex min-h-11 items-center justify-center rounded hover:text-foreground">{t.nav.example}</a>
          <a href={`${landingHref(locale)}#how-it-works`} className="inline-flex min-h-11 items-center justify-center rounded hover:text-foreground">{t.nav.how}</a>
          <a href={`${landingHref(locale)}#features`} className="inline-flex min-h-11 items-center justify-center rounded hover:text-foreground">{t.nav.features}</a>
          <a href={`${landingHref(locale)}#evidence`} className="inline-flex min-h-11 items-center justify-center rounded hover:text-foreground">{t.nav.evidence}</a>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div role="group" aria-label={t.nav.language} className="flex gap-0.5 rounded-md border p-0.5 text-xs font-medium">{(["en", "tr"] as const).map(lang => <a key={lang} href={`${landingHref(lang)}${document ? `/${document}` : ""}`} hrefLang={lang} aria-label={lang === "en" ? t.nav.english : t.nav.turkish} aria-current={locale === lang ? "page" : undefined} className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm px-1.5 ${locale === lang ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{lang.toUpperCase()}</a>)}</div>
          {!signedIn && <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center rounded-md px-1 text-xs font-medium hover:text-primary sm:px-2 sm:text-sm">{t.nav.signIn}</Link>}
          {signedIn && <Link href={action.href} prefetch={false} className={`${primary} px-4 max-xl:hidden`}>{t.nav.dashboard}</Link>}
        </div>
      </nav>
    </header>;
}

export function PublicFooter({ locale }: { locale: LandingLocale }) {
  const t = dictionaries[locale];
  const nomind = <a href={UMBRELLA_BRAND.url} rel="noopener" className="rounded font-medium underline underline-offset-4 hover:text-foreground">{UMBRELLA_BRAND.name}</a>;
  return <footer className="border-t"><div className={`${container} flex flex-col gap-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between`}>
    <div className="max-w-xs">
      <span className="flex items-center gap-2 font-medium text-foreground"><Radar className="size-4 text-primary" aria-hidden="true" />{LANDING_BRAND.name}</span>
      <p className="mt-3 text-xs/relaxed">{t.footer.description}</p>
      {/* Word order differs: "A product by Nomind" / "Bir Nomind ürünü". */}
      <p className="mt-3 text-xs">{locale === "tr" ? <>Bir {nomind} {t.footer.byline}</> : <>{t.footer.byline} {nomind}</>}</p>
      <p className="mt-1 text-xs">{UMBRELLA_BRAND.copyright}</p>
    </div>
    <div className="sm:max-w-xs sm:text-right">
      <nav aria-label={t.footer.legal}><ul className="flex flex-wrap gap-x-5 text-xs sm:justify-end">{legalDocuments.map(document => <li key={document}><Link href={`/${locale}/${document}`} className="inline-flex min-h-11 items-center rounded hover:text-foreground">{t.footer[document]}</Link></li>)}</ul></nav>
      <p className="text-xs/relaxed">{t.footer.unpublished}</p>
    </div>
  </div></footer>;
}
