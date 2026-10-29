import Link from "next/link";
import { RecentConfirmedTripTable } from "@/components/admin/RecentConfirmedTripTable";
import { ConfirmedTripsBreakdowns } from "@/components/admin/ConfirmedTripsBreakdowns";
import {
  CalendarCheck,
  CalendarDays,
  CircleX,
  Clock3,
  FileCheck2,
  Info,
  ShieldCheck,
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
      eyebrow=""
      description="View trips confirmed by travel providers and monitor confirmation activity."
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
      {/* Retain the existing page body background. One parent groups every
          read-only section without changing the canonical data sources. */}
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div className="space-y-4 lg:space-y-5">
          <section aria-labelledby="confirmed-trips-overview">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="confirmed-trips-overview" className="text-lg font-semibold leading-6 text-slate-950">Trip overview</h2>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">Trusted provider-confirmed My Trips in this database.</p>
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
                <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-5 text-slate-600">
                  <Info size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span><strong className="font-semibold text-slate-700">Last 24h:</strong> Trips whose latest provider-confirmation timestamp is within 24h. This can include updates to existing trips; it is not a new-bookings count. Upcoming, Past and Cancelled use stored trip statuses.</span>
                </p>
              </>
            ) : (
              <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-950">Confirmed-trip telemetry unavailable</h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">The connected database could not return confirmed-trip operations. No zero values were invented.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="recent-confirmed-trips-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <FileCheck2 size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="recent-confirmed-trips-title" className="scroll-mt-28 min-[1100px]:scroll-mt-44 text-base font-semibold text-slate-950">Recent provider-confirmed trips</h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-slate-600">Latest trusted partner-confirmed trip records in this database.</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">Read-only</span>
            </div>
            {operations ? (
              <RecentConfirmedTripTable trips={operations.recentTrips} />
            ) : (
              <div role="status" className="rounded-lg bg-slate-50 px-3 py-3 text-[13px] leading-5 text-slate-600">
                Recent trip records are unavailable because the confirmed-trip database query could not be completed.
              </div>
            )}
          </section>
          <ConfirmedTripsBreakdowns operations={operations} />

          <section aria-labelledby="confirmation-integration-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <ShieldCheck size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="confirmation-integration-title" className="scroll-mt-28 min-[1100px]:scroll-mt-44 text-base font-semibold leading-6 text-slate-950">Confirmation integration readiness</h2>
                  <p className="mt-1 text-[13px] leading-5 text-slate-600">
                    The partner confirmation endpoint is server-to-server only. Current Duffel search and KAYAK sandbox integrations do not send booking confirmations.
                  </p>
                </div>
              </div>
              <div className="max-w-full shrink-0">
                <AdminStatusBadge tone={readiness.feedReady ? "info" : "warn"}>
                  {readiness.feedReady ? "Provider-bound webhook configured" : "Provider-bound webhook not configured"}
                </AdminStatusBadge>
              </div>
            </div>
            <dl className="mt-3 grid gap-x-5 gap-y-2 border-y border-slate-100 py-2.5 sm:grid-cols-3">
              <InlineFact label="Configured provider" value={readiness.providerName || "None"} />
              <InlineFact label="Webhook credential" value={readiness.webhookCredentialConfigured ? "Configured" : "Not configured"} />
              <InlineFact label="Current search-provider confirmation feed" value={readiness.currentSearchProviderConfirmationFeed === "none" ? "None" : "Configured"} />
            </dl>
            <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              <InlineFact label="Endpoint" value="POST /api/internal/partner-confirmations" />
              <InlineFact label="Webhook credential model" value={readiness.credentialModel === "single_provider_bound_secret" ? "Single provider + dedicated secret" : "Unknown"} />
            </dl>
            <p className="mt-2.5 text-[13px] leading-5 text-slate-600">
              A configured webhook secret means the signed callback boundary is ready; it does not mean a provider agreement or live confirmation feed is active. The server now binds the signing secret to a single configured provider, and rejects a signed payload naming a different provider.
            </p>
          </section>

          <section aria-labelledby="confirmation-delivery-health-title" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="confirmation-delivery-health-title" className="text-base font-semibold leading-6 text-slate-950">Confirmation delivery health</h2>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">Authenticated provider callback receipts. Accepted deliveries may be retries; these are not additional bookings or unique trips.</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <AdminStatusBadge tone={!readiness.feedReady ? "neutral" : !deliveryHealth ? "warn" : deliveryHealth.rejectedLast24h > 0 ? "warn" : "info"}>
                  {!readiness.feedReady ? "Monitoring inactive" : !deliveryHealth ? "Telemetry unavailable" : deliveryHealth.rejectedLast24h > 0 ? "Rejected deliveries · last 24h" : "Receipt telemetry available"}
                </AdminStatusBadge>
                <Link href="/admin/notifications" className="text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline">Operational alerts</Link>
              </div>
            </div>
            {!readiness.feedReady ? (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-700">
                <Info size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>No provider-bound confirmation feed is configured. Delivery monitoring remains inactive.</span>
              </p>
            ) : !deliveryHealth ? (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-700">
                <Info size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span>Delivery telemetry is unavailable. No delivery counts have been assumed.</span>
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
                  <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-700">No authenticated partner confirmation deliveries have been recorded yet.</p>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="trips-operational-boundaries" className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="trips-operational-boundaries" className="text-base font-semibold leading-6 text-slate-950">Operational boundaries</h2>
                <p className="mt-1 text-[13px] leading-5 text-slate-700">
                  Kurioticket is a metasearch and referral platform. A confirmed My Trip means Kurioticket accepted a valid signed partner confirmation and stored it as trusted trip data. It does not create a Kurioticket booking, payment, refund, cancellation or ticketing record.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:pl-10">
              <AdminStatusBadge tone="good">Signed confirmations only</AdminStatusBadge>
              <AdminStatusBadge>Provider handoff ≠ confirmation</AdminStatusBadge>
              <AdminStatusBadge>No Kurioticket payment record</AdminStatusBadge>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600 sm:pl-10">
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
      <p className="mt-1.5 break-words text-xs leading-4 text-slate-600">{hint}</p>
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
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium leading-4 text-slate-600">{label}</p>
      <p className="mt-1 break-words text-base font-semibold leading-6 tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
