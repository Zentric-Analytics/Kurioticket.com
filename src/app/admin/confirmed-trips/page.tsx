import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CircleX,
  FileCheck2,
  Info,
  type LucideIcon,
} from "lucide-react";

import { TripDirectoryView } from "@/components/admin/TripDirectoryView";
import { TripFilterControls } from "@/components/admin/TripFilterControls";
import { AdminPageShell, AdminSectionCard } from "@/components/admin/AdminPageShell";
import {
  tripDirectoryHref,
  type AdminTripFilters,
} from "@/lib/adminConfirmedTripsDirectory";
import { getConfirmedTripsOperationsSnapshot } from "@/services/adminConfirmedTripsOperationsService";
import { listAdminConfirmedTrips } from "@/services/adminConfirmedTripsDirectoryService";
import { parseAdminTripWorkspace } from "@/lib/adminTripWorkspace";

export const metadata = { title: "Admin Trips" };

type RawQuery = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<RawQuery> };
type TripTone = "info" | "good" | "warn" | "neutral";

const blankFilters: AdminTripFilters = {
  q: "", provider: "", product: "all", status: "all", from: "", to: "",
};

/** The trip overview is a read-only summary; filtering lives in Trip Directory. */
function TripMetric({
  label, value, hint, icon: Icon, tone,
}: {
  label: string; value: number | string; hint: string;
  icon: LucideIcon; tone: TripTone;
}) {
  const colors: Record<TripTone, string> = {
    info: "bg-indigo-50 text-indigo-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-md " + colors[tone]}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <h3 className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-4 text-slate-800">{label}</h3>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-6 tracking-tight tabular-nums text-slate-950">
        {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
      </p>
      <p className="mt-1 min-w-0 text-[11px] leading-4 text-slate-600">{hint}</p>
    </div>
  );
}

export default async function AdminConfirmedTripsPage({ searchParams }: Props) {
  const raw = (await searchParams) ?? {};
  const parsed = parseAdminTripWorkspace(raw);
  const filters = parsed.ok ? parsed.filters : blankFilters;
  const range = parsed.ok ? parsed.range : "all";
  const dateFields = parsed.ok ? parsed.dateFields : { from: "", to: "" };
  // The product/provider snapshot supplies provider names to the directory filter.
  // Confirmation readiness and delivery telemetry are now loaded only on Trip operations.
  const [operations, directory] = await Promise.all([
    getConfirmedTripsOperationsSnapshot(),
    parsed.ok ? listAdminConfirmedTrips(filters) : Promise.resolve(null),
  ]);

  return (
    <AdminPageShell title="Trips" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div role="group" aria-label="Trip shortcuts" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Browse confirmed trips</Link>
            <Link href="/admin/confirmed-trips/operations" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Trip operations</Link>
            <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Flight status</Link>
          </div>
        </div>

        <div className="space-y-3">
          <section aria-labelledby="confirmed-trips-overview" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <div className="mb-3 min-w-0">
              <h2 id="confirmed-trips-overview" className="text-base font-semibold text-slate-950">Trip overview</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">The counters reflect the filters applied in the Trip Directory. Use Trip status to investigate matching records.</p>
            </div>
            {directory?.status === "ok" ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <TripMetric label="Confirmed trips" value={directory.totalMatching} hint="All verified trips matching this scope" icon={FileCheck2} tone="info" />
                <TripMetric label="Tracked trips" value="—" hint="Tracking reporting not connected" icon={Activity} tone="neutral" />
                <TripMetric label="Upcoming" value={directory.statusCounts.upcoming} hint="Matching upcoming trips" icon={CalendarCheck} tone="good" />
                <TripMetric label="Past" value={directory.statusCounts.past} hint="Matching past trips" icon={CalendarDays} tone="neutral" />
                <TripMetric label="Cancelled" value={directory.statusCounts.cancelled} hint="Matching cancelled trips" icon={CircleX} tone="warn" />
              </div>
            ) : (
              <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-4 text-sm text-slate-700">
                {parsed.ok ? "Trip summary is temporarily unavailable. No counts are assumed." : parsed.error}
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-600">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Confirmed trips include cancelled records; the status counters partition the selected trips. UTC dates refer to the latest signed provider confirmation, not the trip date. Tracking totals require a separate data source.</span>
            </p>
          </section>

          <section aria-labelledby="trip-directory-title" id="trip-directory" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="trip-directory-title" className="text-base font-semibold text-slate-950">Trip directory</h2>
              <Link href={tripDirectoryHref(filters)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                Open full directory <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <TripFilterControls filters={filters} range={range} dateFields={dateFields}
              key={[filters.q, filters.provider, filters.product, filters.status, range, filters.from, filters.to].join("|")}
              providerNames={operations?.byProvider.map(item => item.provider) ?? []} />

            <div className="mt-3 border-t border-slate-100 pt-3">
              {!parsed.ok ? (
                <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{parsed.error}</p>
              ) : directory?.status === "unavailable" ? (
                <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-4 text-sm text-slate-700">Trip records are temporarily unavailable. No records or counts are assumed.</p>
              ) : directory?.status === "ok" ? (
                <>
                  <div className="mb-3">
                    <p className="text-xs font-semibold tabular-nums text-slate-700">{directory.totalMatching.toLocaleString("en-US")} matching verified trips</p>
                  </div>
                  {directory.rows.length ? (
                    <TripDirectoryView rows={directory.rows} subtle />
                  ) : (
                    <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-4 text-center text-sm text-slate-700">No provider-confirmed trip matches the selected filters.</p>
                  )}
                  {directory.nextCursor ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={tripDirectoryHref(filters, directory.nextCursor)} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        Older matching trips <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                </>
              ) : (
                <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700">Trip directory couldn't be loaded.</p>
              )}
            </div>
          </section>


        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
