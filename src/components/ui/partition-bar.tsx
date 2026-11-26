/**
 * PartitionBar — adapted from 8starlabs UI "Partition Bar" (MIT, https://github.com/8starlabs/ui/blob/main/LICENSE.md).
 * 21st.dev listing: https://21st.dev/@8starlabs/components/partition-bar
 * Upstream source: https://ui.8starlabs.com/r/partition-bar.json
 * Kept: context-computed total, proportional `flex-basis` segments, cva variants, title/value slots.
 * Changes: AppRadar chart tokens instead of primary opacities and `text-slate-500`,
 * list semantics with an accessible label, optional hidden captions (for a legend
 * rendered elsewhere), zero-total guard, named export only.
 */
"use client";

import { Children, createContext, isValidElement, useContext, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const partitionBarVariants = cva("flex w-full flex-row", {
  variants: { size: { sm: "text-xs", md: "text-sm", lg: "text-base" } },
  defaultVariants: { size: "md" },
});
const lineVariants = cva("", {
  variants: {
    variant: { "chart-1": "bg-chart-1", "chart-2": "bg-chart-2", "chart-3": "bg-chart-3", "chart-4": "bg-chart-4", "chart-5": "bg-chart-5", muted: "bg-chart-track" },
  },
  defaultVariants: { variant: "chart-1" },
});

type Context = { total: number; size: VariantProps<typeof partitionBarVariants>["size"]; captions: boolean };
const PartitionBarContext = createContext<Context | null>(null);
function usePartitionBar() {
  const context = useContext(PartitionBarContext);
  if (!context) throw new Error("PartitionBarSegment must be used within PartitionBar");
  return context;
}

interface PartitionBarProps extends HTMLAttributes<HTMLUListElement>, VariantProps<typeof partitionBarVariants> {
  children?: ReactNode;
  gap?: number;
  /** Render segment captions under each bar. Disable when a separate legend labels the segments. */
  captions?: boolean;
}
export function PartitionBar({ children, className, gap = 1, size, captions = true, ...props }: PartitionBarProps) {
  const total = Children.toArray(children).reduce<number>((sum, child) => isValidElement(child) ? sum + (((child.props as PartitionBarSegmentProps).num) || 0) : sum, 0);
  return <PartitionBarContext.Provider value={{ total, size, captions }}>
    <ul className={cn(partitionBarVariants({ size }), className)} style={{ gap: `${gap * 4}px` }} {...props}>{children}</ul>
  </PartitionBarContext.Provider>;
}

interface PartitionBarSegmentProps extends HTMLAttributes<HTMLLIElement>, VariantProps<typeof lineVariants> {
  children?: ReactNode;
  num?: number;
  alignment?: "left" | "center" | "right";
}
export function PartitionBarSegment({ children, num = 0, variant, alignment = "left", className, ...props }: PartitionBarSegmentProps) {
  const { total, size, captions } = usePartitionBar();
  const width = total > 0 ? (num / total) * 100 : 0;
  if (width <= 0) return null;
  return <li className="flex min-w-0 flex-col" style={{ flexBasis: `${width}%`, flexGrow: 0, flexShrink: 1 }} {...props}>
    <div className={cn(lineVariants({ variant }), "w-full shrink-0 rounded-full", size === "sm" ? "h-2" : size === "lg" ? "h-4" : "h-2.5", className)} />
    {captions ? <div className={cn("flex w-full flex-col whitespace-normal", size === "sm" ? "mt-2" : "mt-3", alignment === "center" && "items-center", alignment === "right" && "items-end")}>{children}</div> : children ? <span className="sr-only">{children}</span> : null}
  </li>;
}
export function PartitionBarSegmentTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-fit font-medium text-foreground", className)}>{children}</div>;
}
export function PartitionBarSegmentValue({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-fit text-[85%] text-muted-foreground tabular-nums", className)}>{children}</div>;
}
