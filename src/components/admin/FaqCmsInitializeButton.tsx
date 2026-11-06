"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CmsSuccessMessage } from "@/components/admin/CmsEditorFeedback";
import { AdminButton } from "@/components/admin/AdminPageShell";

export function FaqCmsInitializeButton({ disabled = false }: { disabled?: boolean }) {
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
        const response = await fetch("/api/admin/content/faqs/initialize", {
          method: "POST",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(typeof payload.error === "string" ? payload.error : "Unable to initialize FAQ CMS.");
          return;
        }
        setMessage(`FAQ CMS ready: ${payload.seededCount ?? 0} seeded, ${payload.migratedCount ?? 0} existing records reconciled.`);
        router.refresh();
      } catch {
        setError("Unable to initialize FAQ CMS. Check your connection and try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AdminButton
        className="cursor-pointer"
        type="button"
        onClick={initialize}
        loading={pending}
        disabled={disabled || pending}
      >
        Initialize FAQ CMS
      </AdminButton>
      <CmsSuccessMessage message={message} onDismiss={() => setMessage(null)} />
      {error ? <p className="text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
