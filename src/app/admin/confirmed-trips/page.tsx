import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CircleX,
  FileCheck2,
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
  q: "", provider: "", product: "all", status: "all", identity: "all", from: "", to: "",
};

/** Read-only trip summary; filtering lives in the records workspace below. */
function TripMetric({
  label, value, icon: Icon, tone, index, screenReaderNote,
}: {
  label: string; value: number | string;
  icon: LucideIcon; tone: TripTone; index: number; screenReaderNote?: string;
}) {
  const colors: Record<TripTone, string> = {
    info: "bg-indigo-50 text-indigo-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <div className={"flex h-full min-w-0 flex-col border-slate-200/80 px-3 py-2.5 " +
      (index < 4 ? "border-b lg:border-b-0 " : "") +
      (index % 2 === 1 ? "sm:border-l " : "") +
      (index > 0 ? "lg:border-l" : "")}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-md " + colors[tone]}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <h3 className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-4 text-slate-800">{label}</h3>
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-6 tracking-tight tabular-nums text-slate-950">
        {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
      </p>
      {screenReaderNote ? <span className="sr-only">{screenReaderNote}</span> : null}
    </div>
  );
}

export default async function AdminConfirmedTripsPage({ searchParams }: Props) {
  const raw = (await searchParams) ?? {};
  const parsed = parseAdminTripWorkspace(raw);
  // Preserve legacy custom-date bookmarks without applying invisible filters
  // to the simplified five-field Trip Directory workspace.
  if (parsed.ok && parsed.range === "custom") {
    redirect(tripDirectoryHref(parsed.filters));
  }
  const filters = parsed.ok ? parsed.filters : blankFilters;
  const range = parsed.ok ? parsed.range : "today";
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
            <Link href="/admin/confirmed-trips/monitoring" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Trip monitoring</Link>
          </div>
        </div>

        <div className="space-y-8">
          <section aria-label="Trip summary" className="min-w-0">
            {directory?.status === "ok" ? (
              <div className="grid min-w-0 grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5">
                <TripMetric index={0} label="Confirmed trips" value={directory.totalMatching} icon={FileCheck2} tone="info" />
                <TripMetric index={1} label="Tracked trips" value="—" icon={Activity} tone="neutral" screenReaderNote="Tracking reporting not connected" />
                <TripMetric index={2} label="Upcoming" value={directory.statusCounts.upcoming} icon={CalendarCheck} tone="good" />
                <TripMetric index={3} label="Past" value={directory.statusCounts.past} icon={CalendarDays} tone="neutral" />
                <TripMetric index={4} label="Cancelled" value={directory.statusCounts.cancelled} icon={CircleX} tone="warn" />
              </div>
            ) : (
              <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-4 text-sm text-slate-700">
                {parsed.ok ? "Trip summary is temporarily unavailable. No counts are assumed." : parsed.error}
              </p>
            )}
          </section>

          <section aria-label="Trip records" id="trip-directory" className="min-w-0">
            <TripFilterControls filters={filters} range={range}
              key={[filters.q, filters.provider, filters.product, filters.status, filters.identity, range, filters.from, filters.to].join("|")}
              providerNames={operations?.byProvider.map(item => item.provider) ?? []} />

            <div className="mt-3 border-t border-slate-100 pt-3">
              {!parsed.ok ? (
                <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{parsed.error}</p>
              ) : directory?.status === "unavailable" ? (
                <p role="status" className="rounded-lg border border-slate-100 bg-white px-4 py-4 text-sm text-slate-700">Trip records are temporarily unavailable. No records or counts are assumed.</p>
              ) : directory?.status === "ok" ? (
                <>
                  <TripDirectoryView rows={directory.rows} subtle />
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
