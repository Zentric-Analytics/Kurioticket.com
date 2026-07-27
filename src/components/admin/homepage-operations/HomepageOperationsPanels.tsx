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
    <dl className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-e lg:last:border-e-0"
        >
          <dt className="text-xs font-semibold text-slate-500">{item.label}</dt>
          <dd
            className={`mt-1 truncate text-base font-extrabold ${metricTone(item.tone)}`}
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
    <section
      aria-labelledby="operational-health-heading"
      className="border-t border-slate-200 pt-4 lg:border-s lg:border-t-0 lg:ps-5 lg:pt-0"
    >
      <h2
        id="operational-health-heading"
        className="text-lg font-extrabold text-slate-950"
      >
        Operational health
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={
              metric.tone === "danger" || metric.tone === "warning"
                ? "rounded-lg bg-amber-50 px-3 py-2"
                : "px-1 py-2"
            }
          >
            <dt className="text-xs font-semibold text-slate-500">
              {metric.label}
            </dt>
            <dd
              className={`mt-0.5 text-lg font-extrabold ${metricTone(metric.tone)}`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
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
    <details className={`group border-t border-slate-200 py-4 ${className}`}>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 [&::-webkit-details-marker]:hidden">
        {label}
        <span
          aria-hidden="true"
          className="text-lg text-slate-400 transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function metricTone(tone: OperationsMetric["tone"]) {
  if (tone === "good") return "text-emerald-700";
  if (tone === "danger") return "text-rose-700";
  if (tone === "warning") return "text-amber-700";
  return "text-slate-950";
}
