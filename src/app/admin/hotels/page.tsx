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
    <AdminPageShell
      title="Hotel Operations"
      description="Monitor hotel-search health, provider readiness and recent hotel-search outcomes from recorded production-safe telemetry. Inventory and reservations remain provider-backed and provider-owned."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/searches?product=HOTEL" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View hotel searches
          </Link>
          <Link href="/admin/journeys?product=HOTEL" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View hotel journeys
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {operations ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="Searches" value={operations.searches.total} hint={operations.windowHours + "-hour window"} tone="info" />
            <AdminMetricCard label="Successful" value={operations.searches.successful} hint="Recorded successful searches" tone="good" />
            <AdminMetricCard label="Partial / failed" value={operations.searches.partial + operations.searches.failed} hint={operations.searches.partial + " partial · " + operations.searches.failed + " failed"} tone={operations.searches.partial + operations.searches.failed > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Zero results" value={operations.searches.successfulZeroResults} hint="Successful searches returning no hotel offers" tone={operations.searches.successfulZeroResults > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded hotel-search latency" />
          </div>
        ) : (
          <AdminEmptyState title="Hotel telemetry unavailable" message="The current environment could not return hotel-search telemetry. No zero values were invented." />
        )}

        <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-black text-slate-950">Hotel provider health</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Configuration readiness and hotel-search-only provider-call health for integrations that can serve hotel search.
                </p>
              </div>
              <AdminStatusBadge tone="info">Current environment</AdminStatusBadge>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {hotelIntegrations.map((integration) => {
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
                      <Stat label="Degraded (24h)" value={health ? String(health.degradedCalls) : "—"} />
                      <Stat label="Failed (24h)" value={health ? String(health.failedCalls) : "—"} />
                      <Stat label="Avg latency" value={health?.averageLatencyMs === null || health?.averageLatencyMs === undefined ? "—" : health.averageLatencyMs + " ms"} />
                      <Stat label="Last issue" value={health?.lastIssueAt ? formatDateTime(new Date(health.lastIssueAt)) : "—"} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{integration.note}</p>
                  </div>
                );
              })}
            </div>
          </AdminSectionCard>

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Hotel Operations reports recorded search and provider health only. Search results are provider-backed availability, and a provider handoff is not a Kurioticket reservation confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">Search operations live</AdminStatusBadge>
            <AdminStatusBadge>Provider data only</AdminStatusBadge>
            <AdminStatusBadge>Provider-owned reservation</AdminStatusBadge>
          </div>
        </AdminSectionCard>

        {operations ? (
          operations.recentSearches.length ? (
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">Recent hotel searches</h2>
                  <p className="mt-1 text-sm text-slate-600">Latest recorded hotel searches in this environment.</p>
                </div>
                <Link href="/admin/searches?product=HOTEL" className="text-sm font-black text-indigo-700 hover:text-indigo-900">View all</Link>
              </div>
              <AdminDataTable
                columns={["Created", "Destination", "Stay", "Results", "Latency", "Status", "Action"]}
                rows={operations.recentSearches.map((search) => ({
                  id: search.id,
                  cells: [
                    formatDateTime(new Date(search.createdAt)),
                    <div key="destination"><p className="font-semibold text-slate-950">{search.destination || "—"}</p><p className="text-xs text-slate-500">{search.requestId || "No request ID"}</p></div>,
                    search.checkIn ? (search.checkIn.slice(0, 10) + (search.checkOut ? " → " + search.checkOut.slice(0, 10) : "")) : "—",
                    search.resultCount,
                    search.latencyMs === null ? "—" : search.latencyMs + " ms",
                    <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>,
                    <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState title="No recent hotel searches" message="No recorded hotel searches exist in the current 24-hour window." />
          )
        ) : null}
      </div>
    </AdminPageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white px-3 py-2"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>;
}
