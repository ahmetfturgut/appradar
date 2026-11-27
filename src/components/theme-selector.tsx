"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../lib/utils";
import type { ThemePreference } from "../lib/ui/theme";
import { setThemePreference, useThemePreference } from "../lib/ui/use-theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Appearance control. `compact` (header) shows icons with accessible names; `full` (Account) shows labels. */
export function ThemeSelector({ variant = "compact", className }: { variant?: "compact" | "full"; className?: string }) {
  const preference = useThemePreference();
  const compact = variant === "compact";
  return <div role="group" aria-label="Theme" className={cn("inline-flex items-center gap-0.5 rounded-md border bg-card p-0.5", className)}>
    {OPTIONS.map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={preference === value}
      aria-label={compact ? `${label} theme` : undefined} title={compact ? `${label} theme` : undefined}
      onClick={() => setThemePreference(value)}
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-[5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none",
        compact ? "size-7" : "h-8 px-3 text-sm font-medium",
        preference === value && "bg-accent text-foreground shadow-[inset_0_0_0_1px_var(--input)] hover:bg-accent")}>
      <Icon className={compact ? "size-3.5" : "size-4"} aria-hidden="true" />{!compact && label}
    </button>)}
  </div>;
}
