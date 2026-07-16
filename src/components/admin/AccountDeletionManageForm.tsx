"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton, AdminInput, AdminSectionCard, AdminTextarea } from "@/components/admin/AdminPageShell";

type Props = {
  requestId: string;
  status: string;
  reviewNotes?: string | null;
  adminReference?: string | null;
  readyForReview: boolean;
  canComplete: boolean;
};

export function AccountDeletionManageForm({ requestId, status, reviewNotes, adminReference, readyForReview, canComplete }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(reviewNotes || "");
  const [reference, setReference] = useState(adminReference || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(action: "save_notes" | "mark_ready_for_review" | "mark_completed") {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/account-deletions/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes: notes, adminReference: reference }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to update request.");
        return;
      }
      setMessage("Deletion request updated.");
      router.refresh();
    });
  }

  return (
    <AdminSectionCard className="space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Safe admin actions</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          These controls update lifecycle tracking only. They do not hard-delete users or automatically anonymize data.
        </p>
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Review notes</span>
        <AdminTextarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="mt-2"
          placeholder="Document retention/anonymization checks, support context, and next steps."
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Admin reference</span>
        <AdminInput
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="mt-2"
          placeholder="Internal review reference or case id"
        />
      </label>
      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <AdminButton type="button" onClick={() => submit("save_notes")} disabled={isPending}>Save notes</AdminButton>
        {status === "PENDING" ? (
          <AdminButton type="button" variant="secondary" onClick={() => submit("mark_ready_for_review")} disabled={isPending || !readyForReview} title={!readyForReview ? "Available after the 7-day deadline passes" : undefined}>
            Mark ready for review
          </AdminButton>
        ) : null}
        {canComplete ? (
          <AdminButton type="button" variant="secondary" onClick={() => submit("mark_completed")} disabled={isPending}>
            Mark completed
          </AdminButton>
        ) : null}
      </div>
    </AdminSectionCard>
  );
}
