/**
 * Card — adapted from shadcn/ui "Card" (MIT).
 * 21st.dev listing: https://21st.dev/@shadcn/components/card
 * Upstream source: https://ui.shadcn.com/docs/components/card
 * Changes: compact AppRadar spacing (gap-0, px-5), no default shadow beyond `shadow-xs`,
 * relative `cn` import, plain `div` titles so legacy heading rules never apply.
 */
import * as React from "react";
import { cn } from "../../lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-xs", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-header" className={cn("grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-5 pt-5 pb-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-title" className={cn("text-[15px] leading-tight font-semibold tracking-[-0.01em]", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-xs/relaxed text-muted-foreground", className)} {...props} />;
}
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-5", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center px-5 py-3 text-xs text-muted-foreground [.border-t]:pt-3", className)} {...props} />;
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
