import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Car,
  ChevronDown,
  CircleX,
  Clock3,
  FileCheck2,
  Hotel,
  Info,
  Plane,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { ConfirmedTripsBreakdowns } from "@/components/admin/ConfirmedTripsBreakdowns";
import { ConfirmedTripDeliveryAlerts } from "@/components/admin/ConfirmedTripDeliveryAlerts";
import { TripDirectoryView } from "@/components/admin/TripDirectoryView";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import {
  parseAdminTripFilters,
  tripDirectoryHref,
  type AdminTripFilters,
} from "@/lib/adminConfirmedTripsDirectory";
import {
  getConfirmedTripsIntegrationReadiness,
  getConfirmedTripsOperationsSnapshot,
} from "@/services/adminConfirmedTripsOperationsService";
import { listAdminConfirmedTrips } from "@/services/adminConfirmedTripsDirectoryService";
import { getConfirmationDeliveryHealth } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Trips" };

type RawQuery = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<RawQuery> };
type TripTone = "info" | "good" | "warn" | "neutral";

const blankFilters: AdminTripFilters = {
  q: "", provider: "", product: "all", status: "all", from: "", to: "",
};

const travelTypes = [
  { type: "FLIGHT", title: "Flights", icon: Plane, detail: "Flight itineraries" },
  { type: "HOTEL", title: "Hotels", icon: Hotel, detail: "Hotel stays" },
  { type: "CAR", title: "Cars", icon: Car, detail: "Car rentals" },
] as const;

