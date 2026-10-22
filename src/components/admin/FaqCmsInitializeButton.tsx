"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

export function FaqCmsInitializeButton({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function initialize() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/content/faqs/initialize", {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to initialize FAQ CMS.");
        return;
      }
      setMessage(`Imported ${payload.count ?? 0} published FAQs.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <AdminButton
        type="button"
        onClick={initialize}
        loading={pending}
        disabled={disabled}
      >
        Initialize FAQ CMS
      </AdminButton>
      {message ? <p className="text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
