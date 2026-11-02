"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminTextarea } from "@/components/admin/AdminPageShell";
import { supportTicketStatuses } from "@/lib/supportTickets";

type SupportStatus = (typeof supportTicketStatuses)[number];

export function SupportReplyForm({ ticketId, recipientEmail }: { ticketId: string; recipientEmail: string }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReplyPending, startReplyTransition] = useTransition();

  function submitReply() {
    setReplyMessage(null);
    setError(null);
    startReplyTransition(async () => {
      try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
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
      setReplyMessage(payload.emailStatus === "accepted" ? "Reply saved. Email accepted by provider; delivery is not confirmed." : payload.emailStatus === "failed" ? "Reply saved, but email sending failed. Check email delivery records." : "Reply saved. Email sending status is unknown; check email delivery records.");
      router.refresh();
      } catch {
        setError("Unable to send reply. Check the conversation before retrying.");
      }
    });
  }

  return (
    <section aria-labelledby="support-reply-heading" className="border-b border-[#E5E7EB] bg-transparent px-2 py-4">
      <h3 id="support-reply-heading" className="text-[14px] font-semibold text-[#111827]">Reply to customer</h3>
      <p className="mt-1 break-all text-[12px] text-[#64748B]">To: {recipientEmail}</p>
      <label className="mt-4 block" htmlFor="support-reply-body">
        <span className="sr-only">Reply message</span>
        <AdminTextarea
          id="support-reply-body"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={5}
          className="w-full rounded-none border-[#AEB8C6] bg-transparent text-[13px] font-medium text-[#374151] focus:border-[#004BB8] focus:ring-[#004BB8]/10"
          placeholder="Write your reply..."
          disabled={isReplyPending}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submitReply} disabled={isReplyPending || reply.trim().length < 2} aria-disabled={isReplyPending || reply.trim().length < 2} className="inline-flex h-9 items-center justify-center bg-[#111827] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-55">
          {isReplyPending ? "Sending" : "Send reply"}
        </button>
        {replyMessage ? <p className="text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{replyMessage}</p> : null}
      </div>
      {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
      <p className="mt-3 text-[11px] leading-5 text-[#64748B]">Replies are saved in this conversation and email sending is attempted separately. Email delivery confirmation is not available here.</p>
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
    <section aria-labelledby="support-ticket-controls-heading" className="border-b border-[#E5E7EB] bg-transparent px-2 py-4">
      <h3 id="support-ticket-controls-heading" className="text-[14px] font-semibold text-[#111827]">Ticket management</h3>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Change the workflow status without sending a customer reply.</p>
      <label className="mt-4 block" htmlFor="support-ticket-status">
        <span className="mb-1 block text-[11px] font-medium text-[#64748B]">Status</span>
        <select id="support-ticket-status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as SupportStatus)} disabled={isStatusPending} className="h-9 w-full cursor-pointer border-0 border-b border-[#AEB8C6] bg-transparent text-[13px] font-semibold text-[#475569] outline-none focus:border-[#004BB8]">{supportTicketStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
      </label>
      <div className="mt-3">
        <button type="button" onClick={updateStatus} disabled={isStatusPending || selectedStatus === status} aria-disabled={isStatusPending || selectedStatus === status} className="inline-flex h-9 items-center justify-center border border-[#AEB8C6] px-4 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#004BB8] disabled:cursor-not-allowed disabled:opacity-55">
          {isStatusPending ? "Saving" : "Save status"}
        </button>
      </div>
      {statusMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{statusMessage}</p> : null}
      {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
    </section>
  );
}
