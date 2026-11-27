"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, DEFAULT_THEME_PREFERENCE, THEME_ATTRIBUTE, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, parseThemePreference, resolveTheme, type ThemePreference } from "./theme";

function readPreference(): ThemePreference {
  try { return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)); } catch { return DEFAULT_THEME_PREFERENCE; }
}

function systemPrefersDark(): boolean {
  try { return window.matchMedia(DARK_QUERY).matches; } catch { return false; }
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, resolveTheme(preference, systemPrefersDark()));
}

/** One store for every control: header selector and Account preference stay synchronised. */
function subscribe(onChange: () => void) {
  const update = () => { applyTheme(readPreference()); onChange(); };
  const onStorage = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) update(); };
  let media: MediaQueryList | null = null;
  try { media = window.matchMedia(DARK_QUERY); } catch { media = null; }
  media?.addEventListener("change", update); // live OS changes while "system" is selected
  window.addEventListener("storage", onStorage); // other tabs
  window.addEventListener(THEME_CHANGE_EVENT, update); // this tab
  return () => {
    media?.removeEventListener("change", update);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, update);
  };
}

export function setThemePreference(preference: ThemePreference) {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, preference); } catch { /* storage unavailable: apply for this page only */ }
  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * Server snapshot is the default preference, so the first client render matches the HTML; React then
 * re-renders with the stored value without a hydration mismatch. The document theme itself is already
 * correct before paint (inline script), so only the control's pressed state can update after hydration.
 */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => DEFAULT_THEME_PREFERENCE);
}
