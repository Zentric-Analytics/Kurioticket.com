import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
type BadgeSize = "sm" | "md";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const badgeVariants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-surface-muted text-navy",
  brand: "border-blue/25 bg-status-surface text-blue",
  success: "border-success-border bg-success-surface text-success-text",
  warning: "border-amber/30 bg-surface-subtle text-amber",
  danger: "border-error-border bg-error-surface text-danger",
  info: "border-status-border bg-status-surface text-status-text",
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({ className, variant = "neutral", size = "sm", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none whitespace-nowrap",
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
      {...props}
    />
  );
}
