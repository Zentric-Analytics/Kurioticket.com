import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageShell,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { OperationsDataTable, OperationsMetric, OperationsProviderIssues, OperationsSection, OperationsStatus } from "@/components/admin/TravelOperationsOverviewUI";
import { getHotelOperationsSnapshot } from "@/services/adminHotelOperationsService";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export const metadata = { title: "Admin Hotel Operations" };

export default async function AdminHotelsPage() {
  const [operations, integrations] = await Promise.all([
    getHotelOperationsSnapshot(),
    Promise.resolve(getProviderIntegrationStatuses()),
  ]);

  const hotelIntegrations = integrations.filter((provider) => provider.products.includes("HOTELS"));

  return (
    <AdminPageShell title="Hotel Operations" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E1EC] pb-4 pt-1">
          <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">Hotel Operations</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href="/admin/searches/activity?product=HOTEL" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">View hotel searches</Link>
            <Link href="/admin/journeys?product=HOTEL" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">View hotel journeys</Link>
          </div>
        </header>
        <div className="space-y-1">
        {operations ? (
          <dl className="grid min-w-0 grid-cols-2 border-b border-[#D8E1EC] py-1 sm:grid-cols-3 xl:grid-cols-5">
            <OperationsMetric label="Searches" value={operations.searches.total} hint={operations.windowHours + "-hour window"} tone="info" />
            <OperationsMetric label="Successful" value={operations.searches.successful} hint="Recorded successful searches" tone="good" />
            <OperationsMetric label="Partial / failed" value={operations.searches.partial + operations.searches.failed} hint={operations.searches.partial + " partial · " + operations.searches.failed + " failed"} tone={operations.searches.partial + operations.searches.failed > 0 ? "warn" : "neutral"} />
            <OperationsMetric label="Zero results" value={operations.searches.successfulZeroResults} hint="Successful searches returning no hotel offers" tone={operations.searches.successfulZeroResults > 0 ? "warn" : "neutral"} />
            <OperationsMetric label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded hotel-search latency" />
          </dl>
        ) : (
          <AdminEmptyState title="Hotel telemetry unavailable" message="The current environment could not return hotel-search telemetry. No zero values were invented." />
        )}

        <OperationsSection className="py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-[#020617]">Hotel provider health</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                  Configuration readiness and hotel-search-only provider-call health for integrations that can serve hotel search.
                </p>
              </div>
              <OperationsStatus tone="info">Current environment</OperationsStatus>
            </div>

            <div className="mt-3 grid gap-x-8 gap-y-3 lg:grid-cols-2">
              {hotelIntegrations.map((integration) => {
                const health = operations?.providerHealth.find((provider) => provider.id === integration.id);
                return (
                  <div key={integration.id} className="border-b border-[#E7ECF5] bg-white py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#020617]">{integration.provider}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{integration.environment}</p>
                      </div>
                      <OperationsStatus tone={integration.state === "READY" ? "good" : integration.state === "ENVIRONMENT_BLOCKED" ? "warn" : "neutral"}>
                        {integration.state.replaceAll("_", " ")}
                      </OperationsStatus>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <Stat label="Search" value={integration.searchEnabled ? "Enabled" : "Not enabled"} />
                      <Stat label="Handoff" value={integration.externalHandoffEnabled ? "Enabled" : "Not enabled"} />
                      <Stat label="Calls (24h)" value={health ? String(health.attemptedCalls) : "—"} />
                      <Stat label="Disabled (24h)" value={health ? String(health.disabledCalls) : "—"} />
                      <Stat label="Degraded (24h)" value={health ? String(health.degradedCalls) : "—"} />
                      <Stat label="Failed (24h)" value={health ? String(health.failedCalls) : "—"} />
                      <Stat label="Avg latency" value={health?.averageLatencyMs === null || health?.averageLatencyMs === undefined ? "—" : health.averageLatencyMs + " ms"} />
                      <Stat label="Last issue" value={health?.lastIssueAt ? formatDateTime(new Date(health.lastIssueAt)) : "—"} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[#64748B]">{integration.note}</p>
                  </div>
                );
              })}
            </div>
          </OperationsSection>

        {operations ? (
          <OperationsSection className="py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-semibold text-[#020617]">Search exceptions</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                  Recent failed, partial and valid zero-result hotel searches that may need investigation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/searches/activity?product=HOTEL&status=FAILED" className="rounded-lg border border-[#D8E1EC] bg-white px-3 py-2 text-[12px] font-medium text-[#334155] hover:bg-[#F8FAFC]">
                  Failed searches
                </Link>
                <Link href="/admin/searches/activity?product=HOTEL&status=PARTIAL" className="rounded-lg border border-[#D8E1EC] bg-white px-3 py-2 text-[12px] font-medium text-[#334155] hover:bg-[#F8FAFC]">
                  Partial searches
                </Link>
              </div>
            </div>

            <div className="mt-4">
              {operations.exceptionSearches.length ? (
                <OperationsDataTable
                  columns={["Observed", "Destination", "Stay", "Exception", "Results", "Latency", "Action"]}
                  rows={operations.exceptionSearches.map((search) => ({
                    id: search.id,
                    cells: [
                      formatDateTime(new Date(search.createdAt)),
                      <div key="destination"><p className="font-semibold text-[#020617]">{search.destination || "—"}</p><p className="text-xs text-[#64748B]">{search.requestId || "No request ID"}</p></div>,
                      search.checkIn ? (search.checkIn.slice(0, 10) + (search.checkOut ? " → " + search.checkOut.slice(0, 10) : "")) : "—",
                      <OperationsStatus key="kind" tone={search.kind === "FAILED" ? "bad" : "warn"}>{search.kind.replaceAll("_", " ")}</OperationsStatus>,
                      search.resultCount,
                      search.latencyMs === null ? "—" : search.latencyMs + " ms",
                      <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-semibold text-[#004BB8] hover:text-[#003985]">Open</Link>,
                    ],
                  }))}
                />
              ) : (
                <AdminEmptyState title="No recent search exceptions" message="No failed, partial or zero-result hotel searches were recorded in the current 24-hour window." />
              )}
            </div>
          </OperationsSection>
        ) : null}

        {operations ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <OperationsSection className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#020617]">Destinations needing attention</h2>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Highest-volume destinations with failed, partial or zero-result searches in this window.</p>
                </div>
                <OperationsStatus tone={operations.destinationIssues.length ? "warn" : "good"}>{operations.destinationIssues.length ? "Exceptions found" : "Clear"}</OperationsStatus>
              </div>
              {operations.destinationIssues.length ? (
                <div className="mt-4 divide-y divide-[#E7ECF5]">
                  {operations.destinationIssues.map((destination, index) => (
                    <div key={(destination.destination || "unknown") + "-" + index} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-semibold text-[#020617]">{destination.destination || "—"}</p>
                        <p className="mt-1 text-xs font-semibold text-[#64748B]">{destination.lastIssueAt ? "Last issue " + formatDateTime(new Date(destination.lastIssueAt)) : "No timestamp"}</p>
                      </div>
                      <OperationsStatus tone="warn">{destination.issueCount} {destination.issueCount === 1 ? "exception" : "exceptions"}</OperationsStatus>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-[#64748B]">No destination-level hotel search exceptions were recorded in this window.</p>
              )}
            </OperationsSection>

            <OperationsSection className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#020617]">Provider exceptions</h2>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Recent disabled, degraded or failed hotel-search provider observations. Raw provider error payloads are not exposed.</p>
                </div>
                <Link href="/admin/providers?product=hotels" className="text-sm font-semibold text-[#004BB8] hover:text-[#003985]">Providers</Link>
              </div>
              {operations.providerIssues.length ? (
                <OperationsProviderIssues items={operations.providerIssues} formatDate={formatDateTime} />
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-[#64748B]">No disabled, degraded or failed hotel-search provider observations were recorded in this window.</p>
              )}
            </OperationsSection>
          </div>
        ) : null}

        <p className="border-t border-[#D8E1EC] py-4 text-[12px] leading-5 text-[#64748B]">Hotel results and provider handoffs do not confirm reservations; booking completion remains provider-owned.</p>

        </div>
      </div>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-b border-[#E7ECF5] py-2"><p className="text-[11px] font-medium text-[#64748B]">{label}</p><p className="mt-1 break-words text-[12px] font-semibold text-[#020617]">{value}</p></div>;
}
