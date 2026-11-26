"use client";
/**
 * Local implementation of the `useEntrance` helper imported by the 21st.dev Bar Chart
 * (https://21st.dev/@kevingirelli/components/bar-chart). The helper's source was not part of the
 * MCP retrieval, so this reproduces the contract the chart relies on:
 *   const [observe, phase] = useEntrance<T>({ play?: boolean })
 *   - `observe(node)` registers the element to watch (callback ref).
 *   - `phase` is "armed" (hidden, waiting), "play" (entering) or "static" (shown, no motion).
 * `play: true` skips the entrance entirely; reduced-motion users always get "static".
 */
import { useCallback, useEffect, useState } from "react";

export type EntrancePhase = "armed" | "play" | "static";

export function useEntrance<T extends Element>({ play }: { play?: boolean | undefined } = {}): [(node: T | null) => void, EntrancePhase] {
  const [node, setNode] = useState<T | null>(null);
  const [phase, setPhase] = useState<EntrancePhase>(play ? "static" : "armed");
  const observe = useCallback((next: T | null) => setNode(next), []);

  useEffect(() => {
    if (play || phase !== "armed") return;
    // After mount only: browsers without IntersectionObserver skip the entrance.
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setPhase("static"));
      return () => cancelAnimationFrame(frame);
    }
    if (!node) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setPhase(reduced ? "static" : "play");
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, phase, play]);

  // First paint matches the server ("armed" unless play is forced). No window checks here.
  return [observe, play ? "static" : phase];
}
