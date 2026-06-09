import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Flights" };

export default async function AdminFlightsPage() {
  const flight = (await getProviderStatuses()).find((provider) => provider.product === "Flights");

  return (
    <AdminPageShell title="Flight Operations" description="Flight provider readiness and operational boundaries for admin users.">
      {flight ? <AdminProviderStatusCard {...flight} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Admin actions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Flight search visibility is available only from real search logs and provider configuration. Booking actions remain unavailable unless a production booking workflow is connected.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge tone="info">Operational visibility</AdminStatusBadge><AdminStatusBadge tone="warn">Booking not live by default</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
