"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { AdminTextarea } from "@/components/admin/AdminPageShell";
import { supportStatusTabs } from "@/lib/adminSupportInboxNavigation";
import { supportTicketStatuses } from "@/lib/supportTickets";

type SupportStatus = (typeof supportTicketStatuses)[number];
const replyMaxLength = 4000;
const panel = "min-w-0 rounded-xl border border-[#E2E8F0] bg-white";
const statusChoices = supportStatusTabs.filter(option => option.value !== "") as Array<{ value: SupportStatus; label: string }>;

export function SupportReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReplyPending, startReplyTransition] = useTransition();
  const validReply = reply.trim().length >= 2 && reply.trim().length <= replyMaxLength;

  function submitReply() {
    if (!validReply || isReplyPending) return;
    setReplyMessage(null);
    setError(null);
    startReplyTransition(async () => {
      try {
        const response = await fetch("/api/admin/support/" + encodeURIComponent(ticketId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(typeof payload.error === "string" ? payload.error : "Unable to add reply.");
          return;
        }
        setReply("");
        setReplyMessage(payload.emailStatus === "accepted"
          ? "Reply saved. Email accepted by provider; delivery is not confirmed."
          : payload.emailStatus === "failed"
            ? "Reply saved, but email sending failed. Check email delivery records."
            : "Reply saved. Email sending status is unknown; check email delivery records.");
        router.refresh();
      } catch {
        setError("Unable to send reply. Check the conversation before retrying.");
      }
    });
  }

  return (
    <section aria-labelledby="support-reply-heading" className={panel}>
      <div className="border-b border-[#E2E8F0] px-5 py-4">
        <h3 id="support-reply-heading" className="text-[15px] font-semibold text-[#111827]">Reply</h3>
      </div>
      <div className="px-5 py-4">
        <label htmlFor="support-reply-body" className="sr-only">Reply message</label>
        <AdminTextarea
          id="support-reply-body"
          value={reply}
          onChange={event => setReply(event.target.value)}
          maxLength={replyMaxLength}
          rows={5}
          className="min-h-32 w-full rounded-lg border-[#CBD5E1] bg-white text-[13px] font-normal text-[#374151] focus:border-[#64748B] focus:ring-0"
          placeholder="Write your reply..."
          disabled={isReplyPending}
        />
        <div className="mt-2 flex justify-end text-[11px] tabular-nums text-[#64748B]">
          {reply.length.toLocaleString()} / {replyMaxLength.toLocaleString()}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[460px] text-[12px] leading-5 text-[#64748B]">
            Replies are saved first; email delivery is not guaranteed.
          </p>
          <button
            type="button"
            onClick={submitReply}
            disabled={isReplyPending || !validReply}
            className="focus-ring inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#111827] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isReplyPending ? "Sending…" : "Send reply"}
          </button>
        </div>
        {replyMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{replyMessage}</p> : null}
        {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}

export function SupportTicketStatusControl({ ticketId, status }: { ticketId: string; status: SupportStatus }) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>(status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();

  function updateStatus() {
    if (selectedStatus === status || isStatusPending) return;
    setStatusMessage(null);
    setError(null);
    startStatusTransition(async () => {
      try {
        const response = await fetch("/api/admin/support/" + encodeURIComponent(ticketId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(typeof payload.error === "string" ? payload.error : "Unable to update ticket status.");
          return;
        }
        setStatusMessage("Ticket status updated.");
        router.refresh();
      } catch {
        setError("Unable to update ticket status. Check your connection.");
      }
    });
  }

  return (
    <section aria-labelledby="support-ticket-controls-heading" className={panel}>
      <h3 id="support-ticket-controls-heading" className="border-b border-[#E2E8F0] px-4 py-3.5 text-[15px] font-semibold text-[#111827]">
        Manage ticket
      </h3>
      <fieldset disabled={isStatusPending} className="min-w-0 px-4 py-4 disabled:opacity-70">
        <span className="mb-2 block text-[12px] font-medium text-[#64748B]">Status</span>
        <div className="flex min-h-11 items-center rounded-lg border border-[#CBD5E1] px-3">
          <AdminDirectorySelect
            key={ticketId + "-" + status}
            label="Ticket status"
            name="status"
            value={status}
            options={statusChoices}
            plain
            onValueChange={value => { setSelectedStatus(value as SupportStatus); setStatusMessage(null); setError(null); }}
          />
        </div>
        <button
          type="button"
          onClick={updateStatus}
          disabled={isStatusPending || selectedStatus === status}
          className="focus-ring mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#CBD5E1] px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#64748B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStatusPending ? "Saving…" : "Save status"}
        </button>
        {statusMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{statusMessage}</p> : null}
        {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
      </fieldset>
    </section>
  );
}
