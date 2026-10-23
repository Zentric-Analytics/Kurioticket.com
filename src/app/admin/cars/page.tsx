import Link from "next/link";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
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
    <AdminPageShell
      title="Car Operations"
      description="Monitor car-search outcomes, provider readiness, exact provider telemetry, and operational exceptions. Car checkout and reservation completion remain provider-owned."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/searches?product=CAR" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View car searches
          </Link>
          <Link href="/admin/journeys?product=CAR" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View car journeys
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {operations ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="Searches" value={operations.searches.total} hint={operations.windowHours + "-hour window"} tone="info" />
            <AdminMetricCard label="Successful" value={operations.searches.successful} hint="Recorded successful car searches" tone="good" />
            <AdminMetricCard label="Partial / failed" value={operations.searches.partial + operations.searches.failed} hint={operations.searches.partial + " partial · " + operations.searches.failed + " failed"} tone={operations.searches.partial + operations.searches.failed > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Zero results" value={operations.searches.successfulZeroResults} hint="Successful searches returning no car offers" tone={operations.searches.successfulZeroResults > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded car-search latency" />
          </div>
        ) : (
          <AdminEmptyState title="Car telemetry unavailable" message="The current environment could not return car-search telemetry. No zero values were invented." />
        )}

        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-black text-slate-950">Car provider health</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Configuration readiness and car-search-only provider telemetry for integrations that can serve car search.
              </p>
            </div>
            <AdminStatusBadge tone="info">Current environment</AdminStatusBadge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {carIntegrations.map((integration) => {
              const health = operations?.providerHealth.find((provider) => provider.id === integration.id);
              return (
                <div key={integration.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{integration.provider}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{integration.environment}</p>
                    </div>
                    <AdminStatusBadge tone={integration.state === "READY" ? "good" : integration.state === "ENVIRONMENT_BLOCKED" ? "warn" : "neutral"}>
                      {integration.state.replaceAll("_", " ")}
                    </AdminStatusBadge>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <Stat label="Search" value={integration.searchEnabled ? "Enabled" : "Not enabled"} />
                    <Stat label="Handoff" value={integration.externalHandoffEnabled ? "Enabled" : "Not enabled"} />
                    <Stat label="Calls (24h)" value={health ? String(health.attemptedCalls) : "—"} />
                    <Stat label="Disabled (24h)" value={health ? String(health.disabledCalls) : "—"} />
                    <Stat label="Failed (24h)" value={health ? String(health.failedCalls) : "—"} />
                    <Stat label="Avg latency" value={health?.averageLatencyMs === null || health?.averageLatencyMs === undefined ? "—" : health.averageLatencyMs + " ms"} />
                    <Stat label="Last issue" value={health?.lastIssueAt ? formatDateTime(new Date(health.lastIssueAt)) : "—"} />
                    <Stat label="Booking" value={integration.bookingEnabled ? "Enabled" : "Not enabled"} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{integration.note}</p>
                </div>
              );
            })}
          </div>
        </AdminSectionCard>

        {operations ? (
          <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-black text-slate-950">Search exceptions</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Recent failed, partial, and valid zero-result car searches, including unsupported provider coverage now recorded with exact provider correlation.
                </p>
              </div>
              <Link href="/admin/searches?product=CAR&status=FAILED" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                Failed searches
              </Link>
            </div>
            <div className="mt-4">
              {operations.exceptionSearches.length ? (
                <AdminDataTable
                  columns={["Observed", "Pick-up", "Drop-off", "Exception", "Results", "Latency", "Action"]}
                  rows={operations.exceptionSearches.map((search) => ({
                    id: search.id,
                    cells: [
                      formatDateTime(new Date(search.createdAt)),
                      <div key="origin"><p className="font-semibold text-slate-950">{search.origin || "—"}</p><p className="text-xs text-slate-500">{search.requestId || "No request ID"}</p></div>,
                      search.destination || "—",
                      <AdminStatusBadge key="kind" tone={search.kind === "FAILED" ? "bad" : "warn"}>{search.kind.replaceAll("_", " ")}</AdminStatusBadge>,
                      search.resultCount,
                      search.latencyMs === null ? "—" : search.latencyMs + " ms",
                      <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                    ],
                  }))}
                />
              ) : (
                <AdminEmptyState title="No recent car search exceptions" message="No failed, partial, or zero-result car searches were recorded in the current 24-hour window." />
              )}
            </div>
          </AdminSectionCard>
        ) : null}

        {operations ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSectionCard className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">Locations needing attention</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Pick-up/drop-off pairs with the highest number of failed, partial, or zero-result searches.</p>
                </div>
                <AdminStatusBadge tone={operations.locationIssues.length ? "warn" : "good"}>{operations.locationIssues.length ? "Exceptions found" : "Clear"}</AdminStatusBadge>
              </div>
              {operations.locationIssues.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {operations.locationIssues.map((location, index) => (
                    <div key={(location.origin || "unknown") + "-" + (location.destination || "unknown") + "-" + index} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="font-black text-slate-950">{location.origin || "—"} → {location.destination || "—"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{location.lastIssueAt ? "Last issue " + formatDateTime(new Date(location.lastIssueAt)) : "No timestamp"}</p>
                      </div>
                      <AdminStatusBadge tone="warn">{location.issueCount} {location.issueCount === 1 ? "exception" : "exceptions"}</AdminStatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No location-level car search exceptions were recorded in this window.</p>
              )}
            </AdminSectionCard>

            <AdminSectionCard className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">Provider exceptions</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Recent disabled, degraded or failed car-search provider observations. Raw provider errors are not exposed.</p>
                </div>
                <Link href="/admin/providers?product=cars" className="text-sm font-black text-indigo-700 hover:text-indigo-900">Providers</Link>
              </div>
              {operations.providerIssues.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {operations.providerIssues.map((issue) => (
                    <div key={issue.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">{issue.provider}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(new Date(issue.createdAt))}</p>
                        </div>
                        <AdminStatusBadge tone={issue.status === "FAILED" ? "bad" : "warn"}>{issue.status}</AdminStatusBadge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">{issue.category}</span>
                        <span className="rounded-lg bg-slate-50 px-2.5 py-1.5">{issue.latencyMs === null ? "Latency unavailable" : issue.latencyMs + " ms"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No disabled, degraded or failed car-search provider observations were recorded in this window.</p>
              )}
            </AdminSectionCard>
          </div>
        ) : null}

        <AdminSectionCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Telemetry boundaries</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Valid car searches now record exact provider telemetry. Feature-disabled and invalid-request responses still return before a valid SearchHistory record exists, so they are not included in these operational metrics.
              </p>
            </div>
            <AdminStatusBadge tone="good">Provider telemetry live</AdminStatusBadge>
          </div>
        </AdminSectionCard>

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Car Operations reports recorded search outcomes, provider telemetry, and configuration readiness. Search success does not mean a rental was booked, and provider handoff is not a Kurioticket reservation confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">Search telemetry live</AdminStatusBadge>
            <AdminStatusBadge tone="good">Provider telemetry live</AdminStatusBadge>
            <AdminStatusBadge>Provider-owned reservation</AdminStatusBadge>
          </div>
        </AdminSectionCard>

        {operations ? (
          operations.recentSearches.length ? (
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">Recent car searches</h2>
                  <p className="mt-1 text-sm text-slate-600">Latest recorded car searches in this environment.</p>
                </div>
                <Link href="/admin/searches?product=CAR" className="text-sm font-black text-indigo-700 hover:text-indigo-900">View all</Link>
              </div>
              <AdminDataTable
                columns={["Created", "Pick-up", "Drop-off", "Results", "Latency", "Status", "Action"]}
                rows={operations.recentSearches.map((search) => ({
                  id: search.id,
                  cells: [
                    formatDateTime(new Date(search.createdAt)),
                    <div key="origin"><p className="font-semibold text-slate-950">{search.origin || "—"}</p><p className="text-xs text-slate-500">{search.requestId || "No request ID"}</p></div>,
                    search.destination || "—",
                    search.resultCount,
                    search.latencyMs === null ? "—" : search.latencyMs + " ms",
                    <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>,
                    <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState title="No recent car searches" message="No recorded car searches exist in the current 24-hour window." />
          )
        ) : null}
      </div>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white px-3 py-2"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}
