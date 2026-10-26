import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { parseAdminTripFilters, tripDirectoryHref } from "@/lib/adminConfirmedTripsDirectory";
import { listAdminConfirmedTrips } from "@/services/adminConfirmedTripsDirectoryService";
import { formatDateTime } from "@/lib/admin-data";

export const metadata = { title: "Admin Confirmed Trip Records" };
type RawQuery = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<RawQuery> };
const inputClass = "focus-ring h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900";
const products = ["all", "FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
const statuses = ["all", "UPCOMING", "PAST", "CANCELLED"] as const;

export default async function AdminConfirmedTripRecordsPage({ searchParams }: Props) {
  await requireAdminSession("/admin/confirmed-trips/records");
  const raw = (await searchParams) ?? {};
  const parsed = parseAdminTripFilters(raw);
  if (!parsed.ok) return (
    <AdminPageShell title="Confirmed Trip Records">
      <AdminSectionCard className="p-6">
        <p role="alert" className="text-sm text-rose-700">{parsed.error}</p>
        <Link href="/admin/confirmed-trips/records" className="mt-3 inline-block text-sm font-semibold text-indigo-700">Reset filters</Link>
      </AdminSectionCard>
    </AdminPageShell>
  );

  const { filters } = parsed;
  const result = await listAdminConfirmedTrips(filters, typeof raw.cursor === "string" ? raw.cursor : undefined);
  if (result.status === "invalid_cursor") return (
    <AdminPageShell title="Confirmed Trip Records">
      <AdminSectionCard className="p-6">
        <p role="alert" className="font-semibold text-slate-950">The records page link is invalid or no longer matches these filters.</p>
        <Link href={tripDirectoryHref(filters)} className="mt-3 inline-block text-sm font-semibold text-indigo-700">Return to first page</Link>
      </AdminSectionCard>
    </AdminPageShell>
  );

  return (
    <AdminPageShell title="Confirmed Trip Records"
      description="Read-only provider-confirmed My Trips. Handoffs and search results are not confirmations."
      actions={<Link href="/admin/confirmed-trips" className="text-sm font-semibold text-indigo-700 hover:underline">Back to Trip overview</Link>}>
      <AdminSectionCard className="min-w-0 p-4 sm:p-6">
        <form method="get" action="/admin/confirmed-trips/records" aria-label="Confirmed trip filters" className="grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1fr)_minmax(135px,0.8fr)_130px_130px_145px_145px_auto]">
          <label className="min-w-0 text-xs font-semibold text-slate-600">Search
            <span className="relative mt-1 block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
              <input name="q" defaultValue={filters.q} maxLength={80} placeholder="Customer, reference, destination..." className={inputClass + " pl-9"} />
            </span>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">Provider
            <input name="provider" defaultValue={filters.provider} maxLength={100} placeholder="All providers" className={inputClass + " mt-1"} />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">Product
            <select name="product" defaultValue={filters.product} className={inputClass + " mt-1"}>
              {products.map(value => <option key={value} value={value}>{value === "all" ? "All products" : value}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">Status
            <select name="status" defaultValue={filters.status} className={inputClass + " mt-1"}>
              {statuses.map(value => <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">From (UTC)
            <input type="date" name="from" defaultValue={filters.from} className={inputClass + " mt-1"} />
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-600">To (UTC)
            <input type="date" name="to" defaultValue={filters.to} className={inputClass + " mt-1"} />
          </label>
          <button type="submit" className="h-10 self-end whitespace-nowrap rounded-lg bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800">Apply filters</button>
        </form>
        {result.status === "unavailable" ? (
          <div role="status" className="py-10 text-sm text-slate-700">Confirmed trip records are temporarily unavailable. No results or counts have been invented.</div>
        ) : (
          <section className="mt-5 min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">Matching confirmed trips</h2>
              <span className="text-sm text-slate-600">{result.totalMatching} verified records</span>
            </div>
            {result.rows.length ? (
              <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[970px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600"><tr>
                    {["Confirmed", "Customer", "Product", "Route / destination", "Provider", "Reference", "Travel", "Status", "Details"].map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {result.rows.map(trip => <tr key={trip.id}>
                      <td className="whitespace-nowrap px-3 py-3">{formatDateTime(new Date(trip.confirmedAt))}</td>
                      <td className="max-w-48 break-words px-3 py-3"><span className="font-medium text-slate-900">{trip.userEmail || "Email unavailable"}</span><span className="mt-1 block break-all text-xs text-slate-500">{trip.userId}</span></td>
                      <td className="px-3 py-3">{trip.tripType}</td>
                      <td className="max-w-40 break-words px-3 py-3">{trip.origin ? trip.origin + " → " + trip.destination : trip.destination}</td>
                      <td className="max-w-36 break-words px-3 py-3">{trip.providerName}</td>
                      <td className="max-w-36 break-all px-3 py-3">{trip.providerConfirmationCode}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDateTime(new Date(trip.departureDate))}</td>
                      <td className="px-3 py-3"><AdminStatusBadge tone={trip.status === "CANCELLED" ? "warn" : trip.status === "UPCOMING" ? "good" : "neutral"}>{trip.status}</AdminStatusBadge>{trip.needsStatusReview ? <p className="mt-1 text-xs text-amber-700">Review status freshness</p> : null}</td>
                      <td className="px-3 py-3"><Link href={"/admin/confirmed-trips/records/" + encodeURIComponent(trip.id)} className="font-semibold text-indigo-700 hover:underline">View details</Link></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            ) : <p role="status" className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">No provider-confirmed trip matches the selected filters.</p>}
            {result.nextCursor ? (
              <div className="mt-4 flex justify-end">
                <Link href={tripDirectoryHref(filters, result.nextCursor)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-slate-50">Older confirmed trips</Link>
              </div>
            ) : null}
          </section>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
