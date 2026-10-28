import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Support" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.support.list(params);

  return (
    <AdminPageShell title="Support" description="Review and operate support tickets through the safe admin support contract.">
      <div className="space-y-4">
        <AdminFilterBar action="/admin/support">
          <AdminInput name="q" defaultValue={one(raw.q)} placeholder="Email, name or subject" />
          <AdminSelect name="status" defaultValue={one(raw.status)}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="WAITING_ON_USER">Waiting on user</option>
            <option value="WAITING_ON_TEAM">Waiting on team</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </AdminSelect>
          <AdminSelect name="priority" defaultValue={one(raw.priority)}>
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </AdminSelect>
          <AdminInput name="category" defaultValue={one(raw.category)} placeholder="Category" />
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AdminEmptyState title="No support tickets" message="No support tickets match the selected filters." />
          ) : (
            <>
              <AdminDataTable
                columns={["Subject", "Category", "Identity", "Email", "Status", "Priority", "Messages", "Updated", "Action"]}
                rows={result.data.items.map((ticket) => ({
                  id: ticket.id,
                  cells: [
                    <span key="subject" className="font-black text-slate-950">{ticket.subject}</span>,
                    ticket.category,
                    <span key="identity" className="capitalize">{ticket.identity.kind}</span>,
                    ticket.email || "—",
                    <AdminStatusBadge key="status" tone={ticket.status === "OPEN" || ticket.status === "WAITING_ON_TEAM" ? "warn" : ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "good" : "info"}>{ticket.status.replaceAll("_", " ")}</AdminStatusBadge>,
                    <AdminStatusBadge key="priority" tone={ticket.priority === "URGENT" ? "bad" : ticket.priority === "HIGH" ? "warn" : "neutral"}>{ticket.priority}</AdminStatusBadge>,
                    ticket.messageCount,
                    formatDateTime(new Date(ticket.updatedAt)),
                    <Link key="action" href={"/admin/support/" + ticket.id} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
              {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState
            title={result.status === "invalid" ? "Invalid support filters" : result.status === "forbidden" ? "Admin access required" : "Support data unavailable"}
            message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The safe support reader could not return ticket data. An unavailable read is not shown as an empty inbox."}
          />
        )}
      </div>
    </AdminPageShell>
  );
}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function toParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}
function cursorHref(raw: Record<string, string | string[] | undefined>, cursor: string) {
  const params = toParams(raw);
  params.set("cursor", cursor);
  params.set("limit", one(raw.limit) || "50");
  return "/admin/support?" + params.toString();
}
