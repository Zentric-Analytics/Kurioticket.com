"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton, AdminCheckbox, AdminInput, AdminTextarea } from "@/components/admin/AdminPageShell";

type Props = {
  requestId: string;
  status: string;
  accountEmail: string;
  reviewNotes?: string | null;
  adminReference?: string | null;
  readyForReview: boolean;
  canFinalize: boolean;
};

export function AccountDeletionManageForm({ requestId, status, accountEmail, reviewNotes, adminReference, readyForReview, canFinalize }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(reviewNotes || "");
  const [reference, setReference] = useState(adminReference || "");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [retentionReviewed, setRetentionReviewed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(action: "save_notes" | "mark_ready_for_review" | "finalize") {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/account-deletions/" + requestId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: notes,
          adminReference: reference,
          ...(action === "finalize" ? { confirmEmail, retentionReviewed } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to update request.");
        return;
      }
      setMessage(action === "finalize" ? "Account deletion finalized." : "Deletion request updated.");
      if (action === "finalize") {
        setConfirmEmail("");
        setRetentionReviewed(false);
      }
      router.refresh();
    });
  }

  const finalizeReady = canFinalize
    && retentionReviewed
    && notes.trim().length > 0
    && reference.trim().length > 0
    && confirmEmail.trim().toLowerCase() === accountEmail.trim().toLowerCase();

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-950">Safe admin actions</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Save review context, move an expired request to final review, or finalize only after the required retention and identity checks.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Review notes</span>
        <AdminTextarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
          className="mt-2"
          placeholder="Document retention/anonymization checks, support context, and next steps."
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-wide text-slate-500">Admin reference</span>
        <AdminInput
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          className="mt-2"
          placeholder="Internal review reference or case id"
        />
      </label>

      {canFinalize ? (
        <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <div>
            <p className="text-sm font-black text-rose-900">Final deletion review</p>
            <p className="mt-1 text-xs leading-5 text-rose-700">Finalization anonymizes/removes account-owned data according to the backend deletion workflow. It cannot be treated as a normal status change.</p>
          </div>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-600">Type account email to confirm</span>
            <AdminInput
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              className="mt-2"
              placeholder={accountEmail || "Account email"}
              autoComplete="off"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <AdminCheckbox checked={retentionReviewed} onChange={(event) => setRetentionReviewed(event.target.checked)} className="mt-0.5" />
            <span>I confirm the required retention/anonymization review has been completed.</span>
          </label>
        </div>
      ) : null}

      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" role="status">{message}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <AdminButton type="button" onClick={() => submit("save_notes")} loading={isPending}>Save notes</AdminButton>
        {status === "PENDING" ? (
          <AdminButton type="button" variant="secondary" onClick={() => submit("mark_ready_for_review")} disabled={isPending || !readyForReview} title={!readyForReview ? "Available after the 7-day deadline passes" : undefined}>
            Mark ready for review
          </AdminButton>
        ) : null}
        {canFinalize ? (
          <AdminButton type="button" variant="destructive" onClick={() => submit("finalize")} disabled={isPending || !finalizeReady} loading={isPending}>
            Finalize deletion
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
