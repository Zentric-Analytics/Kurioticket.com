import { AdminPageShell, EmptyState, StatusPill } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Support" };

export default async function AdminSupportPage() {
  const tickets = await getPrisma().supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { email: true, name: true } } } });
  return (
    <AdminPageShell title="Support" description="Support ticket management for Curioticket users and guests.">
      {tickets.length === 0 ? <EmptyState message="Support ticket management is not active yet." /> : (
        <Card className="overflow-x-auto p-0"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="p-3">Subject</th><th className="p-3">Category</th><th className="p-3">User / email</th><th className="p-3">Status</th><th className="p-3">Priority</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id} className="border-t border-border"><td className="p-3 font-bold text-navy">{ticket.subject}</td><td className="p-3">{ticket.category}</td><td className="p-3">{ticket.user?.email || ticket.email}</td><td className="p-3"><StatusPill>{ticket.status}</StatusPill></td><td className="p-3">{ticket.priority}</td><td className="p-3">{formatDate(ticket.createdAt)}</td><td className="p-3 text-muted">View action pending</td></tr>)}</tbody></table></Card>
      )}
    </AdminPageShell>
  );
}
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date); }
