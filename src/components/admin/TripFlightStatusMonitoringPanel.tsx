import {
  AdminDataTable,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import {
  getFlightStatusIntegrationReadiness,
  getFlightStatusOperationsSnapshot,
} from "@/services/adminFlightStatusOperationsService";

/** Authenticated by the canonical Trip monitoring page before rendering. */
export async function TripFlightStatusMonitoringPanel() {
  const readiness = getFlightStatusIntegrationReadiness();
  const operations = await getFlightStatusOperationsSnapshot(undefined, readiness);

  return (
    <div className="min-w-0 space-y-4">
        <section aria-labelledby="flight-status-overview-title" className="min-w-0">
          <h2 id="flight-status-overview-title" className="mb-2.5 text-base font-semibold leading-6 tracking-tight text-slate-950">Flight status overview</h2>
          {operations ? (
            <div role="region" aria-label="Flight status metrics" tabIndex={0} className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
              <div className="grid w-full min-w-[960px] grid-cols-6 gap-2">
              <FlightStatusMetric label="Confirmed flights" value={operations.metrics.confirmedFlights} hint="Provider-confirmed trips" tone="info" />
              <FlightStatusMetric label="Provider matched" value={operations.metrics.feedEligibleFlights} hint="Matches status provider" />
              <FlightStatusMetric label="Tracked" value={operations.metrics.trackedFlights} hint="With a stored status" tone={operations.metrics.trackedFlights > 0 ? "good" : "neutral"} />
              <FlightStatusMetric label="Missing status" value={operations.metrics.missingSnapshots} hint="Awaiting first status" tone={operations.metrics.missingSnapshots > 0 ? "warn" : "neutral"} />
              <FlightStatusMetric label="Current" value={operations.metrics.currentSnapshots} hint="Within 15-min window" tone={operations.metrics.currentSnapshots > 0 ? "good" : "neutral"} />
              <FlightStatusMetric label="Stale" value={operations.metrics.staleSnapshots} hint="Outside 15-min window" tone={operations.metrics.staleSnapshots > 0 ? "warn" : "neutral"} />
              </div>
            </div>
          ) : (
            <div role="status" className="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              <p className="font-semibold text-slate-900">Flight-status telemetry unavailable</p>
              <p className="mt-1">The connected database could not return flight-status operations. No zero values were invented.</p>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Status-feed readiness</h2>
              <p className="mt-0.5 text-[13px] leading-5 text-slate-600">
                Only the configured provider can send signed updates. Duffel search and KAYAK sandbox do not supply this feed.
              </p>
            </div>
            <div className="shrink-0 whitespace-nowrap">
              <AdminStatusBadge tone={readiness.feedReady ? "good" : "warn"}>
                {readiness.feedReady ? "Status feed configured" : "Status feed not configured"}
              </AdminStatusBadge>
            </div>
          </div>
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Configured provider" value={readiness.providerName || "None"} />
            <Fact label="Webhook credential" value={readiness.webhookCredentialConfigured ? "Configured" : "Not configured"} />
            <Fact label="Current search-provider status feed" value={readiness.currentSearchProviderStatusFeed === "none" ? "None" : "Configured"} />
          </div>
          <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
            <Fact label="Endpoint" value="POST /api/internal/flight-status/updates" />
            <Fact label="Provider binding" value={readiness.credentialModel === "single_provider_bound_secret" ? "Single provider + dedicated secret" : "Unknown"} />
          </div>
          <p className="mt-3 text-[13px] leading-5 text-slate-600">
            A configured feed does not mean updates are arriving. Live status requires signed provider updates for confirmed flights—not searches, handoffs or trip confirmations.
          </p>
        </section>

        {/* Keep monitoring cards visible when data is unavailable. */}
        <div className="grid min-w-0 items-stretch gap-3 lg:grid-cols-2">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
            <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Latest status distribution</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-600">Latest stored statuses from the configured provider.</p>
            {!operations ? (
              <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
                Flight-status distribution is unavailable. No counts are assumed.
              </p>
            ) : operations.statusDistribution.length ? (
              <div className="mt-2 divide-y divide-slate-100">
                {operations.statusDistribution.map((item) => (
                  <div key={item.status} className="flex min-w-0 items-center justify-between gap-3 py-2">
                    <span className="min-w-0 break-words text-[13px] font-medium leading-5 text-slate-800">{item.status}</span>
                    <AdminStatusBadge tone={item.status === "DELAYED" || item.status === "CANCELLED" ? "warn" : item.status === "UNKNOWN" ? "neutral" : "info"}>{item.count}</AdminStatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
                {readiness.feedReady
                  ? "No verified flight-status snapshots recorded yet."
                  : "No status feed is configured; no snapshots to show."}
              </p>
            )}
          </section>

          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
            <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Snapshot scope</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">
              We save only the latest status of the main flight in each confirmed trip. Return and connecting flights aren't tracked separately.
            </p>
            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
              <AdminStatusBadge tone="good">Provider supplied only</AdminStatusBadge>
              <AdminStatusBadge>Latest snapshot only</AdminStatusBadge>
              <AdminStatusBadge>No segment history yet</AdminStatusBadge>
            </div>
          </section>
        </div>

        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
          <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Awaiting first status snapshot</h2>
          <p className="mt-0.5 text-[13px] leading-5 text-slate-600">Provider-matched flights awaiting their first status.</p>
          {!operations ? (
            <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              Flight-status data unavailable. Count awaiting first status is unknown.
            </p>
          ) : operations.awaitingFirstSnapshot.length ? (
            <div className="mt-3 min-w-0">
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
            <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              <span className="font-medium text-slate-800">No flights awaiting a first snapshot.</span>{" "}
              {readiness.feedReady
                ? "No provider-matched flights are awaiting a first status."
                : "No matching flights are waiting; the status feed is not ready."}
            </p>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 sm:p-4">
          <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Latest trusted flight-status snapshots</h2>
          <p className="mt-0.5 text-[13px] leading-5 text-slate-600">Latest verified statuses. This is not an event history.</p>
          {!operations ? (
            <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              Recent flight-status data unavailable. No records are assumed.
            </p>
          ) : operations.recentSnapshots.length ? (
            <div className="mt-3 min-w-0">
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
            <p role="status" className="mt-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-600">
              {readiness.feedReady
                ? "No verified flight-status snapshots recorded yet."
                : "No status feed is configured; no snapshots to show."}
            </p>
          )}
        </section>
    </div>
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
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium leading-4 text-slate-600">{label}</p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-slate-900">{value}</p>
    </div>
  );
}

