import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";
import { getAdminEmails } from "@/lib/env";

export const metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
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
    </AdminPageShell>
  );
}
