import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { readFile } from "node:fs/promises";
import { DEFAULT_THEME_PREFERENCE, THEME_ATTRIBUTE, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, parseThemePreference, resolveTheme } from "../src/lib/ui/theme.ts";

/** Executes the real pre-paint script with a stub document, storage and media query. */
function runInitScript({ stored, systemDark, storageThrows = false, mediaThrows = false }: { stored?: string | null; systemDark: boolean; storageThrows?: boolean; mediaThrows?: boolean }) {
  const attributes: Record<string, string> = {};
  runInNewContext(THEME_INIT_SCRIPT, {
    document: { documentElement: { setAttribute: (name: string, value: string) => { attributes[name] = value; } } },
    localStorage: { getItem: (key: string) => { if (storageThrows) throw new Error("blocked"); return key === THEME_STORAGE_KEY ? stored ?? null : null; } },
    window: { matchMedia: () => { if (mediaThrows) throw new Error("unsupported"); return { matches: systemDark }; } },
  });
  return attributes[THEME_ATTRIBUTE];
}

test("preference parsing defaults new users to dark and rejects unknown values", () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, "dark");
  for (const value of ["light", "dark", "system"] as const) assert.equal(parseThemePreference(value), value);
  for (const value of [null, undefined, "", "auto", "DARK", 1]) assert.equal(parseThemePreference(value), "dark");
});

test("system preference follows the operating system; explicit choices ignore it", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("pre-paint script resolves the same theme as the client store", () => {
  assert.equal(runInitScript({ stored: null, systemDark: false }), "dark");
  assert.equal(runInitScript({ stored: "light", systemDark: true }), "light");
  assert.equal(runInitScript({ stored: "dark", systemDark: false }), "dark");
  assert.equal(runInitScript({ stored: "system", systemDark: true }), "dark");
  assert.equal(runInitScript({ stored: "system", systemDark: false }), "light");
  assert.equal(runInitScript({ stored: "bogus", systemDark: false }), "dark");
  assert.equal(runInitScript({ systemDark: false, storageThrows: true }), "dark");
  assert.equal(runInitScript({ stored: "system", systemDark: false, mediaThrows: true }), "dark");
});

test("dark tokens and theme-aware overrides stay scoped to the product shell", async () => {
  const css = await readFile("src/app/globals.css", "utf8");
  assert.match(css, /:root\[data-app-theme="dark"\]:has\(\.product-shell\)\{/);
  // No unconditional dark block: every --background override for the app requires the dark attribute.
  const appBlocks = [...css.matchAll(/(:root[^{]*:has\(\.product-shell\))\{([^}]*)\}/g)];
  for (const [, selector, body] of appBlocks) if (/--background:/.test(body!)) assert.match(selector!, /data-app-theme="dark"/);
});
