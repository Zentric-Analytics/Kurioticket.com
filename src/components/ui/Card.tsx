import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "flat" | "subtle" | "elevated";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const cardVariants: Record<CardVariant, string> = {
  default: "rounded-2xl border border-border bg-surface-raised shadow-[0_16px_40px_-24px_rgba(2,28,43,0.36)]",
  flat: "rounded-2xl border border-border bg-surface shadow-none",
  subtle: "rounded-2xl border border-border bg-surface-subtle shadow-none",
  elevated: "rounded-2xl border border-border bg-surface-raised shadow-[0_20px_48px_-20px_rgba(2,28,43,0.42)]",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return <div className={cn(cardVariants[variant], className)} {...props} />;
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("border-y border-border bg-surface", className)} {...props} />;
}
