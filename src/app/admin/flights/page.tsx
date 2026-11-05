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
import { getFlightOperationsSnapshot } from "@/services/adminFlightOperationsService";

export const metadata = { title: "Admin Flight Operations" };

export default async function AdminFlightsPage() {
  const operations = await getFlightOperationsSnapshot();

  return (
    <AdminPageShell
      title="Flight Operations"
      description="Monitor flight-search health, route-level exceptions and recent outcomes from recorded production-safe telemetry. Provider health is managed in Providers, while homepage fare readiness remains a separate flight workspace."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/searches/activity?product=FLIGHT" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View flight searches
          </Link>
          <Link href="/admin/providers?product=flights" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View flight providers
          </Link>
          <Link href="/admin/homepage-fares" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Homepage fare operations
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
            <AdminMetricCard label="Zero results" value={operations.searches.successfulZeroResults} hint="Successful searches returning no offers" tone={operations.searches.successfulZeroResults > 0 ? "warn" : "neutral"} />
            <AdminMetricCard label="Average latency" value={operations.searches.averageLatencyMs === null ? "—" : operations.searches.averageLatencyMs + " ms"} hint="Recorded flight-search latency" />
          </div>
        ) : (
          <AdminEmptyState title="Flight telemetry unavailable" message="The current environment could not return flight-search telemetry. No zero values were invented." />
        )}

        <AdminSectionCard className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-black text-slate-950">Related flight operations</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Provider readiness and provider-call diagnostics live in Providers. Homepage fare coverage and refresh controls live in Homepage Fare Operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-black">
              <Link href="/admin/providers?product=flights" className="text-indigo-700 hover:text-indigo-900">Open Providers</Link>
              <Link href="/admin/homepage-fares" className="text-indigo-700 hover:text-indigo-900">Open Homepage Fare Operations</Link>
            </div>
          </div>
        </AdminSectionCard>

        {operations ? (
          <AdminSectionCard className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-black text-slate-950">Search exceptions</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Recent failed, partial and zero-result flight searches that may need investigation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/searches?product=FLIGHT&status=FAILED" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Failed searches
                </Link>
                <Link href="/admin/searches?product=FLIGHT&status=PARTIAL" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Partial searches
                </Link>
              </div>
            </div>

            <div className="mt-4">
              {operations.exceptionSearches.length ? (
                <AdminDataTable
                  columns={["Observed", "Route", "Exception", "Results", "Latency", "Action"]}
                  rows={operations.exceptionSearches.map((search) => ({
                    id: search.id,
                    cells: [
                      formatDateTime(new Date(search.createdAt)),
                      <div key="route"><p className="font-semibold text-slate-950">{search.origin || "—"}{search.destination ? " → " + search.destination : ""}</p><p className="text-xs text-slate-500">{search.requestId || "No request ID"}</p></div>,
                      <AdminStatusBadge key="kind" tone={search.kind === "FAILED" ? "bad" : "warn"}>{search.kind.replaceAll("_", " ")}</AdminStatusBadge>,
                      search.resultCount,
                      search.latencyMs === null ? "—" : search.latencyMs + " ms",
                      <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                    ],
                  }))}
                />
              ) : (
                <AdminEmptyState title="No recent search exceptions" message="No failed, partial or zero-result flight searches were recorded in the current 24-hour window." />
              )}
            </div>
          </AdminSectionCard>
        ) : null}

        {operations ? (
          <AdminSectionCard className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-950">Routes needing attention</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Highest-volume routes with failed, partial or zero-result searches in this window.</p>
              </div>
              <AdminStatusBadge tone={operations.routeIssues.length ? "warn" : "good"}>{operations.routeIssues.length ? "Exceptions found" : "Clear"}</AdminStatusBadge>
            </div>
            {operations.routeIssues.length ? (
              <div className="mt-4 divide-y divide-slate-100">
                {operations.routeIssues.map((route, index) => (
                  <div key={(route.origin || "unknown") + "-" + (route.destination || "unknown") + "-" + index} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-black text-slate-950">{route.origin || "—"}{route.destination ? " → " + route.destination : ""}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{route.lastIssueAt ? "Last issue " + formatDateTime(new Date(route.lastIssueAt)) : "No timestamp"}</p>
                    </div>
                    <AdminStatusBadge tone="warn">{route.issueCount} {route.issueCount === 1 ? "exception" : "exceptions"}</AdminStatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No route-level flight search exceptions were recorded in this window.</p>
            )}
          </AdminSectionCard>
        ) : null}

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Operational boundaries</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Flight Operations reports recorded flight-search health only. Provider readiness belongs to Providers, a provider handoff is not a booking confirmation, and search data is not used to infer live flight status.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="info">Search operations live</AdminStatusBadge>
            <AdminStatusBadge>Booking provider-owned</AdminStatusBadge>
            <AdminStatusBadge>Flight status separate</AdminStatusBadge>
          </div>
        </AdminSectionCard>

        {operations ? (
          operations.recentSearches.length ? (
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">Recent flight searches</h2>
                  <p className="mt-1 text-sm text-slate-600">Latest recorded flight searches in this environment.</p>
                </div>
                <Link href="/admin/searches/activity?product=FLIGHT" className="text-sm font-black text-indigo-700 hover:text-indigo-900">View all</Link>
              </div>
              <AdminDataTable
                columns={["Created", "Route", "Results", "Latency", "Status", "Action"]}
                rows={operations.recentSearches.map((search) => ({
                  id: search.id,
                  cells: [
                    formatDateTime(new Date(search.createdAt)),
                    <div key="route"><p className="font-semibold text-slate-950">{search.origin || "—"}{search.destination ? " → " + search.destination : ""}</p><p className="text-xs text-slate-500">{search.requestId || "No request ID"}</p></div>,
                    search.resultCount,
                    search.latencyMs === null ? "—" : search.latencyMs + " ms",
                    <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>,
                    <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + operations.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
            </div>
          ) : (
            <AdminEmptyState title="No recent flight searches" message="No recorded flight searches exist in the current 24-hour window." />
          )
        ) : null}
      </div>
    </AdminPageShell>
  );
}
