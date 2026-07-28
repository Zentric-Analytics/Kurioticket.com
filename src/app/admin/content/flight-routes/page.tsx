import Link from "next/link";

import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";

import { FlightRouteFilterToolbar } from "./FlightRouteFilterToolbar";
import {
  buildFlightRouteHref,
  filterFlightRouteRows,
  FLIGHT_ROUTE_PAGE_SIZE,
  formatFlightRoutePoolType,
  formatFlightRouteVisibility,
  getFlightRouteInventoryRows,
  getFlightRouteInventorySummary,
  getFlightRouteRegions,
  isAliasFlightRouteRegion,
  paginateFlightRouteRows,
  parseFlightRouteSearchParams,
  type FlightRouteSearchParams,
} from "./page-data";

export const metadata = { title: "Admin Configured Flight Fare Routes" };

type PageProps = { searchParams?: Promise<FlightRouteSearchParams> };

export default async function FlightRouteInventoryPage({ searchParams }: PageProps) {
  const filters = parseFlightRouteSearchParams(await searchParams);
  const allRows = getFlightRouteInventoryRows();
  const routeSummary = getFlightRouteInventorySummary(allRows);
  const matchingRows = filterFlightRouteRows(allRows, filters);
  const page = paginateFlightRouteRows(matchingRows, filters.page);
  const firstResult = matchingRows.length
    ? (page.currentPage - 1) * FLIGHT_ROUTE_PAGE_SIZE + 1
    : 0;
  const lastResult = Math.min(page.currentPage * FLIGHT_ROUTE_PAGE_SIZE, matchingRows.length);

  return (
    <AdminPageShell
      eyebrow=""
      title="Configured flight fare routes"
      description="Inspect every configured route-pool membership without removing regional aliases, fallback records or duplicate route pairs."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Unique route IDs" value={routeSummary.uniqueRouteIds} />
        <AdminMetricCard label="Pool memberships" value={routeSummary.poolMemberships} />
        <AdminMetricCard label="Default-US routes" value={routeSummary.defaultUsRoutes} />
        <AdminMetricCard label="Global routes" value={routeSummary.globalRoutes} />
      </div>
      <p className="text-sm text-slate-600">One route ID can appear in more than one regional, global, backup or fallback pool.</p>

      <FlightRouteFilterToolbar
        q={filters.q}
        region={filters.region}
        poolType={filters.poolType}
        visibility={filters.visibility}
        regions={getFlightRouteRegions()}
      />

      <AdminDataTable
        caption="Configured flight fare route memberships"
        density="compact"
        minWidth="1120px"
        columns={["Route ID", "Market or region", "Origin", "Destination", "Route", "Pool type", "Visibility", "Status"]}
        summary={`Showing ${firstResult}–${lastResult} of ${matchingRows.length} pool memberships`}
        footer={page.totalPages > 1 ? (
          <Pagination currentPage={page.currentPage} totalPages={page.totalPages} filters={filters} />
        ) : undefined}
        rows={page.rows.map((row) => ({
          id: row.rowId,
          cells: [
            <code key="id" className="text-xs text-slate-700">{row.routeId}</code>,
            <span key="region" className="font-semibold text-slate-950">
              {row.region}
              {isAliasFlightRouteRegion(row.region) ? <span className="mt-1 block text-xs font-normal text-slate-500">Regional alias</span> : null}
            </span>,
            row.originCode,
            row.destinationCode,
            <code key="route" className="text-xs text-slate-700">{row.route}</code>,
            <AdminStatusBadge key="pool" tone={row.poolType === "DEFAULT_US" ? "info" : "neutral"}>
              {formatFlightRoutePoolType(row.poolType)}
            </AdminStatusBadge>,
            <AdminStatusBadge key="visibility" tone={row.visibility === "VISIBLE" ? "good" : row.visibility === "BACKUP" ? "warn" : "neutral"}>
              {formatFlightRouteVisibility(row.visibility)}
            </AdminStatusBadge>,
            <div key="status" className="flex flex-wrap justify-end gap-1.5">
              <AdminStatusBadge tone="good">Configured</AdminStatusBadge>
              {row.duplicateRoutePair ? <AdminStatusBadge tone="warn">Duplicate route pair</AdminStatusBadge> : null}
            </div>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function Pagination({ currentPage, totalPages, filters }: {
  currentPage: number;
  totalPages: number;
  filters: ReturnType<typeof parseFlightRouteSearchParams>;
}) {
  return (
    <nav className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700" aria-label="Configured flight fare route pagination">
      <span>Page {currentPage} of {totalPages}</span>
      <div className="flex gap-2">
        <PageLink page={currentPage - 1} enabled={currentPage > 1} filters={filters}>Previous</PageLink>
        <PageLink page={currentPage + 1} enabled={currentPage < totalPages} filters={filters}>Next</PageLink>
      </div>
    </nav>
  );
}

function PageLink({ page, enabled, filters, children }: {
  page: number;
  enabled: boolean;
  filters: ReturnType<typeof parseFlightRouteSearchParams>;
  children: React.ReactNode;
}) {
  return enabled ? (
    <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2" href={buildFlightRouteHref(page, filters)}>{children}</Link>
  ) : (
    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">{children}</span>
  );
}
