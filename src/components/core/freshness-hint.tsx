"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CircleHelp, Clock } from "lucide-react";

/**
 * Compact per-metric freshness indicator for data tables. Replaces the repeated inline "Stale · date" /
 * "Freshness unknown" lines with an icon whose accessible name carries the status; the tooltip adds the
 * exact observation time. Opens on hover, keyboard focus and tap; closes on Escape, blur, outside tap,
 * scroll and resize. The tooltip stays open while hovered (WCAG 1.4.13) and uses fixed positioning so
 * scrollable table containers never clip it.
 */
export function FreshnessHint({ kind, label, detail }: { kind: "stale" | "unknown"; label: string; detail: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const cancelHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const show = useCallback(() => {
    cancelHide();
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 6, left: Math.min(Math.max(rect.left + rect.width / 2, 136), window.innerWidth - 136) });
  }, []);
  const hide = useCallback(() => { cancelHide(); setPosition(null); }, []);
  const hideSoon = () => { cancelHide(); hideTimer.current = setTimeout(() => setPosition(null), 120); };

  const open = position !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    const onPointer = (event: PointerEvent) => { if (!button.current?.contains(event.target as Node)) hide(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);
  useEffect(() => cancelHide, []);

  const Icon = kind === "stale" ? Clock : CircleHelp;
  return <>
    <button ref={button} type="button" aria-label={label} aria-describedby={open ? id : undefined} data-freshness={kind}
      onMouseEnter={show} onMouseLeave={hideSoon} onFocus={show} onBlur={hide} onClick={show}
      className={`inline-grid size-6 shrink-0 place-items-center rounded-md hover:bg-muted ${kind === "stale" ? "text-warning" : "text-muted-foreground"}`}>
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
    {position && <span role="tooltip" id={id} onMouseEnter={cancelHide} onMouseLeave={hideSoon}
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 w-max max-w-64 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-left text-xs leading-relaxed font-normal whitespace-normal text-popover-foreground shadow-md">
      <strong className={`block font-medium ${kind === "stale" ? "text-warning" : "text-foreground"}`}>{label}</strong>{detail}
    </span>}
  </>;
}
