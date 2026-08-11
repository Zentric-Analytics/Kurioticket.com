import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Cars" };

export default async function AdminCarsPage() {
  const cars = (await getProviderStatuses()).find((provider) => provider.product === "Cars");

  return (
    <AdminPageShell title="Car Search Readiness" description="Car search remains disabled unless real provider configuration is present.">
      {cars ? <AdminProviderStatusCard {...cars} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Car module state</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">No fake car inventory or provider uptime is displayed. Configure a real search provider before operational data appears here; customer checkout remains provider-owned.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge tone="neutral">Provider not configured</AdminStatusBadge><AdminStatusBadge>Search disabled</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
