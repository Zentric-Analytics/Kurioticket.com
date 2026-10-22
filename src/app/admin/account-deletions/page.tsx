import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Account Deletions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminAccountDeletionsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.deletions.list(params);

  return (
    <AdminPageShell title="Account deletion requests" description="Review the account-deletion lifecycle through the safe admin queue and open individual requests for audited actions.">
      <div className="space-y-4">
        <AdminFilterBar action="/admin/account-deletions">
          <AdminInput name="q" defaultValue={one(raw.q)} placeholder="Email or account name" />
          <AdminSelect name="status" defaultValue={one(raw.status)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="READY_FOR_REVIEW">Ready for review</option>
            <option value="CANCELLED">Cancelled / reactivated</option>
            <option value="COMPLETED">Completed</option>
          </AdminSelect>
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AdminEmptyState title="No deletion requests" message="No account deletion requests match the selected filters." />
          ) : (
            <>
              <AdminDataTable
                columns={["Email", "User", "Request status", "Requested", "Scheduled", "Cancelled", "Completed", "Support / admin refs", "Review notes", "Action"]}
                rows={result.data.items.map((request) => ({
                  id: request.id,
                  cells: [
                    <span key="email" className="font-black text-slate-950">{request.email || request.user.email || "—"}</span>,
                    <div key="user"><p className="font-semibold text-slate-950">{request.user.name || request.userId}</p><p className="text-xs text-slate-500">{request.user.role} · {request.user.status}</p></div>,
                    <AdminStatusBadge key="status" tone={request.status === "READY_FOR_REVIEW" ? "bad" : request.status === "PENDING" ? "warn" : request.status === "CANCELLED" ? "good" : "neutral"}>{request.status.replaceAll("_", " ")}</AdminStatusBadge>,
                    formatDateTime(new Date(request.requestedAt)),
                    formatDateTime(new Date(request.deletionScheduledAt)),
                    request.cancelledAt ? formatDateTime(new Date(request.cancelledAt)) : "—",
                    request.completedAt ? formatDateTime(new Date(request.completedAt)) : "—",
                    <div key="refs" className="space-y-1 text-xs"><p>Ticket: {request.supportTicketId || "—"}</p><p>Admin: {request.adminReference || "—"}</p></div>,
                    request.hasReviewNotes ? "Recorded" : "—",
                    <Link key="action" href={"/admin/account-deletions/" + request.id} className="font-black text-indigo-700 hover:text-indigo-900">Manage</Link>,
                  ],
                }))}
              />
              {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState
            title={result.status === "invalid" ? "Invalid deletion filters" : result.status === "forbidden" ? "Admin access required" : "Deletion queue unavailable"}
            message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The safe deletion reader could not return queue data. An unavailable read is not shown as an empty queue."}
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
  return "/admin/account-deletions?" + params.toString();
}
