import { ArrowRight, ChartNoAxesCombined, Check, Compass, FileSearch, Globe2, History, LayoutGrid, Lightbulb, Plus, Radar, Rocket, Users } from "lucide-react";
import Link from "next/link";
import { dictionaries } from "../../lib/landing/dictionaries";
import { type LandingLocale } from "../../lib/landing/locale";
import { ProductPreview } from "./product-preview";
import { LandingLocaleSync } from "./locale-sync";
import { PublicFooter, PublicHeader } from "./public-chrome";

const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-card px-5 py-2.5 text-sm font-medium text-foreground shadow-xs hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const container = "mx-auto max-w-6xl px-5 sm:px-8";
const eyebrow = "mb-4 text-xs font-semibold tracking-[0.12em] text-primary uppercase";
const heading = "text-3xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl";
const featureIcons = [Compass, Globe2, ChartNoAxesCombined, History, LayoutGrid, FileSearch];
const audienceIcons = [Lightbulb, Rocket, Users];

/** Only public copy and a local illustration. Authentication is supplied by the existing page guard. */
export function LandingPage({ locale, signedIn }: { locale: LandingLocale; signedIn: boolean }) {
  const t = dictionaries[locale];
  const ctaHref = signedIn ? "/dashboard" : "/signup";
  const ctaLabel = signedIn ? t.nav.dashboard : t.nav.getStarted;
  return <div className="min-h-screen bg-background text-foreground">
    <LandingLocaleSync locale={locale} />
    <a className="skip-link" href="#main">{t.skip}</a>
    <PublicHeader locale={locale} signedIn={signedIn} />
    <main id="main">
      <section className={`${container} pt-16 pb-10 text-center sm:pt-24 sm:pb-14`}>
        <p className={eyebrow}>{t.hero.eyebrow}</p>
        <h1 className="mx-auto max-w-4xl text-[2.5rem] leading-[1.1] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4rem]">{t.hero.title}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base/relaxed text-pretty text-muted-foreground sm:text-lg/relaxed">{t.hero.description}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 min-[420px]:flex-row min-[420px]:items-center"><Link href={ctaHref} prefetch={false} className={primary}>{ctaLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link><a href="#how-it-works" className={secondary}>{t.hero.secondary}</a></div>
        <p className="mx-auto mt-5 max-w-xl text-xs/relaxed text-muted-foreground">{t.hero.note}</p>
      </section>
      <section aria-label={t.preview.region} className={`${container} pb-20 sm:pb-28`}><ProductPreview text={t.preview} locale={locale} /></section>

      <section aria-labelledby="problem-title" className="border-y bg-muted py-16 sm:py-24"><div className={`${container} grid gap-12 lg:grid-cols-2 lg:gap-20`}>
        <div><p className={eyebrow}>{t.problem.eyebrow}</p><h2 id="problem-title" className={heading}>{t.problem.title}</h2><p className="mt-5 text-base/relaxed text-muted-foreground">{t.problem.description}</p><ul aria-label={t.problem.challengesLabel} className="mt-6 space-y-3 text-sm/relaxed">{t.problem.challenges.map(text => <li key={text} className="flex gap-3"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />{text}</li>)}</ul></div>
        <div className="self-center border-l-2 border-primary pl-6 sm:pl-8"><span className="mb-5 grid size-10 place-items-center rounded-lg border bg-card text-primary"><Radar className="size-5" aria-hidden="true" /></span><h3 className="text-2xl leading-tight font-semibold tracking-tight text-balance">{t.problem.solutionTitle}</h3><p className="mt-4 text-base/relaxed text-muted-foreground">{t.problem.solution}</p><p className="mt-6 text-sm/relaxed text-muted-foreground">{t.problem.note}</p></div>
      </div></section>

      <section id="features" aria-labelledby="features-title" className="scroll-mt-36 py-16 sm:scroll-mt-24 sm:py-24"><div className={container}>
        <div className="max-w-3xl"><p className={eyebrow}>{t.features.eyebrow}</p><h2 id="features-title" className={heading}>{t.features.title}</h2><p className="mt-5 text-base/relaxed text-muted-foreground">{t.features.description}</p></div>
        <ul className="mt-8 grid gap-x-14 sm:grid-cols-2 lg:gap-x-20">{t.features.items.map((item, i) => { const Icon = featureIcons[i]!; return <li key={item.title} className="flex gap-4 border-b py-7"><Icon className="mt-1 size-5 text-primary" aria-hidden="true" /><div><h3 className="text-base font-semibold tracking-tight">{item.title}</h3><p className="mt-2 text-sm/relaxed text-muted-foreground">{item.text}</p></div></li>; })}</ul>
        <p className="mt-7 max-w-4xl text-xs/relaxed text-muted-foreground">{t.features.availability}</p>
      </div></section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-36 border-y bg-muted py-16 sm:scroll-mt-24 sm:py-24"><div className={container}><p className={eyebrow}>{t.how.eyebrow}</p><h2 id="how-title" className={`${heading} max-w-3xl`}>{t.how.title}</h2><ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">{t.how.items.map((item, i) => <li key={item.title} className="border-t pt-5"><span className="text-sm font-medium tabular-nums text-primary" aria-hidden="true">0{i + 1}</span><h3 className="mt-4 text-lg font-semibold tracking-tight">{item.title}</h3><p className="mt-3 text-sm/relaxed text-muted-foreground">{item.text}</p></li>)}</ol></div></section>

      <section aria-labelledby="use-cases-title" className="py-16 sm:py-24"><div className={`${container} grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20`}><div><p className={eyebrow}>{t.useCases.eyebrow}</p><h2 id="use-cases-title" className={heading}>{t.useCases.title}</h2><p className="mt-5 text-base/relaxed text-muted-foreground">{t.useCases.description}</p></div><ul className="divide-y border-y">{t.useCases.questions.map(question => <li key={question} className="flex items-start gap-3 py-5 text-sm/relaxed"><Check className="mt-1 size-4 text-primary" aria-hidden="true" />{question}</li>)}</ul></div></section>

      <section aria-labelledby="audience-title" className="border-t py-16 sm:py-20"><div className={container}><h2 id="audience-title" className={heading}>{t.audience.title}</h2><ul className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">{t.audience.items.map((item, i) => { const Icon = audienceIcons[i]!; return <li key={item.title}><Icon className="size-5 text-primary" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm/relaxed text-muted-foreground">{item.text}</p></li>; })}</ul></div></section>

      <section aria-labelledby="faq-title" className="border-t bg-muted py-16 sm:py-24"><div className={`${container} grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20`}><div><h2 id="faq-title" className={heading}>{t.faq.title}</h2><p className="mt-4 text-sm/relaxed text-muted-foreground">{t.faq.description}</p></div><div className="divide-y border-y">{t.faq.items.map(item => <details key={item.question} className="group py-1"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-sm py-5 text-sm/relaxed font-medium [&::-webkit-details-marker]:hidden">{item.question}<Plus className="size-4 shrink-0 text-muted-foreground group-open:rotate-45" aria-hidden="true" /></summary><p className="pb-5 pr-6 text-sm/relaxed text-muted-foreground">{item.answer}</p></details>)}</div></div></section>

      <section aria-labelledby="cta-title" className={`${container} py-16 text-center sm:py-24`}><h2 id="cta-title" className={`${heading} mx-auto max-w-2xl`}>{t.cta.title}</h2><p className="mx-auto mt-5 max-w-xl text-base/relaxed text-muted-foreground">{t.cta.description}</p><div className="mt-8 flex justify-center"><Link href={ctaHref} prefetch={false} className={primary}>{signedIn ? t.nav.dashboard : t.cta.button}<ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
    </main>
    <PublicFooter locale={locale} />
  </div>;
}
