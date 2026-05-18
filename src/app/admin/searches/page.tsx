import { AdminPageShell, EmptyState } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { getPrisma } from "@/lib/prisma";

export const metadata = { title: "Admin Searches" };

export default async function AdminSearchesPage() {
  const searches = await getPrisma().searchHistory.findMany({ where: { type: "FLIGHT" }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <AdminPageShell title="Searches" description="Recent flight metasearch activity recorded by the backend.">
      {searches.length === 0 ? <EmptyState message="No searches recorded yet." /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="p-3">Route</th><th className="p-3">Origin</th><th className="p-3">Destination</th><th className="p-3">Departure</th><th className="p-3">Return</th><th className="p-3">Travelers</th><th className="p-3">Cabin</th><th className="p-3">Provider</th><th className="p-3">Results</th><th className="p-3">Latency</th><th className="p-3">Created</th></tr></thead>
            <tbody>{searches.map((search) => {
              const query = search.query as Record<string, unknown>;
              return <tr key={search.id} className="border-t border-border"><td className="p-3 font-bold text-navy">{search.origin || "—"} → {search.destination || "—"}</td><td className="p-3">{search.origin || "—"}</td><td className="p-3">{search.destination || "—"}</td><td className="p-3">{String(query.departureDate || "—")}</td><td className="p-3">{String(query.returnDate || "—")}</td><td className="p-3">{String(query.travelers || "—")}</td><td className="p-3">{String(query.cabinClass || "—")}</td><td className="p-3">Duffel foundation</td><td className="p-3">{search.resultCount}</td><td className="p-3">{search.latencyMs ? `${search.latencyMs}ms` : "—"}</td><td className="p-3">{formatDate(search.createdAt)}</td></tr>;
            })}</tbody>
          </table>
        </Card>
      )}
    </AdminPageShell>
  );
}
function formatDate(date: Date) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date); }
