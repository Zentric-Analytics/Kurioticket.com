import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-error-text">{error}</span> : null}
    </label>
  );
}

const formControlBaseClass =
  "h-12 md:h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-[16px] text-foreground shadow-sm placeholder:text-muted/70 transition md:text-sm hover:border-muted/60 focus-visible:border-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/25 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted aria-[invalid=true]:border-error-border aria-[invalid=true]:focus-visible:border-error-text aria-[invalid=true]:focus-visible:ring-error-text/25";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(formControlBaseClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(formControlBaseClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        `${formControlBaseClass} min-h-32 py-3 md:py-2.5`,
        className,
      )}
      {...props}
    />
  );
}
