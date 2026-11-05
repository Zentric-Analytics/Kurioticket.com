"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Bell, LoaderCircle, RefreshCw, X } from "lucide-react";

import { AdminAlertAcknowledgeButton } from "./AdminAlertAcknowledgeButton";
import {
  adminNotificationSourceLabel,
  readAdminNotificationSnapshot,
  readAdminNotificationSummary,
  type AdminNotificationSnapshot,
  type AdminNotificationSummary,
} from "@/lib/adminNotificationData";

export function AdminNotificationsPanel({ open, onToggle, onClose, headerRef, triggerRef }: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  headerRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [summary, setSummary] = useState<AdminNotificationSummary | null>(null);
  const [snapshot, setSnapshot] = useState<AdminNotificationSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    let refreshQueued = false;
    const controller = new AbortController();

    function refresh() {
      if (requestInFlight) { refreshQueued = true; return; }
      requestInFlight = true;
      startTransition(async () => {
        try {
          const response = await fetch(open ? "/api/admin/notifications?panel=1" : "/api/admin/notifications?summary=1", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Notification request failed");
          const body: unknown = await response.json();
          if (!active) return;
          if (open) {
            const result = readAdminNotificationSnapshot(body);
            setSummary(result);
            setSnapshot(result);
          } else {
            setSummary(readAdminNotificationSummary(body));
          }
          setError(null);
        } catch {
          // A failed refresh must not erase the last known count or claim a healthy empty state.
          if (active && !controller.signal.aborted) setError("Unable to load notifications. Please try again.");
        } finally {
          requestInFlight = false;
          if (active && refreshQueued) {
            refreshQueued = false;
            refresh();
          }
        }
      });
    }

    refresh();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener("admin-alerts-updated", refresh);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("admin-alerts-updated", refresh);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [open, pathname, refreshKey]);

  useLayoutEffect(() => {
    if (!open || !headerRef.current || !panelRef.current) return;
    const header = headerRef.current;
    const updatePosition = () => {
      if (panelRef.current) panelRef.current.style.top = Math.max(0, Math.min(window.innerHeight, header.getBoundingClientRect().bottom)) + "px";
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(header);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [open, headerRef]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  const unreadCount = summary?.unreadCount ?? null;
  const iconButton = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F3F5F9] hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9]/30";

  return <>
    <button
      ref={triggerRef}
      type="button"
      onClick={() => { if (!open) setError(null); onToggle(); }}
      aria-label={unreadCount ? unreadCount + " admin alerts need attention" : "Admin notifications"}
      aria-expanded={open}
      aria-controls={id}
      aria-haspopup="dialog"
      title="Notifications"
      className={"relative flex h-10 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9]/30 " + (open ? "bg-[#F3F0FF] text-[#6D28D9]" : "text-[#64748B] hover:bg-[#F3F5F9] hover:text-[#374151]")}
    >
      <Bell size={19} aria-hidden="true" />
      {unreadCount !== null && unreadCount > 0 ? <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span> : null}
    </button>
    {open ? createPortal(
      <section ref={panelRef} id={id} role="dialog" aria-labelledby={id + "-title"} tabIndex={-1}
        className="fixed bottom-0 right-0 top-16 z-50 flex w-full max-w-[400px] flex-col border-l border-[#D8E1EC] bg-white text-[#374151] shadow-[-12px_0_32px_rgba(15,23,42,0.08)] outline-none">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 id={id + "-title"} className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[#111827]">Notifications</h2>
            <p className="mt-1 text-[12px] font-normal leading-5 text-[#64748B]">
              {snapshot ? snapshot.unreadCount > 0 ? snapshot.unreadCount + " need attention" : snapshot.activeCount > 0 ? "All active alerts acknowledged" : "No active notifications" : pending ? "Loading notifications…" : "Activity and alerts"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Refresh notifications" disabled={pending} onClick={() => { setError(null); setRefreshKey(value => value + 1); }} className={iconButton + " disabled:cursor-wait disabled:opacity-50"}>
              <RefreshCw size={16} aria-hidden="true" className={pending ? "animate-spin motion-reduce:animate-none" : ""} />
            </button>
            <button type="button" aria-label="Close notifications" onClick={onClose} className={iconButton}><X size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <div data-notification-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#E7ECF5]">
          {error ? <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-[12px] font-normal leading-5 text-rose-800">
            <p>{error}</p>
            {snapshot ? <p>Showing last loaded alerts.</p> : null}
            <button type="button" disabled={pending} onClick={() => { setError(null); setRefreshKey(value => value + 1); }}
              className="mt-2 rounded-md font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] disabled:opacity-50">Try again</button>
          </div> : null}
          {pending && !snapshot ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-12 text-[12px] text-[#64748B]">
            <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading notifications…
          </div> : null}
          {snapshot?.alerts.length === 0 ? <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F0FF] text-[#6D28D9]"><Bell size={22} strokeWidth={1.5} aria-hidden="true" /></span>
            <p className="text-[13px] font-medium text-[#111827]">You’re all caught up</p>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">There are no active notifications.</p>
          </div> : null}
          {snapshot && snapshot.alerts.length > 0 ? <ul className="divide-y divide-[#E7ECF5]">
            {snapshot.alerts.map(alert => <li key={alert.id} className={"px-5 py-4 " + (alert.acknowledged ? "" : "bg-[#FAFBFF]")}>
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium leading-4">
                <span className={alert.severity === "CRITICAL" ? "text-rose-700" : "text-amber-700"}>{alert.severity === "CRITICAL" ? "Critical" : "Warning"}</span>
                <span className="text-[#64748B]">{adminNotificationSourceLabel(alert.source)}</span>
              </div>
              <h3 className="break-words text-[13px] font-medium leading-5 text-[#111827]">{alert.title}</h3>
              <p className="mt-1 break-words text-[12px] font-normal leading-5 text-[#64748B]">{alert.message}</p>
              {alert.signalAt ? <time dateTime={alert.signalAt} className="mt-2 block text-[11px] font-normal leading-4 text-[#64748B]">
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.signalAt))}
              </time> : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {alert.actionHref ? <Link href={alert.actionHref} onClick={onClose} className="inline-flex items-center gap-1 rounded-md text-[12px] font-medium text-[#6D28D9] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">
                  Open source <ArrowUpRight size={13} aria-hidden="true" />
                </Link> : null}
                {alert.key === "system.database.unavailable" ? null : alert.signalToken.startsWith("unpersisted:") ? <p className="text-[11px] leading-4 text-[#64748B]">Acknowledgement is unavailable until monitoring-state storage recovers.</p> :
                  <AdminAlertAcknowledgeButton alertKey={alert.key} signalToken={alert.signalToken} acknowledged={alert.acknowledged} compact />}
              </div>
            </li>)}
          </ul> : null}
        </div>
      </section>, document.body
    ) : null}
  </>;
}
