"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
      <button
        type="button"
        onClick={sendTest}
        disabled={!enabled || pending}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003E99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Sending test…" : "Send test email to me"}
      </button>
      {!enabled ? (
        <p className="text-[12px] font-medium text-amber-700">
          Configure the Resend API key and sender address before sending a test.
        </p>
      ) : null}
      {message ? <p className="text-[12px] font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="text-[12px] font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
