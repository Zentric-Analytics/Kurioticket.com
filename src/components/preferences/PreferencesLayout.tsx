import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";

type StatusTone = "info" | "success" | "error";

export function PreferencesPageShell({
  title,
  description,
  children,
  className,
  ...props
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={clsx("flex-1 bg-[#f3f7fc] pb-12 pt-0", className)}
      {...props}
    >
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <AccountBackLink />

        <header className="mt-6 max-w-[56rem]">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            {description}
          </p>
        </header>

        <section className="mt-7 max-w-[56rem]">{children}</section>
      </div>
    </main>
  );
}

export function PreferencesCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "-mx-4 rounded-none border border-slate-300 bg-white/45 px-4 py-5 shadow-sm sm:mx-0 sm:rounded-2xl sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PreferencesSection({
  title,
  description,
  children,
  bordered = false,
  id,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  bordered?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={clsx(
        bordered && "mt-6 border-t border-slate-300 pt-6",
        className,
      )}
      aria-labelledby={id}
    >
      <div>
        <h3
          id={id}
          className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">
            {description}
          </p>
        ) : null}
      </div>
      <div className={clsx("mt-3", contentClassName)}>{children}</div>
    </section>
  );
}

export function PreferencesStatus({
  message,
  tone = "info",
}: {
  message?: string;
  tone?: StatusTone;
}) {
  if (!message) return null;

  return (
    <p
      className={clsx(
        "inline-flex rounded-full border px-3 py-1.5 text-sm font-medium",
        tone === "error"
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-blue-100 bg-blue-50 text-[#004BB8]",
      )}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

export function PreferencesActions({
  statusMessage,
  statusTone = "info",
  children,
  className,
}: {
  statusMessage?: string;
  statusTone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "relative mt-5 flex flex-row items-center justify-end gap-3 sm:mt-0 sm:justify-end sm:pt-1",
        className,
      )}
    >
      <PreferencesStatus message={statusMessage} tone={statusTone} />
      {children}
    </div>
  );
}
