"use client";

import { requestCmsDiscard, releaseCmsNavigationGuard } from "@/lib/cmsNavigationGuard";
import { useCmsOperation } from "@/components/admin/CmsOperationContext";
import { useState, useTransition } from "react";

import { AdminButton } from "@/components/admin/AdminPageShell";

export function CmsRevisionRestoreButton({
  itemId,
  revisionId,
  expectedVersion,
}: {
  itemId: string;
  revisionId: string;
  expectedVersion: number;
}) {
  const operation = useCmsOperation();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function restore() {
    if (pending || operation.busy) return;
    if (!window.confirm("Restore this revision into a new draft? The live published version will not change until you publish again.")) {
      return;
    }

    if (!requestCmsDiscard()) return;
    setError(null);
    operation.setBusy(true);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/content/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "restore_revision",
            expectedVersion,
            revisionId,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const serverError = typeof body.error === "string"
            ? body.error
            : "Unable to restore this revision.";
          // Revision uniqueness and dependency checks also use HTTP 409. Only
          // optimistic-concurrency conflicts should suggest a reload; admins
          // need the actionable server message for other conflicts.
          const staleVersion = response.status === 409 &&
            /changed since it was opened|changed concurrently|refresh before|another admin session/i.test(serverError);
          setError(staleVersion
            ? "This content changed in another session. Reload before restoring."
            : serverError);
          return;
        }
        releaseCmsNavigationGuard();
        window.location.reload();
      } catch {
        setError("Unable to restore this revision. Check your connection and try again.");
      } finally {
        operation.setBusy(false);
      }
    });
  }

  return (
    <div className="space-y-1">
      <AdminButton
        className="cursor-pointer"
        type="button"
        variant="secondary"
        onClick={restore}
        loading={pending}
        disabled={pending || operation.busy}
      >
        Restore to draft
      </AdminButton>
      {error ? <p className="text-xs font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
