"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { THEME_INIT_SCRIPT } from "../lib/ui/theme";

/**
 * Emits the pre-paint appearance script into the initial HTML only (Next.js "preventing flash before
 * hydration" guide, Themes). React never renders the <script> on the client, so there is no script-tag
 * warning; the attribute it sets on <html> persists across client-side navigations.
 */
export function ThemeScript() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
  });
  return null;
}
