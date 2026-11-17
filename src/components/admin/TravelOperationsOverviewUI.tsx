import type { ReactNode } from "react";

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