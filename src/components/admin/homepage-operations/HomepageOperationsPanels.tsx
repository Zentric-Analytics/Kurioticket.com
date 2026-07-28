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
      className="grid gap-y-0 sm:grid-cols-2 lg:grid-cols-5"
      data-layout="flat-summary"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-b border-black py-3 sm:px-4 sm:first:ps-0 lg:border-b-0 lg:border-e lg:last:border-e-0"
        >
          <dt className="text-xs font-semibold text-black">{item.label}</dt>
          <dd
            className="mt-1 truncate text-lg font-extrabold tracking-tight text-black"
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
    <details className={`group border-b border-black py-2 ${className}`}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-black focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        {label}
        <span
          aria-hidden="true"
          className="text-lg text-black transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pb-3 pt-2 text-black">{children}</div>
    </details>
  );
}
