import Link from "next/link";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import { HomepageDestinationFilterToolbar } from "./HomepageDestinationFilterToolbar";
import { getInventoryEmptyState } from "../inventory-empty-state";
import {
  buildHomepageDestinationHref,
  filterHomepageDestinationRows,
  formatAssignmentType,
  getHomepageDestinationInventoryRows,
  getHomepageDestinationMarkets,
  getHomepageDestinationSummary,
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
  const summary = getHomepageDestinationSummary(allRows);
  const matchingRows = filterHomepageDestinationRows(allRows, filters);
  const page = paginateHomepageDestinationRows(matchingRows, filters.page);
  const firstResult = matchingRows.length
    ? (page.currentPage - 1) * HOMEPAGE_DESTINATION_PAGE_SIZE + 1
    : 0;
  const lastResult = Math.min(page.currentPage * HOMEPAGE_DESTINATION_PAGE_SIZE, matchingRows.length);
  const hasActiveFilters = Boolean(filters.q || filters.market !== "ALL" || filters.assignmentType !== "ALL");
  const emptyState = getInventoryEmptyState(allRows.length, matchingRows.length, hasActiveFilters, {
    filteredTitle: "No destination assignments match",
    filteredMessage: "Adjust the search or filters to view configured homepage destination assignments.",
    sourceTitle: "No destination assignments are configured",
    sourceMessage: "No homepage destination assignment records are configured.",
  });

  return (
    <AdminPageShell
      eyebrow=""
      title="Homepage destination content"
      description="Inspect every configured homepage destination assignment without removing aliases or repeated records."
      actions={<AdminLinkButton href="/admin/content" size="sm">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Unique card IDs" value={summary.uniqueCardIds} />
        <AdminMetricCard label="Market assignments" value={summary.marketAssignments} />
        <AdminMetricCard label="Unique routes" value={summary.uniqueRoutes} />
      </div>

      <HomepageDestinationFilterToolbar
        q={filters.q}
        market={filters.market}
        assignmentType={filters.assignmentType}
        markets={getHomepageDestinationMarkets()}
      />

      {emptyState ? (
        <AdminEmptyState
          title={emptyState.title}
          message={emptyState.message}
          action={emptyState.showClearFilters ? <AdminLinkButton href="/admin/content/homepage-destinations">Clear filters</AdminLinkButton> : undefined}
        />
      ) : <AdminDataTable
        caption="Homepage destination assignments"
        density="compact"
        minWidth="1080px"
        stickyHeaderClassName="top-16 md:top-[68px]"
        columns={[
          { key: "market", label: "Market", className: "w-[8%]" },
          { key: "record-id", label: "Record ID", className: "w-[16%]", bodyClassName: "w-[16%]" },
          { key: "origin", label: "Origin", className: "w-[8%]" },
          { key: "destination", label: "Destination", className: "w-[10%]" },
          { key: "destination-city", label: "Destination city", className: "w-[15%]", bodyClassName: "whitespace-normal" },
          { key: "route", label: "Route", className: "w-[12%]", bodyClassName: "w-[12%]" },
          { key: "assignment-type", label: "Assignment type", className: "w-[15%]" },
          { key: "public-role", label: "Public role", className: "w-[16%]", bodyClassName: "whitespace-normal text-left" },
        ]}
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
            <div key="id" className="flex flex-col items-start gap-1.5">
              <code className="text-xs text-slate-700">{row.recordId}</code>
              {row.repeatedId ? <AdminStatusBadge tone="warn">Repeated ID</AdminStatusBadge> : null}
            </div>,
            row.originCode,
            row.destinationCode,
            row.destinationCity,
            <div key="route" className="flex flex-col items-start gap-1.5">
              <code className="text-xs text-slate-700">{row.route}</code>
              {row.repeatedRoute ? <AdminStatusBadge tone="warn">Repeated route</AdminStatusBadge> : null}
            </div>,
            <AdminStatusBadge key="type" tone={row.assignmentType === "DIRECT_MARKET" ? "info" : "neutral"}>
              {formatAssignmentType(row.assignmentType)}
            </AdminStatusBadge>,
            <span key="role">{row.publicRole}</span>,
          ],
        }))}
      />}
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
