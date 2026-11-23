import { AdminLocalDateTime } from "@/components/admin/AdminTimeZoneProvider";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { CaseDetailHeading, CaseSidebarField, caseAsideClass, caseColumnsClass, caseMainClass, casePageClass } from "@/components/admin/AdminCaseDetailUI";
import { SupportReplyForm, SupportTicketStatusControl } from "@/components/admin/SupportTicketActions";
import { LinkedCasePreview } from "@/components/admin/LinkedCasePreview";
import { supportCategoryLabel, supportTicketBackHref } from "@/lib/adminSupportInboxNavigation";
import type { AdminSupportDetail, AdminSupportStatus } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inbox?: string | string[]; fromDeletion?: string | string[]; fromSupport?: string | string[] }>;
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

export default async function AdminSupportTicketPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await adminOperationalReads.support.detail(id);
  if (result.status === "not_found") notFound();
  const inbox = typeof query?.inbox === "string" ? query.inbox : undefined;
  const fromDeletion = typeof query?.fromDeletion === "string" ? query.fromDeletion : undefined;
  const fromSupport = typeof query?.fromSupport === "string" ? query.fromSupport : undefined;
  const verifiedDeletionId = result.status === "ok" ? result.data.deletionRequestId : null;
  const backHref = supportTicketBackHref(verifiedDeletionId, fromDeletion, inbox, fromSupport);
  const backLabel = verifiedDeletionId && fromDeletion === verifiedDeletionId ? "Back to deletion request" : "Back to Support";

  return (
    <AdminPageShell title="Support ticket" hideHeader>
      <div className={casePageClass}>
        <Link href={backHref} className="focus-ring mb-4 inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-[12px] font-medium text-[#64748B] transition-colors hover:text-[#004BB8]">
          <ArrowLeft size={14} aria-hidden="true" /> {backLabel}
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
      <CaseDetailHeading title={ticket.subject} status={pill.label} dot={pill.dot} />

      <div className={caseColumnsClass}>
        <div className={caseMainClass}>
          <section aria-labelledby="support-conversation-heading" className="min-w-0">
            <h2 id="support-conversation-heading" className="border-b border-[#E7ECF5] pb-3 text-[14px] font-semibold leading-5 text-[#0F172A]">Conversation</h2>
            {ticket.messages.length === 0 ? (
              <p className="py-5 text-[13px] text-[#64748B]">No messages have been recorded for this ticket.</p>
            ) : (
              <ol className="divide-y divide-[#F1F5F9] pt-1">
                {ticket.messages.map(message => {
                  const fromSupport = message.author === "admin";
                  return (
                    <li key={message.id} className="flex min-w-0 items-start gap-3 py-4">
                      <span aria-hidden="true" className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold " + (fromSupport ? "bg-[#E5EFFF] text-[#004BB8]" : "bg-[#EDF0FF] text-[#4058BA]")}>
                        {fromSupport ? "S" : "R"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <span className="min-w-0 break-words text-[13px] font-semibold text-[#111827]">{senderName(message.author, ticket)}</span>
                          <AdminLocalDateTime value={message.createdAt} className="shrink-0 text-[11px] text-[#64748B]" />
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#374151]">{message.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="min-w-0">
            <SupportReplyForm ticketId={ticket.id} />
          </div>

          {contextFields.length ? (
            <details className="group min-w-0 rounded-xl border border-[#E7ECF5] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] [&::-webkit-details-marker]:hidden">
                Request context
                <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-[#64748B] transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid min-w-0 gap-x-6 gap-y-4 border-t border-[#E7ECF5] px-4 py-4 sm:grid-cols-2">
                {contextFields.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-[12px] text-[#64748B]">{key.replaceAll("_", " ").replaceAll("-", " ")}</dt>
                    <dd className="mt-1 break-words text-[13px] font-medium text-[#334155]">{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}

          {ticket.deletionRequestId ? (
            <section aria-label="Related deletion request" className="min-w-0 border-t border-[#E7ECF5] pt-5">
              <h2 className="text-[14px] font-semibold text-[#0F172A]">Linked deletion request</h2>
              <LinkedCasePreview origin="support" sourceId={ticket.id} />
            </section>
          ) : null}
        </div>

        <aside aria-label="Ticket information and management" className={caseAsideClass}>
          <SupportTicketStatusControl ticketId={ticket.id} status={ticket.status} />

          <section aria-labelledby="support-requester-heading" className="min-w-0">
            <h2 id="support-requester-heading" className="border-b border-[#E7ECF5] pb-2.5 text-[14px] font-semibold text-[#0F172A]">Requester</h2>
            <dl className="space-y-0 pt-2">
              <CaseSidebarField label="Name">{contactName}</CaseSidebarField>
              <CaseSidebarField label="Email"><span className="[overflow-wrap:anywhere]">{ticket.email || "—"}</span></CaseSidebarField>
              <CaseSidebarField label="Account">
                <span className="inline-flex items-center rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[12px] leading-4 text-[#475569]">
                  {ticket.identity.kind === "registered" ? "Registered" : "Guest"}
                </span>
              </CaseSidebarField>
            </dl>
          </section>

          <section aria-labelledby="support-details-heading" className="min-w-0">
            <h2 id="support-details-heading" className="border-b border-[#E7ECF5] pb-2.5 text-[14px] font-semibold text-[#0F172A]">Ticket details</h2>
            <dl className="space-y-0 pt-2">
              <CaseSidebarField label="Category">{supportCategoryLabel(ticket.category)}</CaseSidebarField>
              <CaseSidebarField label="Priority">{ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}</CaseSidebarField>
              <CaseSidebarField label="Created"><AdminLocalDateTime value={ticket.createdAt} /></CaseSidebarField>
              <CaseSidebarField label="Updated"><AdminLocalDateTime value={ticket.updatedAt} /></CaseSidebarField>
              <CaseSidebarField label="Ticket ID"><span className="[overflow-wrap:anywhere] text-[12px]">{ticket.id}</span></CaseSidebarField>
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

        </aside>
      </div>
    </>
  );
}
