import type { ReactNode } from "react";

export type OperationsMetric = {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "warning" | "danger";
};

export function HomepageOperationsStatusBar({
  items,
}: {
  items: OperationsMetric[];
}) {
  return (
    <dl
      className="grid gap-y-0 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,1.35fr)_repeat(3,minmax(0,1fr))]"
      data-layout="flat-summary"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-b border-slate-200 py-3 sm:px-5 lg:border-b-0 lg:border-e lg:last:border-e-0 lg:first:ps-0"
        >
          <dt className="text-xs font-medium text-slate-600">{item.label}</dt>
          <dd
            className="mt-1 whitespace-normal text-lg font-bold tracking-tight text-slate-950"
            title={typeof item.value === "string" ? item.value : undefined}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OperationalHealthPanel({
  metrics,
}: {
  metrics: OperationsMetric[];
}) {
  return (
    <dl>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OperationsDisclosure({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`group py-1 ${className}`}>
      <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950 [&::-webkit-details-marker]:hidden">
        {label}
        <span
          aria-hidden="true"
          className="text-lg text-slate-600 transition-transform group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="pb-3 pt-2 text-slate-700">{children}</div>
    </details>
  );
}
