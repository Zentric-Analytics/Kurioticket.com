import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SupportReplyForm, SupportTicketStatusControl } from "@/components/admin/SupportTicketActions";
import { formatDateTime } from "@/lib/admin-data";
import { supportCategoryLabel, supportInboxReturnHref } from "@/lib/adminSupportInboxNavigation";
import type { AdminSupportDetail, AdminSupportStatus } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inbox?: string | string[] }>;
};

const statusPills: Record<AdminSupportStatus, { label: string; dot: string }> = {
  OPEN: { label: "Open", dot: "bg-amber-400" },
  WAITING_ON_USER: { label: "Awaiting customer", dot: "bg-[#004BB8]" },
  WAITING_ON_TEAM: { label: "Awaiting team", dot: "bg-orange-400" },
  RESOLVED: { label: "Resolved", dot: "bg-emerald-500" },
  CLOSED: { label: "Closed", dot: "bg-[#64748B]" },
};

function senderName(author: string, ticket: AdminSupportDetail) {
  if (author === "admin") return "Support team";
  if (author === "user" || author === "guest") return ticket.user?.name || "Requester";
  return author.replaceAll("_", " ").replaceAll("-", " ");
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[73px_minmax(0,1fr)] items-start gap-x-3 py-1 text-[13px] leading-5">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[#334155]">{children}</dd>
    </div>
  );
}

const sectionHeading = "border-b border-[#E5E7EB] pb-2.5 text-[14px] font-semibold leading-5 text-[#111827]";

export default async function AdminSupportTicketPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const backHref = supportInboxReturnHref(typeof query?.inbox === "string" ? query.inbox : undefined);
  const result = await adminOperationalReads.support.detail(id);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Support ticket" hideHeader>
      <div className="mx-auto w-full max-w-[1138px] text-[#374151]">
        <Link href={backHref} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]">
          <ArrowLeft size={14} aria-hidden="true" /> Back to Support
        </Link>

        {result.status === "ok" ? <TicketContent ticket={result.data} /> : (
          <section className="py-10">
            <h2 className="text-[16px] font-semibold text-[#111827]">
              {result.status === "invalid" ? "Invalid ticket reference" : result.status === "forbidden" ? "Admin access required" : "Ticket details unavailable"}
            </h2>
            <p className="mt-2 text-[13px] text-[#64748B]">
              {"issues" in result
                ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ")
                : "This ticket could not be loaded. No conversation data was changed."}
            </p>
          </section>
        )}
      </div>
    </AdminPageShell>
  );
}

function TicketContent({ ticket }: { ticket: AdminSupportDetail }) {
  const contextFields = Object.entries(ticket.source);
  const contactName = ticket.user?.name || (ticket.identity.kind === "registered" ? "Registered requester" : "Guest requester");
  const pill = statusPills[ticket.status];

  return (
    <>
      <header className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="min-w-0 max-w-[1000px] break-words text-[28px] font-semibold leading-9 tracking-tight text-[#111827]">{ticket.subject}</h2>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[12px] font-medium leading-4 text-[#475569]">
            <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + pill.dot} />
            {pill.label}
          </span>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
        <div className="min-w-0">
          <section aria-labelledby="support-conversation-heading" className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
              <h3 id="support-conversation-heading" className="text-[14px] font-semibold leading-5 text-[#111827]">Conversation</h3>
              <span className="shrink-0 text-[12px] text-[#64748B]">{ticket.messages.length} {ticket.messages.length === 1 ? "message" : "messages"}</span>
            </div>
            {ticket.messages.length === 0 ? (
              <p className="py-5 text-[13px] text-[#64748B]">No messages have been recorded for this ticket.</p>
            ) : (
              <ol className="space-y-5 pt-4">
                {ticket.messages.map(message => {
                  const fromSupport = message.author === "admin";
                  return (
                    <li key={message.id} className="flex min-w-0 items-start gap-3">
                      <span aria-hidden="true" className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold " + (fromSupport ? "bg-[#E5EFFF] text-[#004BB8]" : "bg-[#EDF0FF] text-[#4058BA]")}>
                        {fromSupport ? "S" : "R"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="min-w-0 break-words text-[13px] font-semibold text-[#111827]">{senderName(message.author, ticket)}</span>
                          <time dateTime={message.createdAt} className="shrink-0 text-[11px] text-[#64748B]">{formatDateTime(new Date(message.createdAt))}</time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#374151]">{message.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="mt-6">
            <SupportReplyForm ticketId={ticket.id} />
          </div>

          {contextFields.length ? (
            <details className="group mt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[#E5E7EB] py-3 text-[14px] font-semibold text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] [&::-webkit-details-marker]:hidden">
                Request context
                <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-[#64748B] transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid min-w-0 gap-x-6 gap-y-2 py-4 sm:grid-cols-2">
                {contextFields.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[12px] text-[#64748B]">{key.replaceAll("_", " ").replaceAll("-", " ")}</dt>
                    <dd className="mt-1 break-words text-[13px] font-medium text-[#334155]">{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>

        <aside aria-label="Ticket information and management" className="min-w-0 space-y-6">
          <SupportTicketStatusControl ticketId={ticket.id} status={ticket.status} />

          <section aria-labelledby="support-requester-heading" className="min-w-0">
            <h3 id="support-requester-heading" className={sectionHeading}>Requester</h3>
            <dl className="space-y-0 pt-2">
              <DetailField label="Name">{contactName}</DetailField>
              <DetailField label="Email"><span className="[overflow-wrap:anywhere]">{ticket.email || "—"}</span></DetailField>
              <DetailField label="Account">
                <span className="inline-flex items-center rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[12px] leading-4 text-[#475569]">
                  {ticket.identity.kind === "registered" ? "Registered" : "Guest"}
                </span>
              </DetailField>
            </dl>
          </section>

          <section aria-labelledby="support-details-heading" className="min-w-0">
            <h3 id="support-details-heading" className={sectionHeading}>Ticket details</h3>
            <dl className="space-y-0 pt-2">
              <DetailField label="Category">{supportCategoryLabel(ticket.category)}</DetailField>
              <DetailField label="Priority">{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}</DetailField>
              <DetailField label="Created">{formatDateTime(new Date(ticket.createdAt))}</DetailField>
              <DetailField label="Updated">{formatDateTime(new Date(ticket.updatedAt))}</DetailField>
              <DetailField label="Ticket ID"><span className="[overflow-wrap:anywhere] text-[12px]">{ticket.id}</span></DetailField>
            </dl>
            {ticket.identity.userId ? (
              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-[12px] font-medium text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] [&::-webkit-details-marker]:hidden">
                  Account reference
                  <ChevronDown size={14} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-1 break-all text-[12px] text-[#64748B]">{ticket.identity.userId}</p>
              </details>
            ) : null}
          </section>

          {ticket.deletionRequestId ? (
            <section className="min-w-0">
              <h3 className={sectionHeading}>Linked account deletion</h3>
              <Link href={"/admin/account-deletions/" + encodeURIComponent(ticket.deletionRequestId)} className="focus-ring mt-3 inline-flex rounded-sm text-[13px] font-medium text-[#004BB8] hover:underline">
                View deletion request
              </Link>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
