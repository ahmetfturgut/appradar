"use client";
import { useState } from "react";
import { Orbit, Trees, Languages, Camera, Wallet, Moon, Check, Activity, BookOpen, Layers, Pencil, Sun } from "lucide-react";
import type { DemoApp } from "../lib/demo-data";

const icons = { orbit: Orbit, tree: Trees, languages: Languages, camera: Camera, wallet: Wallet, moon: Moon, check: Check, activity: Activity, book: BookOpen, layers: Layers, pen: Pencil, sun: Sun };
export function AppIcon({ app, large = false }: { app: Pick<DemoApp, "name" | "icon" | "color" | "live"> & { iconUrl?: string | null; placeholder?: boolean }; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Read services withhold store media when its feature flag is disabled.
  if (app.iconUrl && app.iconUrl !== failedUrl) return <span className={`app-icon ${large ? "app-icon-large" : ""}`} aria-hidden="true"><img src={app.iconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(app.iconUrl ?? null)} /></span>;
  if (app.live || app.placeholder) return <span className={`app-icon app-icon-${app.color} ${large ? "app-icon-large" : ""}`} aria-hidden="true"><span className="app-monogram">{app.name.slice(0, 1).toLocaleUpperCase("en-US")}</span></span>;
  const Icon = icons[app.icon];
  return <span className={`app-icon app-icon-${app.color} ${large ? "app-icon-large" : ""}`} aria-hidden="true"><Icon strokeWidth={1.8} /></span>;
}
