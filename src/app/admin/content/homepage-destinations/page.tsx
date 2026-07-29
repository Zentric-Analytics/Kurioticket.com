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
  describeAssignmentType,
  filterHomepageDestinationRows,
  formatAssignmentType,
  getHomepageDestinationInventoryRows,
  getHomepageDestinationMarkets,
  getHomepageDestinationReuseStatuses,
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

      <p className="text-sm text-slate-600">
        Shared records can intentionally appear in more than one market or fallback group. Warnings identify duplicates within the same market.
      </p>

      {emptyState ? (
        <AdminEmptyState
          title={emptyState.title}
          message={emptyState.message}
          action={emptyState.showClearFilters ? <AdminLinkButton href="/admin/content/homepage-destinations">Clear filters</AdminLinkButton> : undefined}
        />
      ) : <AdminDataTable
        caption="Homepage destination assignments"
        density="compact"
        minWidth="940px"
        stickyHeaderClassName="top-16 md:top-[68px]"
        columns={["Market", "Record", "Route", "Homepage usage", "Reuse"]}
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
            <div key="record" className="max-w-56"><code className="break-words text-xs text-slate-700">{row.recordId}</code><span className="mt-1 block text-xs font-normal text-slate-500">{row.destinationCity}</span></div>,
            <span key="route" aria-label={`Airport codes ${row.originCode} to ${row.destinationCode}`} className="whitespace-nowrap font-mono text-xs text-slate-700">{row.originCode} → {row.destinationCode}</span>,
            <div key="usage"><AdminStatusBadge tone={row.assignmentType === "DIRECT_MARKET" ? "info" : "neutral"}>{formatAssignmentType(row.assignmentType)}</AdminStatusBadge><span className="mt-1.5 block text-xs text-slate-500">{describeAssignmentType(row.assignmentType)}</span></div>,
            <ReuseStatus key="reuse" row={row} />,
          ],
        }))}
      />}
    </AdminPageShell>
  );
}

function ReuseStatus({ row }: { row: ReturnType<typeof getHomepageDestinationInventoryRows>[number] }) {
  const statuses = getHomepageDestinationReuseStatuses(row);

  return statuses.length ? <div className="flex max-w-64 flex-wrap justify-end gap-1.5">{statuses.map((status) => (
    <AdminStatusBadge key={status.subject} tone={status.kind === "duplicate" ? "warn" : "neutral"}>
      {status.kind === "duplicate" ? `Duplicate ${status.subject} in market` : `Shared ${status.subject} · ${status.assignmentCount} assignments`}
    </AdminStatusBadge>
  ))}</div> : <span className="text-slate-400">Unique</span>;
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
