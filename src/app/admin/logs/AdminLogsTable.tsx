"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatActionLabel, formatMetadata, formatTargetIdentifier, formatTargetType } from "./page-data";

export type AdminLogTableRow = { id: string; created: string; adminEmail: string; action: string; targetType: string; targetId: string | null; targetEmail: string | null; ipAddress: string | null; metadata: unknown };

export function AdminLogsTable({ logs }: { logs: AdminLogTableRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1240px] border-separate border-spacing-0 text-left text-sm" aria-label="Admin logs">
        <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-wide text-slate-500 backdrop-blur"><tr>{["Created", "Admin", "Action", "Target", "Target Email", "IP", "Details"].map((column) => <th key={column} scope="col" className={`border-b border-slate-200 px-5 py-3 font-semibold ${column === "IP" ? "min-w-[140px]" : ""}`}>{column}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => {
            const expanded = expandedId === log.id;
            const detailsId = `audit-details-${log.id}`;
            const metadata = formatMetadata(log.metadata);
            return <AuditRows key={log.id} log={log} expanded={expanded} detailsId={detailsId} metadata={metadata} onToggle={() => setExpandedId(expanded ? null : log.id)} />;
          })}
        </tbody>
      </table>
    </div>
  </div>;
}

function AuditRows({ log, expanded, detailsId, metadata, onToggle }: { log: AdminLogTableRow; expanded: boolean; detailsId: string; metadata: string | null; onToggle: () => void }) {
  return <>
    <tr className="align-top transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80">
      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-950">{log.created}</td>
      <td className="max-w-64 px-5 py-3.5 text-slate-700"><span className="block truncate" title={log.adminEmail}>{log.adminEmail}</span></td>
      <td className="px-5 py-3.5 font-semibold text-slate-950">{formatActionLabel(log.action)}</td>
      <td className="max-w-64 px-5 py-3.5"><span className="block truncate font-semibold text-slate-900" title={formatTargetType(log.targetType)}>{formatTargetType(log.targetType)}</span><span className="mt-0.5 block truncate text-xs text-slate-500" title={log.targetId || undefined}>{formatTargetIdentifier(log.targetId)}</span></td>
      <td className="max-w-64 px-5 py-3.5 text-slate-700">{log.targetEmail ? <span className="block truncate" title={log.targetEmail}>{log.targetEmail}</span> : <span className="text-slate-400">—</span>}</td>
      <td className="min-w-[140px] whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">{log.ipAddress || <span className="font-sans text-slate-400">—</span>}</td>
      <td className="px-5 py-3.5"><button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggle} className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50">{expanded ? "Hide details" : "View details"}{expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button></td>
    </tr>
    {expanded ? <tr id={detailsId}><td colSpan={7} className="border-t border-slate-100 bg-slate-50/50 px-5 py-5"><section aria-label={`Audit details for ${formatActionLabel(log.action)}`} className="w-full max-w-[600px] rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80"><h2 className="text-sm font-bold text-slate-950">Audit details</h2><h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h3>{metadata ? <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 [overflow-wrap:anywhere]">{metadata}</pre> : <p className="mt-2 text-sm text-slate-500">No additional metadata</p>}</section></td></tr> : null}
  </>;
}
