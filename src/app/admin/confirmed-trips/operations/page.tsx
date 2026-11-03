import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Clock3, FileCheck2, Info, Plane, ShieldCheck } from "lucide-react";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { ConfirmedTripsBreakdowns } from "@/components/admin/ConfirmedTripsBreakdowns";
import { ConfirmedTripDeliveryAlerts } from "@/components/admin/ConfirmedTripDeliveryAlerts";
import { formatDateTime } from "@/lib/admin-data";
import { requireAdminSession } from "@/lib/auth-guards";
import {
  getConfirmedTripsIntegrationReadiness,
  getConfirmedTripsOperationsSnapshot,
} from "@/services/adminConfirmedTripsOperationsService";
import { getConfirmationDeliveryHealth } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Trip Operations" };

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

export default async function AdminTripOperationsPage() {
  await requireAdminSession("/admin/confirmed-trips/operations");
  const readiness = getConfirmedTripsIntegrationReadiness();
  const [operations, deliveryHealth] = await Promise.all([
    getConfirmedTripsOperationsSnapshot(),
    getConfirmationDeliveryHealth(),
  ]);

  return (
    <AdminPageShell title="Trip operations" hideHeader>
      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <nav aria-label="Trip operations navigation" className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold text-slate-700 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Trips
          </Link>
          <Link href="/admin/confirmed-trips/records" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Browse confirmed trips
          </Link>
        </nav>
          <section aria-labelledby="trip-operations-title" className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <h2 id="trip-operations-title" className="text-base font-semibold text-slate-950">Trip operations</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">Review trusted provider breakdowns, confirmation readiness, callback delivery health and flight status.</p>
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
      </AdminSectionCard>
    </AdminPageShell>
  );
}
