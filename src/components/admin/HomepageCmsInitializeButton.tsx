"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CmsSuccessMessage } from "@/components/admin/CmsEditorFeedback";
import { AdminButton } from "@/components/admin/AdminPageShell";

export function HomepageCmsInitializeButton({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function initialize() {
    if (pending || disabled) return;
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
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
      } catch {
        setError("Unable to initialize homepage CMS. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AdminButton className="cursor-pointer" type="button" onClick={initialize} loading={pending} disabled={disabled || pending}>
        Initialize homepage CMS
      </AdminButton>
      <CmsSuccessMessage message={message} onDismiss={() => setMessage(null)} />
      {error ? <p className="text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
