import { notFound } from "next/navigation";
import { LegalPage } from "../../../components/landing/legal-page";
import { getViewer } from "../../../lib/auth/server";
import { isLegalDocument } from "../../../lib/landing/legal";
import { isLandingLocale } from "../../../lib/landing/locale";
import { legalMetadata } from "../../../lib/landing/metadata";

type Props = { params: Promise<{ locale: string; document: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, document } = await params;
  if (!isLandingLocale(locale) || !isLegalDocument(document)) notFound();
  return legalMetadata(locale, document);
}
export default async function LegalDocumentPage({ params }: Props) {
  const { locale, document } = await params;
  if (!isLandingLocale(locale) || !isLegalDocument(document)) notFound();
  const viewer = await getViewer();
  return <LegalPage locale={locale} document={document} signedIn={viewer.kind === "user"} />;
}
