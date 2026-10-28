import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";
import { ConfirmedTripRecordsTable } from "@/components/admin/ConfirmedTripRecordsTable";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import { requireAdminSession } from "@/lib/auth-guards";
import { parseAdminTripFilters, tripDirectoryHref } from "@/lib/adminConfirmedTripsDirectory";
import { listAdminConfirmedTrips } from "@/services/adminConfirmedTripsDirectoryService";

export const metadata = { title: "Admin Confirmed Trip Records" };
type RawQuery = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<RawQuery> };
const inputClass = "focus-ring h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900";
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
      actions={<Link href="/admin/confirmed-trips" className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-indigo-700 hover:underline"><ArrowLeft size={15} aria-hidden="true" />Back to Trip overview</Link>}>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5">
        <form method="get" action="/admin/confirmed-trips/records" aria-label="Confirmed trip filters" className="grid min-w-0 gap-2.5 border-b border-slate-200 pb-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="min-w-0 text-xs font-medium text-slate-700">Search
            <span className="relative mt-1 block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true" />
              <input name="q" defaultValue={filters.q} maxLength={80} placeholder="Customer, reference, destination..." className={inputClass + " pl-9"} />
            </span>
          </label>
          <label className="min-w-0 text-xs font-medium text-slate-700">Provider
            <input name="provider" defaultValue={filters.provider} maxLength={100} placeholder="All providers" className={inputClass + " mt-1"} />
          </label>
          <label className="min-w-0 text-xs font-medium text-slate-700">Product
            <select name="product" defaultValue={filters.product} className={inputClass + " mt-1"}>
              {products.map(value => <option key={value} value={value}>{value === "all" ? "All products" : value}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-slate-700">Status
            <select name="status" defaultValue={filters.status} className={inputClass + " mt-1"}>
              {statuses.map(value => <option key={value} value={value}>{value === "all" ? "All statuses" : value}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-slate-700">From (UTC)
            <input type="date" name="from" defaultValue={filters.from} className={inputClass + " mt-1"} />
          </label>
          <label className="min-w-0 text-xs font-medium text-slate-700">To (UTC)
            <input type="date" name="to" defaultValue={filters.to} className={inputClass + " mt-1"} />
          </label>
          <div className="flex min-w-0 items-end gap-2 lg:col-span-2">
            <button type="submit" className="h-9 min-w-0 rounded-lg bg-indigo-700 px-4 text-xs font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Apply filters</button>
            <Link href="/admin/confirmed-trips/records" className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear filters</Link>
          </div>
        </form>
        <p className="mt-2 text-[11px] leading-4 text-slate-500">Dates filter the latest signed provider-confirmation timestamp in UTC, not the travel date.</p>
        {result.status === "unavailable" ? (
          <div role="status" className="mt-4 rounded-lg bg-slate-50 px-4 py-4 text-sm leading-5 text-slate-700">Confirmed trip records are temporarily unavailable. No results or counts have been invented.</div>
        ) : (
          <section className="mt-4 min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950">Matching confirmed trips</h2>
              <span className="text-xs font-medium tabular-nums text-slate-600">{new Intl.NumberFormat("en-US").format(result.totalMatching)} verified records</span>
            </div>
            {result.rows.length ? (
              <ConfirmedTripRecordsTable rows={result.rows} />
            ) : <p role="status" className="rounded-lg bg-slate-50 px-4 py-4 text-center text-xs leading-5 text-slate-600">No provider-confirmed trip matches the selected filters.</p>}
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
