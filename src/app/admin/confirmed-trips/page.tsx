import Link from "next/link";
import { RecentConfirmedTripTable } from "@/components/admin/RecentConfirmedTripTable";
import {
  ArrowDown,
  CalendarCheck,
  CalendarDays,
  CircleX,
  Clock3,
  FileCheck2,
  Info,
  Package,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getConfirmedTripsIntegrationReadiness, getConfirmedTripsOperationsSnapshot } from "@/services/adminConfirmedTripsOperationsService";
import { getConfirmationDeliveryHealth } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Confirmed Trips" };

export default async function AdminConfirmedTripsPage() {
  const readiness = getConfirmedTripsIntegrationReadiness();
  const [operations, deliveryHealth] = await Promise.all([
    getConfirmedTripsOperationsSnapshot(),
    getConfirmationDeliveryHealth(),
  ]);

  return (
    <AdminPageShell
      title="Confirmed Trips"
      description="Monitor provider-confirmed My Trips created by signed partner callbacks. Provider handoffs, searches and payments are not treated as booking confirmations."
      actions={
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            Browse confirmed trips
          </Link>
          <Link href="/admin/flight-status" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
            Flight status
          </Link>
        </div>
      }
    >
      <nav aria-label="Confirmed Trips page shortcuts" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 pb-3">
        <span className="text-xs font-medium text-slate-500">Jump to:</span>
        <Link href="#recent-confirmed-trips-title" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <ArrowDown size={15} aria-hidden="true" />
          Recent confirmed trips
        </Link>
        <Link href="#confirmation-integration-title" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <ArrowDown size={15} aria-hidden="true" />
          Confirmation readiness
        </Link>
      </nav>
      {/* Retain the existing page body background. One parent groups every
          read-only section without changing the canonical data sources. */}
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div className="space-y-4 lg:space-y-5">
          <section aria-labelledby="confirmed-trips-overview">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="confirmed-trips-overview" className="text-lg font-semibold leading-6 text-slate-950">Trip overview</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">Trusted provider-confirmed My Trips in this database.</p>
              </div>
              {operations ? (
                <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Environment: {operations.environment}
                </span>
              ) : null}
            </div>
            {operations ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
                  <TripMetric label="Confirmed trips" value={operations.metrics.total} hint="Trusted confirmed trip records" icon={FileCheck2} tone={operations.metrics.total > 0 ? "info" : "neutral"} />
                  <TripMetric label="Last 24h" value={operations.metrics.confirmedLast24h} hint="Latest confirmation within 24h" icon={Clock3} tone={operations.metrics.confirmedLast24h > 0 ? "info" : "neutral"} />
                  <TripMetric label="Upcoming" value={operations.metrics.upcoming} hint="Stored as upcoming" icon={CalendarCheck} tone={operations.metrics.upcoming > 0 ? "good" : "neutral"} />
                  <TripMetric label="Past" value={operations.metrics.past} hint="Stored as past" icon={CalendarDays} tone="neutral" />
                  <TripMetric label="Cancelled" value={operations.metrics.cancelled} hint="Stored as cancelled" icon={CircleX} tone={operations.metrics.cancelled > 0 ? "warn" : "neutral"} />
                </div>
                <p className="mt-2.5 flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <Info size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span><strong className="font-semibold text-slate-700">Last 24h:</strong> Trips whose latest provider-confirmation timestamp is within 24h. This can include updates to existing trips; it is not a new-bookings count. Upcoming, Past and Cancelled use stored trip statuses.</span>
                </p>
              </>
            ) : (
              <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-bold text-slate-950">Confirmed-trip telemetry unavailable</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">The connected database could not return confirmed-trip operations. No zero values were invented.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="recent-confirmed-trips-title" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <FileCheck2 size={20} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
                <div>
                  <h2 id="recent-confirmed-trips-title" className="scroll-mt-28 min-[1100px]:scroll-mt-44 text-base font-semibold text-slate-950">Recent provider-confirmed trips</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Latest trusted partner-confirmed trip records in this database.</p>
                </div>
              </div>
              <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">Read-only</span>
            </div>
            {operations ? (
              <RecentConfirmedTripTable trips={operations.recentTrips} />
            ) : (
              <div role="status" className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                Recent trip records are unavailable because the confirmed-trip database query could not be completed.
              </div>
            )}
          </section>
          <section aria-labelledby="confirmation-integration-title" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <ShieldCheck size={19} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2 id="confirmation-integration-title" className="scroll-mt-28 min-[1100px]:scroll-mt-44 text-base font-semibold text-slate-950">Confirmation integration readiness</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    The partner confirmation endpoint is server-to-server only. Current Duffel search and KAYAK sandbox integrations do not send booking confirmations.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-start">
                <AdminStatusBadge tone={readiness.feedReady ? "good" : "warn"}>
                  {readiness.feedReady ? "Provider-bound webhook configured" : "Provider-bound webhook not configured"}
                </AdminStatusBadge>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              <Fact label="Endpoint" value="POST /api/internal/partner-confirmations" />
              <Fact label="Webhook credential model" value={readiness.credentialModel === "single_provider_bound_secret" ? "Single provider + dedicated secret" : "Unknown"} />
              <Fact label="Configured provider" value={readiness.providerName || "None"} />
              <Fact label="Webhook credential" value={readiness.webhookCredentialConfigured ? "Configured" : "Not configured"} />
              <Fact label="Current search-provider confirmation feed" value={readiness.currentSearchProviderConfirmationFeed === "none" ? "None" : "Configured"} />
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-600">
              A configured webhook secret means the signed callback boundary is ready; it does not mean a provider agreement or live confirmation feed is active. The server now binds the signing secret to a single configured provider, and rejects a signed payload naming a different provider.
            </p>
          </section>

          <section aria-labelledby="confirmation-delivery-health-title" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="confirmation-delivery-health-title" className="text-base font-bold text-slate-950">Confirmation delivery health</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Authenticated provider callback receipts. Accepted deliveries may be retries; these are not additional bookings or unique trips.</p>
              </div>
              <Link href="/admin/notifications" className="text-sm font-semibold text-indigo-700 hover:underline">Operational alerts</Link>
            </div>
            {!readiness.feedReady ? (
              <p role="status" className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No provider-bound confirmation feed is configured. Delivery monitoring remains inactive.</p>
            ) : !deliveryHealth ? (
              <p role="status" className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Delivery telemetry is unavailable. No delivery counts have been assumed.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Fact label="Authenticated deliveries · last 24h" value={String(deliveryHealth.receivedLast24h)} />
                  <Fact label="Accepted · last 24h" value={String(deliveryHealth.acceptedLast24h)} />
                  <Fact label="Rejected · last 24h" value={String(deliveryHealth.rejectedLast24h)} />
                  <Fact label="Latest authenticated delivery" value={deliveryHealth.lastReceivedAt ? formatDateTime(new Date(deliveryHealth.lastReceivedAt)) : "None recorded"} />
                  <Fact label="Last accepted delivery" value={deliveryHealth.lastAcceptedAt ? formatDateTime(new Date(deliveryHealth.lastAcceptedAt)) : "None recorded"} />
                  <Fact label="Configured provider" value={deliveryHealth.providerName} />
                </div>
                <h3 className="mt-5 text-sm font-bold text-slate-950">Recent authenticated delivery receipts</h3>
                {deliveryHealth.recent.length ? (
                  <div className="mt-2 max-w-full overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr><th className="px-3 py-3">Received</th><th className="px-3 py-3">Outcome</th><th className="px-3 py-3">Reason</th><th className="px-3 py-3">Reported status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deliveryHealth.recent.map(item => (
                          <tr key={item.id}>
                            <td className="whitespace-nowrap px-3 py-3">{formatDateTime(new Date(item.receivedAt))}</td>
                            <td className="px-3 py-3"><AdminStatusBadge tone={item.outcome === "ACCEPTED" ? "good" : "warn"}>{item.outcome}</AdminStatusBadge></td>
                            <td className="px-3 py-3">{item.reason.replaceAll("_", " ")}</td>
                            <td className="px-3 py-3">{item.reportedStatus || "Unavailable"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p role="status" className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No authenticated partner confirmation deliveries have been recorded yet.</p>}
              </>
            )}
          </section>

          <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <section aria-labelledby="trips-by-product-title" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <Package size={20} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
                  <div>
                    <h2 id="trips-by-product-title" className="text-base font-bold text-slate-950">Confirmed trips by product</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Provider-confirmed trips grouped by product.</p>
                  </div>
                </div>
                {!operations ? (
                  <div role="status" className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-slate-800">Product breakdown unavailable</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">Confirmed-trip records could not be loaded from the connected database. No counts are assumed.</p>
                  </div>
                ) : operations.byProduct.length ? (
                  <div className="mt-4 divide-y divide-slate-100">
                    {operations.byProduct.map((item) => (
                      <div key={item.tripType} className="flex min-w-0 items-center justify-between gap-3 py-3">
                        <span className="break-words text-sm font-semibold text-slate-900">{item.tripType}</span>
                        <AdminStatusBadge tone="info">{item.count}</AdminStatusBadge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
                    <Package size={25} className="text-slate-400" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">No provider-confirmed trips are recorded yet.</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">A product breakdown will appear after accepted signed confirmations are recorded.</p>
                  </div>
                )}
              </section>

              <section aria-labelledby="trips-by-provider-title" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start gap-2.5">
                  <Users size={20} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
                  <div>
                    <h2 id="trips-by-provider-title" className="text-base font-bold text-slate-950">Confirmed trips by provider</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Provider-confirmed trips grouped by provider.</p>
                  </div>
                </div>
                {!operations ? (
                  <div role="status" className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-slate-800">Provider breakdown unavailable</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">Confirmed-trip records could not be loaded from the connected database. No providers or counts are assumed.</p>
                  </div>
                ) : operations.byProvider.length ? (
                  <div className="mt-4 divide-y divide-slate-100">
                    {operations.byProvider.map((item) => (
                      <div key={item.provider} className="flex min-w-0 items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900">{item.provider}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{item.lastConfirmationAt ? "Last confirmation " + formatDateTime(new Date(item.lastConfirmationAt)) : "No timestamp"}</p>
                        </div>
                        <AdminStatusBadge tone="info">{item.count}</AdminStatusBadge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 py-6 text-center">
                    <Users size={25} className="text-slate-400" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-800">No provider confirmation feed has produced a confirmed trip yet.</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">A provider breakdown will appear after genuine signed confirmations are accepted.</p>
                  </div>
                )}
              </section>
            </div>

          <section aria-labelledby="trips-operational-boundaries" className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="trips-operational-boundaries" className="text-base font-bold text-slate-950">Operational boundaries</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Kurioticket is a metasearch and referral platform. A confirmed My Trip means Kurioticket accepted a valid signed partner confirmation and stored it as trusted trip data. It does not create a Kurioticket booking, payment, refund, cancellation or ticketing record.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminStatusBadge tone="good">Signed confirmations only</AdminStatusBadge>
              <AdminStatusBadge>Provider handoff ≠ confirmation</AdminStatusBadge>
              <AdminStatusBadge>No Kurioticket payment record</AdminStatusBadge>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              MyTrip rows do not carry an environment column. This page therefore reports the database connected to the current {operations?.environment ?? "application"} environment rather than applying a per-row environment filter.
            </p>
          </section>

        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
}

type TripTone = "info" | "good" | "warn" | "neutral";

function TripMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: TripTone;
}) {
  const styles: Record<TripTone, string> = {
    info: "bg-indigo-50 text-indigo-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  };
  const formattedValue = new Intl.NumberFormat("en-US").format(value);
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + styles[tone]}>
          <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <h3 className="min-w-0 break-words text-xs font-semibold leading-4 text-slate-700">{label}</h3>
      </div>
      <p className="mt-2 text-[clamp(1.4rem,2.2vw,1.875rem)] font-semibold leading-none tracking-tight tabular-nums text-slate-950">{formattedValue}</p>
      <p className="mt-1.5 break-words text-[11px] leading-4 text-slate-600">{hint}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">{value}</p>
    </div>
  );
}
