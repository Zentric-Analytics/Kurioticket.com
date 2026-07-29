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
  formatMarketLabel,
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
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Destination cards"
          value={summary.uniqueCardIds}
          hint="Distinct configured card records"
        />
        <AdminMetricCard
          label="Homepage placements"
          value={summary.marketAssignments}
          hint="Total appearances across markets and fallback groups"
        />
        <AdminMetricCard
          label="Routes covered"
          value={summary.uniqueRoutes}
          hint="Distinct origin-to-destination routes"
        />
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
        minWidth={null}
        fixedLayout
        tableClassName="min-w-[900px] lg:min-w-full"
        columns={[
          { key: "market", label: "Market", align: "left", width: "11%", cellClassName: "whitespace-normal leading-snug" },
          { key: "record-id", label: "Record ID", align: "left", width: "19%", cellClassName: "whitespace-normal break-words" },
          { key: "origin", label: "Origin", align: "left", width: "8%", cellClassName: "whitespace-nowrap" },
          { key: "destination", label: "Destination", align: "left", width: "9%", cellClassName: "whitespace-nowrap" },
          { key: "destination-city", label: "Destination city", align: "left", width: "20%", cellClassName: "whitespace-normal break-words" },
          { key: "route", label: "Route", align: "left", width: "14%", cellClassName: "whitespace-normal break-words" },
          { key: "homepage-usage", label: "Homepage usage", align: "left", width: "19%", cellClassName: "whitespace-normal break-words" },
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
            <span key="market" className="block w-full whitespace-normal text-left font-semibold leading-snug text-slate-950">
              {formatMarketLabel(row.market)}
            </span>,
            <div key="id" className="space-y-1 text-left">
              <code className="break-all text-xs text-slate-700">{row.recordId}</code>
              {row.recordIdAssignmentCount > 1 ? (
                <p className="cursor-text text-xs text-slate-500">
                  Used in {row.recordIdAssignmentCount} assignments
                </p>
              ) : null}
            </div>,
            row.originCode,
            row.destinationCode,
            row.destinationCity,
            <div key="route" className="space-y-1 text-left">
              <code className="break-all text-xs text-slate-700">{row.route}</code>
              {row.routeAssignmentCount > 1 ? (
                <p className="cursor-text text-xs text-slate-500">
                  Used in {row.routeAssignmentCount} assignments
                </p>
              ) : null}
            </div>,
            <AdminStatusBadge key="type" tone={row.assignmentType === "DIRECT_MARKET" ? "info" : "neutral"}>
              {formatAssignmentType(row.assignmentType)}
            </AdminStatusBadge>,
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
