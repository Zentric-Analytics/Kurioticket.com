"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton, AdminSelect, AdminTextarea } from "@/components/admin/AdminPageShell";
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
      setReplyMessage("Reply recorded. Email delivery is not confirmed.");
      router.refresh();
      } catch {
        setError("Unable to send reply. Check the conversation before retrying.");
      }
    });
  }

  return (
    <section aria-labelledby="support-reply-heading" className="rounded-lg border border-[#E5E7EB] bg-white px-5 py-4">
      <h3 id="support-reply-heading" className="text-[14px] font-semibold text-[#111827]">Reply to customer</h3>
      <p className="mt-1 break-all text-[12px] text-[#64748B]">To: {recipientEmail}</p>
      <label className="mt-4 block" htmlFor="support-reply-body">
        <span className="sr-only">Reply message</span>
        <AdminTextarea
          id="support-reply-body"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={5}
          className="w-full text-[13px]"
          placeholder="Write your reply..."
          disabled={isReplyPending}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AdminButton type="button" onClick={submitReply} loading={isReplyPending} disabled={isReplyPending || reply.trim().length < 2} aria-disabled={isReplyPending || reply.trim().length < 2}>
          {isReplyPending ? "Sending" : "Send reply"}
        </AdminButton>
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
    <section aria-labelledby="support-ticket-controls-heading" className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-4">
      <h3 id="support-ticket-controls-heading" className="text-[14px] font-semibold text-[#111827]">Ticket management</h3>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Change the workflow status without sending a customer reply.</p>
      <label className="mt-4 block" htmlFor="support-ticket-status">
        <span className="mb-1 block text-[11px] font-medium text-[#64748B]">Status</span>
        <AdminSelect id="support-ticket-status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as SupportStatus)} disabled={isStatusPending} className="w-full">
          {supportTicketStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </AdminSelect>
      </label>
      <div className="mt-3">
        <AdminButton type="button" variant="secondary" onClick={updateStatus} loading={isStatusPending} disabled={isStatusPending || selectedStatus === status} aria-disabled={isStatusPending || selectedStatus === status}>
          {isStatusPending ? "Saving" : "Save status"}
        </AdminButton>
      </div>
      {statusMessage ? <p className="mt-3 text-[12px] font-medium text-emerald-700" role="status" aria-live="polite">{statusMessage}</p> : null}
      {error ? <p className="mt-3 text-[12px] font-medium text-rose-700" role="alert">{error}</p> : null}
    </section>
  );
}
