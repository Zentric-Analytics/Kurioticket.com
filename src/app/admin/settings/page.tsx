import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";
import { getAdminEmails } from "@/lib/env";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const flags = await withOptionalDb((db) => db.featureFlag.findMany({ orderBy: { key: "asc" }, take: 50 }), []);

  return (
    <AdminPageShell title="Settings" description="Read-only operational settings for platform systems and future RBAC controls.">
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Admin email configuration</h2>
          <p className="mt-2 text-sm text-slate-600">ADMIN_EMAILS configured: <b>{getAdminEmails().length > 0 ? "Yes" : "No"}</b></p>
          <p className="mt-1 text-sm text-slate-600">Configured admin count: <b>{getAdminEmails().length}</b></p>
        </AdminSectionCard>
        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">System controls</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">RBAC-ready navigation</AdminStatusBadge>
            <AdminStatusBadge tone="info">Audit-log-ready actions</AdminStatusBadge>
            <AdminStatusBadge>Secrets hidden</AdminStatusBadge>
          </div>
        </AdminSectionCard>
      </div>
      <div className="mt-4"><HomepageFaresRefreshCard /></div>
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Feature flags</h2>
        {flags.length === 0 ? <p className="mt-2 text-sm text-slate-600">No feature flags configured yet.</p> : (
          <div className="mt-3 grid gap-2">
            {flags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="font-black text-slate-950">{flag.key}</span>
                <AdminStatusBadge tone={flag.enabled ? "good" : "neutral"}>{flag.enabled ? "Enabled" : "Disabled"} / {flag.scope}</AdminStatusBadge>
              </div>
            ))}
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
