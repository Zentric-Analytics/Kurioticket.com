"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

export function AdminAlertAcknowledgeButton({
  alertKey,
  acknowledged,
}: {
  alertKey: string;
  acknowledged: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (acknowledged) {
    return (
      <span className="text-xs font-semibold text-slate-500">
        Acknowledged for 24 hours
      </span>
    );
  }

  function acknowledge() {
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/admin/notifications/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alertKey }),
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
    });
  }

  return (
    <div>
      <AdminButton type="button" onClick={acknowledge} disabled={pending}>
        {pending ? "Acknowledging…" : "Acknowledge"}
      </AdminButton>
      {error ? (
        <p className="mt-2 max-w-sm text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
