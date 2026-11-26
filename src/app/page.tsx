import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Compass, History, LayoutGrid, Lightbulb, Radar, Rocket, Users } from "lucide-react";
import { ProductPreview } from "../components/landing/product-preview";
import { getViewer } from "../lib/auth/server";

export const metadata: Metadata = {
  title: { absolute: "AppRadar · Discover your next great app idea" },
  description: "Explore the app market, uncover trends and understand your competition, all in one place.",
};

// Only capabilities that exist in the product today (Dashboard, App Explorer, App Details).
const features = [
  { icon: Compass, title: "App Discovery", text: "Search stored App Store and Google Play listings, then filter by country, requested language, store, category and price. Sort by rating, rating count or release date." },
  { icon: LayoutGrid, title: "Market Research", text: "See how listings spread across categories, which apps were released recently and how coverage splits between stores, in the market you select." },
  { icon: History, title: "Historical Metrics", text: "Follow an app’s rating and rating count across stored observations, each with its observation date and source context." },
  { icon: ChartNoAxesCombined, title: "App Rankings", text: "Compare chart positions between two comparable snapshots to spot which apps are climbing or falling." },
];
const audiences = [
  { icon: Lightbulb, title: "Indie developers", text: "Validate an idea against real listings before you spend months building it." },
  { icon: Rocket, title: "App founders", text: "Understand the category you compete in and keep an eye on new entrants." },
  { icon: Users, title: "Product teams", text: "Share a common, sourced view of the market when planning what to build next." },
];

const primary = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const secondary = "inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function LandingPage() {
  const viewer = await getViewer();
  const signedIn = viewer.kind === "user";
  return <div className="min-h-screen bg-background text-foreground">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-[-0.02em]"><span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground"><Radar className="size-4" strokeWidth={2.2} /></span>AppRadar</Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="#features" className="hidden h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">Features</a>
          {signedIn ? <Link href="/dashboard" className={`${primary} h-9`}>Open dashboard</Link> : <>
            <Link href="/login" className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted">Sign in</Link>
            <Link href="/signup" className={`${primary} h-9`}>Get started</Link>
          </>}
        </div>
      </nav>
    </header>

    <main id="main">
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-4xl leading-[1.1] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[56px]">Discover your next great app idea.</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">Explore the app market, uncover trends and understand your competition — all in one place.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {signedIn ? <Link href="/dashboard" className={primary}>Open dashboard <ArrowRight className="size-4" /></Link> : <Link href="/signup" className={primary}>Get started <ArrowRight className="size-4" /></Link>}
          <a href="#features" className={secondary}>Explore features</a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Built on stored, sourced store observations. No download or revenue estimates.</p>
      </section>

      <section aria-label="Product preview" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6"><ProductPreview /></section>

      <section id="features" className="scroll-mt-20 border-t bg-muted py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em]">Everything you need to research a market</h2>
            <p className="mt-3 text-muted-foreground">Four tools that work on the same stored catalog, so every number keeps its store, country, language and observation date.</p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">{features.map(feature => <li key={feature.title} className="rounded-xl border bg-card p-6 shadow-xs">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground"><feature.icon className="size-[18px]" aria-hidden="true" /></span>
            <h3 className="mt-4 text-base font-semibold tracking-[-0.01em]">{feature.title}</h3>
            <p className="mt-2 text-sm/relaxed text-muted-foreground">{feature.text}</p>
          </li>)}</ul>
          <p className="mt-6 text-sm text-muted-foreground">Missing values are shown as “Not available”, never as zero. Coverage is limited to collected observations.</p>
        </div>
      </section>

      <section aria-labelledby="audience-title" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="audience-title" className="text-3xl font-semibold tracking-[-0.03em]">Made for people who build apps</h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">{audiences.map(audience => <li key={audience.title}>
            <audience.icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold">{audience.title}</h3>
            <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{audience.text}</p>
          </li>)}</ul>
        </div>
      </section>

      <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-muted px-6 py-12 text-center sm:py-16">
          <h2 id="cta-title" className="text-3xl font-semibold tracking-[-0.03em]">Start researching your next app</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">Create an account to explore the catalog, compare apps and follow the market.</p>
          <div className="mt-8 flex justify-center">{signedIn ? <Link href="/dashboard" className={primary}>Open dashboard <ArrowRight className="size-4" /></Link> : <Link href="/signup" className={primary}>Create your account <ArrowRight className="size-4" /></Link>}</div>
        </div>
      </section>
    </main>

    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="flex items-center gap-2 font-medium text-foreground"><Radar className="size-4 text-primary" aria-hidden="true" />AppRadar</span>
        {/* Launch blocker: Privacy, Terms and Contact content has not been written or approved yet. */}
        <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal and contact (pending)">
          {["Privacy", "Terms", "Contact"].map(item => <li key={item}><span aria-disabled="true" title="Not yet published">{item} <span className="text-xs">(coming soon)</span></span></li>)}
        </ul>
      </div>
    </footer>
  </div>;
}
