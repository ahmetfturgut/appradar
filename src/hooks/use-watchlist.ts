"use client";

import { useSyncExternalStore, useMemo } from "react";
import { type Country } from "../lib/demo-data";

const key = "appradar:watchlist:v1";
const legacyKey = "appradar:demo:watchlist:v1";
const event = "appradar:watchlist-change";
let memory = "[]";
let storageAvailable = true;
function snapshot() {
  if (!storageAvailable) return memory;
  try { return window.localStorage.getItem(key) ?? window.localStorage.getItem(legacyKey) ?? "[]"; }
  catch { storageAvailable = false; return memory; }
}
function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === key || e.key === legacyKey || e.key === null) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(event, callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(event, callback); };
}
function parse(value: string): string[] {
  try {
    const data: unknown = JSON.parse(value);
    return Array.isArray(data) ? [...new Set(data.filter((s): s is string => typeof s === "string" && /^(?:demo-\d+-(?:ios|play)|live-(?:ios|play)-[A-Za-z0-9._-]+):(TR|US)$/.test(s)))] : [];
  } catch { return []; }
}
function write(value: string[]) {
  memory = JSON.stringify(value);
  try { window.localStorage.setItem(key, memory); } catch { storageAvailable = false; }
  window.dispatchEvent(new Event(event));
}
export function useWatchlist() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const items = useMemo(() => parse(raw), [raw]);
  return {
    items,
    isSaved: (id: string, country: Country) => items.includes(`${id}:${country}`),
    toggle: (id: string, country: Country) => {
      const current = parse(snapshot());
      const target = `${id}:${country}`;
      write(current.includes(target) ? current.filter(v => v !== target) : [...current, target]);
    },
    clear: () => write([]),
    temporary: !storageAvailable,
  };
}
