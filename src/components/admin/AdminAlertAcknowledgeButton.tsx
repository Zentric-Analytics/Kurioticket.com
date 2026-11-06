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
}: {
  alertKey: string;
  signalToken: string;
  acknowledged: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (acknowledged) {
    if (compact) return <span className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-4 text-[#6B7280]">
      <CheckCheck size={14} strokeWidth={1.75} aria-hidden="true" /> Seen for 24 hours
    </span>;
    return (
      <span className="text-xs font-semibold text-slate-500">
        Acknowledged for 24 hours
      </span>
    );
  }

  function acknowledge() {
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
              : "Unable to acknowledge this alert.",
          );
          return;
        }

        window.dispatchEvent(new Event("admin-alerts-updated"));
        router.refresh();
      } catch {
        setError("Unable to acknowledge this alert. Check your connection and try again.");
      }
    });
  }

  return (
    <div>
      {compact ? <button type="button" onClick={acknowledge} disabled={pending} aria-busy={pending}
        title="Mark this alert as seen for 24 hours. This does not resolve the issue."
        className={styles.action + " min-w-[128px]"}>
        {pending ? <AdminNotificationSpinner className="h-3.5 w-3.5" /> : <Check size={14} strokeWidth={1.75} aria-hidden="true" />}
        {pending ? "Saving…" : "Mark as seen"}
      </button> : <AdminButton type="button" onClick={acknowledge} disabled={pending} loading={pending}>
        {pending ? "Acknowledging…" : "Acknowledge"}
      </AdminButton>}
      {error ? (
        <p role="alert" className="mt-2 max-w-sm text-xs font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
