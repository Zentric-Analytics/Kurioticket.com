import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountDeletionManageForm } from "@/components/admin/AccountDeletionManageForm";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Account Deletion Request" };

type PageProps = { params: Promise<{ id: string }> };

function statusTone(status: string) {
  if (status === "PENDING") return "warn";
  if (status === "READY_FOR_REVIEW") return "bad";
  if (status === "CANCELLED") return "good";
  return "neutral";
}

function daysRemaining(scheduledAt: Date) {
  return Math.ceil((scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
  const request = await getPrisma().accountDeletionRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true, status: true } },
    },
  });

  if (!request) notFound();

  const remaining = daysRemaining(request.deletionScheduledAt);
  const readyForReview = request.status === "PENDING" && remaining <= 0;
  const canComplete = request.status === "READY_FOR_REVIEW";
  const lifecycleMessage = request.status === "CANCELLED"
    ? "This request was cancelled, commonly because the user reactivated during the grace period."
    : request.status === "COMPLETED"
      ? "This request has been marked completed after manual retention/anonymization review."
      : readyForReview
        ? "The 7-day deadline has passed; this request can be marked ready for manual review."
        : `Pending grace period: ${Math.max(remaining, 0)} day${Math.max(remaining, 0) === 1 ? "" : "s"} remain.`;

  return (
    <AdminPageShell
      title="Account deletion request"
      description="Review deletion request details and update safe lifecycle metadata without hard-deleting account data."
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
              <Detail label="User email" value={request.email || request.user.email} />
              <Detail label="User id" value={request.userId} />
              <Detail label="User status" value={<AdminStatusBadge tone={request.user.status === "ACTIVE" ? "good" : request.user.status === "PENDING_DELETION" ? "warn" : "neutral"}>{request.user.status}</AdminStatusBadge>} />
              <Detail label="User role" value={request.user.role} />
              <Detail label="Request id" value={request.id} />
              <Detail label="Request status" value={request.status} />
              <Detail label="Requested date" value={formatDateTime(request.requestedAt)} />
              <Detail label="Scheduled deletion date" value={formatDateTime(request.deletionScheduledAt)} />
              <Detail label="Cancelled / reactivated date" value={request.cancelledAt ? formatDateTime(request.cancelledAt) : "—"} />
              <Detail label="Completed date" value={request.completedAt ? formatDateTime(request.completedAt) : "—"} />
              <Detail label="Support ticket id" value={request.supportTicketId || "—"} />
              <Detail label="Admin reference" value={request.adminNotificationId || "—"} />
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
          reviewNotes={request.reviewNotes}
          adminReference={request.adminNotificationId}
          readyForReview={readyForReview}
          canComplete={canComplete}
        />
      </div>
    </AdminPageShell>
  );
}
