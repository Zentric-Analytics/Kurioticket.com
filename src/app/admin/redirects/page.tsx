import Link from "next/link";
import type { RedirectLogModel } from "@/generated/prisma/models/RedirectLog";

import { AdminDataErrorState, AdminDataTable, AdminEmptyState, AdminLinkButton, AdminPageShell, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { getPrisma } from "@/lib/prisma";
import { RedirectsFilterToolbar } from "./RedirectsFilterToolbar";
import { buildRedirectsHref, buildRedirectsWhere, clampRedirectsPage, formatDestinationDomain, formatSourcePage, parseRedirectsSearchParams, REDIRECT_PAGE_SIZE, redirectsTableColumns, type RedirectsSearchParams } from "./page-data";

export const metadata = { title: "Admin Provider Handoffs" };
type PageProps = { searchParams?: Promise<RedirectsSearchParams> };

export default async function AdminRedirectsPage({ searchParams }: PageProps) {
  const filters = parseRedirectsSearchParams(await searchParams);
  const where = buildRedirectsWhere(filters);
  let data: RedirectsData | null = null;

  try {
    const db = getPrisma();
    const [total, all, providerRows] = await Promise.all([
      db.redirectLog.count({ where }),
      db.redirectLog.count(),
      db.redirectLog.findMany({ distinct: ["provider"], orderBy: { provider: "asc" }, select: { provider: true } }),
    ]);
    const { currentPage, totalPages } = clampRedirectsPage(filters.page, total);
    const redirects = total ? await db.redirectLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (currentPage - 1) * REDIRECT_PAGE_SIZE, take: REDIRECT_PAGE_SIZE }) : [];
    data = { redirects, total, all, currentPage, totalPages, providers: providerRows.map(({ provider }) => provider) };
  } catch (error) {
    console.error("[admin-redirects:data]", error);
  }

  return (
    <AdminPageShell eyebrow="" title="Provider Handoffs" description="Review outbound redirects from Kurioticket to external providers.">
      <RedirectsFilterToolbar filters={filters} providers={data?.providers ?? []} />
      {!data ? (
        <AdminDataErrorState title="Provider handoffs could not be loaded." message="Refresh the page or check the database connection." />
      ) : data.redirects.length === 0 ? (
        <AdminEmptyState
          title={data.all === 0 ? "No provider handoffs recorded." : "No provider handoffs found."}
          message={data.all === 0 ? "Outbound provider handoffs will appear here when users continue to an external provider." : "Try another filter or clear the current filters."}
          action={data.all === 0 ? undefined : <AdminLinkButton href="/admin/redirects">Clear filters</AdminLinkButton>}
        />
      ) : <RedirectsTable data={data} filters={filters} />}
    </AdminPageShell>
  );
}

type RedirectsData = { redirects: RedirectLogModel[]; total: number; all: number; currentPage: number; totalPages: number; providers: string[] };

function RedirectsTable({ data, filters }: { data: RedirectsData; filters: ReturnType<typeof parseRedirectsSearchParams> }) {
  const first = (data.currentPage - 1) * REDIRECT_PAGE_SIZE + 1;
  const last = Math.min(data.currentPage * REDIRECT_PAGE_SIZE, data.total);
  return <div className="mt-3"><AdminDataTable
    caption="Provider handoffs"
    density="compact"
    minWidth="960px"
    columns={redirectsTableColumns}
    summary={<span className="text-xs text-slate-500">Showing {first}–{last} of {data.total} handoffs</span>}
    footer={<Pagination {...data} filters={filters} first={first} last={last} />}
    rows={data.redirects.map((redirect) => ({ id: redirect.id, cells: [
      <span key="route" className="block"><span className="block font-semibold text-slate-950">{redirect.route || "—"}</span><span className="mt-0.5 block text-xs capitalize text-slate-500">{redirect.type.toLowerCase()}</span></span>,
      <span key="provider" className="font-semibold text-slate-800">{redirect.provider}</span>,
      formatSourcePage(redirect.sourcePage),
      <span key="domain" className="block max-w-64 truncate" title={redirect.destinationUrl} aria-label={`Destination: ${redirect.destinationUrl}`}>{formatDestinationDomain(redirect.destinationUrl)}</span>,
      <AdminStatusBadge key="status" tone="neutral">Recorded</AdminStatusBadge>,
      formatDateTime(redirect.createdAt),
    ] }))}
  /></div>;
}

function Pagination({ currentPage, totalPages, total, first, last, filters }: { currentPage: number; totalPages: number; total: number; first: number; last: number; filters: ReturnType<typeof parseRedirectsSearchParams> }) {
  const pages = getVisiblePages(currentPage, totalPages);
  return <nav aria-label="Provider handoffs pagination" className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center sm:justify-between"><span>Showing {first}–{last} of {total} handoffs</span><div className="flex flex-wrap gap-2"><PageLink href={currentPage > 1 ? buildRedirectsHref(currentPage - 1, filters) : null}>Previous</PageLink>{pages.map((page) => <Link key={page} href={buildRedirectsHref(page, filters)} aria-current={page === currentPage ? "page" : undefined} className={`focus-ring rounded-xl border px-3 py-2 ${page === currentPage ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{page}</Link>)}<PageLink href={currentPage < totalPages ? buildRedirectsHref(currentPage + 1, filters) : null}>Next</PageLink></div></nav>;
}

function PageLink({ href, children }: { href: string | null; children: React.ReactNode }) { return href ? <Link href={href} className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{children}</Link> : <span aria-disabled="true" className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400">{children}</span>; }
function getVisiblePages(current: number, total: number) { const start = Math.max(1, Math.min(current - 1, total - 2)); return Array.from({ length: Math.min(3, total) }, (_, index) => start + index); }
