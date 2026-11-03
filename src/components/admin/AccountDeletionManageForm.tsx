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
    <section aria-labelledby="deletion-manage-heading" className="min-w-0">
      <h3 id="deletion-manage-heading" className="border-b border-[#E5E7EB] pb-2.5 text-[14px] font-semibold leading-5 text-[#111827]">Manage deletion</h3>

      <div className="min-w-0 space-y-4 pt-3">
        <label className="block min-w-0">
          <span className="mb-1.5 block text-[12px] font-medium text-[#64748B]">Review notes</span>
          <AdminTextarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            maxLength={5000}
            rows={4}
            className="min-h-[104px] w-full rounded-lg border-[#D9DDE3] bg-white px-3 py-2 text-[13px] font-normal text-[#374151] focus:border-[#64748B] focus:ring-0"
            placeholder="Document retention review and next steps"
            disabled={isPending}
          />
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[12px] font-medium text-[#64748B]">Admin reference</span>
          <AdminInput
            value={reference}
            onChange={event => setReference(event.target.value)}
            maxLength={255}
            className="h-9 w-full rounded-lg border-[#D9DDE3] bg-white px-3 text-[13px] font-normal text-[#374151] focus:border-[#64748B] focus:ring-0"
            placeholder="Internal case reference"
            disabled={isPending}
          />
        </label>

        {canFinalize ? (
          <section aria-labelledby="deletion-final-review-heading" className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
            <h4 id="deletion-final-review-heading" className="text-[13px] font-semibold text-rose-900">Final deletion review</h4>
            <p className="text-[12px] leading-5 text-rose-800">
              Finalization anonymizes or removes account-owned data. Confirm retention checks and the account email before proceeding.
            </p>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[12px] font-medium text-[#475569]">Confirm account email</span>
              <AdminInput
                value={confirmEmail}
                onChange={event => setConfirmEmail(event.target.value)}
                autoComplete="off"
                placeholder={accountEmail || "Account email"}
                className="h-9 w-full rounded-lg border-[#D9DDE3] bg-white px-3 text-[13px] font-normal text-[#374151] focus:border-[#64748B] focus:ring-0"
                disabled={isPending}
              />
            </label>
            <label className="flex items-start gap-2.5 text-[12px] leading-5 text-[#374151]">
              <AdminCheckbox
                checked={retentionReviewed}
                onChange={event => setRetentionReviewed(event.target.checked)}
                className="mt-0.5 shrink-0"
                disabled={isPending}
              />
              <span>I confirm that the required retention and anonymization review is complete.</span>
            </label>
          </section>
        ) : null}

        {message ? <p className="text-[12px] font-medium text-emerald-700" role="status">{message}</p> : null}
        {error ? <p className="text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <AdminButton type="button" onClick={() => submit("save_notes")} loading={isPending} className="h-9 rounded-lg bg-[#3154EF] px-3 text-[13px] font-semibold hover:bg-[#2445D7]">Save notes</AdminButton>
          {status === "PENDING" ? (
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => submit("mark_ready_for_review")}
              disabled={isPending || !readyForReview}
              title={!readyForReview ? "Available after the 7-day deadline passes" : undefined}
              className="h-9 rounded-lg px-3 text-[12px] font-medium"
            >
              Mark ready for review
            </AdminButton>
          ) : null}
          {canFinalize ? (
            <AdminButton
              type="button"
              variant="destructive"
              onClick={() => submit("finalize")}
              disabled={isPending || !finalizeReady}
              loading={isPending}
              className="h-9 rounded-lg px-3 text-[12px] font-semibold"
            >
              Finalize deletion
            </AdminButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}
