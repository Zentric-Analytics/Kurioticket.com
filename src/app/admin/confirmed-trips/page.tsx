import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleX,
  Clock3,
  FileCheck2,
  Info,
  Plane,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { ConfirmedTripsBreakdowns } from "@/components/admin/ConfirmedTripsBreakdowns";
import { ConfirmedTripDeliveryAlerts } from "@/components/admin/ConfirmedTripDeliveryAlerts";
import { TripDirectoryView } from "@/components/admin/TripDirectoryView";
import { TripFilterControls } from "@/components/admin/TripFilterControls";
import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import {
  tripDirectoryHref,
  type AdminTripFilters,
} from "@/lib/adminConfirmedTripsDirectory";
import {
  getConfirmedTripsIntegrationReadiness,
  getConfirmedTripsOperationsSnapshot,
} from "@/services/adminConfirmedTripsOperationsService";
import { listAdminConfirmedTrips } from "@/services/adminConfirmedTripsDirectoryService";
import { parseAdminTripWorkspace, tripWorkspaceHref } from "@/lib/adminTripWorkspace";
import { getConfirmationDeliveryHealth } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Trips" };

type RawQuery = Record<string, string | string[] | undefined>;
type Props = { searchParams?: Promise<RawQuery> };
type TripTone = "info" | "good" | "warn" | "neutral";

const blankFilters: AdminTripFilters = {
  q: "", provider: "", product: "all", status: "all", from: "", to: "",
};

const tripCategories = [
  { type: "all", label: "All" },
  { type: "FLIGHT", label: "Flights" },
  { type: "HOTEL", label: "Hotels" },
  { type: "CAR", label: "Cars" },
  { type: "PACKAGE", label: "Packages" },
] as const;

function TripMetric({
  label, value, hint, icon: Icon, tone, href, active = false,
}: {
  label: string; value: number | string; hint: string;
  icon: LucideIcon; tone: TripTone; href?: string; active?: boolean;
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
        <span className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-md " + colors[tone]}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <h3 className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-4 text-slate-800">{label}</h3>
        {href ? <ArrowRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" /> : null}
      </div>
      <p className="mt-2 text-[22px] font-semibold leading-6 tracking-tight tabular-nums text-slate-950">
        {typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : value}
      </p>
      <p className="mt-1 min-w-0 text-[11px] leading-4 text-slate-600">{hint}</p>
    </>
  );
  const className = "flex h-full min-w-0 flex-col rounded-lg border bg-white px-3 py-2.5 " +
    (active ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200/80");
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={className + " transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"}>
      {content}
    </Link>
  ) : (
    <div className={className + " cursor-not-allowed"} aria-label={label + ": reporting not yet available"}>
      {content}
    </div>
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
    <div className="min-w-0 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-xs font-medium leading-4 text-slate-600">{label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-6 tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminConfirmedTripsPage({ searchParams }: Props) {
  const raw = (await searchParams) ?? {};
  const parsed = parseAdminTripWorkspace(raw);
  const filters = parsed.ok ? parsed.filters : blankFilters;
  const range = parsed.ok ? parsed.range : "all";
  const dateFields = parsed.ok ? parsed.dateFields : { from: "", to: "" };
  const readiness = getConfirmedTripsIntegrationReadiness();
  const [operations, deliveryHealth, directory] = await Promise.all([
    getConfirmedTripsOperationsSnapshot(),
    getConfirmationDeliveryHealth(),
    parsed.ok ? listAdminConfirmedTrips(filters) : Promise.resolve(null),
  ]);

  return (
    <AdminPageShell title="Trips" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div role="group" aria-label="Trip shortcuts" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Browse confirmed trips</Link>
            <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Flight status</Link>
          </div>
        </div>

        <div className="space-y-3">
          <section aria-labelledby="confirmed-trips-overview" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <div className="mb-3 min-w-0">
              <h2 id="confirmed-trips-overview" className="text-base font-semibold text-slate-950">Trip overview</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">The counters and records follow the same applied filters. Select a status to investigate matching trips.</p>
            </div>
            {directory?.status === "ok" ? (
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <TripMetric label="Confirmed trips" value={directory.totalMatching} hint="All verified trips matching this scope" icon={FileCheck2} tone="info"
                  href={tripWorkspaceHref(filters, range, { status: "all" })} active={filters.status === "all"} />
                <TripMetric label="Tracked trips" value="—" hint="Tracking reporting not connected" icon={Activity} tone="neutral" />
                <TripMetric label="Upcoming" value={directory.statusCounts.upcoming} hint="Matching upcoming trips" icon={CalendarCheck} tone="good"
                  href={tripWorkspaceHref(filters, range, { status: "UPCOMING" })} active={filters.status === "UPCOMING"} />
                <TripMetric label="Past" value={directory.statusCounts.past} hint="Matching past trips" icon={CalendarDays} tone="neutral"
                  href={tripWorkspaceHref(filters, range, { status: "PAST" })} active={filters.status === "PAST"} />
                <TripMetric label="Cancelled" value={directory.statusCounts.cancelled} hint="Matching cancelled trips" icon={CircleX} tone="warn"
                  href={tripWorkspaceHref(filters, range, { status: "CANCELLED" })} active={filters.status === "CANCELLED"} />
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
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="trip-directory-title" className="text-base font-semibold text-slate-950">Trip directory</h2>
                <p className="mt-0.5 text-xs leading-5 text-slate-600">Search verified records; filters use the latest signed confirmation date in UTC.</p>
              </div>
              <Link href={tripDirectoryHref(filters)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                Open full directory <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <nav aria-label="Trip travel types" className="mb-3 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-100">
              {tripCategories.map(({ type, label }) => {
                const selected = filters.product === type;
                return (
                  <Link key={type} href={tripWorkspaceHref(filters, range, { product: type })}
                    aria-current={selected ? "page" : undefined}
                    className={"relative inline-flex min-h-9 items-center text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 " +
                      (selected ? "text-indigo-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-indigo-700" : "text-slate-600 hover:text-slate-950")}>
                    {label}
                  </Link>
                );
              })}
            </nav>

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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold tabular-nums text-slate-700">{directory.totalMatching.toLocaleString("en-US")} matching verified trips</p>
                    <p className="text-xs text-slate-500">Showing up to 20 records, newest confirmation first</p>
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

          <section aria-labelledby="related-trip-operations-title" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 id="related-trip-operations-title" className="text-base font-semibold text-slate-950">Related trip operations</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Technical monitoring remains available without crowding trip records.</p>
            <div className="mt-3 space-y-2">
              <details className="group rounded-xl border border-slate-200/80 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><FileCheck2 size={17} className="text-indigo-700" aria-hidden="true" />Detailed product and provider breakdowns</span>
                  <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 p-3"><ConfirmedTripsBreakdowns operations={operations} /></div>
              </details>

              <details className="group rounded-xl border border-slate-200/80 bg-white">
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

              <details id="confirmation-delivery-health-title" className="group rounded-xl border border-slate-200/80 bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><Clock3 size={17} className="text-indigo-700" aria-hidden="true" />Confirmation delivery health and alerts</span>
                  <ChevronDown size={17} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-slate-100 p-3">
          <section aria-labelledby="confirmation-delivery-health-heading" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2.5">
              <div className="min-w-0 flex-1">
                <h2 id="confirmation-delivery-health-heading" className="text-base font-semibold leading-6 tracking-tight text-slate-950">Confirmation delivery health</h2>
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

              <Link href="/admin/flight-status" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span className="flex items-center gap-2"><Plane size={17} className="text-indigo-700" aria-hidden="true" />Flight status monitoring</span>
                <ArrowRight size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
