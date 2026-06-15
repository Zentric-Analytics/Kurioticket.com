import { AdminDataTable, AdminEmptyState, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Support" };

export default async function AdminSupportPage() {
  const tickets = await withOptionalDb(
    (db) => db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true, name: true } } } }),
    [],
  );

  return (
    <AdminPageShell title="Support" description="Support ticket management for Kurioticket users and guests.">
      {tickets.length === 0 ? (
        <AdminEmptyState title="No support tickets" message="Support tickets will appear here when real users or guests submit support requests." />
      ) : (
        <AdminDataTable
          columns={["Subject", "Category", "User / email", "Status", "Priority", "Created", "Action"]}
          rows={tickets.map((ticket) => ({
            id: ticket.id,
            cells: [
              <span key="subject" className="font-black text-slate-950">{ticket.subject}</span>,
              ticket.category,
              ticket.user?.email || ticket.email,
              <AdminStatusBadge key="status" tone={ticket.status === "OPEN" ? "warn" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "good" : "info"}>{ticket.status}</AdminStatusBadge>,
              ticket.priority,
              formatDateTime(ticket.createdAt),
              "View action pending",
            ],
          }))}
        />
      )}
    </AdminPageShell>
  );
}
