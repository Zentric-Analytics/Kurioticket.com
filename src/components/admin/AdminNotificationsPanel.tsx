"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Bell, RefreshCw, X } from "lucide-react";

import { AdminAlertAcknowledgeButton } from "./AdminAlertAcknowledgeButton";
import { AdminNotificationSpinner } from "./AdminNotificationSpinner";
import { AdminNotificationItem } from "./AdminNotificationItem";
import styles from "./AdminNotificationsPanel.module.css";
import {
  adminNotificationSourceLabel,
  readAdminNotificationSnapshot,
  readAdminNotificationSummary,
  type AdminNotificationSnapshot,
  type AdminNotificationSummary,
} from "@/lib/adminNotificationData";

function withoutDeletedAlerts(snapshot: AdminNotificationSnapshot, deleted: Set<string>): AdminNotificationSnapshot {
  const alerts = snapshot.alerts.filter(alert => !deleted.has(alert.id));
  return {
    ...snapshot, alerts, activeCount: alerts.length,
    unreadCount: alerts.filter(alert => !alert.acknowledged).length,
    criticalCount: alerts.filter(alert => alert.severity === "CRITICAL").length,
    warningCount: alerts.filter(alert => alert.severity === "WARNING").length,
  };
}

function NotificationScrollArea({ children, busy }: { children: React.ReactNode; busy: boolean }) {
  const id = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ pointerId: number; offset: number } | null>(null);
  const [metrics, setMetrics] = useState({ maximum: 0, position: 0, height: 0 });
  const thumbHeight = Math.min(24, metrics.height);
  const travel = Math.max(0, metrics.height - thumbHeight);
  const thumbTop = metrics.maximum > 0 ? metrics.position / metrics.maximum * travel : 0;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const position = Math.max(0, Math.min(maximum, viewport.scrollTop));
      const height = Math.max(0, viewport.clientHeight - 16);
      setMetrics(previous => previous.maximum === maximum && previous.position === position && previous.height === height
        ? previous : { maximum, position, height });
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(content);
    viewport.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function scrollFromPointer(clientY: number, track: HTMLDivElement, offset: number) {
    const viewport = viewportRef.current;
    if (!viewport || travel <= 0) return;
    const progress = Math.max(0, Math.min(1, (clientY - track.getBoundingClientRect().top - offset) / travel));
    viewport.scrollTop = progress * metrics.maximum;
  }

  return <div className="relative min-h-0 flex-1 border-t border-[#E5E7EB]">
    <div ref={viewportRef} id={id} data-notification-scroll role="region" aria-label="Notification list" aria-busy={busy} tabIndex={0}
      className={styles.viewport + " h-full overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-200"}>
      <div ref={contentRef}>{children}</div>
    </div>
    {metrics.maximum > 0 && travel > 0 ? <div role="scrollbar" aria-label="Scroll notifications" aria-controls={id} aria-orientation="vertical"
      aria-valuemin={0} aria-valuemax={Math.ceil(metrics.maximum)} aria-valuenow={Math.round(metrics.position)} tabIndex={0}
      className="absolute bottom-2 right-0 top-2 w-3.5 touch-none cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-violet-200"
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        const thumb = thumbRef.current?.getBoundingClientRect();
        const offset = thumb && event.clientY >= thumb.top && event.clientY <= thumb.bottom ? event.clientY - thumb.top : thumbHeight / 2;
        dragRef.current = { pointerId: event.pointerId, offset };
        event.currentTarget.setPointerCapture(event.pointerId);
        scrollFromPointer(event.clientY, event.currentTarget, offset);
      }}
      onPointerMove={event => {
        if (dragRef.current?.pointerId === event.pointerId) scrollFromPointer(event.clientY, event.currentTarget, dragRef.current.offset);
      }}
      onPointerUp={event => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => { dragRef.current = null; }}
      onKeyDown={event => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const next = {
          ArrowDown: viewport.scrollTop + 40, ArrowUp: viewport.scrollTop - 40,
          PageDown: viewport.scrollTop + viewport.clientHeight, PageUp: viewport.scrollTop - viewport.clientHeight,
          Home: 0, End: metrics.maximum,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        viewport.scrollTop = next;
      }}>
      <span ref={thumbRef} data-notification-scroll-thumb aria-hidden="true"
        className="pointer-events-none absolute right-1 top-0 w-[3px] rounded-full bg-[#9CA3AF]"
        style={{ height: thumbHeight, transform: "translateY(" + thumbTop + "px)" }} />
    </div> : null}
  </div>;
}

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
  const snapshotRef = useRef<AdminNotificationSnapshot | null>(null);
  const deletedIdsRef = useRef(new Set<string>());
  const [swipedId, setSwipedId] = useState<string | null>(null);
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
            const result = withoutDeletedAlerts(readAdminNotificationSnapshot(body), deletedIdsRef.current);
            snapshotRef.current = result;
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
  const visibleAlerts = snapshot?.alerts ?? [];
  const iconButton = "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-white text-[#6B7280] transition-[color,box-shadow,border-color] duration-150 hover:border-[#E5E7EB] hover:text-[#374151] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 motion-reduce:transition-none";

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
      className={"relative flex h-10 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-white text-[#374151] transition-[box-shadow,border-color] duration-150 hover:border-[#E5E7EB] hover:shadow-[0_2px_8px_rgba(17,24,39,0.08)] active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 motion-reduce:transition-none " + (open ? "border-[#E5E7EB] shadow-[0_2px_8px_rgba(17,24,39,0.08)]" : "border-transparent")}
    >
      <Bell size={19} aria-hidden="true" />
      {unreadCount !== null && unreadCount > 0 ? <span aria-hidden="true" className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span> : null}
    </button>
    {open ? createPortal(
      <section ref={panelRef} id={id} role="dialog" aria-labelledby={id + "-title"} tabIndex={-1}
        className={styles.panel + " fixed bottom-0 right-0 top-16 z-50 flex w-full max-w-[400px] flex-col border-l border-[#E5E7EB] bg-white text-[#374151] shadow-[-12px_0_32px_rgba(15,23,42,0.08)] outline-none"}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 id={id + "-title"} className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[#111827]">Notifications</h2>
            <p className="mt-1 text-[12px] font-normal leading-5 text-[#6B7280]">
              {snapshot ? snapshot.unreadCount > 0 ? snapshot.unreadCount + " need attention" : snapshot.activeCount > 0 ? "All active alerts read" : "No active notifications" : pending ? "Loading notifications…" : "Activity and alerts"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Refresh notifications" aria-busy={pending} title={pending ? "Refreshing notifications…" : "Refresh notifications"} disabled={pending} onClick={() => { setError(null); setRefreshKey(value => value + 1); }} className={iconButton + " disabled:cursor-wait disabled:opacity-60"}>
              {pending ? <AdminNotificationSpinner /> : <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />}
            </button>
            <button type="button" aria-label="Close notifications" onClick={onClose} className={iconButton}><X size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <NotificationScrollArea busy={pending}>
          {error ? <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-[12px] font-normal leading-5 text-rose-800">
            <p>{error}</p>
            {snapshot ? <p>Showing last loaded alerts.</p> : null}
            <button type="button" disabled={pending} onClick={() => { setError(null); setRefreshKey(value => value + 1); }}
              className="mt-2 rounded-md font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9] disabled:opacity-50">Try again</button>
          </div> : null}
          {!snapshot && !error ? <div role="status" aria-live="polite" className="p-5">
            <div className="mb-6 flex items-center gap-2 text-[12px] font-normal leading-5 text-[#6B7280]"><AdminNotificationSpinner /> Loading notifications…</div>
            <div aria-hidden="true" className="space-y-7">
              {[0, 1, 2].map(index => <div key={index} data-notification-skeleton className="space-y-3">
                <div className={styles.skeleton + " h-2 w-20"} />
                <div className={styles.skeleton + " h-3 w-4/5"} />
                <div className={styles.skeleton + " h-2 w-full"} />
                <div className={styles.skeleton + " h-2 w-3/5"} />
              </div>)}
            </div>
          </div> : null}
          {snapshot && visibleAlerts.length === 0 ? <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280]"><Bell size={22} strokeWidth={1.5} aria-hidden="true" /></span>
            <p className="text-[14px] font-semibold text-[#111827]">You’re all caught up</p>
            <p className="mt-1 text-[12px] leading-5 text-[#6B7280]">No active notifications.</p>
          </div> : null}
          {snapshot && visibleAlerts.length > 0 ? <ul className="space-y-2 px-3 py-3">
            {visibleAlerts.map(alert => <AdminNotificationItem key={alert.id} id={alert.id} alertKey={alert.key} signalToken={alert.signalToken} title={alert.title}
              canDelete={alert.key !== "system.database.unavailable" && !alert.signalToken.startsWith("unpersisted:")}
              open={swipedId === alert.id} onSetOpen={open => setSwipedId(open ? alert.id : null)}
              onDelete={async () => {
                deletedIdsRef.current.add(alert.id);
                setSwipedId(null);
                if (snapshotRef.current) {
                  const result = withoutDeletedAlerts(snapshotRef.current, deletedIdsRef.current);
                  snapshotRef.current = result;
                  setSnapshot(result);
                  setSummary(result);
                }
                if (document.activeElement?.closest("[data-notification-id]")?.getAttribute("data-notification-id") === alert.id) {
                  panelRef.current?.querySelector<HTMLElement>("[data-notification-scroll]")?.focus({ preventScroll: true });
                }
                window.dispatchEvent(new Event("admin-alerts-updated"));
              }}>
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 pr-7 text-[11px] leading-4">
                <span className={"font-semibold " + (alert.severity === "CRITICAL" ? "text-rose-700" : "text-amber-700")}>{alert.severity === "CRITICAL" ? "Critical" : "Warning"}</span>
                <span className="font-normal text-[#6B7280]">{adminNotificationSourceLabel(alert.source)}</span>
              </div>
              <h3 className="break-words text-[13px] font-semibold leading-5 text-[#111827]">{alert.title}</h3>
              <p className="mt-1 break-words text-[13px] font-normal leading-5 text-[#374151]">{alert.message}</p>
              {alert.signalAt ? <time dateTime={alert.signalAt} className="mt-2 block text-[11px] font-normal leading-4 text-[#6B7280]">
                {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(alert.signalAt))}
              </time> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {alert.actionHref ? <Link href={alert.actionHref} onClick={onClose} className={styles.action}>
                  View details <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </Link> : null}
                {alert.key === "system.database.unavailable" ? null : alert.signalToken.startsWith("unpersisted:") ? <p className="text-[11px] leading-4 text-[#6B7280]">Acknowledgement is unavailable until monitoring-state storage recovers.</p> :
                  <AdminAlertAcknowledgeButton alertKey={alert.key} signalToken={alert.signalToken} acknowledged={alert.acknowledged} compact />}
              </div>
            </AdminNotificationItem>)}
          </ul> : null}
        </NotificationScrollArea>
      </section>, document.body
    ) : null}
  </>;
}
