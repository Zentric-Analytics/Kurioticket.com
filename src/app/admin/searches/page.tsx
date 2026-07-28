import Link from "next/link";
import type { SearchHistoryModel } from "@/generated/prisma/models/SearchHistory";

import { AdminDataErrorState, AdminDataTable, AdminEmptyState, AdminLinkButton, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";
import { SearchesFilterToolbar } from "./SearchesFilterToolbar";
import { buildSearchesHref, buildSearchesWhere, clampSearchesPage, latencyTone, parseSearchesSearchParams, SEARCH_PAGE_SIZE, searchesTableColumns, type SearchesSearchParams } from "./page-data";

export const metadata = { title: "Admin Searches" };
type PageProps = { searchParams?: Promise<SearchesSearchParams> };

export default async function AdminSearchesPage({ searchParams }: PageProps) {
  const filters = parseSearchesSearchParams(await searchParams);
  const where = buildSearchesWhere(filters);
  let data: SearchesData | null = null;
  try {
    const db = getPrisma();
    const [total, all] = await Promise.all([db.searchHistory.count({ where }), db.searchHistory.count()]);
    const { currentPage, totalPages } = clampSearchesPage(filters.page, total);
    const searches = total ? await db.searchHistory.findMany({ where, orderBy: { createdAt: "desc" }, skip: (currentPage - 1) * SEARCH_PAGE_SIZE, take: SEARCH_PAGE_SIZE }) : [];
    data = { searches, total, all, currentPage, totalPages };
  } catch (error) {
    console.error("[admin-searches:data]", error);
  }

  return (
    <AdminPageShell eyebrow="" title="Searches" description="Review user search attempts, outcomes, providers, and latency.">
      <SearchesFilterToolbar filters={filters} />
      {!data ? <AdminDataErrorState title="Searches could not be loaded." message="Refresh the page or check the database connection." /> : data.searches.length === 0 ? (
        <AdminEmptyState title="No search activity found." message={data.all === 0 ? "Search activity will appear here after users run searches." : "Try another filter or clear the current filters."} action={data.all === 0 ? undefined : <AdminLinkButton href="/admin/searches">Clear filters</AdminLinkButton>} />
      ) : <SearchesTable data={data} filters={filters} />}
    </AdminPageShell>
  );
}

type SearchesData = { searches: SearchHistoryModel[]; total: number; all: number; currentPage: number; totalPages: number };

function SearchesTable({ data, filters }: { data: SearchesData; filters: ReturnType<typeof parseSearchesSearchParams> }) {
  const first = (data.currentPage - 1) * SEARCH_PAGE_SIZE + 1;
  const last = Math.min(data.currentPage * SEARCH_PAGE_SIZE, data.total);
  return <div className="mt-3"><AdminDataTable caption="Search operations" density="compact" minWidth="1040px" columns={searchesTableColumns} summary={<span className="text-xs text-slate-500">Showing {first}–{last} of {data.total} searches</span>} footer={<Pagination {...data} filters={filters} first={first} last={last} />} rows={data.searches.map((search) => {
    const query = normalizeQuery(search.query);
    const provider = query.provider || providerForProduct(search.type);
    return { id: search.id, cells: [formatDateTime(search.createdAt), <AdminStatusBadge key="type" tone="info">{search.type}</AdminStatusBadge>, <p key="route" className="truncate font-semibold text-slate-950">{query.route || `${search.origin || "—"}${search.destination ? ` → ${search.destination}` : ""}`}</p>, `${query.country || "—"} / ${query.currency || "—"}`, <span key="results" className="font-semibold text-slate-950">{search.resultCount}</span>, <span key="provider" className={query.provider ? "font-medium text-slate-700" : "text-slate-500"}>{provider}</span>, <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>, <span key="latency" className={`font-semibold tabular-nums ${latencyTone(search.latencyMs)}`}>{search.latencyMs === null ? "—" : `${search.latencyMs}ms`}</span>] };
  })} /></div>;
}

function Pagination({ currentPage, totalPages, total, first, last, filters }: { currentPage: number; totalPages: number; total: number; first: number; last: number; filters: ReturnType<typeof parseSearchesSearchParams> }) {
  const pages = getVisiblePages(currentPage, totalPages);
  return <nav aria-label="Searches pagination" className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>Showing {first}–{last} of {total} searches</span><div className="flex flex-wrap gap-2"><PageLink href={currentPage > 1 ? buildSearchesHref(currentPage - 1, filters) : null}>Previous</PageLink>{pages.map((page) => <Link key={page} href={buildSearchesHref(page, filters)} aria-current={page === currentPage ? "page" : undefined} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{page}</Link>)}<PageLink href={currentPage < totalPages ? buildSearchesHref(currentPage + 1, filters) : null}>Next</PageLink></div></nav>;
}
function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) { return href ? <Link href={href} className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{children}</Link> : <span aria-disabled="true" className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400">{children}</span>; }
function getVisiblePages(current: number, total: number) { const start = Math.max(1, Math.min(current - 1, total - 2)); return Array.from({ length: Math.min(3, total) }, (_, index) => start + index); }
function normalizeQuery(query: unknown) { const data = query && typeof query === "object" ? query as Record<string, unknown> : {}; const origin = stringValue(data.origin) || stringValue(data.originAirport); const destination = stringValue(data.destination) || stringValue(data.destinationAirport) || stringValue(data.destinationName); return { route: origin || destination ? `${origin || "—"} → ${destination || "—"}` : stringValue(data.label), country: stringValue(data.country) || stringValue(data.market) || stringValue(data.region), currency: stringValue(data.currency), provider: stringValue(data.provider) }; }
function stringValue(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function providerForProduct(type: string) { if (type === "FLIGHT") return "Configured flight provider"; if (type === "HOTEL") return "Configured hotel provider"; return "Unavailable"; }
