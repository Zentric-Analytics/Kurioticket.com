import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminEmptyState, AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SupportTicketActions } from "@/components/admin/SupportTicketActions";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support Ticket" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminSupportTicketPage({ params }: PageProps) {
  const { id } = await params;
  const result = await adminOperationalReads.support.detail(id);
  if (result.status === "not_found") notFound();

  return (
    <AdminPageShell
      title="Support ticket"
      description="Review safe ticket context, reply to the customer, and update the support workflow."
      actions={<Link href="/admin/support" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to support</Link>}
    >
      {result.status === "ok" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            {result.data.deletionRequestId ? (
              <Link href={"/admin/account-deletions/" + result.data.deletionRequestId} className="inline-flex rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-800">
                View linked deletion request
              </Link>
            ) : null}

            <AdminSectionCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{result.data.category}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{result.data.subject}</h2>
                  <p className="mt-2 text-sm text-slate-600">Ticket ID: {result.data.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge tone={result.data.status === "OPEN" || result.data.status === "WAITING_ON_TEAM" ? "warn" : result.data.status === "RESOLVED" || result.data.status === "CLOSED" ? "good" : "info"}>{result.data.status.replaceAll("_", " ")}</AdminStatusBadge>
                  <AdminStatusBadge tone={result.data.priority === "URGENT" ? "bad" : result.data.priority === "HIGH" ? "warn" : "neutral"}>{result.data.priority}</AdminStatusBadge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Detail label="Email" value={result.data.email || "—"} />
                <Detail label="Identity" value={result.data.identity.kind} />
                <Detail label="User ID" value={result.data.user?.id || result.data.identity.userId || "—"} />
                <Detail label="User name" value={result.data.user?.name || "—"} />
                <Detail label="Created" value={formatDateTime(new Date(result.data.createdAt))} />
                <Detail label="Updated" value={formatDateTime(new Date(result.data.updatedAt))} />
              </div>

              {Object.keys(result.data.source).length ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Safe source context</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {Object.entries(result.data.source).map(([key, value]) => <Detail key={key} label={key} value={value} />)}
                  </div>
                </div>
              ) : null}
            </AdminSectionCard>

            <AdminSectionCard className="divide-y divide-slate-100 p-0">
              {result.data.messages.length === 0 ? (
                <p className="p-5 text-sm text-slate-600">No messages are linked to this ticket.</p>
              ) : result.data.messages.map((message) => (
                <div key={message.id} className="p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">{message.author} · {formatDateTime(new Date(message.createdAt))}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                </div>
              ))}
            </AdminSectionCard>
          </div>

          <SupportTicketActions ticketId={result.data.id} status={result.data.status} />
        </div>
      ) : (
        <AdminEmptyState
          title={result.status === "invalid" ? "Invalid ticket request" : result.status === "forbidden" ? "Admin access required" : "Support ticket unavailable"}
          message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The safe support reader could not return this ticket."}
        />
      )}
    </AdminPageShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div></div>;
}
