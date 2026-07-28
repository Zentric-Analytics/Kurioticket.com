import Link from "next/link";

import {
  AdminDataTable,
  AdminLinkButton,
  AdminMetricCard,
  AdminPageShell,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { activeHotelDestinationDisplayLocales } from "@/data/hotelDestinations";

import { HotelDestinationFilterToolbar } from "./HotelDestinationFilterToolbar";
import {
  buildHotelDestinationHref,
  filterHotelDestinationRows,
  formatHotelDestinationKind,
  getHotelDestinationCountries,
  getHotelDestinationInventoryRows,
  getHotelDestinationSummary,
  HOTEL_DESTINATION_PAGE_SIZE,
  paginateHotelDestinationRows,
  parseHotelDestinationSearchParams,
  type HotelDestinationSearchParams,
} from "./page-data";

export const metadata = { title: "Admin Hotel Search Destinations" };

type PageProps = { searchParams?: Promise<HotelDestinationSearchParams> };

export default async function HotelDestinationInventoryPage({ searchParams }: PageProps) {
  const filters = parseHotelDestinationSearchParams(await searchParams);
  const allRows = getHotelDestinationInventoryRows();
  const summary = getHotelDestinationSummary(allRows);
  const matchingRows = filterHotelDestinationRows(allRows, filters);
  const page = paginateHotelDestinationRows(matchingRows, filters.page);
  const firstResult = matchingRows.length ? (page.currentPage - 1) * HOTEL_DESTINATION_PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page.currentPage * HOTEL_DESTINATION_PAGE_SIZE, matchingRows.length);

  return (
    <AdminPageShell
      eyebrow=""
      title="Hotel search destinations"
      description="Inspect the code-backed destinations used by hotel search and autocomplete. These records are not homepage hotel cards."
      actions={<AdminLinkButton href="/admin/content">Back to Content Inventory</AdminLinkButton>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label="Total search destinations" value={summary.total} />
        <AdminMetricCard label="Cities" value={summary.cities} />
        <AdminMetricCard label="Airport areas" value={summary.airportAreas} />
        <AdminMetricCard label="Districts" value={summary.districts} />
        <AdminMetricCard label="Supported display locales" value={summary.supportedDisplayLocales} />
      </div>

      <HotelDestinationFilterToolbar
        q={filters.q}
        country={filters.country}
        kind={filters.kind}
        countries={getHotelDestinationCountries()}
      />

      <AdminDataTable
        caption="Hotel search and autocomplete destinations"
        density="compact"
        minWidth="1540px"
        columns={["Destination ID", "Name", "Country", "Country code", "Region", "Type", "Search value", "Aliases", "Localisation coverage", "Public usage"]}
        summary={`Showing ${firstResult}–${lastResult} of ${matchingRows.length} search destinations`}
        footer={page.totalPages > 1 ? <Pagination currentPage={page.currentPage} totalPages={page.totalPages} filters={filters} /> : undefined}
        rows={page.rows.map((row) => ({
          id: row.rowId,
          cells: [
            <div key="id">
              <code className="text-xs text-slate-700">{row.id}</code>
              {row.duplicateId ? <div className="mt-1"><AdminStatusBadge tone="warn">Duplicate ID</AdminStatusBadge></div> : null}
            </div>,
            <div key="name" className="font-semibold text-slate-950">
              {row.name}
              {row.repeatedName ? <div className="mt-1"><AdminStatusBadge tone="warn">Repeated name</AdminStatusBadge></div> : null}
            </div>,
            row.country,
            <code key="country-code" className="text-xs text-slate-700">{row.countryCode}</code>,
            row.region || <span key="region" className="text-slate-400">—</span>,
            <AdminStatusBadge key="type" tone={row.kind === "city" ? "info" : row.kind === "landmark" ? "warn" : "neutral"}>{formatHotelDestinationKind(row.kind)}</AdminStatusBadge>,
            <div key="search-value">
              <span>{row.searchValue}</span>
              {row.duplicateSearchValue ? <div className="mt-1"><AdminStatusBadge tone="warn">Duplicate search value</AdminStatusBadge></div> : null}
            </div>,
            row.aliases?.length ? row.aliases.join(", ") : <span key="aliases" className="text-slate-400">—</span>,
            <span key="coverage" className="whitespace-nowrap">{row.localizationCoverage} / {activeHotelDestinationDisplayLocales.length} locales</span>,
            <AdminStatusBadge key="usage" tone="good">Search &amp; autocomplete</AdminStatusBadge>,
          ],
        }))}
      />
    </AdminPageShell>
  );
}

function Pagination({ currentPage, totalPages, filters }: {
  currentPage: number;
  totalPages: number;
  filters: ReturnType<typeof parseHotelDestinationSearchParams>;
}) {
  return (
    <nav className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700" aria-label="Hotel destination pagination">
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
  filters: ReturnType<typeof parseHotelDestinationSearchParams>;
  children: React.ReactNode;
}) {
  return enabled ? (
    <Link className="focus-ring rounded-xl border border-slate-200 bg-white px-3 py-2" href={buildHotelDestinationHref(page, filters)}>{children}</Link>
  ) : (
    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400" aria-disabled="true">{children}</span>
  );
}
