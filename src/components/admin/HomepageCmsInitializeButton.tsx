"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

export function HomepageCmsInitializeButton({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function initialize() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/content/homepage/initialize", {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to initialize homepage CMS.");
        return;
      }

      setMessage(
        `Homepage CMS ready: ${payload.homepageDestinationCount ?? 0} destinations, ${payload.flightRouteCount ?? 0} flight routes, ${payload.hotelDestinationCount ?? 0} hotel destinations.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AdminButton type="button" onClick={initialize} loading={pending} disabled={disabled}>
        Initialize homepage CMS
      </AdminButton>
      {message ? <p className="text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
