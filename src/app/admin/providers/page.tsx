import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { ProviderRetestButton } from "@/components/admin/ProviderRetestButton";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Providers" };

export default async function AdminProvidersPage() {
  const providers = await getProviderStatuses();

  return (
    <AdminPageShell
      title="Provider Readiness"
      description="Real provider/config status by product. Credentials are shown only as yes/no and secrets are never exposed."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {providers.map((provider) => <AdminProviderStatusCard key={provider.product} {...provider} />)}
      </div>
      <AdminSectionCard className="mt-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-black text-slate-950">Provider health retest</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Retesting records real provider health when the backing endpoint and credentials are available.</p>
          </div>
          <ProviderRetestButton />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminStatusBadge tone="info">Audit-log ready action</AdminStatusBadge>
          <AdminStatusBadge>Secrets hidden</AdminStatusBadge>
          <AdminStatusBadge>Cars pending unless configured</AdminStatusBadge>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
