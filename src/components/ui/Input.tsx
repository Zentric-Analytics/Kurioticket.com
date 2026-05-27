import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

const formControlBaseClass =
  "h-12 md:h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] text-slate-900 shadow-sm placeholder:text-slate-400 transition md:text-sm hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus-visible:border-rose-500 aria-[invalid=true]:focus-visible:ring-rose-500/30";

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
