import { getAdminNavForRole } from "@/lib/adminNavigation";
import { getProviderStatuses, formatDateTime } from "@/lib/admin-data";
import { withOptionalDb } from "@/lib/prisma";
import { adminSearchHistoryWhere, matchesAdminProvider } from "@/lib/adminSearch";

export type AdminSearchResult = { id: string; title: string; detail: string; href: string; status: string };
export type AdminSearchResults = { pages?: AdminSearchResult[]; users: AdminSearchResult[]; searches: AdminSearchResult[]; providers: AdminSearchResult[]; databaseUnavailable: boolean };

export async function getAdminSearchResults(q: string): Promise<AdminSearchResults> {
  if (!q) return { pages: [], users: [], searches: [], providers: [], databaseUnavailable: false };
  const [records, providers] = await Promise.all([
    withOptionalDb(async (db) => {
      const [users, searches] = await Promise.all([
        db.user.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }, select: { id: true, name: true, email: true, status: true }, take: 20, orderBy: { createdAt: "desc" } }),
        db.searchHistory.findMany({ where: adminSearchHistoryWhere(q), select: { id: true, type: true, origin: true, destination: true, status: true, createdAt: true }, take: 20, orderBy: { createdAt: "desc" } }),
      ]);
      return { users, searches };
    }, null), getProviderStatuses(),
  ]);
  return {
    pages: getAdminNavForRole("ADMIN").filter(item => (item.label+" "+item.description).toLowerCase().includes(q.toLowerCase())).map(item => ({id:item.href,title:item.label,detail:item.description,href:item.href,status:"Workspace"})),
    databaseUnavailable: records === null,
    users: records?.users.map((user) => ({ id: user.id, title: user.name || user.email || "Unnamed user", detail: user.email || "No email", status: user.status, href: `/admin/users?q=${encodeURIComponent(user.email || user.name || q)}` })) || [],
    searches: records?.searches.map((search) => ({ id: search.id, title: `${search.type}: ${search.origin || "—"} → ${search.destination || "—"}`, detail: formatDateTime(search.createdAt), status: search.status, href: `/admin/searches/${encodeURIComponent(search.id)}` })) || [],
    providers: providers.filter((provider) => matchesAdminProvider(provider, q)).map((provider) => ({ id: provider.product, title: `${provider.product} · ${provider.providerName}`, detail: provider.environment, status: provider.searchEnabled ? "Search ready" : "Not enabled", href: `/admin/providers?product=${encodeURIComponent(provider.product)}` })),
  };
}
