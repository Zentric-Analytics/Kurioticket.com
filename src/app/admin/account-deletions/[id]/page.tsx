import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { AccountDeletionManageForm } from "@/components/admin/AccountDeletionManageForm";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { deletionRequestBackHref, supportTicketFromDeletionHref } from "@/lib/adminSupportInboxNavigation";
import { getAdminAccountDeletionDetail, type AdminAccountDeletionDetail } from "@/services/adminAccountDeletionDetailService";

export const metadata = { title: "Admin Account Deletion Request" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromSupport?: string | string[]; inbox?: string | string[] }>;
};

const sectionTitle = "border-b border-[#E5E7EB] pb-2.5 text-[14px] font-semibold leading-5 text-[#111827]";
const statusView: Record<AdminAccountDeletionDetail["status"], { label: string; dot: string; description: string }> = {
  PENDING: {
    label: "Pending",
    dot: "bg-amber-400",
    description: "The deletion request is in its grace period. No finalization can happen until its scheduled review date.",
  },
  READY_FOR_REVIEW: {
    label: "Ready for review",
    dot: "bg-[#D97706]",
    description: "The grace period has ended. An admin must complete the retention review and confirm the account email before finalization.",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-[#64748B]",
    description: "This deletion request was cancelled, commonly because the account was reactivated during its grace period.",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-emerald-500",
    description: "The account deletion workflow has completed its retention review and data finalization.",
  },
};

function daysRemaining(scheduledAt: string) {
  return Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(120px,35%)_minmax(0,1fr)] gap-x-4 gap-y-1 py-1.5 text-[13px] leading-5">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-[#334155]">{children}</dd>
    </div>
  );
}

export default async function AdminAccountDeletionDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await getAdminAccountDeletionDetail(id);
  if (result.status === "not_found") notFound();

  const request = result.status === "ok" ? result.data : null;
  const fromSupport = typeof query.fromSupport === "string" ? query.fromSupport : undefined;
  const inbox = typeof query.inbox === "string" ? query.inbox : undefined;
  // A link is contextual only if the authorized detail includes an actual linked Support ticket.
  const backHref = deletionRequestBackHref(request?.supportTicketId ?? null, fromSupport, inbox);
  const contextual = request?.supportTicketId && fromSupport === "1";
  const remaining = request ? daysRemaining(request.deletionScheduledAt) : 0;
  const readyForReview = request?.status === "PENDING" && remaining <= 0;
  const canFinalize = request?.status === "READY_FOR_REVIEW";

  return (
    <AdminPageShell title="Account deletion request" hideHeader>
      <div className="mx-auto w-full max-w-[1138px] text-[#374151]">
        <Link href={backHref} className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]">
          <ArrowLeft size={14} aria-hidden="true" /> {contextual ? "Back to Support ticket" : "Back to deletion requests"}
        </Link>

        {!request ? (
          <section className="py-10">
            <h2 className="text-[16px] font-semibold text-[#111827]">{result.status === "forbidden" ? "Admin access required" : "Deletion request unavailable"}</h2>
            <p className="mt-2 text-[13px] text-[#64748B]">The account deletion detail reader could not safely return this request.</p>
          </section>
        ) : (
          <>
            <header className="flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="break-words text-[28px] font-semibold leading-9 tracking-tight text-[#111827]">Account deletion request</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F2F5] px-2.5 py-1 text-[12px] font-medium leading-4 text-[#475569]">
                <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + statusView[request.status].dot} />
                {statusView[request.status].label}
              </span>
            </header>

            <div className="mt-5 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 xl:gap-14">
              <div className="min-w-0 space-y-6">
                <section aria-labelledby="deletion-lifecycle-heading">
                  <h3 id="deletion-lifecycle-heading" className={sectionTitle}>Deletion lifecycle</h3>
                  <p className="mt-3 text-[13px] leading-6 text-[#475569]">
                    {readyForReview
                      ? "The 7-day deadline has passed. The request can now be marked ready for final review."
                      : request.status === "PENDING"
                        ? "Grace period: " + Math.max(remaining, 0) + " day" + (Math.max(remaining, 0) === 1 ? "" : "s") + " remaining."
                        : statusView[request.status].description}
                  </p>
                  <dl className="mt-3">
                    <DetailField label="Requested">{formatDateTime(new Date(request.requestedAt))}</DetailField>
                    <DetailField label="Scheduled">{formatDateTime(new Date(request.deletionScheduledAt))}</DetailField>
                    {request.cancelledAt ? <DetailField label="Cancelled">{formatDateTime(new Date(request.cancelledAt))}</DetailField> : null}
                    {request.completedAt ? <DetailField label="Completed">{formatDateTime(new Date(request.completedAt))}</DetailField> : null}
                  </dl>
                </section>

                <section aria-labelledby="deletion-account-heading">
                  <h3 id="deletion-account-heading" className={sectionTitle}>Account information</h3>
                  <dl className="mt-3">
                    <DetailField label="Email"><span className="[overflow-wrap:anywhere]">{request.userEmail || "—"}</span></DetailField>
                    <DetailField label="Account status">{request.userStatus.replaceAll("_", " ")}</DetailField>
                    <DetailField label="Role">{request.userRole}</DetailField>
                    <DetailField label="User ID"><span className="[overflow-wrap:anywhere] text-[12px]">{request.userId}</span></DetailField>
                  </dl>
                </section>

                <section aria-labelledby="deletion-record-heading">
                  <h3 id="deletion-record-heading" className={sectionTitle}>Request details</h3>
                  <dl className="mt-3">
                    <DetailField label="Request ID"><span className="[overflow-wrap:anywhere] text-[12px]">{request.id}</span></DetailField>
                    {request.adminReference ? <DetailField label="Admin reference"><span className="[overflow-wrap:anywhere]">{request.adminReference}</span></DetailField> : null}
                  </dl>
                </section>
              </div>

              <aside aria-label="Deletion request management and related Support ticket" className="min-w-0 space-y-6">
                <AccountDeletionManageForm
                  requestId={request.id}
                  status={request.status}
                  accountEmail={request.userEmail}
                  reviewNotes={request.reviewNotes}
                  adminReference={request.adminReference}
                  readyForReview={readyForReview}
                  canFinalize={canFinalize}
                />

                {request.supportTicketId ? (
                  <section aria-labelledby="deletion-linked-ticket-heading" className="min-w-0">
                    <h3 id="deletion-linked-ticket-heading" className={sectionTitle}>Linked Support ticket</h3>
                    <p className="mt-2 text-[12px] leading-5 text-[#64748B]">This deletion request is connected to a customer Support conversation.</p>
                    <Link
                      href={supportTicketFromDeletionHref(request.supportTicketId, request.id, fromSupport, inbox)}
                      className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-[#004BB8] hover:underline"
                    >
                      View Support ticket <ExternalLink size={13} aria-hidden="true" />
                    </Link>
                  </section>
                ) : null}
              </aside>
            </div>
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
