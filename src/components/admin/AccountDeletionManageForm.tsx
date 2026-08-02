"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

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
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-950">Safe admin actions</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          These controls update lifecycle tracking only. They do not hard-delete users or automatically anonymize data.
        </p>
      </div>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Review notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          placeholder="Document retention/anonymization checks, support context, and next steps."
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Admin reference</span>
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
          placeholder="Internal review reference or case id"
        />
      </label>
      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => submit("save_notes")} disabled={isPending}>Save notes</Button>
        {status === "PENDING" ? (
          <Button type="button" variant="secondary" onClick={() => submit("mark_ready_for_review")} disabled={isPending || !readyForReview} title={!readyForReview ? "Available after the 7-day deadline passes" : undefined}>
            Mark ready for review
          </Button>
        ) : null}
        {canComplete ? (
          <Button type="button" variant="secondary" onClick={() => submit("mark_completed")} disabled={isPending}>
            Mark completed
          </Button>
        ) : null}
      </div>
    </div>
  );
}
