import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Cars" };

export default async function AdminCarsPage() {
  const cars = (await getProviderStatuses()).find((provider) => provider.product === "Cars");

  return (
    <AdminPageShell title="Car Operations" description="Car provider readiness. Cars remain pending/not connected unless real provider configuration is present.">
      {cars ? <AdminProviderStatusCard {...cars} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Car module state</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">No fake car provider inventory, pickup cards, bookings, provider uptime, or confirmations are displayed. Configure a real car provider before operational data appears here.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge tone="neutral">Pending provider</AdminStatusBadge><AdminStatusBadge tone="warn">Not live yet</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
