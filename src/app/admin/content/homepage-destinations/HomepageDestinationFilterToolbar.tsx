import { Search } from "lucide-react";

import {
  AdminButton,
  AdminInput,
  AdminLinkButton,
  AdminSelect,
} from "@/components/admin/AdminPageShell";

import {
  formatAssignmentType,
  type HomepageDestinationAssignmentType,
  type HomepageDestinationAssignmentTypeFilter,
} from "./page-data";

export function HomepageDestinationFilterToolbar({
  q,
  market,
  assignmentType,
  markets,
}: {
  q: string;
  market: string;
  assignmentType: HomepageDestinationAssignmentTypeFilter;
  markets: string[];
}) {
  const hasActiveFilters = Boolean(q || market !== "ALL" || assignmentType !== "ALL");

  return (
    <form
      action="/admin/content/homepage-destinations"
      role="search"
      aria-label="Filter homepage destination inventory"
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(12rem,1fr)_auto] lg:items-center xl:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(12rem,1fr)_auto_auto]"
    >
      <label className="relative min-w-0 md:col-span-2 lg:col-span-4 xl:col-span-1">
        <span className="sr-only">Search inventory</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput
          name="q"
          defaultValue={q}
          placeholder="Search ID, city or airport code..."
          aria-label="Search by ID, city, origin or destination code"
          className="bg-white pl-9"
        />
      </label>
      <label>
        <span className="sr-only">Market</span>
        <AdminSelect name="market" defaultValue={market} aria-label="Market" className="bg-white">
          <option value="ALL">All markets</option>
          {markets.map((option) => <option key={option} value={option}>{option}</option>)}
        </AdminSelect>
      </label>
      <label>
        <span className="sr-only">Assignment type</span>
        <AdminSelect name="assignmentType" defaultValue={assignmentType} aria-label="Assignment type" className="bg-white">
          <option value="ALL">All assignment types</option>
          {(["DIRECT_MARKET", "REGIONAL_ALIAS", "NEUTRAL_GLOBAL_ALIAS"] as HomepageDestinationAssignmentType[]).map(
            (type) => <option key={type} value={type}>{formatAssignmentType(type)}</option>,
          )}
        </AdminSelect>
      </label>
      <div className="flex items-center gap-3 md:col-span-2 lg:col-span-1 xl:contents">
        <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
        {hasActiveFilters ? <AdminLinkButton href="/admin/content/homepage-destinations">Clear filters</AdminLinkButton> : null}
      </div>
    </form>
  );
}
