"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AdminButton, AdminSectionCard, AdminSelect, AdminTextarea } from "@/components/admin/AdminPageShell";
import { supportTicketStatuses } from "@/lib/supportTickets";

type SupportStatus = (typeof supportTicketStatuses)[number];

export function SupportTicketActions({ ticketId, status }: { ticketId: string; status: SupportStatus }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>(status);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReplyPending, startReplyTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();

  function submitReply() {
    setReplyMessage(null);
    setStatusMessage(null);
    setError(null);
    startReplyTransition(async () => {
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
      setReplyMessage("Reply sent.");
      router.refresh();
    });
  }

  function updateStatus() {
    setReplyMessage(null);
    setStatusMessage(null);
    setError(null);
    startStatusTransition(async () => {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to update status.");
        return;
      }
      setStatusMessage("Ticket status updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <AdminSectionCard className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Reply to customer</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Send a visible support reply to the ticket email address.</p>
        </div>
        <label className="block" htmlFor="support-reply-body">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Reply message</span>
          <AdminTextarea
            id="support-reply-body"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={6}
            className="mt-2"
            placeholder="Write a concise support reply..."
            disabled={isReplyPending}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton type="button" onClick={submitReply} loading={isReplyPending} disabled={reply.trim().length < 2} aria-disabled={isReplyPending || reply.trim().length < 2}>
            {isReplyPending ? "Sending" : "Reply"}
          </AdminButton>
          {replyMessage ? <p className="text-sm font-bold text-emerald-700" role="status" aria-live="polite">{replyMessage}</p> : null}
        </div>
      </AdminSectionCard>

      <AdminSectionCard className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Ticket controls</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Update the ticket lifecycle status without sending a customer email.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,280px)_auto] sm:items-end">
          <label className="block" htmlFor="support-ticket-status">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Ticket status</span>
            <AdminSelect
              id="support-ticket-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as SupportStatus)}
              disabled={isStatusPending}
              className="mt-2"
            >
              {supportTicketStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </AdminSelect>
          </label>
          <AdminButton type="button" variant="secondary" onClick={updateStatus} loading={isStatusPending} disabled={selectedStatus === status} aria-disabled={isStatusPending || selectedStatus === status}>
            {isStatusPending ? "Saving" : "Save status"}
          </AdminButton>
        </div>
        {statusMessage ? <p className="text-sm font-bold text-emerald-700" role="status" aria-live="polite">{statusMessage}</p> : null}
      </AdminSectionCard>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p> : null}
    </div>
  );
}
