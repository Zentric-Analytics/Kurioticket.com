import type { ReactNode } from "react";

export type OperationsStatusItem = {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "warning" | "danger";
};

const toneClasses = {
  neutral: "text-slate-950",
  good: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-rose-700",
};

export function HomepageOperationsStatusBar({
  items,
}: {
  items: OperationsStatusItem[];
}) {
  return (
    <dl className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-e lg:last:border-e-0"
        >
          <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
          <dd
            className={`mt-1 truncate text-base font-bold ${toneClasses[item.tone ?? "neutral"]}`}
            title={typeof item.value === "string" ? item.value : undefined}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OperationsDisclosure({
  label,
  children,
  id,
}: {
  label: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <details id={id} className="group border-t border-slate-200 py-4">
      <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        {label}
        <span
          aria-hidden="true"
          className="text-lg text-slate-400 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="mt-3 px-2">{children}</div>
    </details>
  );
}

export function OperationsMetric({
  label,
  value,
  problematic = false,
}: {
  label: string;
  value: ReactNode;
  problematic?: boolean;
}) {
  return (
    <div className={problematic ? "rounded-lg bg-rose-50 p-3" : "p-3"}>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd
        className={
          problematic
            ? "mt-1 text-lg font-bold text-rose-700"
            : "mt-1 text-lg font-bold text-slate-950"
        }
      >
        {value}
      </dd>
    </div>
  );
}
