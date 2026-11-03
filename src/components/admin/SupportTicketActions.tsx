"use client";

import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { supportStatusTabs } from "@/lib/adminSupportInboxNavigation";
import { supportTicketStatuses } from "@/lib/supportTickets";

type SupportStatus = (typeof supportTicketStatuses)[number];
const replyMaxLength = 4000;
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
    <section aria-labelledby="support-reply-heading" className="min-w-0">
      <h3 id="support-reply-heading" className="mb-2 text-[14px] font-semibold leading-5 text-[#111827]">Reply</h3>
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#D9DDE3] bg-white">
        <label htmlFor="support-reply-body" className="sr-only">Reply message</label>
        <textarea
          id="support-reply-body"
          value={reply}
          onChange={event => setReply(event.target.value)}
          maxLength={replyMaxLength}
          rows={5}
          className="block h-[116px] min-h-[116px] w-full resize-y border-0 bg-white px-4 py-3 text-[13px] leading-5 text-[#374151] outline-none placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B9C6EA]"
          placeholder="Write your reply..."
          disabled={isReplyPending}
        />
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-3 bg-[#F8FAFC] px-4 py-2">
          <p className="inline-flex min-w-0 items-center gap-2 text-[11px] leading-5 text-[#64748B]">
            <Info size={13} aria-hidden="true" className="shrink-0" />
            Replies are saved first; email delivery is not guaranteed.
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <span className="whitespace-nowrap text-[11px] tabular-nums text-[#64748B]">{reply.length.toLocaleString()} / {replyMaxLength.toLocaleString()}</span>
            <button
              type="button"
              onClick={submitReply}
              disabled={isReplyPending || !validReply}
              className="focus-ring inline-flex h-9 items-center justify-center rounded-lg bg-[#3154EF] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2445D7] disabled:cursor-not-allowed disabled:opacity-75"
            >
              {isReplyPending ? "Sending…" : "Send reply"}
            </button>
          </div>
        </div>
      </div>
      {replyMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{replyMessage}</p> : null}
      {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
    </section>
  );
}

export function SupportTicketStatusControl({ ticketId, status }: { ticketId: string; status: SupportStatus }) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>(status);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStatusPending, startStatusTransition] = useTransition();

  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

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
    <section aria-labelledby="support-ticket-controls-heading" className="min-w-0">
      <h3 id="support-ticket-controls-heading" className="border-b border-[#E5E7EB] pb-2.5 text-[14px] font-semibold leading-5 text-[#111827]">
        Manage ticket
      </h3>
      <fieldset disabled={isStatusPending} className="min-w-0 pt-3">
        <span className="mb-1 block text-[12px] font-medium text-[#64748B]">Status</span>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="min-w-0 rounded-lg border border-[#D9DDE3] bg-white px-2.5 [&_button]:h-9 [&_button]:w-full [&_button]:justify-between [&_select]:h-9 [&_select]:w-full [&_select]:border-0 [&_select]:bg-transparent">
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
            className="focus-ring inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-[#D9DDE3] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors hover:border-[#64748B] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isStatusPending ? "Saving…" : "Save status"}
          </button>
        </div>
        {statusMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{statusMessage}</p> : null}
        {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
      </fieldset>
    </section>
  );
}
