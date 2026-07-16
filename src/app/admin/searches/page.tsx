import { AdminDataTable, AdminEmptyState, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";

export const metadata = { title: "Admin Searches" };

export default async function AdminSearchesPage() {
  const searches = await withOptionalDb(
    (db) => db.searchHistory.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    [],
  );

  return (
    <AdminPageShell
      title="Searches"
      description="Review user search attempts, outcomes, providers, and latency."
    >
      {searches.length === 0 ? (
        <AdminEmptyState
          title="No search logs available"
          message="Search analytics will appear after search logging is enabled and real users run searches. No fake routes, destinations, providers, result counts, or statuses are displayed."
        />
      ) : (
        <AdminDataTable
          caption="Search operations"
          density="compact"
          minWidth="1040px"
          columns={["Created", "Type", "Route / stay", "Market", "Results", "Provider", "Status", "Latency"]}
          rows={searches.map((search) => {
            const query = normalizeQuery(search.query);
            return {
              id: search.id,
              cells: [
                formatDateTime(search.createdAt),
                <AdminStatusBadge key="type" tone="info">{search.type}</AdminStatusBadge>,
                <div key="query" className="min-w-0 space-y-1"><p className="truncate font-semibold text-slate-950">{query.route || `${search.origin || "—"}${search.destination ? ` → ${search.destination}` : ""}`}</p><p className="truncate text-xs text-slate-500">Raw query summarized for operations</p></div>,
                `${query.country || "—"} / ${query.currency || "—"}`,
                <span key="results" className="font-semibold text-slate-950">{search.resultCount}</span>,
                query.provider || providerForProduct(search.type),
                <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>,
                search.latencyMs ? `${search.latencyMs}ms` : "—",
              ],
            };
          })}
        />
      )}
    </AdminPageShell>
  );
}

function normalizeQuery(query: unknown) {
  const data = query && typeof query === "object" ? (query as Record<string, unknown>) : {};
  const origin = stringValue(data.origin) || stringValue(data.originAirport);
  const destination = stringValue(data.destination) || stringValue(data.destinationAirport) || stringValue(data.destinationName);
  return {
    route: origin || destination ? `${origin || "—"} → ${destination || "—"}` : stringValue(data.label),
    country: stringValue(data.country) || stringValue(data.market) || stringValue(data.region),
    currency: stringValue(data.currency),
    provider: stringValue(data.provider),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function providerForProduct(type: string) {
  if (type === "FLIGHT") return "Configured flight provider";
  if (type === "HOTEL") return "Configured hotel provider";
  return "Unavailable";
}
