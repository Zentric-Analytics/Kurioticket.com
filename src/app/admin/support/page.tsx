import { AdminDataTable, AdminEmptyState, AdminLinkButton, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Support" };

export default async function AdminSupportPage() {
  const tickets = await withOptionalDb(
    (db) => db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true, name: true } } } }),
    [],
  );
  const deletionRequests = await withOptionalDb(
    (db) => db.accountDeletionRequest.findMany({
      where: { supportTicketId: { in: tickets.map((ticket) => ticket.id) } },
      select: { id: true, supportTicketId: true },
    }),
    [],
  );
  const deletionRequestByTicketId = new Map(deletionRequests.map((request) => [request.supportTicketId, request.id]));

  return (
    <AdminPageShell title="Support" description="Support ticket management for Kurioticket users and guests.">
      {tickets.length === 0 ? (
        <AdminEmptyState title="No support tickets" message="Support tickets will appear here when real users or guests submit support requests." />
      ) : (
        <AdminDataTable
          caption="Support tickets"
          minWidth="1040px"
          columns={["Ticket", "User / email", "Category", "Status", "Priority", "Created", "Updated", { key: "action", label: "Action", align: "right" }]}
          rows={tickets.map((ticket) => ({
            id: ticket.id,
            cells: [
              <div key="ticket" className="min-w-0 space-y-1"><p className="truncate font-semibold text-slate-950">{ticket.subject}</p><p className="truncate text-xs text-slate-500">{ticket.id}</p></div>,
              <div key="user" className="min-w-0 space-y-1"><p className="truncate font-medium text-slate-800">{ticket.user?.name || "Guest"}</p><p className="truncate text-xs text-slate-500">{ticket.user?.email || ticket.email}</p></div>,
              ticket.category,
              <AdminStatusBadge key="status" tone={ticket.status === "OPEN" ? "warn" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "good" : "info"}>{ticket.status}</AdminStatusBadge>,
              ticket.priority,
              formatDateTime(ticket.createdAt),
              formatDateTime(ticket.updatedAt),
              (() => {
                const deletionRequestId = ticket.category === "account_deletion" ? deletionRequestByTicketId.get(ticket.id) : null;
                const href = deletionRequestId ? `/admin/account-deletions/${deletionRequestId}` : `/admin/support/${ticket.id}`;
                return (
                  <AdminLinkButton key="action" href={href} size="sm" variant="primary" aria-label={`View support ticket ${ticket.subject}`}>
                    {deletionRequestId ? "View request" : "Open"}
                  </AdminLinkButton>
                );
              })(),
            ],
          }))}
        />
      )}
    </AdminPageShell>
  );
}
