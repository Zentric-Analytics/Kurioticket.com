"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminNotificationSpinner } from "./AdminNotificationSpinner";
import { ADMIN_NOTIFICATION_DELETE_WIDTH, adminNotificationSwipeDirection, adminNotificationSwipePosition } from "@/lib/adminNotificationSwipe";
import styles from "./AdminNotificationsPanel.module.css";

export function AdminNotificationItem({ id, alertKey, signalToken, title, canDelete, open, onSetOpen, onDelete, children }: {
  id: string;
  alertKey: string;
  signalToken: string;
  title: string;
  canDelete: boolean;
  open: boolean;
  onSetOpen: (open: boolean) => void;
  onDelete: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const gesture = useRef<{ id: number; x: number; y: number; start: number; direction: "undecided" | "horizontal" | "vertical" } | null>(null);
  const suppressClick = useRef(false);
  const position = dragPosition ?? (open ? -ADMIN_NOTIFICATION_DELETE_WIDTH : 0);

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertKey, signalToken }),
      });
      if (!response.ok) throw new Error("Unable to delete this notification. Please try again.");
      setRemoving(true);
      // Wait for the same short settling motion as the swipe, then update the list.
      await new Promise(resolve => window.setTimeout(resolve, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 240));
      await onDelete();
    } catch {
      setError("Unable to delete this notification. Please try again.");
      setDeleting(false);
      setRemoving(false);
    }
  }

  return <li data-notification-item data-notification-id={id} data-notification-swipe-open={open ? "true" : "false"} aria-busy={deleting}
    className={styles.item + (removing ? " " + styles.removing : "")}>
    <div className="min-h-0 overflow-hidden rounded-xl">
      <div className="relative isolate rounded-xl bg-white">
        {canDelete ? <button type="button" tabIndex={open ? 0 : -1} aria-hidden={!open} disabled={deleting}
          aria-label={"Delete " + title} onClick={() => void remove()}
          className="absolute bottom-0 right-0 top-0 flex w-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-r-xl bg-rose-600 text-[12px] font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white disabled:cursor-wait motion-reduce:transition-none">
          {deleting ? <AdminNotificationSpinner className="h-5 w-5" /> : <Trash2 size={19} strokeWidth={1.75} aria-hidden="true" />}
          {deleting ? "Deleting…" : "Delete"}
        </button> : null}
        <div data-notification-card className={styles.card + (dragPosition !== null ? " " + styles.dragging : "")}
          style={{ transform: "translateX(" + position + "px)" }}
          onPointerDown={event => {
            suppressClick.current = false;
            if (!canDelete || deleting || event.button !== 0 || (event.target as HTMLElement).closest("button, a")) return;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position, direction: "undecided" };
          }}
          onPointerMove={event => {
            const current = gesture.current;
            if (!current || current.id !== event.pointerId) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (current.direction === "undecided") current.direction = adminNotificationSwipeDirection(dx, dy, current.start);
            if (current.direction !== "horizontal") return;
            event.preventDefault();
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
            suppressClick.current = true;
            setDragPosition(adminNotificationSwipePosition(current.start, dx));
          }}
          onPointerUp={event => {
            const current = gesture.current;
            if (!current || current.id !== event.pointerId) return;
            if (current.direction === "horizontal") onSetOpen(adminNotificationSwipePosition(current.start, event.clientX - current.x) <= -ADMIN_NOTIFICATION_DELETE_WIDTH / 2);
            gesture.current = null;
            setDragPosition(null);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { gesture.current = null; setDragPosition(null); }}
          onLostPointerCapture={() => { gesture.current = null; setDragPosition(null); }}
          onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
          {canDelete ? <button type="button" disabled={deleting} title="Delete notification" aria-label={"Delete notification: " + title}
            onClick={() => void remove()} className="absolute right-2.5 top-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white text-[#6B7280] transition-[color,box-shadow] hover:text-rose-700 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-violet-200 disabled:cursor-wait motion-reduce:transition-none">
            {deleting ? <AdminNotificationSpinner className="h-3.5 w-3.5" /> : <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />}
          </button> : null}
          <div inert={deleting}>{children}</div>
          {error ? <p role="alert" className="mt-3 text-[12px] leading-5 text-rose-700">{error}</p> : null}
        </div>
      </div>
    </div>
  </li>;
}
