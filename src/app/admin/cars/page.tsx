import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageShell,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { ProductSearchRecordsPanel } from "@/components/admin/ProductSearchRecordsPanel";
import { OperationsMetric, OperationsMetricStrip, OperationsProviderIssues, OperationsSection, OperationsStatus } from "@/components/admin/TravelOperationsOverviewUI";
import { getCarOperationsSnapshot } from "@/services/adminCarOperationsService";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export const metadata = { title: "Admin Car Operations" };

export default async function AdminCarsPage() {
  const [operations, integrations] = await Promise.all([
    getCarOperationsSnapshot(),
    Promise.resolve(getProviderIntegrationStatuses()),
  ]);

  const carIntegrations = integrations.filter((provider) => provider.products.includes("CARS"));

  return (
    <AdminPageShell title="Car Operations" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <header className="min-w-0 border-b border-[#D8E1EC] pb-4 pt-1">
          <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">Car Operations</h1>
        </header>
        <div className="min-w-0 space-y-0">
        {operations ? (
          <OperationsMetricStrip>
            <OperationsMetric label="Searches" value={operations.searches.total} hint={operations.windowHours + "-hour window"} tone="info" />
            <OperationsMetric label="Successful" value={operations.searches.successful} hint="Recorded successful car searches" tone="good" />
            <OperationsMetric label="Partial / failed" value={operations.searches.partial + operations.searches.failed} hint={operations.searches.partial + " partial · " + operations.searches.failed + " failed"} tone={operations.searches.partial + operations.searches.failed > 0 ? "warn" : "neutral"} />
            <OperationsMetric label="Zero results" value={operations.searches.successfulZeroResults} hint="Successful searches returning no car offers" tone={operations.searches.successfulZeroResults > 0 ? "warn" : "neutral"} />
            <OperationsMetric label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded car-search latency" />
          </OperationsMetricStrip>
        ) : (
          <AdminEmptyState title="Car telemetry unavailable" message="The current environment could not return car-search telemetry. No zero values were invented." />
        )}

        <OperationsSection className="py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#020617]">Car provider health</h2>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                Configuration readiness and car-search-only provider telemetry for integrations that can serve car search.
              </p>
            </div>
            <OperationsStatus tone="info">Current environment</OperationsStatus>
          </div>

          <div className={"mt-4 grid min-w-0 gap-x-10 gap-y-4 " + (carIntegrations.length > 1 ? "lg:grid-cols-2" : "grid-cols-1")}>
            {carIntegrations.map((integration) => {
              const health = operations?.providerHealth.find((provider) => provider.id === integration.id);
              return (
                <div key={integration.id} className="min-w-0 border-b border-[#E7ECF5] bg-white py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#020617]">{integration.provider}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">{integration.environment}</p>
                    </div>
                    <OperationsStatus tone={integration.state === "READY" ? "good" : integration.state === "ENVIRONMENT_BLOCKED" ? "warn" : "neutral"}>
                      {integration.state.replaceAll("_", " ")}
                    </OperationsStatus>
                  </div>
                  <div className="mt-4 grid min-w-0 grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
                    <Stat label="Search" value={integration.searchEnabled ? "Enabled" : "Not enabled"} />
                    <Stat label="Handoff" value={integration.externalHandoffEnabled ? "Enabled" : "Not enabled"} />
                    <Stat label="Calls (24h)" value={health ? String(health.attemptedCalls) : "—"} />
                    <Stat label="Disabled (24h)" value={health ? String(health.disabledCalls) : "—"} />
                    <Stat label="Failed (24h)" value={health ? String(health.failedCalls) : "—"} />
                    <Stat label="Avg latency" value={health?.averageLatencyMs === null || health?.averageLatencyMs === undefined ? "—" : health.averageLatencyMs + " ms"} />
                    <Stat label="Last issue" value={health?.lastIssueAt ? formatDateTime(new Date(health.lastIssueAt)) : "—"} />
                    <Stat label="Booking" value={integration.bookingEnabled ? "Enabled" : "Not enabled"} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#64748B]">{integration.note}</p>
                </div>
              );
            })}
          </div>
        </OperationsSection>

        <ProductSearchRecordsPanel product="CAR" />

        {operations ? (
          <div className="min-w-0">
            <OperationsSection className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#020617]">Locations needing attention</h2>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Pick-up/drop-off pairs with the highest number of failed, partial, or zero-result searches.</p>
                </div>
                <OperationsStatus tone={operations.locationIssues.length ? "warn" : "good"}>{operations.locationIssues.length ? "Exceptions found" : "Clear"}</OperationsStatus>
              </div>
              {operations.locationIssues.length ? (
                <div className="mt-4 divide-y divide-[#E7ECF5]">
                  {operations.locationIssues.map((location, index) => (
                    <div key={(location.origin || "unknown") + "-" + (location.destination || "unknown") + "-" + index} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3 sm:items-center">
                      <div>
                        <p className="break-words text-[13px] font-semibold text-[#020617]">{location.origin || "—"} → {location.destination || "—"}</p>
                        <p className="mt-1 text-xs font-semibold text-[#64748B]">{location.lastIssueAt ? "Last issue " + formatDateTime(new Date(location.lastIssueAt)) : "No timestamp"}</p>
                      </div>
                      <OperationsStatus tone="warn">{location.issueCount} {location.issueCount === 1 ? "exception" : "exceptions"}</OperationsStatus>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-[#64748B]">No location-level car search exceptions were recorded in this window.</p>
              )}
            </OperationsSection>

            <OperationsSection className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#020617]">Provider exceptions</h2>
                  <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Recent disabled, degraded or failed car-search provider observations. Raw provider errors are not exposed.</p>
                </div>
                <Link href="/admin/providers?product=cars" className="text-sm font-semibold text-[#004BB8] hover:text-[#003985]">Providers</Link>
              </div>
              {operations.providerIssues.length ? (
                <OperationsProviderIssues items={operations.providerIssues} formatDate={formatDateTime} />
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[12px] text-[#64748B]">No disabled, degraded or failed car-search provider observations were recorded in this window.</p>
              )}
            </OperationsSection>
          </div>
        ) : null}

        <p className="border-t border-[#D8E1EC] py-4 text-[12px] leading-5 text-[#64748B]">Only valid car searches produce recorded search and provider telemetry; invalid or feature-disabled requests are excluded. Results and handoffs do not confirm rentals.</p>

        </div>
      </div>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-b border-[#E7ECF5] py-2"><p className="text-[11px] font-medium text-[#64748B]">{label}</p><p className="mt-1 break-words text-[12px] font-semibold text-[#020617]">{value}</p></div>;
}
