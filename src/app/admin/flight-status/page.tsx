import Link from "next/link";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import {
  getFlightStatusIntegrationReadiness,
  getFlightStatusOperationsSnapshot,
} from "@/services/adminFlightStatusOperationsService";

export const metadata = { title: "Admin Flight Status" };

export default async function AdminFlightStatusPage() {
  const readiness = getFlightStatusIntegrationReadiness();
  const operations = await getFlightStatusOperationsSnapshot(undefined, readiness);

  return (
    <AdminPageShell title="Flight Status Operations" hideHeader>
      <div role="group" aria-label="Flight Status actions" className="mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Link href="/admin/confirmed-trips" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
          Confirmed trips
        </Link>
      </div>
      <AdminSectionCard className="min-w-0 space-y-3 p-4 sm:p-5 lg:p-6">
        <section aria-labelledby="flight-status-overview-title" className="min-w-0 rounded-xl border border-slate-200/90 p-3 sm:p-4">
          <h2 id="flight-status-overview-title" className="mb-2.5 text-base font-semibold leading-6 tracking-tight text-slate-950">Flight status overview</h2>
          {operations ? (
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
              <FlightStatusMetric label="Confirmed flights" value={operations.metrics.confirmedFlights} hint="Signed partner-confirmed flight trips in this database" tone="info" />
              <FlightStatusMetric label="Provider matched" value={operations.metrics.feedEligibleFlights} hint="Confirmed flights matching the configured provider name" />
              <FlightStatusMetric label="Tracked" value={operations.metrics.trackedFlights} hint="Provider-matched confirmed flights with a stored snapshot" tone={operations.metrics.trackedFlights > 0 ? "good" : "neutral"} />
              <FlightStatusMetric label="Missing status" value={operations.metrics.missingSnapshots} hint="Provider-matched confirmed flights awaiting their first snapshot" tone={operations.metrics.missingSnapshots > 0 ? "warn" : "neutral"} />
              <FlightStatusMetric label="Current" value={operations.metrics.currentSnapshots} hint="Snapshots observed from now back through 15 minutes" tone={operations.metrics.currentSnapshots > 0 ? "good" : "neutral"} />
              <FlightStatusMetric label="Stale" value={operations.metrics.staleSnapshots} hint="Stored snapshots outside the current freshness window" tone={operations.metrics.staleSnapshots > 0 ? "warn" : "neutral"} />
            </div>
          ) : (
            <div role="status" className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              <p className="font-semibold text-slate-900">Flight-status telemetry unavailable</p>
              <p className="mt-1">The connected database could not return flight-status operations. No zero values were invented.</p>
            </div>
          )}
        </section>

        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Status-feed readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The status endpoint accepts one provider-bound signed feed. Current Duffel search and KAYAK sandbox integrations do not supply this feed.
              </p>
            </div>
            <AdminStatusBadge tone={readiness.feedReady ? "good" : "warn"}>
              {readiness.feedReady ? "Status feed configured" : "Status feed not configured"}
            </AdminStatusBadge>
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            <Fact label="Endpoint" value="POST /api/internal/flight-status/updates" />
            <Fact label="Configured provider" value={readiness.providerName || "None"} />
            <Fact label="Webhook credential" value={readiness.webhookCredentialConfigured ? "Configured" : "Not configured"} />
            <Fact label="Provider binding" value={readiness.credentialModel === "single_provider_bound_secret" ? "Single provider + dedicated secret" : "Unknown"} />
            <Fact label="Current search-provider status feed" value={readiness.currentSearchProviderStatusFeed === "none" ? "None" : "Configured"} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The configured provider name must exactly match every accepted signed payload. A configured endpoint proves only that the status-feed boundary is ready; it does not prove that status updates are currently arriving.
          </p>
        </AdminSectionCard>

        {/* Keep both informational panels present even when the data query fails. */}
        <div className="grid items-start gap-3 lg:grid-cols-2">
            <AdminSectionCard className="min-w-0 p-4 sm:p-5">
              <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Latest status distribution</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Distribution of the latest stored provider snapshot for confirmed flights matching the configured provider.</p>
              {!operations ? (
                <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  Flight-status distribution is unavailable. No counts are assumed.
                </p>
              ) : operations.statusDistribution.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {operations.statusDistribution.map((item) => (
                    <div key={item.status} className="flex items-center justify-between gap-3 py-3">
                      <span className="font-semibold text-slate-900">{item.status}</span>
                      <AdminStatusBadge tone={item.status === "DELAYED" || item.status === "CANCELLED" ? "warn" : item.status === "UNKNOWN" ? "neutral" : "info"}>{item.count}</AdminStatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {readiness.feedReady
                    ? "No trusted flight-status snapshot is recorded for the configured provider yet."
                    : "No status provider feed is configured. There are no trusted snapshots to show."}
                </p>
              )}
            </AdminSectionCard>

            <AdminSectionCard className="min-w-0 p-4 sm:p-5">
              <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Snapshot scope</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Flight status currently stores one latest primary-flight snapshot per confirmed My Trip. Return legs and connecting segments are not tracked independently yet.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminStatusBadge tone="good">Provider supplied only</AdminStatusBadge>
                <AdminStatusBadge>Latest snapshot only</AdminStatusBadge>
                <AdminStatusBadge>No segment history yet</AdminStatusBadge>
              </div>
            </AdminSectionCard>
        </div>

        {operations ? (
          operations.awaitingFirstSnapshot.length ? (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Awaiting first status snapshot</h2>
                <p className="mt-1 text-sm text-slate-600">Provider-matched confirmed flights that have not received a trusted status snapshot yet.</p>
              </div>
              <AdminDataTable
                columns={["Departure", "Customer", "Route", "Provider", "Reference", "Confirmed"]}
                rows={operations.awaitingFirstSnapshot.map((trip) => ({
                  id: trip.id,
                  cells: [
                    formatDateTime(new Date(trip.departureDate)),
                    <div key="customer"><p className="font-semibold text-slate-950">{trip.userEmail || "Email unavailable"}</p><p className="text-xs text-slate-500">{trip.userId}</p></div>,
                    trip.origin ? trip.origin + " → " + trip.destination : trip.destination,
                    trip.providerName,
                    trip.providerConfirmationCode,
                    formatDateTime(new Date(trip.confirmedAt)),
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState title="No flights awaiting a first snapshot" message={readiness.feedReady ? "Every provider-matched confirmed flight currently has a stored status snapshot, or there are no matched flights." : "No configured status provider is currently eligible to receive snapshots."} />
          )
        ) : (
          <AdminEmptyState title="Awaiting first status snapshot" message="Flight-status data is unavailable. The number of flights awaiting a snapshot is unknown." />
        )}

        {operations ? (
          operations.recentSnapshots.length ? (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Latest trusted flight-status snapshots</h2>
                <p className="mt-1 text-sm text-slate-600">Newest canonical provider snapshots. This is not an event history.</p>
              </div>
              <AdminDataTable
                columns={["Observed", "Flight", "Route", "Status", "Freshness", "Customer", "Reference"]}
                rows={operations.recentSnapshots.map((snapshot) => ({
                  id: snapshot.id,
                  cells: [
                    formatDateTime(new Date(snapshot.observedAt)),
                    snapshot.carrierCode + " " + snapshot.flightNumber,
                    snapshot.originAirport + " → " + snapshot.destinationAirport,
                    <AdminStatusBadge key="status" tone={snapshot.status === "DELAYED" || snapshot.status === "CANCELLED" ? "warn" : snapshot.status === "UNKNOWN" ? "neutral" : "info"}>{snapshot.status}</AdminStatusBadge>,
                    <AdminStatusBadge key="freshness" tone={snapshot.freshness === "current" ? "good" : "warn"}>{snapshot.freshness.toUpperCase()}</AdminStatusBadge>,
                    <div key="customer"><p className="font-semibold text-slate-950">{snapshot.userEmail || "Email unavailable"}</p><p className="text-xs text-slate-500">{snapshot.userId}</p></div>,
                    snapshot.providerConfirmationCode,
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState
              title="Latest trusted flight-status snapshots"
              message={readiness.feedReady
                ? "No trusted flight-status snapshots have been recorded for the configured provider yet."
                : "No status provider feed is configured. There are no trusted snapshots to show."}
            />
          )
        ) : (
          <AdminEmptyState title="Latest trusted flight-status snapshots" message="Flight-status data is unavailable. Recent snapshots could not be loaded." />
        )}
        <AdminSectionCard className="min-w-0 p-4 sm:p-5">
          <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Kurioticket never derives live flight status from a search, a provider handoff, or a trip confirmation. A status appears only when the configured provider sends a valid signed update for an existing signed provider-confirmed flight.
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            FlightStatusSnapshot rows do not carry an environment column. This page reports the database connected to the current {operations?.environment ?? "application"} environment rather than pretending to apply per-row environment scoping.
          </p>
        </AdminSectionCard>

      </AdminSectionCard>
    </AdminPageShell>
  );
}


type FlightStatusMetricTone = "info" | "good" | "warn" | "neutral";

const flightStatusMetricDots: Record<FlightStatusMetricTone, string> = {
  info: "bg-indigo-500",
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  neutral: "bg-slate-300",
};

function FlightStatusMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: FlightStatusMetricTone;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 break-words text-xs font-medium leading-4 text-slate-600">{label}</p>
        <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${flightStatusMetricDots[tone]}`} />
      </div>
      <p className="mt-1 text-[22px] font-semibold leading-[26px] tracking-tight tabular-nums text-slate-950">
        {value.toLocaleString("en-US")}
      </p>
      <p className="mt-1 min-w-0 break-words text-xs font-normal leading-4 text-slate-600">{hint}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-slate-900">{value}</p>
    </div>
  );
}
