"use client";
import { useLayoutEffect } from "react";
import type { LandingLocale } from "../../lib/landing/locale";

/** SSR sets the same lang via the proxy header. Also cover soft navigation from auth pages. */
export function LandingLocaleSync({ locale }: { locale: LandingLocale }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = "en"; };
  }, [locale]);
  return null;
}
