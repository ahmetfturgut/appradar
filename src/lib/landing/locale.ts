/** Public-site locale only. Never read or write app-store country/language filters. */
export const LANDING_LOCALE_COOKIE = "appradar_landing_locale";
export const LANDING_LOCALE_HEADER = "x-appradar-landing-locale";
export const landingLocales = ["en", "tr"] as const;
export type LandingLocale = typeof landingLocales[number];
export const isLandingLocale = (value: unknown): value is LandingLocale => value === "en" || value === "tr";
export const landingLocaleFromPath = (path: string): LandingLocale | null => path === "/en" ? "en" : path === "/tr" ? "tr" : null;
export const preferredLandingLocale = (cookie: unknown): LandingLocale => isLandingLocale(cookie) ? cookie : "en";
export const landingHref = (locale: LandingLocale) => `/${locale}`;
