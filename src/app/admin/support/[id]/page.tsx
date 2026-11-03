import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SupportReplyForm, SupportTicketStatusControl } from "@/components/admin/SupportTicketActions";
import { formatDateTime } from "@/lib/admin-data";
import { supportCategoryLabel, supportInboxReturnHref } from "@/lib/adminSupportInboxNavigation";
import type { AdminSupportDetail } from "@/services/adminOperationalReadContract";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inbox?: string | string[] }>;
};

function senderName(author: string, ticket: AdminSupportDetail) {
  if (author === "admin") return "Support team";
  if (author === "user" || author === "guest") return ticket.user?.name || "Requester";
  return author.replaceAll("_", " ").replaceAll("-", " ");
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(90px,38%)_minmax(0,1fr)] items-start gap-x-3 gap-y-1 py-2.5 text-[13px]">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-[#334155]">{children}</dd>
    </div>
  );
}

const panel = "min-w-0 rounded-xl border border-[#E2E8F0] bg-white";
const heading = "text-[15px] font-semibold leading-6 text-[#111827]";

export default async function AdminSupportTicketPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const backHref = supportInboxReturnHref(typeof query?.inbox === "string" ? query.inbox : undefined);
  const result = await adminOperationalReads.support.detail(id);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell title="Support ticket" hideHeader>
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        <Link href={backHref} className="focus-ring mb-5 inline-flex items-center gap-2 rounded-sm text-[13px] font-medium text-[#475569] hover:text-[#004BB8]">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Support
        </Link>

        {result.status === "ok" ? <TicketContent ticket={result.data} /> : (
          <section className="border-y border-[#E5E7EB] px-3 py-10">
            <h2 className={heading}>
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

  return (
    <>
      <header className="min-w-0 border-b border-[#E2E8F0] pb-5">
        <h2 className="max-w-[1000px] break-words text-[22px] font-semibold leading-8 tracking-tight text-[#111827]">
          {ticket.subject}
        </h2>
      </header>

      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(290px,340px)] xl:gap-7">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="support-conversation-heading" className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4">
              <h3 id="support-conversation-heading" className={heading}>Conversation</h3>
              <span className="text-[12px] text-[#64748B]">
                {ticket.messages.length} {ticket.messages.length === 1 ? "message" : "messages"}
              </span>
            </div>
            {ticket.messages.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-[#64748B]">No messages have been recorded for this ticket.</p>
            ) : (
              <ol className="divide-y divide-[#E2E8F0]">
                {ticket.messages.map(message => {
                  const fromSupport = message.author === "admin";
                  return (
                    <li key={message.id} className="px-5 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span aria-hidden="true" className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold " + (fromSupport ? "bg-[#E5EFFF] text-[#004BB8]" : "bg-[#F1F5F9] text-[#334155]")}>
                            {fromSupport ? "S" : "R"}
                          </span>
                          <span className="min-w-0 break-words text-[13px] font-semibold text-[#111827]">
                            {senderName(message.author, ticket)}
                          </span>
                        </div>
                        <time dateTime={message.createdAt} className="shrink-0 text-[12px] text-[#64748B]">
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

          <SupportReplyForm ticketId={ticket.id} />
        </div>

        <aside aria-label="Ticket information and management" className="min-w-0 space-y-5">
          <SupportTicketStatusControl ticketId={ticket.id} status={ticket.status} />

          <section aria-labelledby="support-requester-heading" className={panel}>
            <h3 id="support-requester-heading" className={heading + " border-b border-[#E2E8F0] px-4 py-3.5"}>Requester</h3>
            <dl className="divide-y divide-[#F1F5F9] px-4 py-1">
              <DetailField label="Name">{contactName}</DetailField>
              <DetailField label="Email"><span className="[overflow-wrap:anywhere]">{ticket.email || "—"}</span></DetailField>
              <DetailField label="Account">{ticket.identity.kind === "registered" ? "Registered" : "Guest"}</DetailField>
            </dl>
          </section>

          <section aria-labelledby="support-details-heading" className={panel}>
            <h3 id="support-details-heading" className={heading + " border-b border-[#E2E8F0] px-4 py-3.5"}>Ticket details</h3>
            <dl className="divide-y divide-[#F1F5F9] px-4 py-1">
              <DetailField label="Category">{supportCategoryLabel(ticket.category)}</DetailField>
              <DetailField label="Priority">
                <span className={ticket.priority === "URGENT" ? "text-rose-700" : ticket.priority === "HIGH" ? "text-amber-700" : ""}>
                  {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                </span>
              </DetailField>
              <DetailField label="Created">{formatDateTime(new Date(ticket.createdAt))}</DetailField>
              <DetailField label="Updated">{formatDateTime(new Date(ticket.updatedAt))}</DetailField>
              <DetailField label="Ticket ID"><span className="break-all text-[12px]">{ticket.id}</span></DetailField>
            </dl>
            {ticket.identity.userId ? (
              <details className="group border-t border-[#E2E8F0] px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-[#475569] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] [&::-webkit-details-marker]:hidden">
                  Account reference <ChevronDown size={14} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 break-all text-[12px] text-[#64748B]">{ticket.identity.userId}</p>
              </details>
            ) : null}
          </section>

          {contextFields.length ? (
            <section aria-label="Request context" className={panel}>
              <details className="group">
                <summary className={heading + " flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] [&::-webkit-details-marker]:hidden"}>
                  Request context <ChevronDown size={15} aria-hidden="true" className="shrink-0 text-[#475569] transition-transform group-open:rotate-180" />
                </summary>
                <dl className="divide-y divide-[#F1F5F9] border-t border-[#E2E8F0] px-4 py-1">
                  {contextFields.map(([key, value]) => (
                    <DetailField key={key} label={key.replaceAll("_", " ").replaceAll("-", " ")}>
                      {value}
                    </DetailField>
                  ))}
                </dl>
              </details>
            </section>
          ) : null}

          {ticket.deletionRequestId ? (
            <section className={panel + " px-4 py-4"}>
              <h3 className={heading}>Linked account deletion</h3>
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
