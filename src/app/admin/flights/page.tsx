import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Flights" };

export default async function AdminFlightsPage() {
  const flight = (await getProviderStatuses()).find((provider) => provider.product === "Flights");

  return (
    <AdminPageShell title="Flight Search Readiness" description="Flight search provider readiness and operational visibility for admin users.">
      {flight ? <AdminProviderStatusCard {...flight} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Search visibility</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Flight search visibility is derived only from real search logs and provider configuration. Customer checkout and reservation management remain provider-owned.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge tone="info">Operational visibility</AdminStatusBadge><AdminStatusBadge>Provider-owned checkout</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
