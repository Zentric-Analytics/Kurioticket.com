"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminSectionCard } from "./AdminPageShellHistorical";

const adminButtonVariants = {
  primary: "border border-indigo-700 bg-indigo-700 text-white shadow-sm hover:border-indigo-800 hover:bg-indigo-800",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  destructive: "border border-rose-600 bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700",
};

const adminButtonSizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof adminButtonVariants;
  size?: keyof typeof adminButtonSizes;
  loading?: boolean;
};

export function AdminButton({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }: AdminButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-black transition disabled:cursor-not-allowed disabled:opacity-55",
        adminButtonVariants[variant],
        adminButtonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function AdminLinkButton({ className, variant = "secondary", size = "md", children, ...props }: React.ComponentProps<typeof Link> & { variant?: keyof typeof adminButtonVariants; size?: keyof typeof adminButtonSizes }) {
  return (
    <Link
      className={cn(
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-black transition",
        adminButtonVariants[variant],
        adminButtonSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

const adminControlClass = "focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export function AdminInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(adminControlClass, className)} {...props} />;
}

export function AdminSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(adminControlClass, className)} {...props} />;
}

export function AdminTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(adminControlClass, "min-h-32 py-2 leading-6", className)} {...props} />;
}

export function AdminCheckbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("focus-ring h-4 w-4 rounded border-slate-300 text-indigo-700", className)} {...props} />;
}

export function AdminFilterBar({ children, action, className = "" }: { children: React.ReactNode; action?: string; className?: string }) {
  return (
    <AdminSectionCard className={cn("p-4", className)}>
      <form className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:items-center" action={action}>
        {children}
      </form>
    </AdminSectionCard>
  );
}
