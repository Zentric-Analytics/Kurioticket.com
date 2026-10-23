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
      description="Monitor recorded completed/unavailable car-search outcomes and provider readiness without inventing provider-call health. Car checkout and reservation completion remain provider-owned."
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard label="Searches" value={operations.searches.total} hint={operations.windowHours + "-hour window"} tone="info" />
            <AdminMetricCard label="Successful" value={operations.searches.successful} hint="Recorded successful car searches" tone="good" />
            <AdminMetricCard label="Failed" value={operations.searches.failed} hint="Recorded failed car searches" tone={operations.searches.failed > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded car-search latency" />
          </div>
        ) : (
          <AdminEmptyState title="Car telemetry unavailable" message="The current environment could not return car-search telemetry. No zero values were invented." />
        )}

        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-black text-slate-950">Car provider readiness</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Secret-free configuration readiness for integrations that can serve car search. This does not claim provider uptime.
              </p>
            </div>
            <AdminStatusBadge tone="info">Current environment</AdminStatusBadge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {carIntegrations.length ? carIntegrations.map((integration) => (
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
                  <Stat label="Configured" value={integration.configured ? "Yes" : "No"} />
                  <Stat label="Search" value={integration.searchEnabled ? "Enabled" : "Not enabled"} />
                  <Stat label="Handoff" value={integration.externalHandoffEnabled ? "Enabled" : "Not enabled"} />
                  <Stat label="Booking" value={integration.bookingEnabled ? "Enabled" : "Not enabled"} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{integration.note}</p>
              </div>
            )) : (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No car-capable provider integrations are registered.</p>
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Provider-call telemetry</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Car search currently records completed/unavailable SearchHistory outcomes, but does not yet persist per-provider car-search calls in ApiProviderLog.
              </p>
            </div>
            <AdminStatusBadge tone="warn">Not recorded yet</AdminStatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Until that telemetry exists, this page will not invent provider call counts, provider failure rates, or provider latency. Pre-search rejections such as feature-disabled, invalid-request, and unsupported-coverage responses currently return before SearchHistory recording, so they are not included in these metrics. Search Detail can still show recorded car-search outcomes, but exact provider-level car diagnostics are unavailable.
          </p>
        </AdminSectionCard>

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Car Operations reports recorded search outcomes and configuration readiness only. Search success does not mean a rental was booked, and provider handoff is not a Kurioticket reservation confirmation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">Search telemetry live</AdminStatusBadge>
            <AdminStatusBadge>Provider-call telemetry pending</AdminStatusBadge>
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
