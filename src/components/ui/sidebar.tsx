/**
 * Sidebar primitives — adapted from shadcn/ui "Sidebar" (MIT).
 * 21st.dev listing: https://21st.dev/@shadcn/components/sidebar
 * Upstream source: https://ui.shadcn.com/docs/components/sidebar
 *
 * Kept: the slot structure (header / content / group / group label / menu / menu item /
 * menu button / footer), `data-slot` + `data-sidebar` attributes, the cva menu-button
 * variants and the sidebar-* colour tokens.
 * Changes: the provider, Sheet, Tooltip, collapsible-icon mode and cookie state were
 * removed, so no new radix-ui packages are required. The mobile drawer stays in
 * `components/shell.tsx`, which already handles focus return, Escape and `inert`.
 * Menu buttons use a 36px height for comfortable targets.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn("flex flex-col gap-2 p-3", className)} {...props} />;
}
function SidebarSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="separator" data-slot="sidebar-separator" data-sidebar="separator" className={cn("mx-3 h-px w-auto shrink-0 bg-sidebar-border", className)} {...props} />;
}
function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-content" data-sidebar="content" className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-auto", className)} {...props} />;
}
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col px-3 py-2", className)} {...props} />;
}
function SidebarGroupLabel({ className, asChild = false, ...props }: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return <Comp data-slot="sidebar-group-label" data-sidebar="group-label" className={cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-hidden ring-sidebar-ring focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", className)} {...props} />;
}
function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}
function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md px-2 text-left text-sm text-sidebar-foreground outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-sidebar-primary",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-card shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: { default: "h-9", sm: "h-7 text-xs", lg: "h-12" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function SidebarMenuButton({ asChild = false, isActive = false, variant, size, className, ...props }: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="sidebar-menu-button" data-sidebar="menu-button" data-size={size} data-active={isActive} className={cn(sidebarMenuButtonVariants({ variant, size }), className)} {...props} />;
}

export { SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, sidebarMenuButtonVariants };
