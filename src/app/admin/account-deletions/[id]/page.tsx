import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountDeletionManageForm } from "@/components/admin/AccountDeletionManageForm";
import { AdminEmptyState, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getAdminAccountDeletionDetail } from "@/services/adminAccountDeletionDetailService";

export const metadata = { title: "Admin Account Deletion Request" };

type PageProps = { params: Promise<{ id: string }> };

function statusTone(status: string) {
  if (status === "PENDING") return "warn";
  if (status === "READY_FOR_REVIEW") return "bad";
  if (status === "CANCELLED") return "good";
  return "neutral";
}

function daysRemaining(scheduledAt: string) {
  return Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value || "—"}</div>
    </div>
  );
}

export default async function AdminAccountDeletionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminAccountDeletionDetail(id);
  if (result.status === "not_found") notFound();

  if (result.status !== "ok") {
    return (
      <AdminPageShell title="Account deletion request" description="Review and manage the account deletion lifecycle.">
        <AdminEmptyState title={result.status === "forbidden" ? "Admin access required" : "Deletion request unavailable"} message="The account deletion detail reader could not safely return this request." />
      </AdminPageShell>
    );
  }

  const request = result.data;
  const remaining = daysRemaining(request.deletionScheduledAt);
  const readyForReview = request.status === "PENDING" && remaining <= 0;
  const canFinalize = request.status === "READY_FOR_REVIEW";
  const lifecycleMessage = request.status === "CANCELLED"
    ? "This request was cancelled, commonly because the user reactivated during the grace period."
    : request.status === "COMPLETED"
      ? "This request completed after retention review and account-data finalization."
      : readyForReview
        ? "The 7-day deadline has passed; this request can be marked ready for final review."
        : request.status === "READY_FOR_REVIEW"
          ? "The grace period has ended and this request is ready for explicit retention review and finalization."
          : "Pending grace period: " + Math.max(remaining, 0) + " day" + (Math.max(remaining, 0) === 1 ? "" : "s") + " remain.";

  return (
    <AdminPageShell
      title="Account deletion request"
      description="Review deletion details and use the audited lifecycle controls. Finalization requires explicit retention review and account-email confirmation."
      actions={<Link href="/admin/account-deletions" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to requests</Link>}
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Lifecycle state</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{lifecycleMessage}</p>
              </div>
              <AdminStatusBadge tone={statusTone(request.status)}>{request.status.replaceAll("_", " ")}</AdminStatusBadge>
            </div>
          </AdminSectionCard>

          <AdminSectionCard className="p-5">
            <h2 className="text-lg font-black text-slate-950">Request details</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Detail label="User email" value={request.userEmail || "—"} />
              <Detail label="User id" value={request.userId} />
              <Detail label="User status" value={<AdminStatusBadge tone={request.userStatus === "ACTIVE" ? "good" : request.userStatus === "PENDING_DELETION" ? "warn" : "neutral"}>{request.userStatus}</AdminStatusBadge>} />
              <Detail label="User role" value={request.userRole} />
              <Detail label="Request id" value={request.id} />
              <Detail label="Request status" value={request.status} />
              <Detail label="Requested date" value={formatDateTime(new Date(request.requestedAt))} />
              <Detail label="Scheduled deletion date" value={formatDateTime(new Date(request.deletionScheduledAt))} />
              <Detail label="Cancelled / reactivated date" value={request.cancelledAt ? formatDateTime(new Date(request.cancelledAt)) : "—"} />
              <Detail label="Completed date" value={request.completedAt ? formatDateTime(new Date(request.completedAt)) : "—"} />
              <Detail label="Support ticket id" value={request.supportTicketId || "—"} />
              <Detail label="Admin reference" value={request.adminReference || "—"} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard className="p-5">
            <h2 className="text-lg font-black text-slate-950">Review notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.reviewNotes || "No review notes yet."}</p>
          </AdminSectionCard>
        </div>

        <AccountDeletionManageForm
          requestId={request.id}
          status={request.status}
          accountEmail={request.userEmail}
          reviewNotes={request.reviewNotes}
          adminReference={request.adminReference}
          readyForReview={readyForReview}
          canFinalize={canFinalize}
        />
      </div>
    </AdminPageShell>
  );
}
