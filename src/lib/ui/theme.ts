/**
 * Application appearance (Design System V2). Pure helpers shared by the pre-paint inline script,
 * the client store and tests. The preference lives only in localStorage; nothing is sent to a server.
 * Landing and auth pages stay light: the dark tokens apply only to documents rendering `.product-shell`.
 */
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "dark", "system"];
export const THEME_STORAGE_KEY = "appradar-theme";
/** New users (no stored preference) get the dark application theme. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";
export const THEME_ATTRIBUTE = "data-app-theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
/** Same-tab change notification (the `storage` event only fires in other tabs). */
export const THEME_CHANGE_EVENT = "appradar-theme-change";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemPrefersDark ? "dark" : "light") : preference;
}

/**
 * Runs synchronously in <head> before first paint (hard loads and refreshes). Mirrors
 * parseThemePreference + resolveTheme; falls back to the default if storage is unavailable.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement,p;try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(p!=="light"&&p!=="dark"&&p!=="system")p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};var k=p;if(p==="system"){try{k=window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light"}catch(e){k=${JSON.stringify(DEFAULT_THEME_PREFERENCE)}}}d.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},k)})()`;
