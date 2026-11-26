import { notFound } from "next/navigation";
import { LandingPage } from "../../components/landing/landing-page";
import { getViewer } from "../../lib/auth/server";
import { isLandingLocale } from "../../lib/landing/locale";
import { landingMetadata } from "../../lib/landing/metadata";

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  return landingMetadata(locale);
}
export default async function LocalizedLandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLandingLocale(locale)) notFound();
  const viewer = await getViewer();
  return <LandingPage locale={locale} signedIn={viewer.kind === "user"} />;
}
