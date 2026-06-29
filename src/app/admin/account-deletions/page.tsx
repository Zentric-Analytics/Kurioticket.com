import { AdminDataTable, AdminEmptyState, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Account Deletions" };

export default async function AdminAccountDeletionsPage() {
  const requests = await withOptionalDb(
    (db) => db.accountDeletionRequest.findMany({ orderBy: { requestedAt: "desc" }, take: 100, include: { user: { select: { email: true, role: true, status: true } } } }),
    [],
  );
  return (
    <AdminPageShell title="Account deletion requests" description="Review pending deletion requests. Do not hard-delete before legal, tax, fraud, booking, payment, support, and compliance retention review.">
      {requests.length === 0 ? <AdminEmptyState title="No deletion requests" message="Account deletion requests will appear here after users submit them." /> : (
        <AdminDataTable
          columns={["Email", "User status", "Request status", "Requested", "Scheduled", "Support ticket"]}
          rows={requests.map((request) => ({
            id: request.id,
            cells: [
              <span key="email" className="font-black text-slate-950">{request.email || request.user.email}</span>,
              `${request.user.role} / ${request.user.status}`,
              <AdminStatusBadge key="status" tone={request.status === "PENDING" ? "warn" : request.status === "CANCELLED" ? "info" : request.status === "COMPLETED" ? "good" : "bad"}>{request.status}</AdminStatusBadge>,
              formatDateTime(request.requestedAt),
              formatDateTime(request.deletionScheduledAt),
              request.supportTicketId || "—",
            ],
          }))}
        />
      )}
    </AdminPageShell>
  );
}
