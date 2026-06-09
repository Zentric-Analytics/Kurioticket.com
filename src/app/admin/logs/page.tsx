import { AdminDataTable, AdminEmptyState, AdminPageShell } from "@/components/admin/AdminPageShell";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Logs" };

type PageProps = { searchParams?: Promise<{ action?: string; adminEmail?: string; targetEmail?: string }> };

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const action = params?.action?.trim() || "";
  const adminEmail = params?.adminEmail?.trim() || "";
  const targetEmail = params?.targetEmail?.trim() || "";
  const logs = await withOptionalDb(async (db) => db.adminAuditLog.findMany({
    where: {
      ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
      ...(adminEmail ? { adminEmail: { contains: adminEmail, mode: "insensitive" as const } } : {}),
      ...(targetEmail ? { targetEmail: { contains: targetEmail, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  }), []);

  return (
    <AdminPageShell title="Audit Logs" description="Security audit trail for sensitive admin actions and platform operations.">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" action="/admin/logs">
          <input name="action" defaultValue={action} placeholder="Action" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <input name="adminEmail" defaultValue={adminEmail} placeholder="Admin email" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <input name="targetEmail" defaultValue={targetEmail} placeholder="Target email" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
          <Button type="submit">Filter</Button>
        </form>
      </div>
      <div className="mt-4">
        {logs.length === 0 ? (
          <AdminEmptyState title="No admin audit logs found" message="Audit logs will appear after sensitive admin actions are recorded. TODO: expand this view when additional audit event types are added." />
        ) : (
          <AdminDataTable
            columns={["Created", "Admin", "Action", "Target", "Target email", "IP", "Metadata"]}
            rows={logs.map((log) => ({
              id: log.id,
              cells: [
                formatDateTime(log.createdAt),
                log.adminEmail,
                <span key="action" className="font-black text-slate-950">{log.action}</span>,
                `${log.targetType}${log.targetId ? ` / ${log.targetId}` : ""}`,
                log.targetEmail || "—",
                log.ipAddress || "—",
                <span key="metadata" className="font-mono text-xs text-slate-500">{JSON.stringify(log.metadata || {})}</span>,
              ],
            }))}
          />
        )}
      </div>
    </AdminPageShell>
  );
}
