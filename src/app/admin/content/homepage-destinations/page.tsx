import Link from "next/link";

import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import { getContentInventory } from "../inventory";
import { HomepageDestinationFilterToolbar } from "./HomepageDestinationFilterToolbar";
import {
  buildHomepageDestinationHref,
  filterHomepageDestinationRows,
  formatAssignmentType,
  getHomepageDestinationInventoryRows,
  getHomepageDestinationMarkets,
  HOMEPAGE_DESTINATION_PAGE_SIZE,
  paginateHomepageDestinationRows,
  parseHomepageDestinationSearchParams,
  type HomepageDestinationSearchParams,
} from "./page-data";

export const metadata = { title: "Admin Homepage Destination Inventory" };

type PageProps = { searchParams?: Promise<HomepageDestinationSearchParams> };

export default async function HomepageDestinationInventoryPage({ searchParams }: PageProps) {
  const filters = parseHomepageDestinationSearchParams(await searchParams);
  const allRows = getHomepageDestinationInventoryRows();
  const matchingRows = filterHomepageDestinationRows(allRows, filters);
  const page = paginateHomepageDestinationRows(matchingRows, filters.page);
  const summary = getContentInventory().find((item) => item.title === "Homepage destination content");
  const firstResult = matchingRows.length
    ? (page.currentPage - 1) * HOMEPAGE_DESTINATION_PAGE_SIZE + 1
    : 0;
  const lastResult = Math.min(page.currentPage * HOMEPAGE_DESTINATION_PAGE_SIZE, matchingRows.length);

  if (!summary) throw new Error("Homepage destination inventory summary is unavailable");

  return (
    <AdminPageShell
      eyebrow=""
      title="Homepage destination content"
      description="Inspect every configured homepage destination assignment without removing aliases or repeated records."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Unique card IDs" value={summary.primaryCount} />
        <AdminMetricCard label="Market assignments" value={summary.supportingMetrics[0].value} />
        <AdminMetricCard label="Unique routes" value={summary.supportingMetrics[1].value} />
      </div>

      <HomepageDestinationFilterToolbar
        q={filters.q}
        market={filters.market}
        assignmentType={filters.assignmentType}
        markets={getHomepageDestinationMarkets()}
      />

      <AdminDataTable
        caption="Homepage destination assignments"
        density="compact"
        minWidth="1180px"
        columns={["Market", "Record ID", "Origin", "Destination", "Destination city", "Route", "Assignment type", "Public role"]}
        summary={`Showing ${firstResult}–${lastResult} of ${matchingRows.length} assignments`}
        footer={page.totalPages > 1 ? (
          <Pagination
            currentPage={page.currentPage}
            totalPages={page.totalPages}
            filters={filters}
          />
        ) : undefined}
        rows={page.rows.map((row) => ({
          id: row.rowId,
          cells: [
            <span key="market" className="font-semibold text-slate-950">{row.market}</span>,
            <code key="id" className="text-xs text-slate-700">{row.recordId}</code>,
            row.originCode,
            row.destinationCode,
            row.destinationCity,
            <code key="route" className="text-xs text-slate-700">{row.route}</code>,
            <AdminStatusBadge key="type" tone={row.assignmentType === "DIRECT_MARKET" ? "info" : "neutral"}>
              {formatAssignmentType(row.assignmentType)}
            </AdminStatusBadge>,
            <div key="role" className="flex flex-wrap justify-end gap-1.5">
              <span>{row.publicRole}</span>
              {row.repeatedId ? <AdminStatusBadge tone="warn">Repeated ID</AdminStatusBadge> : null}
              {row.repeatedRoute ? <AdminStatusBadge tone="warn">Repeated route</AdminStatusBadge> : null}
            </div>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function Pagination({
  currentPage,
  totalPages,
  filters,
}: {
  currentPage: number;
  totalPages: number;
  filters: ReturnType<typeof parseHomepageDestinationSearchParams>;
}) {
  return (
    <nav className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700" aria-label="Homepage destination inventory pagination">
      <span>Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        <PageLink page={currentPage - 1} enabled={currentPage > 1} filters={filters}>Previous</PageLink>
        <PageLink page={currentPage + 1} enabled={currentPage < totalPages} filters={filters}>Next</PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  page,
  enabled,
  filters,
  children,
}: {
  page: number;
  enabled: boolean;
  filters: ReturnType<typeof parseHomepageDestinationSearchParams>;
  children: React.ReactNode;
}) {
  return enabled ? (
    <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2" href={buildHomepageDestinationHref(page, filters)}>{children}</Link>
  ) : (
    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">{children}</span>
  );
}
