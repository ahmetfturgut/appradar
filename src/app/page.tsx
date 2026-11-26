import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LANDING_LOCALE_COOKIE, landingHref, preferredLandingLocale } from "../lib/landing/locale";

// Stable, shareable locale URLs. First-time visitors default to English.
export default async function LandingEntry() {
  const preference = (await cookies()).get(LANDING_LOCALE_COOKIE)?.value;
  redirect(landingHref(preferredLandingLocale(preference)));
}
