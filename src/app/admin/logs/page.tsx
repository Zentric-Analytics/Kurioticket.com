import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminAuditReads } from "@/services/adminAuditReadService";

export const metadata = { title: "Admin Logs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminAuditReads.list(params);

  return (
    <AdminPageShell
      title="Audit Logs"
      description="Security audit trail for sensitive admin actions. This view uses the safe audit contract and intentionally excludes raw metadata, IP addresses and user-agent values."
    >
      <div className="space-y-4">
        <AdminFilterBar action="/admin/logs">
          <AdminInput name="action" defaultValue={one(raw.action)} placeholder="Action" />
          <AdminInput name="adminEmail" defaultValue={one(raw.adminEmail)} placeholder="Admin email" />
          <AdminInput name="targetType" defaultValue={one(raw.targetType)} placeholder="Target type" />
          <AdminInput name="targetEmail" defaultValue={one(raw.targetEmail)} placeholder="Target email" />
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AdminEmptyState
              title="No audit entries found"
              message="No recorded admin actions match this filter set in the current audit window."
            />
          ) : (
            <>
              <AdminDataTable
                columns={["Created", "Admin", "Action", "Target", "Target email"]}
                rows={result.data.items.map((log) => ({
                  id: log.id,
                  cells: [
                    formatDateTime(new Date(log.createdAt)),
                    <div key="admin"><p className="font-semibold text-slate-950">{log.adminEmail}</p><p className="text-xs text-slate-500">{log.adminUserId || "No user id"}</p></div>,
                    <span key="action" className="font-black text-slate-950">{log.action}</span>,
                    <div key="target"><p className="font-semibold text-slate-950">{log.targetType}</p><p className="text-xs text-slate-500">{log.targetId || "—"}</p></div>,
                    log.targetEmail || "—",
                  ],
                }))}
              />
              {result.data.nextCursor ? (
                <div className="flex justify-end">
                  <Link
                    href={cursorHref(raw, result.data.nextCursor)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    Next page
                  </Link>
                </div>
              ) : null}
            </>
          )
        ) : (
          <AdminEmptyState
            title={result.status === "invalid" ? "Invalid audit filters" : result.status === "forbidden" ? "Admin access required" : "Audit log unavailable"}
            message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The audit reader could not verify log data. An unavailable audit read is not shown as an empty history."}
          />
        )}
      </div>
    </AdminPageShell>
  );
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

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
  return "/admin/logs?" + params.toString();
}
