import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { formatDateTime } from "@/lib/admin-data";

/** Shared, presentation-only styling for the Hotels and Cars workspaces.
 * Keep domain-specific metrics and queries in their existing pages/services. */
export function OperationsMetric({ label, value, hint, tone = "neutral" }: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "info" | "good" | "warn" | "neutral" | "bad";
}) {
  const dots = {
    info: "bg-[#004BB8]",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
    neutral: "bg-[#CBD5E1]",
  };
  return (
    <div className="min-w-0 border-b border-[#E7ECF5] px-3 py-4 first:pl-0 xl:border-b-0 xl:border-r xl:last:border-r-0">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + dots[tone]} />
        <dt className="min-w-0 text-[12px] font-medium text-[#64748B]">{label}</dt>
      </div>
      <dd className="mt-2 break-words text-[22px] font-semibold leading-7 tabular-nums text-[#020617]">{value}</dd>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-[#64748B]">{hint}</p> : null}
    </div>
  );
}

/** Status indicator uses Homepage Fares' restrained dot-and-label treatment. */
export function OperationsStatus({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "info" | "good" | "warn" | "neutral" | "bad";
}) {
  const dots = {
    info: "bg-[#004BB8]",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
    neutral: "bg-[#94A3B8]",
  };
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-[#475569]">
      <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + dots[tone]} />
      {children}
    </span>
  );
}

export function OperationsSection({ children, className = "" }: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={"min-w-0 border-t border-[#D8E1EC] bg-white " + className}>{children}</section>;
}

export function OperationsDataTable({ columns, rows }: {
  columns: string[];
  rows: Array<{ id: string; cells: ReactNode[] }>;
}) {
  return (
    <div role="region" aria-label="Operational records" tabIndex={0} className="w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-[12px] leading-5">
        <thead className="border-y border-[#D8E1EC] text-[11px] font-medium uppercase tracking-wide text-[#64748B]">
          <tr>{columns.map(column => <th scope="col" key={column} className="px-3 py-3 font-medium first:pl-0">{column}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#E7ECF5]">
          {rows.map(row => (
            <tr key={row.id} className="align-top hover:bg-[#FAFBFD]">
              {row.cells.map((cell, index) => <td key={row.id + "-" + index} className="px-3 py-3 text-[#334155] first:pl-0">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
/** Group repeated provider observations for presentation, not storage.
 * Every original event remains available within the expanded group. */
export type OperationsProviderIssue = {
  id: string;
  provider: string;
  status: string;
  category: string;
  createdAt: string;
  latencyMs: number | null;
};

export function groupOperationsProviderIssues(items: readonly OperationsProviderIssue[]) {
  const groups = new Map<string, OperationsProviderIssue[]>();
  for (const item of items) {
    const key = JSON.stringify([item.provider, item.status, item.category]);
    const previous = groups.get(key);
    if (previous) previous.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}

export function OperationsProviderIssues({ items }: { items: readonly OperationsProviderIssue[] }) {
  return (
    <div className="mt-4 divide-y divide-[#E7ECF5]">
      {groupOperationsProviderIssues(items).map(group => {
        const latest = group[0];
        const tone = latest.status === "FAILED"
          ? "text-rose-700 bg-rose-500"
          : latest.status === "DEGRADED" || latest.status === "DISABLED"
            ? "text-amber-700 bg-amber-500"
            : "text-[#475569] bg-[#94A3B8]";
        const [textTone, dotTone] = tone.split(" ");
        return (
          <details key={JSON.stringify([latest.provider, latest.status, latest.category])} className="group py-3">
            <summary className="flex min-w-0 cursor-pointer list-none flex-wrap items-start justify-between gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-semibold text-[#020617]">{latest.provider}</p>
                <p className="mt-1 break-words text-[12px] text-[#64748B]">{latest.category}</p>
                <p className="mt-1 text-[11px] text-[#64748B]">
                  {group.length} {group.length === 1 ? "observation" : "observations"}
                  {" · Latest " + formatDateTime(new Date(latest.createdAt))}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2">
                <span className={"inline-flex items-center gap-1.5 text-[11px] font-medium " + textTone}>
                  <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + dotTone} />
                  {latest.status}
                </span>
                <ChevronDown size={15} aria-hidden="true" className="text-[#64748B] transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <ol className="mt-3 border-l-2 border-[#E7ECF5] pl-3">
              {group.map(issue => (
                <li key={issue.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-1.5 text-[12px] text-[#475569]">
                  <span>{formatDateTime(new Date(issue.createdAt))}</span>
                  <span className="tabular-nums">{issue.latencyMs === null ? "Latency unavailable" : issue.latencyMs + " ms"}</span>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </div>
  );
}
