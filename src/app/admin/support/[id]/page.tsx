import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminSupportTicketPage({ params }: PageProps) {
  const { id } = await params;
  const ticket = await getPrisma().supportTicket.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, status: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  const deletionRequest = ticket.category === "account_deletion"
    ? await getPrisma().accountDeletionRequest.findFirst({ where: { supportTicketId: ticket.id }, select: { id: true } })
    : null;

  return (
    <AdminPageShell title="Support ticket" description="Review ticket context and route account deletion tickets to the deletion request workflow." actions={<Link href="/admin/support" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to support</Link>}>
      <div className="space-y-5">
        {deletionRequest ? <Link href={`/admin/account-deletions/${deletionRequest.id}`} className="inline-flex rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800">View linked deletion request</Link> : null}
        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{ticket.category}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{ticket.subject}</h2>
              <p className="mt-2 text-sm text-slate-600">Ticket ID: {ticket.id}</p>
            </div>
            <AdminStatusBadge tone={ticket.status === "OPEN" ? "warn" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "good" : "info"}>{ticket.status}</AdminStatusBadge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <p className="rounded-xl bg-slate-50 p-3 text-sm"><strong>Email:</strong> {ticket.email}</p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm"><strong>User ID:</strong> {ticket.user?.id || "—"}</p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm"><strong>User status:</strong> {ticket.user?.status || "Guest / unknown"}</p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm"><strong>Created:</strong> {formatDateTime(ticket.createdAt)}</p>
          </div>
        </AdminSectionCard>
        <AdminSectionCard className="divide-y divide-slate-100 p-0">
          {ticket.messages.length === 0 ? <p className="p-5 text-sm text-slate-600">No messages are linked to this ticket.</p> : ticket.messages.map((message) => (
            <div key={message.id} className="p-5">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{message.author} · {formatDateTime(message.createdAt)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
            </div>
          ))}
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
