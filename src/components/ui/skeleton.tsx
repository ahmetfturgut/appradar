/**
 * Skeleton — adapted from shadcn/ui "Skeleton" (MIT).
 * 21st.dev listing: https://21st.dev/@shadcn/components/skeleton
 * Upstream source: https://ui.shadcn.com/docs/components/skeleton
 * Changes: uses the neutral `muted` token (the AppRadar `accent` token is tinted);
 * the pulse is disabled under prefers-reduced-motion.
 */
import * as React from "react";
import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} {...props} />;
}

export { Skeleton };
