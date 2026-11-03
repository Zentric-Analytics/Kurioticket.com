import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";

/** A consistent, content-only workspace surface; mirrors Support's text back link. */
export function ContentPageFrame({
  title,
  subtitle,
  backHref,
  backLabel = "Back to Content",
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminPageShell title={title} hideHeader>
      <div className="mx-auto w-full max-w-[1138px] min-w-0 text-[#374151]">
        {backHref ? (
          <Link
            href={backHref}
            className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {backLabel}
          </Link>
        ) : null}
        <header className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[28px] font-semibold leading-9 tracking-tight text-[#111827]">{title}</h2>
            {subtitle ? <p className="mt-1 text-[13px] leading-5 text-[#64748B]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </AdminPageShell>
  );
}

export function ContentSectionHeading({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[14px] font-semibold leading-5 text-[#111827]">{children}</h3>
      {extra ? <div className="text-[12px] text-[#64748B]">{extra}</div> : null}
    </div>
  );
}

const statusDots: Record<string, string> = {
  DRAFT: "bg-[#94A3B8]",
  PUBLISHED: "bg-emerald-500",
  HIDDEN: "bg-amber-500",
  ARCHIVED: "bg-[#64748B]",
  "CMS managed": "bg-emerald-500",
  "Setup required": "bg-amber-500",
  Unavailable: "bg-rose-500",
};

export function ContentStatusPill({ status, inline = false }: { status: string; inline?: boolean }) {
  const label = status.replaceAll("_", " ").toLowerCase();
  const displayed = status === "CMS managed" || status === "Setup required" || status === "Unavailable"
    ? status
    : label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <span className={inline
      ? "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] font-medium leading-4 text-[#475569]"
      : "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[12px] font-medium leading-4 text-[#475569]"}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[status] ?? "bg-[#94A3B8]"}`} aria-hidden="true" />
      {displayed}
    </span>
  );
}

export function ContentRecordsTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ id: string; cells: ReactNode[] }>;
}) {
  return (
    <div className="min-w-0 overflow-x-auto bg-white">
      <table className="w-full min-w-[740px] text-left text-[13px] text-[#374151]">
        <thead>
          <tr className="border-b border-[#D8E1EC] bg-white">
            {columns.map(column => (
              <th key={column} scope="col" className="whitespace-nowrap px-3 py-3 text-[12px] font-medium text-[#475569] sm:px-4">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7ECF5]">
          {rows.map(row => (
            <tr key={row.id} className="h-[64px] align-middle transition-colors hover:bg-[#F8FAFC]">
              {row.cells.map((cell, i) => (
                <td key={i} className="px-3 py-1.5 align-middle sm:px-4">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentEmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white px-2 py-8">
      <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#64748B]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ContentMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-[#64748B]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums text-[#111827]">{value}</p>
    </div>
  );
}