function TripMetric({
  label, value, hint, icon: Icon, tone, href,
}: {
  label: string; value: number | string; hint: string;
  icon: LucideIcon; tone: TripTone; href?: string;
}) {
  const colors: Record<TripTone, string> = {
    info: "bg-indigo-50 text-indigo-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + colors[tone]}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <h3 className="min-w-0 flex-1 break-words text-xs font-semibold leading-4 text-slate-800">{label}</h3>
        {href ? <ArrowRight size={15} className="shrink-0 text-slate-400" aria-hidden="true" /> : null}
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-[26px] tracking-tight tabular-nums text-slate-950">
        {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
      </p>
      <p className="mt-1 min-w-0 text-xs leading-4 text-slate-600">{hint}</p>
    </>
  );
  const className = "flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white px-3 py-3";
  return href ? (
    <Link href={href} className={className + " transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"}>
      {content}
    </Link>
  ) : (
    <div className={className} aria-label={label + ": reporting not yet available"}>
      {content}
    </div>
  );
}

function TripCategoryCard({
  title, type, detail, icon: Icon, count,
}: {
  title: string; type: "FLIGHT" | "HOTEL" | "CAR";
  detail: string; icon: LucideIcon; count: number | null;
}) {
  const href = tripDirectoryHref({ ...blankFilters, product: type });
  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-3.5">
      <Link href={href} className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Icon size={19} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-950">{title}</span>
          <span className="block text-xs text-slate-600">{detail}</span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
      </Link>
      <dl className="mt-3 divide-y divide-slate-100 border-y border-slate-100 text-[13px]">
        <div className="flex items-center justify-between gap-2 py-2">
          <dt className="font-medium text-slate-700">Provider-confirmed</dt>
          <dd className="font-semibold tabular-nums text-slate-950">{count === null ? "Unavailable" : count.toLocaleString("en-US")}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 py-2">
          <dt className="text-slate-600">Tracked trips</dt><dd className="text-xs font-medium text-slate-500">Not connected</dd>
        </div>
      </dl>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
        <Link href={tripDirectoryHref({ ...blankFilters, product: type, status: "UPCOMING" })}
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Upcoming</Link>
        <Link href={tripDirectoryHref({ ...blankFilters, product: type, status: "CANCELLED" })}
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Cancelled</Link>
        <Link href={href} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          View {title.toLowerCase()} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium leading-4 text-slate-600">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-slate-900">{value}</dd>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium leading-4 text-slate-600">{label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-6 tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminConfirmedTripsPage({ searchParams }: Props) {
  const raw = (await searchParams) ?? {};
  const parsed = parseAdminTripFilters(raw);
  const filters = parsed.ok ? parsed.filters : blankFilters;
  const readiness = getConfirmedTripsIntegrationReadiness();
  const [operations, deliveryHealth, directory] = await Promise.all([
    getConfirmedTripsOperationsSnapshot(),
    getConfirmationDeliveryHealth(),
    parsed.ok ? listAdminConfirmedTrips(filters) : Promise.resolve(null),
  ]);

  return (
    <AdminPageShell title="Trips" hideHeader>
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-slate-950">Trips</p>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">View verified provider-confirmed trips across flights, hotels, and cars.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Browse confirmed trips</Link>
          <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Flight status</Link>
        </div>
      </div>

      <div className="space-y-3">
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <section aria-labelledby="confirmed-trips-overview">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <h2 id="confirmed-trips-overview" className="text-base font-semibold text-slate-950">Trip overview</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">All-time verified trip records. Select a card to inspect matching records.</p>
              </div>
              {operations ? <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="font-semibold tabular-nums">{operations.metrics.confirmedLast24h.toLocaleString("en-US")}</span> confirmation updates · last 24h
              </div> : null}
            </div>
            {operations ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <TripMetric label="Confirmed trips" value={operations.metrics.total} hint="All verified trip records, including later status changes" icon={FileCheck2} tone="info" href="/admin/confirmed-trips/records" />
                <TripMetric label="Tracked trips" value="—" hint="Tracking begins at confirmation once integrated" icon={Activity} tone="neutral" />
                <TripMetric label="Upcoming" value={operations.metrics.upcoming} hint="Latest provider status: upcoming" icon={CalendarCheck} tone="good" href="/admin/confirmed-trips/records?status=UPCOMING" />
                <TripMetric label="Past" value={operations.metrics.past} hint="Latest provider status: past" icon={CalendarDays} tone="neutral" href="/admin/confirmed-trips/records?status=PAST" />
                <TripMetric label="Cancelled" value={operations.metrics.cancelled} hint="Latest provider status: cancelled" icon={CircleX} tone="warn" href="/admin/confirmed-trips/records?status=CANCELLED" />
              </div>
            ) : (
              <p role="status" className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-700">Trip counts unavailable. No counts are shown.</p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-600">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Trips with a provider confirmation in the last 24 hours, including updates. Not a count of new bookings. Tracking totals require a separate future data source.</span>
            </p>
          </section>
        </AdminSectionCard>

        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <section aria-labelledby="trip-categories-title">
            <h2 id="trip-categories-title" className="text-base font-semibold text-slate-950">Trips by category</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Select a travel type or open its upcoming and cancelled records.</p>
            <div className="mt-3 grid min-w-0 items-stretch gap-3 lg:grid-cols-3">
              {travelTypes.map(({ type, title, detail, icon }) => (
                <TripCategoryCard key={type} type={type} title={title} detail={detail} icon={icon}
                  count={operations ? operations.byProduct.find((item) => item.tripType === type)?.count ?? 0 : null} />
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Package and additional product types remain available in the full directory and detailed breakdowns.</p>
          </section>
        </AdminSectionCard>

        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <section aria-labelledby="trip-directory-title" id="trip-directory">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="trip-directory-title" className="text-base font-semibold text-slate-950">Trip directory</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">Search verified records; filters use the latest signed confirmation date in UTC.</p>
              </div>
              <Link href={tripDirectoryHref(filters)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                Open full directory <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <form method="get" action="/admin/confirmed-trips" aria-label="Filter trip directory" className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <label className="min-w-0 text-xs font-medium text-slate-700 lg:col-span-2">Search trips
                <input name="q" defaultValue={filters.q} maxLength={80} placeholder="Customer, reference, destination…"
                  className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
              </label>
              <label className="min-w-0 text-xs font-medium text-slate-700 lg:col-span-2">Provider
                <input name="provider" defaultValue={filters.provider} maxLength={100} placeholder="All providers"
                  className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
              </label>
              <label className="min-w-0 text-xs font-medium text-slate-700">Travel type
                <select name="product" defaultValue={filters.product} className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <option value="all">All travel types</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option><option value="CAR">Cars</option><option value="PACKAGE">Packages</option>
                </select>
              </label>
              <label className="min-w-0 text-xs font-medium text-slate-700">Trip status
                <select name="status" defaultValue={filters.status} className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <option value="all">All statuses</option><option value="UPCOMING">Upcoming</option><option value="PAST">Past</option><option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              <label className="min-w-0 text-xs font-medium text-slate-700">Confirmed from (UTC)
                <input type="date" name="from" defaultValue={filters.from} className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
              </label>
              <label className="min-w-0 text-xs font-medium text-slate-700">Confirmed to (UTC)
                <input type="date" name="to" defaultValue={filters.to} className="mt-1 h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-700 px-4 text-xs font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Apply filters</button>
                <Link href="/admin/confirmed-trips#trip-directory" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Clear filters</Link>
                <span className="text-xs leading-5 text-slate-500">Precise 10- and 30-minute filters and tracking health require backend integration.</span>
              </div>
            </form>

            <div className="mt-3 border-t border-slate-100 pt-3">
              {!parsed.ok ? (
                <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{parsed.error}</p>
              ) : directory?.status === "unavailable" ? (
                <p role="status" className="rounded-lg bg-slate-50 px-4 py-4 text-sm text-slate-700">Trip records are temporarily unavailable. No records or counts are assumed.</p>
              ) : directory?.status === "ok" ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold tabular-nums text-slate-700">{directory.totalMatching.toLocaleString("en-US")} matching verified trips</p>
                    <p className="text-xs text-slate-500">Showing up to 20 records, newest confirmation first</p>
                  </div>
                  {directory.rows.length ? (
                    <TripDirectoryView rows={directory.rows} />
                  ) : (
                    <p role="status" className="rounded-lg bg-slate-50 px-4 py-4 text-center text-sm text-slate-700">No provider-confirmed trip matches the selected filters.</p>
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
                <p role="status" className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">Trip directory couldn't be loaded.</p>
              )}
            </div>
          </section>
        </AdminSectionCard>

        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <section aria-labelledby="related-trip-operations-title">
            <h2 id="related-trip-operations-title" className="text-base font-semibold text-slate-950">Related trip operations</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Technical monitoring remains available without crowding trip records.</p>
            <div className="mt-3 space-y-2">
              <details className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><FileCheck2 size={17} className="text-indigo-700" aria-hidden="true" />Detailed product and provider breakdowns</span>
                  <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 p-3"><ConfirmedTripsBreakdowns operations={operations} /></div>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-indigo-700" aria-hidden="true" />Confirmation integration readiness</span>
                  <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 p-3">
          <section aria-labelledby="confirmation-integration-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <ShieldCheck size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="confirmation-integration-title" className="scroll-mt-28 min-[1100px]:scroll-mt-44 text-base font-semibold leading-6 tracking-tight text-slate-950">Confirmation integration readiness</h2>
                  <p className="mt-1 text-[13px] leading-5 text-slate-600">
                    Provider confirmation setup and connection status.
                  </p>
                </div>
              </div>
              <div className="max-w-full shrink-0">
                <AdminStatusBadge tone={readiness.feedReady ? "info" : "warn"}>
                  {readiness.feedReady ? "Provider-bound webhook configured" : "Provider-bound webhook not configured"}
                </AdminStatusBadge>
              </div>
            </div>
            <dl className="mt-3 grid gap-x-5 gap-y-2.5 border-y border-slate-100 py-2.5 md:grid-cols-3">
              <InlineFact label="Configured provider" value={readiness.providerName || "None"} />
              <InlineFact label="Webhook credential" value={readiness.webhookCredentialConfigured ? "Configured" : "Not configured"} />
              <InlineFact label="Current search-provider confirmation feed" value={readiness.currentSearchProviderConfirmationFeed === "none" ? "None" : "Configured"} />
            </dl>
            <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              <InlineFact label="Endpoint" value="POST /api/internal/partner-confirmations" />
              <InlineFact label="Webhook credential model" value={readiness.credentialModel === "single_provider_bound_secret" ? "Single provider + dedicated secret" : "Unknown"} />
            </dl>
            <p className="mt-2.5 text-[13px] leading-5 text-slate-600">
              Confirmations require signed server-to-server callbacks from the configured provider. A webhook setup does not mean a live feed or provider agreement. Duffel search and KAYAK sandbox do not send booking confirmations.
            </p>
          </section>

                </div>
              </details>

              <details className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><Clock3 size={17} className="text-indigo-700" aria-hidden="true" />Confirmation delivery health and alerts</span>
                  <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 p-3">
          <section aria-labelledby="confirmation-delivery-health-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
              <div className="min-w-0 flex-1">
                <h2 id="confirmation-delivery-health-title" className="text-base font-semibold leading-6 tracking-tight text-slate-950">Confirmation delivery health</h2>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">Tracks authenticated provider callbacks. Retries are not new bookings or trips.</p>
              </div>
              <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2">
                <AdminStatusBadge tone={!readiness.feedReady ? "neutral" : !deliveryHealth ? "warn" : deliveryHealth.rejectedLast24h > 0 ? "warn" : "info"}>
                  {!readiness.feedReady ? "Monitoring inactive" : !deliveryHealth ? "Telemetry unavailable" : deliveryHealth.rejectedLast24h > 0 ? "Rejected deliveries · last 24h" : "Receipt telemetry available"}
                </AdminStatusBadge>
              </div>
            </div>
            {!readiness.feedReady ? (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-700">
                <Info size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>No provider confirmation feed is configured. Monitoring is off.</span>
              </p>
            ) : !deliveryHealth ? (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-700">
                <Info size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>Delivery data is unavailable. No counts are assumed.</span>
              </p>
            ) : (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Fact label="Authenticated deliveries · last 24h" value={String(deliveryHealth.receivedLast24h)} />
                  <Fact label="Accepted · last 24h" value={String(deliveryHealth.acceptedLast24h)} />
                  <Fact label="Rejected · last 24h" value={String(deliveryHealth.rejectedLast24h)} />
                </div>
                <dl className="mt-3 grid gap-x-5 gap-y-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  <InlineFact label="Latest authenticated delivery" value={deliveryHealth.lastReceivedAt ? formatDateTime(new Date(deliveryHealth.lastReceivedAt)) : "None recorded"} />
                  <InlineFact label="Last accepted delivery" value={deliveryHealth.lastAcceptedAt ? formatDateTime(new Date(deliveryHealth.lastAcceptedAt)) : "None recorded"} />
                  <InlineFact label="Latest rejected delivery · last 24h" value={deliveryHealth.lastRejectedAt ? formatDateTime(new Date(deliveryHealth.lastRejectedAt)) : "None in last 24h"} />
                  <InlineFact label="Configured provider" value={deliveryHealth.providerName} />
                </dl>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">Recent authenticated delivery receipts</h3>
                {deliveryHealth.recent.length ? (
                  <div role="region" aria-label="Recent authenticated delivery receipts" tabIndex={0} className="mt-2 max-w-full overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <caption className="sr-only">Recent authenticated callback receipts for the configured provider. Receipts may include retries.</caption>
                      <thead className="bg-slate-50 font-medium text-slate-700">
                        <tr>
                          {["Received", "Outcome", "Reason", "Reported status"].map((heading) => (
                            <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveryHealth.recent.map(item => (
                          <tr key={item.id} className="align-top hover:bg-slate-50/60">
                            <td className="whitespace-nowrap px-3 py-2.5 text-slate-800">{formatDateTime(new Date(item.receivedAt))}</td>
                            <td className="px-3 py-2.5"><AdminStatusBadge tone={item.outcome === "ACCEPTED" ? "good" : "warn"}>{item.outcome}</AdminStatusBadge></td>
                            <td className="break-words px-3 py-2.5 text-slate-700">{item.reason.replaceAll("_", " ")}</td>
                            <td className="px-3 py-2.5 text-slate-700">{item.reportedStatus || "Unavailable"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-700">No authenticated provider callbacks recorded yet.</p>
                )}
              </>
            )}
            {readiness.feedReady ? <ConfirmedTripDeliveryAlerts /> : null}
          </section>
                </div>
              </details>

              <Link href="/admin/flight-status" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span className="flex items-center gap-2"><Plane size={17} className="text-indigo-700" aria-hidden="true" />Flight status monitoring</span>
                <ArrowRight size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </AdminSectionCard>
      </div>
    </AdminPageShell>
  );
}
