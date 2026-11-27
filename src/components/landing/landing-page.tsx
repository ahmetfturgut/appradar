import { ArrowRight, Bookmark, Check, Compass, FileSearch, FlaskConical, Layers, Lightbulb, Plus, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { dictionaries, type LandingDictionary } from "../../lib/landing/dictionaries";
import type { LandingLocale } from "../../lib/landing/locale";
import { landingAction } from "../../lib/landing/config";
import { marketCheck } from "../../lib/landing/market-check-data";
import { Card } from "../ui/card";
import { MarketCheck } from "./market-check";
import { LandingLocaleSync } from "./locale-sync";
import { PublicFooter, PublicHeader } from "./public-chrome";

export const landingPrimary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted";
const container = "mx-auto max-w-6xl px-5 sm:px-8";
const eyebrow = "mb-4 text-xs font-semibold tracking-[0.12em] text-primary uppercase";
const heading = "text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl";
const audienceIcons = [Lightbulb, Compass, Users];
const featureIcons = [Search, Layers, FileSearch, Bookmark];

export function LandingPage({ locale, signedIn }: { locale: LandingLocale; signedIn: boolean }) {
  const t = dictionaries[locale], action = landingAction(signedIn);
  const label = signedIn ? t.nav.getStarted : t.hero.secondary;
  return <div className="min-h-screen bg-background text-foreground">
    <LandingLocaleSync locale={locale} />
    <a className="skip-link" href="#main">{t.skip}</a>
    <PublicHeader locale={locale} signedIn={signedIn} />
    <main id="main">
      <section className={`${container} pt-14 pb-12 text-center sm:pt-20 sm:pb-16`}>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1.5 text-xs font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />{t.hero.eyebrow}</p>
        <h1 className="mx-auto max-w-4xl text-[2.5rem] leading-[1.07] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.5rem]">{t.hero.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base/relaxed text-pretty text-muted-foreground sm:text-lg/relaxed">{t.hero.description}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
          <Link href={action.href} prefetch={false} className={landingPrimary}>{label}<ArrowRight className="size-4" aria-hidden="true" /></Link>
          <a href={signedIn ? "#market-check" : "#how-it-works"} className={secondary}>{signedIn ? t.hero.secondary : t.nav.how}</a>
        </div>
        {!signedIn && <p className="mx-auto mt-4 max-w-lg text-xs/relaxed text-muted-foreground">{t.hero.note}</p>}
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">{t.hero.tags.map(tag => <li key={tag} className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" aria-hidden="true" />{tag}</li>)}</ul>
      </section>

      <section id="market-check" aria-labelledby="market-title" className={`${container} scroll-mt-36 pb-16 sm:pb-24`}>
        <div className="mb-7 max-w-2xl"><p className={eyebrow}>{t.market.eyebrow}</p><h2 id="market-title" className={heading}>{t.market.title}</h2><p className="mt-4 text-sm/relaxed text-muted-foreground sm:text-base/relaxed">{t.market.description}</p></div>
        <MarketCheck text={t.market} locale={locale} />
      </section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-36 border-y bg-muted py-16 sm:py-20"><div className={container}>
        <p className={eyebrow}>{t.how.eyebrow}</p><h2 id="how-title" className={`${heading} max-w-2xl`}>{t.how.title}</h2><p className="mt-4 text-base/relaxed text-muted-foreground">{t.how.description}</p>
        <ol className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">{t.how.items.map((item, i) => <li key={item.title} className="border-t pt-5"><span className="mb-4 grid size-9 place-items-center rounded-lg border bg-card text-sm font-medium tabular-nums text-primary">0{i + 1}</span><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-3 text-sm/relaxed text-muted-foreground">{item.text}</p></li>)}</ol>
      </div></section>

      <section id="features" aria-labelledby="features-title" className={`${container} scroll-mt-36 py-16 sm:py-24`}>
        <div className="max-w-2xl"><p className={eyebrow}>{t.features.eyebrow}</p><h2 id="features-title" className={heading}>{t.features.title}</h2><p className="mt-4 text-base/relaxed text-muted-foreground">{t.features.description}</p></div>
        <div className="mt-9 grid gap-5 md:grid-cols-2">{t.features.items.map((item, i) => { const Icon = featureIcons[i]!; return <Card key={item.title} className="overflow-hidden shadow-none">
          <div className="flex-1 p-5 sm:p-7"><Icon className="mb-5 size-5 text-primary" aria-hidden="true" /><p className="mb-2 text-xs/relaxed font-medium text-primary">{item.tools}</p><h3 className="text-xl leading-snug font-semibold tracking-tight">{item.title}</h3><p className="mt-3 text-sm/relaxed text-muted-foreground">{item.text}</p></div>
          <FeatureVisual index={i} text={t} locale={locale} />
        </Card>; })}</div>
        <p className="mt-6 max-w-3xl text-xs/relaxed text-muted-foreground">{t.features.availability}</p>
      </section>

      <section id="evidence" aria-labelledby="evidence-title" className="scroll-mt-36 border-y bg-muted py-16 sm:py-20"><div className={container}>
        <div className="max-w-2xl"><p className={eyebrow}>{t.evidence.eyebrow}</p><h2 id="evidence-title" className={heading}>{t.evidence.title}</h2><p className="mt-4 text-base/relaxed text-muted-foreground">{t.evidence.description}</p></div>
        <div className="mt-9 grid gap-8 md:grid-cols-3">{t.evidence.items.map((item, i) => <div key={item.title}><ShieldCheck className="mb-4 size-5 text-primary" aria-hidden="true" /><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-3 text-sm/relaxed text-muted-foreground">{item.text}</p>{i === 1 && <a className="mt-3 inline-flex min-h-11 items-center gap-2 rounded text-xs font-medium text-primary" href="#market-check">{t.market.limited}<ArrowRight className="size-3.5" aria-hidden="true" /></a>}</div>)}</div>
        <aside id="access" aria-labelledby="access-title" className="mt-10 scroll-mt-36 rounded-xl border bg-card p-5 sm:p-6"><h3 id="access-title" className="text-base font-semibold">{t.evidence.accessTitle}</h3><p className="mt-2 max-w-3xl text-sm/relaxed text-muted-foreground">{t.evidence.access}</p><p className="mt-2 max-w-3xl text-xs/relaxed text-muted-foreground">{t.evidence.language}</p></aside>
      </div></section>

      <section aria-labelledby="audience-title" className={`${container} py-16 sm:py-20`}><h2 id="audience-title" className={`${heading} max-w-2xl`}>{t.audience.title}</h2><div className="mt-9 grid gap-8 md:grid-cols-3">{t.audience.items.map((item, i) => { const Icon = audienceIcons[i]!; return <div key={item.title}><Icon className="mb-4 size-5 text-primary" aria-hidden="true" /><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-3 text-sm/relaxed text-muted-foreground">{item.text}</p></div>; })}</div></section>

      <section aria-labelledby="faq-title" className="border-y bg-muted py-16 sm:py-20"><div className={`${container} grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16`}>
        <div><h2 id="faq-title" className={heading}>{t.faq.title}</h2><p className="mt-4 text-sm/relaxed text-muted-foreground">{t.faq.description}</p></div>
        <div className="divide-y border-y">{t.faq.items.map(item => <details key={item.question} className="group py-1"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-sm/relaxed font-medium [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-4 shrink-0 group-open:rotate-45" aria-hidden="true" /></summary><p className="pb-5 text-sm/relaxed text-muted-foreground">{item.answer}</p></details>)}</div>
      </div></section>

      <section aria-labelledby="cta-title" className={`${container} py-16 text-center sm:py-24`}><h2 id="cta-title" className={`${heading} mx-auto max-w-2xl`}>{t.cta.title}</h2><p className="mx-auto mt-5 max-w-xl text-base/relaxed text-muted-foreground">{t.cta.description}</p><Link href={action.href} prefetch={false} className={`${landingPrimary} mt-7`}>{signedIn ? t.cta.button : t.hero.secondary}<ArrowRight className="size-4" aria-hidden="true" /></Link></section>
    </main>
    <PublicFooter locale={locale} />
  </div>;
}

/** Original, non-interactive product fragments. Never load third-party assets or product data. */
function FeatureVisual({ index, text: t, locale }: { index: number; text: LandingDictionary; locale: LandingLocale }) {
  const model = marketCheck("habits"), v = t.features.visual;
  const number = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 });
  return <figure className="border-t bg-muted/70 px-5 pt-4 pb-5 sm:px-7">
    <figcaption className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><FlaskConical className="size-3" aria-hidden="true" />{t.features.illustrative}</figcaption>
    <div className="min-h-40 rounded-lg border bg-card p-4">
      <p className="mb-3 text-xs font-medium">{[v.results, v.category, v.compare, v.saved][index]}</p>
      {index === 0 && model.comparison.map((app, i) => <div className="flex items-center gap-2 border-t py-2 text-xs" key={app.appId}><span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent font-medium text-primary" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span className="min-w-0 flex-1">{app.name}</span><span className="tabular-nums text-muted-foreground">{app.rating == null ? v.unknown : `${number.format(app.rating)} / 5`}</span></div>)}
      {index === 1 && <div className="space-y-3">{(["qualityGap", "neglected", "newcomers"] as const).map(key => <div key={key} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-xs"><span>{t.market.metrics[key].title}</span><span className="tabular-nums text-muted-foreground">{number.format(model.indicators[key].value!)}%</span><span className="col-span-2 h-1.5 rounded bg-muted" aria-hidden="true"><span className="block h-full rounded bg-primary/60" style={{ width: `${model.indicators[key].value}%` }} /></span></div>)}</div>}
      {index === 2 && <><div className="grid grid-cols-3 gap-2">{model.comparison.map((app, i) => <div key={app.appId} className="rounded border p-2 text-center"><span className="text-xs font-medium text-primary">{String.fromCharCode(65 + i)}</span><p className="mt-2 text-sm font-semibold tabular-nums">{app.rating == null ? "—" : number.format(app.rating)}</p><p className="mt-1 text-[11px] text-muted-foreground">{app.ratingCount == null ? v.unknown : number.format(app.ratingCount)}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">{v.history}</p></>}
      {index === 3 && <><div className="flex items-center gap-2 rounded border bg-muted px-3 py-2.5 text-xs"><Bookmark className="size-4 text-primary" aria-hidden="true" />Habit Meadow<Check className="ml-auto size-3.5 text-primary" aria-hidden="true" /></div><div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{v.release}</span><span>{new Date(model.apps[0]!.releasedAt!).getUTCFullYear()}</span></div><p className="mt-2 text-xs text-muted-foreground">{t.market.context}</p></>}
    </div>
  </figure>;
}
