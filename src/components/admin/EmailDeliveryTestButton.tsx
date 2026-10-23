"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

export function EmailDeliveryTestButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function sendTest() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/admin/email/health", {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof body.error === "string" ? body.error : "Unable to send test email.");
        return;
      }

      setMessage("Test email sent to your admin email address.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AdminButton type="button" onClick={sendTest} disabled={!enabled || pending}>
        {pending ? "Sending test…" : "Send test email to me"}
      </AdminButton>
      {!enabled ? (
        <p className="text-xs font-semibold text-amber-700">
          Configure the Resend API key and sender address before sending a test.
        </p>
      ) : null}
      {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
