import { AdminPageShell, EmptyState } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Logs" };

type PageProps = { searchParams?: Promise<{ action?: string; adminEmail?: string; targetEmail?: string; page?: string }> };

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const action = params?.action?.trim() || "";
  const adminEmail = params?.adminEmail?.trim() || "";
  const targetEmail = params?.targetEmail?.trim() || "";
  const where = {
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
    ...(adminEmail ? { adminEmail: { contains: adminEmail, mode: "insensitive" as const } } : {}),
    ...(targetEmail ? { targetEmail: { contains: targetEmail, mode: "insensitive" as const } } : {}),
  };
  const logs = await getPrisma().adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <AdminPageShell title="Audit Logs" description="Security audit trail for sensitive admin actions and platform operations.">
      <Card className="p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" action="/admin/logs">
          <input name="action" defaultValue={action} placeholder="Action" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="adminEmail" defaultValue={adminEmail} placeholder="Admin email" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="targetEmail" defaultValue={targetEmail} placeholder="Target email" className="rounded-md border border-border px-3 py-2 text-sm" />
          <Button type="submit">Filter</Button>
        </form>
      </Card>
      {logs.length === 0 ? <div className="mt-4"><EmptyState message="No admin audit logs found." /></div> : (
        <Card className="mt-4 overflow-x-auto p-0"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="p-3">Created</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Target email</th><th className="p-3">IP</th><th className="p-3">Metadata</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-border align-top"><td className="p-3">{formatDate(log.createdAt)}</td><td className="p-3">{log.adminEmail}</td><td className="p-3 font-bold text-navy">{log.action}</td><td className="p-3">{log.targetType}{log.targetId ? ` / ${log.targetId}` : ""}</td><td className="p-3">{log.targetEmail || "—"}</td><td className="p-3">{log.ipAddress || "—"}</td><td className="p-3 font-mono text-xs text-muted">{JSON.stringify(log.metadata || {})}</td></tr>)}</tbody></table></Card>
      )}
    </AdminPageShell>
  );
}
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date); }
