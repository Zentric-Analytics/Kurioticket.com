"use client";

import { signOut } from "next-auth/react";
import React, { useState } from "react";

import { PendingDeletionDeadline } from "@/components/account/PendingDeletionDeadline";
import { useLocale } from "@/components/layout/LocaleProvider";

export function PendingDeletionActions({ deadline }: { deadline: string }) {
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function reactivate() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/security/deletion-request/reactivate", { method: "POST", credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok || data?.success !== true) {
        setMessage(
          data?.error === "The 7-day reactivation window has expired. Contact support."
            ? t["account.pendingDeletion.error.expired"]
            : t["account.pendingDeletion.error.reactivate"],
        );
        return;
      }
      window.location.replace("/dashboard");
    } catch {
      setMessage(t["account.pendingDeletion.error.reactivate"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-7 space-y-4">
      <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        {t["account.pendingDeletion.helperBefore"]} <PendingDeletionDeadline deadline={deadline} dateStyle="medium" /> {t["account.pendingDeletion.helperAfter"]}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reactivate} disabled={saving} className="focus-ring rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? t["account.pendingDeletion.action.reactivating"] : t["account.pendingDeletion.action.reactivate"]}
        </button>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="focus-ring rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800">
          {t["account.pendingDeletion.action.logout"]}
        </button>
      </div>
      {message ? <p className="text-sm font-semibold text-red-600">{message}</p> : null}
    </div>
  );
}
