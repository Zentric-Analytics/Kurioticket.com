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
      title="Search Operations"
      description="Real search logs only. If logging is unavailable, this page stays empty rather than inventing search volume."
    >
      {searches.length === 0 ? (
        <AdminEmptyState
          title="No search logs available"
          message="Search analytics will appear after search logging is enabled and real users run searches. No fake routes, destinations, providers, result counts, or statuses are displayed."
        />
      ) : (
        <AdminDataTable
          columns={["Date/time", "Product", "Query / route / destination", "Country / currency", "Result count", "Provider", "Status", "Duration"]}
          rows={searches.map((search) => {
            const query = normalizeQuery(search.query);
            return {
              id: search.id,
              cells: [
                formatDateTime(search.createdAt),
                search.type,
                query.route || `${search.origin || "—"}${search.destination ? ` → ${search.destination}` : ""}`,
                `${query.country || "—"} / ${query.currency || "—"}`,
                search.resultCount,
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
