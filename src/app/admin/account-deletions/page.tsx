import Link from "next/link";

import { AdminDataTable, AdminEmptyState, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Account Deletions" };

type AccountDeletionFilter = "open" | "pending" | "cancelled" | "ready" | "completed" | "all";

type DeletionRequestStatus = "PENDING" | "CANCELLED" | "READY_FOR_REVIEW" | "COMPLETED";

const FILTERS: Array<{ key: AccountDeletionFilter; label: string; statuses?: DeletionRequestStatus[] }> = [
  { key: "open", label: "Pending + review", statuses: ["PENDING", "READY_FOR_REVIEW"] },
  { key: "pending", label: "Pending", statuses: ["PENDING"] },
  { key: "cancelled", label: "Cancelled / Reactivated", statuses: ["CANCELLED"] },
  { key: "ready", label: "Ready for review", statuses: ["READY_FOR_REVIEW"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
  { key: "all", label: "All" },
];

const statusPriority: Record<DeletionRequestStatus, number> = {
  READY_FOR_REVIEW: 0,
  PENDING: 1,
  CANCELLED: 2,
  COMPLETED: 3,
};

function getFilter(value: string | string[] | undefined): AccountDeletionFilter {
  const filter = Array.isArray(value) ? value[0] : value;
  return FILTERS.some((item) => item.key === filter) ? (filter as AccountDeletionFilter) : "open";
}

function getStatusLabel(status: DeletionRequestStatus, userStatus: string) {
  if (status === "CANCELLED") return userStatus === "ACTIVE" ? "Reactivated" : "Cancelled";
  if (status === "READY_FOR_REVIEW") return "Ready for review";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusTone(status: DeletionRequestStatus) {
  if (status === "PENDING") return "warn";
  if (status === "CANCELLED") return "good";
  if (status === "READY_FOR_REVIEW") return "bad";
  return "neutral";
}

function getCancellationDetail(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const source = "source" in metadata && typeof metadata.source === "string" ? metadata.source : null;
  return source ? `Cancellation source: ${source.replaceAll("-", " ")}` : null;
}

export default async function AdminAccountDeletionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const activeFilter = getFilter((await searchParams).status);
  const requests = await withOptionalDb(
    (db) => db.accountDeletionRequest.findMany({
      orderBy: [{ requestedAt: "desc" }],
      take: 200,
      include: { user: { select: { email: true, role: true, status: true } } },
    }),
    [],
  );

  const sortedRequests = [...requests].sort((a, b) => {
    const priorityDifference = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDifference !== 0) return priorityDifference;
    return b.requestedAt.getTime() - a.requestedAt.getTime();
  });
  const filterDefinition = FILTERS.find((filter) => filter.key === activeFilter);
  const visibleRequests = filterDefinition?.statuses
    ? sortedRequests.filter((request) => filterDefinition.statuses?.includes(request.status))
    : sortedRequests;
  const counts = FILTERS.reduce<Record<AccountDeletionFilter, number>>((acc, filter) => {
    acc[filter.key] = filter.statuses ? requests.filter((request) => filter.statuses?.includes(request.status)).length : requests.length;
    return acc;
  }, { open: 0, pending: 0, cancelled: 0, ready: 0, completed: 0, all: 0 });

  return (
    <AdminPageShell title="Account deletion requests" description="Review the full account deletion lifecycle, including pending, cancelled/reactivated, ready-for-review, and completed requests.">
      {requests.length === 0 ? <AdminEmptyState title="No deletion requests" message="Account deletion requests will appear here after users submit them." /> : (
        <div className="space-y-4">
          <AdminSectionCard className="p-3">
            <div className="flex flex-wrap gap-2" aria-label="Account deletion request filters">
              {FILTERS.map((filter) => {
                const active = filter.key === activeFilter;
                return (
                  <Link
                    key={filter.key}
                    href={filter.key === "open" ? "/admin/account-deletions" : `/admin/account-deletions?status=${filter.key}`}
                    className={`rounded-full px-3 py-2 text-xs font-black transition ${
                      active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {filter.label} <span className="opacity-75">({counts[filter.key]})</span>
                  </Link>
                );
              })}
            </div>
          </AdminSectionCard>

          {visibleRequests.length === 0 ? (
            <AdminEmptyState title="No requests in this view" message="Try another status filter to review other deletion request lifecycle states." />
          ) : (
            <AdminDataTable
              columns={["Email", "User status", "Request status", "Requested", "Scheduled", "Cancelled / reactivated", "Completed", "Support / admin refs", "Notes"]}
              rows={visibleRequests.map((request) => {
                const cancellationDetail = getCancellationDetail(request.cancellationMetadata);
                return {
                  id: request.id,
                  cells: [
                    <span key="email" className="font-black text-slate-950">{request.email || request.user.email}</span>,
                    <div key="user-status" className="space-y-1">
                      <AdminStatusBadge tone={request.user.status === "ACTIVE" ? "good" : request.user.status === "PENDING_DELETION" ? "warn" : "neutral"}>{request.user.status}</AdminStatusBadge>
                      <p className="text-xs font-semibold text-slate-500">Role: {request.user.role}</p>
                    </div>,
                    <div key="request-status" className="space-y-1">
                      <AdminStatusBadge tone={getStatusTone(request.status)}>{getStatusLabel(request.status, request.user.status)}</AdminStatusBadge>
                      {request.status === "CANCELLED" ? <p className="text-xs font-semibold text-emerald-700">Deletion request is no longer pending.</p> : null}
                    </div>,
                    formatDateTime(request.requestedAt),
                    formatDateTime(request.deletionScheduledAt),
                    request.cancelledAt ? formatDateTime(request.cancelledAt) : "—",
                    request.completedAt ? formatDateTime(request.completedAt) : "—",
                    <div key="refs" className="space-y-1 text-xs font-semibold text-slate-600">
                      <p>Ticket: {request.supportTicketId || "—"}</p>
                      <p>Admin ref: {request.adminNotificationId || "—"}</p>
                    </div>,
                    <div key="notes" className="max-w-xs space-y-1 text-xs leading-5 text-slate-600">
                      {request.reviewNotes ? <p>{request.reviewNotes}</p> : null}
                      {cancellationDetail ? <p>{cancellationDetail}</p> : null}
                      {!request.reviewNotes && !cancellationDetail ? "—" : null}
                    </div>,
                  ],
                };
              })}
            />
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
