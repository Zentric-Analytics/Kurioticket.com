import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Hotels" };

export default async function AdminHotelsPage() {
  const hotel = (await getProviderStatuses()).find((provider) => provider.product === "Hotels");

  return (
    <AdminPageShell title="Hotel Operations" description="Hotel provider readiness without fake inventory, ratings, or customer confirmations.">
      {hotel ? <AdminProviderStatusCard {...hotel} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Inventory and booking state</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Hotel inventory, ratings, confirmations, and bookings are shown only if returned from real provider/configured data. This admin module does not manufacture hotel rows.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge>Provider data only</AdminStatusBadge><AdminStatusBadge tone="warn">Booking not live yet</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
