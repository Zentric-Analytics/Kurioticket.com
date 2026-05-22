import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-white shadow-[0_16px_40px_-24px_rgba(30,27,75,0.45)]", className)} {...props} />;
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("border-y border-border bg-white", className)} {...props} />;
}
