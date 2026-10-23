import { AdminHorizontalShell } from "@/components/admin/AdminHorizontalShell";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getCurrentDatabaseOutageAdminToken } from "@/lib/adminDatabaseOutageAccess";
import { requireAdminSession } from "@/lib/auth-guards";
import { isStagingEnvironment } from "@/lib/stagingSafety";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await requireAdminSession("/admin");

    return (
      <AdminHorizontalShell
        adminEmail={session.user.email}
        adminName={session.user.name}
        adminRole={session.user.role}
        showPreviewTesters={isStagingEnvironment()}
      >
        {children}
      </AdminHorizontalShell>
    );
  } catch (error) {
    const system = await getSafeSystemStatus();
    if (!system.databaseConfigured || system.databaseConnected) throw error;

    const token = await getCurrentDatabaseOutageAdminToken("/admin/notifications");
    if (!token) throw error;

    return (
      <AdminHorizontalShell
        adminEmail={token.email}
        adminName={token.name}
        adminRole={token.role}
        showPreviewTesters={false}
      >
        <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-rose-700">
            Critical operational alert
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Database is unavailable
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Canonical database-backed admin session validation cannot complete.
            This restricted emergency view exposes only the database outage
            condition. Admin mutations and normal operational data remain
            unavailable until database connectivity recovers.
          </p>
        </section>
      </AdminHorizontalShell>
    );
  }
}
