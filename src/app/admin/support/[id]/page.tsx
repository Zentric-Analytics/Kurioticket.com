import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SupportReplyForm, SupportTicketStatusControl } from "@/components/admin/SupportTicketActions";
import { formatDateTime } from "@/lib/admin-data";
import type { AdminSupportDetail, AdminSupportPriority, AdminSupportStatus } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = { params: Promise<{ id: string }> };

const statuses: Record<AdminSupportStatus, { label: string; dot: string; text: string }> = {
  OPEN: { label: "Open", dot: "bg-amber-400", text: "text-[#6B4A10]" },
  WAITING_ON_TEAM: { label: "Awaiting team", dot: "bg-orange-400", text: "text-[#92400E]" },
  WAITING_ON_USER: { label: "Awaiting customer", dot: "bg-[#004BB8]", text: "text-[#004BB8]" },
  RESOLVED: { label: "Resolved", dot: "bg-emerald-500", text: "text-emerald-700" },
  CLOSED: { label: "Closed", dot: "bg-slate-400", text: "text-[#64748B]" },
};

function priorityColor(priority: AdminSupportPriority) {
  return priority === "URGENT" ? "text-rose-700" : priority === "HIGH" ? "text-amber-700" : "text-[#475569]";
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function senderName(author: string, ticket: AdminSupportDetail) {
  if (author === "admin") return "Support team";
  if (author === "user" || author === "guest") return ticket.user?.name || "Customer";
  return humanize(author);
}

export default async function AdminSupportTicketPage({ params }: PageProps) {
  const { id } = await params;
  const result = await adminOperationalReads.support.detail(id);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Support ticket" hideHeader>
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <Link
          href="/admin/support"
          className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#475569] transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/20"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Support
        </Link>

        {result.status === "ok" ? <TicketContent ticket={result.data} /> : (
          <div className="border-y border-[#E5E7EB] px-2 py-10">
            <h2 className="text-[15px] font-semibold text-[#111827]">
              {result.status === "invalid" ? "Invalid ticket reference" : result.status === "forbidden" ? "Admin access required" : "Ticket details unavailable"}
            </h2>
            <p className="mt-2 text-[12px] text-[#64748B]">
              {"issues" in result
                ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ")
                : "This ticket could not be loaded. It has not been treated as an empty conversation."}
            </p>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}

function TicketContent({ ticket }: { ticket: AdminSupportDetail }) {
  const status = statuses[ticket.status];
  const contactName = ticket.user?.name || (ticket.identity.kind === "registered" ? "Registered customer" : "Guest customer");
  const contextFields = Object.entries(ticket.source);

  return (
    <>
      <header className="border-b border-[#E5E7EB] px-2 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">Support ticket</p>
            <h2 className="mt-2 max-w-[900px] break-words text-[20px] font-semibold leading-7 tracking-tight text-[#111827]">
              {ticket.subject}
            </h2>
            <p className="mt-2 break-all text-[12px] text-[#64748B]">
              {humanize(ticket.category)} · Ticket ID: {ticket.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={"inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[12px] font-semibold " + status.text}>
              <span className={"h-1.5 w-1.5 rounded-full " + status.dot} aria-hidden="true" />
              {status.label}
            </span>
            <span className={"rounded-md border border-[#E5E7EB] px-3 py-1.5 text-[12px] font-semibold " + priorityColor(ticket.priority)}>
              {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()} priority
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#64748B]">
          <span>Created {formatDateTime(new Date(ticket.createdAt))}</span>
          <span>Updated {formatDateTime(new Date(ticket.updatedAt))}</span>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="support-conversation-heading" className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] px-5 py-4">
              <h3 id="support-conversation-heading" className="text-[14px] font-semibold text-[#111827]">Conversation</h3>
              <span className="text-[12px] text-[#64748B]">
                {ticket.messages.length} {ticket.messages.length === 1 ? "message" : "messages"}
              </span>
            </div>

            {ticket.messages.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-[#64748B]">No messages have been recorded for this ticket.</p>
            ) : (
              <ol className="divide-y divide-[#E5E7EB]">
                {ticket.messages.map((message) => {
                  const fromSupport = message.author === "admin";
                  return (
                    <li key={message.id} className={"px-5 py-5 " + (fromSupport ? "bg-[#F7FAFF]" : "bg-white")}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold " +
                              (fromSupport ? "bg-[#E5EFFF] text-[#004BB8]" : "bg-[#F0F2F5] text-[#475569]")
                            }
                          >
                            {fromSupport ? "S" : "C"}
                          </span>
                          <div>
                            <p className="text-[13px] font-semibold text-[#111827]">{senderName(message.author, ticket)}</p>
                            <p className="text-[11px] text-[#64748B]">{fromSupport ? "Admin reply" : "Customer message"}</p>
                          </div>
                        </div>
                        <time dateTime={message.createdAt} className="text-[11px] text-[#64748B]">
                          {formatDateTime(new Date(message.createdAt))}
                        </time>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#374151]">{message.body}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <SupportReplyForm ticketId={ticket.id} recipientEmail={ticket.email} />
        </div>

        <aside aria-label="Ticket information and management" className="min-w-0 space-y-5">
          <SupportTicketStatusControl ticketId={ticket.id} status={ticket.status} />

          <section aria-labelledby="support-customer-heading" className="rounded-lg border border-[#E5E7EB] bg-white">
            <h3 id="support-customer-heading" className="border-b border-[#E5E7EB] px-4 py-3 text-[14px] font-semibold text-[#111827]">Customer</h3>
            <dl className="space-y-3 px-4 py-4">
              <Info label="Name" value={contactName} />
              <Info label="Email" value={ticket.email || "—"} />
              <Info label="Account" value={ticket.identity.kind === "registered" ? "Registered" : "Guest"} />
            </dl>
          </section>

          <section aria-labelledby="support-reference-heading" className="rounded-lg border border-[#E5E7EB] bg-white">
            <h3 id="support-reference-heading" className="border-b border-[#E5E7EB] px-4 py-3 text-[14px] font-semibold text-[#111827]">Ticket information</h3>
            <dl className="space-y-3 px-4 py-4">
              <Info label="Category" value={humanize(ticket.category)} />
              <Info label="Priority" value={ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()} />
              <Info label="Created" value={formatDateTime(new Date(ticket.createdAt))} />
              <Info label="Last updated" value={formatDateTime(new Date(ticket.updatedAt))} />
            </dl>
            {ticket.identity.userId ? (
              <details className="border-t border-[#E5E7EB] px-4 py-3">
                <summary className="cursor-pointer text-[12px] font-medium text-[#475569] hover:text-[#004BB8]">
                  Account reference
                </summary>
                <p className="mt-2 break-all text-[12px] text-[#64748B]">{ticket.identity.userId}</p>
              </details>
            ) : null}
          </section>

          {contextFields.length ? (
            <section aria-labelledby="support-source-heading" className="rounded-lg border border-[#E5E7EB] bg-white">
              <h3 id="support-source-heading" className="border-b border-[#E5E7EB] px-4 py-3 text-[14px] font-semibold text-[#111827]">Request context</h3>
              <dl className="space-y-3 px-4 py-4">
                {contextFields.map(([key, value]) => (
                  <Info key={key} label={humanize(key)} value={humanize(value)} />
                ))}
              </dl>
            </section>
          ) : null}

          {ticket.deletionRequestId ? (
            <div className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-4">
              <p className="text-[13px] font-semibold text-[#111827]">Linked account deletion</p>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">This ticket is connected to an account deletion request.</p>
              <Link
                href={"/admin/account-deletions/" + encodeURIComponent(ticket.deletionRequestId)}
                className="mt-3 inline-flex text-[12px] font-semibold text-[#004BB8] hover:underline"
              >
                View deletion request
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-[13px] font-medium text-[#374151]">{value}</dd>
    </div>
  );
}
