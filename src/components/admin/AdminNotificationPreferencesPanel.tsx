"use client";

import Link from "next/link";
import { useState } from "react";

export function AdminNotificationPreferencesPanel({
  initialValue,
  available,
}: {
  initialValue: boolean;
  available: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function save(next: boolean) {
    if (saving || !available) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/admin/notification-preferences", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ showAcknowledgedWarnings: next }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== "object" ||
          !("showAcknowledgedWarnings" in body) || typeof body.showAcknowledgedWarnings !== "boolean") {
        throw new Error("Unable to save notification settings.");
      }
      setValue(body.showAcknowledgedWarnings);
      setFeedback("Preference saved.");
      window.dispatchEvent(new Event("admin-notification-preferences-updated"));
    } catch {
      setError("The preference was not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3">
      {!available ? (
        <p role="status" className="mb-3 border-l-[3px] border-amber-500 py-1 pl-3 text-[13px] text-amber-800">
          Notification settings are unavailable. Existing alerts remain visible.
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 border-y border-[#D8E1EC] py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#020617]">Show acknowledged warnings</h3>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Keep acknowledged warnings in your notification drawer.
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Critical and unacknowledged alerts always remain visible.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[12px] font-medium text-[#475569]">{value ? "Shown" : "Hidden"}</span>
          <button
            type="button"
            role="switch"
            aria-label="Show acknowledged warnings"
            aria-checked={value}
            aria-busy={saving}
            disabled={!available || saving}
            onClick={() => { void save(!value); }}
            className={"relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50 " + (value ? "bg-emerald-600" : "bg-slate-300")}
          >
            <span aria-hidden="true" className={"inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform " + (value ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>
      {feedback ? <p role="status" className="mt-2 text-[12px] text-emerald-700">{feedback}</p> : null}
      {error ? <p role="alert" className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#64748B]">
        <Link href="/admin/notifications" className="font-medium text-[#004BB8] hover:underline">
          Open Notifications &amp; Alerts
        </Link>
        <Link
          href="/admin/logs?range=30d&action=ADMIN_NOTIFICATION_PREFERENCE_UPDATED&targetType=AdminNotificationPreference"
          className="font-medium text-[#004BB8] hover:underline"
        >
          View notification audit history
        </Link>
      </div>
    </div>
  );
}
