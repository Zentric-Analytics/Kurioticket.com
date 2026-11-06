"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, CheckCheck } from "lucide-react";

import { AdminButton } from "@/components/admin/AdminPageShell";
import { AdminNotificationSpinner } from "./AdminNotificationSpinner";
import styles from "./AdminNotificationsPanel.module.css";

export function AdminAlertAcknowledgeButton({
  alertKey,
  signalToken,
  acknowledged,
  compact = false,
  rowStyle = false,
}: {
  alertKey: string;
  signalToken: string;
  acknowledged: boolean;
  compact?: boolean;
  rowStyle?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (acknowledged) {
    if (compact) return <span className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-4 text-[#6B7280]">
      <CheckCheck size={14} strokeWidth={1.75} aria-hidden="true" /> Marked as read · 24h
    </span>;
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold leading-5 text-slate-500">
        <CheckCheck size={14} strokeWidth={1.75} aria-hidden="true" />
        Marked as read for 24 hours
      </span>
    );
  }

  function markRead() {
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/notifications/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ alertKey, signalToken }),
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(
            typeof body.error === "string"
              ? body.error
              : "Unable to mark this alert as read.",
          );
          return;
        }

        window.dispatchEvent(new Event("admin-alerts-updated"));
        router.refresh();
      } catch {
        setError("Unable to mark this alert as read. Check your connection and try again.");
      }
    });
  }

  return (
    <div>
      {compact ? <button type="button" onClick={markRead} disabled={pending} aria-busy={pending}
        title="Mark this alert as read for 24 hours. This does not resolve the issue."
        className={styles.action + " min-w-[168px]"}>
        {pending ? <AdminNotificationSpinner className="h-3.5 w-3.5" /> : <Check size={14} strokeWidth={1.75} aria-hidden="true" />}
        {pending ? "Marking as read…" : "Mark as read"}
      </button> : <AdminButton type="button" onClick={markRead} disabled={pending} loading={pending} size={rowStyle ? "sm" : "md"} className={rowStyle ? "rounded-md font-semibold shadow-none" : undefined}>
        {pending ? "Marking as read…" : "Mark as read"}
      </AdminButton>}
      {error ? (
        <p role="alert" className="mt-2 max-w-sm text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
