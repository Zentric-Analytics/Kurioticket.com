import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell } from "@/components/admin/AdminPageShell";
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
    <AdminPageShell title="Admin Logs" description="Review administrative and security-sensitive actions.">
      <AdminFilterBar action="/admin/logs">
        <AdminInput name="action" defaultValue={action} placeholder="Action" />
        <AdminInput name="adminEmail" defaultValue={adminEmail} placeholder="Admin email" />
        <AdminInput name="targetEmail" defaultValue={targetEmail} placeholder="Target email" />
        <AdminButton type="submit">Filter</AdminButton>
      </AdminFilterBar>
      <div className="mt-4">
        {logs.length === 0 ? (
          <AdminEmptyState title="No admin audit logs found" message="Audit logs will appear after sensitive admin actions are recorded." />
        ) : (
          <AdminDataTable
            caption="Admin audit logs"
            density="compact"
            minWidth="1120px"
            columns={["Created", "Admin", "Action", "Target", "Target email", "IP", "Metadata"]}
            rows={logs.map((log) => ({
              id: log.id,
              cells: [
                formatDateTime(log.createdAt),
                log.adminEmail,
                <span key="action" className="font-semibold text-slate-950">{log.action}</span>,
                `${log.targetType}${log.targetId ? ` / ${log.targetId}` : ""}`,
                log.targetEmail || "—",
                log.ipAddress || "—",
                <span key="metadata" className="block max-w-xs truncate font-mono text-xs text-slate-500" title={JSON.stringify(log.metadata || {})}>{JSON.stringify(log.metadata || {})}</span>,
              ],
            }))}
          />
        )}
      </div>
    </AdminPageShell>
  );
}
