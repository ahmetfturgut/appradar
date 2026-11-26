import { Orbit, Trees, Languages, Camera, Wallet, Moon, Check, Activity, BookOpen, Layers, Pencil, Sun } from "lucide-react";
import type { DemoApp } from "../lib/demo-data";

const icons = { orbit: Orbit, tree: Trees, languages: Languages, camera: Camera, wallet: Wallet, moon: Moon, check: Check, activity: Activity, book: BookOpen, layers: Layers, pen: Pencil, sun: Sun };
export function AppIcon({ app, large = false }: { app: DemoApp; large?: boolean }) {
  if (app.live) return <span className={`app-icon app-icon-${app.color} ${large ? "app-icon-large" : ""}`} aria-hidden="true"><span className="app-monogram">{app.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</span></span>;
  const Icon = icons[app.icon];
  return <span className={`app-icon app-icon-${app.color} ${large ? "app-icon-large" : ""}`} aria-hidden="true"><Icon strokeWidth={1.8} /></span>;
}
