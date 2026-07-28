"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

import { formatActionLabel, formatMetadata, formatTargetIdentifier, formatTargetType } from "./page-data";

export type AdminLogTableRow = { id: string; created: string; adminEmail: string; action: string; targetType: string; targetId: string | null; targetEmail: string | null; ipAddress: string | null; metadata: unknown };

type PopoverPosition = { left: number; top: number; width: number; maxHeight: number };

const POPOVER_WIDTH = 420;
const POPOVER_MAX_HEIGHT = 420;
const VIEWPORT_GAP = 16;
const ANCHOR_GAP = 8;

export function AdminLogsTable({ logs }: { logs: AdminLogTableRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
    const left = Math.max(VIEWPORT_GAP, Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_GAP));
    const roomBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
    const roomAbove = rect.top - VIEWPORT_GAP;
    const openAbove = roomBelow < Math.min(POPOVER_MAX_HEIGHT, 280) && roomAbove > roomBelow;
    const availableHeight = Math.max(160, openAbove ? roomAbove - ANCHOR_GAP : roomBelow - ANCHOR_GAP);
    const maxHeight = Math.min(POPOVER_MAX_HEIGHT, availableHeight);
    const top = openAbove ? Math.max(VIEWPORT_GAP, rect.top - maxHeight - ANCHOR_GAP) : rect.bottom + ANCHOR_GAP;

    setPosition({ left, top, width, maxHeight });
  }, []);

  const closePopover = useCallback((restoreFocus = false) => {
    const trigger = triggerRef.current;
    setOpenId(null);
    setPosition(null);
    if (restoreFocus) window.requestAnimationFrame(() => trigger?.focus());
  }, []);

  useLayoutEffect(() => {
    if (openId) updatePosition();
  }, [openId, updatePosition]);

  useEffect(() => {
    if (!openId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) closePopover(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopover(true);
      }
    };
    const handleViewportChange = () => updatePosition();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closePopover, openId, updatePosition]);

  const openLog = logs.find((log) => log.id === openId) ?? null;

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1240px] border-separate border-spacing-0 text-left text-sm" aria-label="Admin logs">
        <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs uppercase tracking-wide text-slate-500 backdrop-blur"><tr>{["Created", "Admin", "Action", "Target", "Target Email", "IP", "Details"].map((column) => <th key={column} scope="col" className={`border-b border-slate-200 px-5 py-3 font-semibold ${column === "IP" ? "min-w-[140px]" : ""}`}>{column}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => {
            const open = openId === log.id;
            const detailsId = `audit-details-${log.id}`;
            return <tr key={log.id} className="align-top transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80">
              <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-950">{log.created}</td>
              <td className="max-w-64 px-5 py-3.5 text-slate-700"><span className="block truncate" title={log.adminEmail}>{log.adminEmail}</span></td>
              <td className="px-5 py-3.5 font-semibold text-slate-950">{formatActionLabel(log.action)}</td>
              <td className="max-w-64 px-5 py-3.5"><span className="block truncate font-semibold text-slate-900" title={formatTargetType(log.targetType)}>{formatTargetType(log.targetType)}</span><span className="mt-0.5 block truncate text-xs text-slate-500" title={log.targetId || undefined}>{formatTargetIdentifier(log.targetId)}</span></td>
              <td className="max-w-64 px-5 py-3.5 text-slate-700">{log.targetEmail ? <span className="block truncate" title={log.targetEmail}>{log.targetEmail}</span> : <span className="text-slate-400">—</span>}</td>
              <td className="min-w-[140px] whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">{log.ipAddress || <span className="font-sans text-slate-400">—</span>}</td>
              <td className="px-5 py-3.5"><button ref={open ? triggerRef : undefined} type="button" aria-expanded={open} aria-haspopup="dialog" aria-controls={detailsId} onClick={(event) => {
                if (open) return closePopover(false);
                triggerRef.current = event.currentTarget;
                setPosition(null);
                setOpenId(log.id);
              }} className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50">View details{open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</button></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    {openLog && position && typeof document !== "undefined" ? createPortal(<AuditDetailsPopover ref={popoverRef} log={openLog} position={position} />, document.body) : null}
  </div>;
}

function AuditDetailsPopover({ ref, log, position }: { ref: React.Ref<HTMLElement>; log: AdminLogTableRow; position: PopoverPosition }) {
  const metadata = formatMetadata(log.metadata);
  const details = [
    ["Action", formatActionLabel(log.action)],
    ["Admin", log.adminEmail],
    ["Target", `${formatTargetType(log.targetType)} · ${formatTargetIdentifier(log.targetId)}`],
    ["Target email", log.targetEmail || "—"],
    ["IP", log.ipAddress || "—"],
    ["Created", log.created],
  ];

  return <section ref={ref} id={`audit-details-${log.id}`} role="dialog" aria-modal="false" aria-label={`Audit details for ${formatActionLabel(log.action)}`} tabIndex={0} className="fixed z-[1000] flex max-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" style={position}>
    <div className="shrink-0 border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-bold text-slate-950">Audit details</h2></div>
    <div className="min-h-0 overflow-y-auto p-4">
      <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">{details.map(([label, value]) => <div key={label} className="contents"><dt className="whitespace-nowrap font-semibold text-slate-500">{label}</dt><dd className={`${label === "IP" ? "min-w-[140px] whitespace-nowrap font-mono text-xs" : "break-words"} min-w-0 text-slate-800`}>{value}</dd></div>)}</dl>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Metadata</h3>
      {metadata ? <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-100 p-3 font-mono text-xs leading-5 text-slate-800 [overflow-wrap:anywhere]">{metadata}</pre> : <p className="mt-2 text-sm text-slate-500">No additional metadata</p>}
    </div>
  </section>;
}
