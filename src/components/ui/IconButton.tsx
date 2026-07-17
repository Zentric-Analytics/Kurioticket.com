import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type IconButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type IconButtonSize = "sm" | "md" | "lg";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const iconButtonVariants: Record<IconButtonVariant, string> = {
  primary: "border-blue bg-blue text-surface hover:bg-navy active:bg-navy",
  secondary: "border-border bg-surface text-navy hover:bg-surface-subtle active:bg-surface-muted",
  ghost: "border-transparent bg-transparent text-navy hover:bg-surface-subtle active:bg-surface-muted",
  danger: "border-danger bg-danger text-surface hover:bg-danger-hover active:bg-danger-hover",
};

const iconButtonSizes: Record<IconButtonSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

export function IconButton({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        iconButtonVariants[variant],
        iconButtonSizes[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
