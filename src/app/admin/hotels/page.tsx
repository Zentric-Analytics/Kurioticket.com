import { AdminPageShell, AdminProviderStatusCard, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { getProviderStatuses } from "@/lib/admin-data";

export const metadata = { title: "Admin Hotels" };

export default async function AdminHotelsPage() {
  const hotel = (await getProviderStatuses()).find((provider) => provider.product === "Hotels");

  return (
    <AdminPageShell title="Hotel Search Readiness" description="Hotel search provider readiness without fake inventory or ratings.">
      {hotel ? <AdminProviderStatusCard {...hotel} /> : null}
      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Inventory state</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Hotel inventory and ratings are shown only when returned from configured provider data. Customer checkout and reservation management remain provider-owned.</p>
        <div className="mt-4 flex flex-wrap gap-2"><AdminStatusBadge>Provider data only</AdminStatusBadge><AdminStatusBadge>Provider-owned checkout</AdminStatusBadge></div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
