import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AccountDeletionManageForm } from "@/components/admin/AccountDeletionManageForm";
import { CaseDetailHeading, CaseInfoField, CaseMilestone, CaseSectionTitle, caseAsideClass, caseColumnsClass, caseMainClass, casePageClass } from "@/components/admin/AdminCaseDetailUI";
import { LinkedCasePreview } from "@/components/admin/LinkedCasePreview";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { deletionRequestBackHref } from "@/lib/adminSupportInboxNavigation";
import { getAdminAccountDeletionDetail, type AdminAccountDeletionDetail } from "@/services/adminAccountDeletionDetailService";

export const metadata = { title: "Admin Account Deletion Request" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromSupport?: string | string[]; inbox?: string | string[] }>;
};

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
      <div className={casePageClass}>
        <Link href={backHref} className="focus-ring mb-4 inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-[12px] font-medium text-[#64748B] transition-colors hover:text-[#004BB8]">
          <ArrowLeft size={14} aria-hidden="true" /> {contextual ? "Back to Support ticket" : "Back to deletion requests"}
        </Link>

        {!request ? (
          <section className="py-10">
            <h2 className="text-[16px] font-semibold text-[#111827]">{result.status === "forbidden" ? "Admin access required" : "Deletion request unavailable"}</h2>
            <p className="mt-2 text-[13px] text-[#64748B]">The account deletion detail reader could not safely return this request.</p>
          </section>
        ) : (
          <>
            <CaseDetailHeading title="Account deletion request" status={statusView[request.status].label} dot={statusView[request.status].dot} />

            <div className={caseColumnsClass}>
              <div className={caseMainClass}>
                <section aria-labelledby="deletion-lifecycle-heading">
                  <CaseSectionTitle id="deletion-lifecycle-heading">Deletion lifecycle</CaseSectionTitle>
                  <p className="mt-3 text-[13px] leading-6 text-[#475569]">
                    {readyForReview
                      ? "The 7-day deadline has passed. The request can now be marked ready for final review."
                      : request.status === "PENDING"
                        ? "Grace period: " + Math.max(remaining, 0) + " day" + (Math.max(remaining, 0) === 1 ? "" : "s") + " remaining."
                        : statusView[request.status].description}
                  </p>
                  <dl className="mt-4 grid min-w-0 gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    <CaseMilestone label="Requested" tone="info" value={formatDateTime(new Date(request.requestedAt))} />
                    <CaseMilestone label="Scheduled review" value={formatDateTime(new Date(request.deletionScheduledAt))} />
                    {request.cancelledAt ? <CaseMilestone label="Cancelled" value={formatDateTime(new Date(request.cancelledAt))} /> : null}
                    {request.completedAt ? <CaseMilestone label="Completed" tone="complete" value={formatDateTime(new Date(request.completedAt))} /> : null}
                  </dl>
                </section>

                <section aria-labelledby="deletion-account-heading">
                  <CaseSectionTitle id="deletion-account-heading">Account information</CaseSectionTitle>
                  <dl className="mt-4 grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <CaseInfoField label="Email" wide><span className="[overflow-wrap:anywhere]">{request.userEmail || "—"}</span></CaseInfoField>
                    <CaseInfoField label="Account status">{request.userStatus.replaceAll("_", " ")}</CaseInfoField>
                    <CaseInfoField label="Role">{request.userRole}</CaseInfoField>
                    <CaseInfoField label="User ID" wide><span className="[overflow-wrap:anywhere] text-[12px]">{request.userId}</span></CaseInfoField>
                  </dl>
                </section>

                <section aria-labelledby="deletion-record-heading">
                  <CaseSectionTitle id="deletion-record-heading">Request details</CaseSectionTitle>
                  <dl className="mt-4 grid min-w-0 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <CaseInfoField label="Request ID" wide><span className="[overflow-wrap:anywhere] text-[12px]">{request.id}</span></CaseInfoField>
                    {request.adminReference ? <CaseInfoField label="Admin reference" wide><span className="[overflow-wrap:anywhere]">{request.adminReference}</span></CaseInfoField> : null}
                  </dl>
                </section>
              </div>

              <aside aria-label="Deletion request management and related Support ticket" className={caseAsideClass}>
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
                    <CaseSectionTitle id="deletion-linked-ticket-heading">Linked Support ticket</CaseSectionTitle>
                    <LinkedCasePreview origin="deletion" sourceId={request.id} />
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
