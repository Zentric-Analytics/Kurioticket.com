"use client";

import { Search } from "lucide-react";

import {
  AdminInput,
  AdminLinkButton,
  AdminSelect,
} from "@/components/admin/AdminPageShell";

import {
  formatAssignmentType,
  formatMarketLabel,
  type HomepageDestinationAssignmentType,
  type HomepageDestinationAssignmentTypeFilter,
} from "./page-data";
import {
  hasActiveHomepageDestinationFilters,
  submitHomepageDestinationFilters,
} from "./filter-toolbar-behavior";

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
  const hasActiveFilters = hasActiveHomepageDestinationFilters(q, market, assignmentType);

  return (
    <form
      action="/admin/content/homepage-destinations"
      method="get"
      role="search"
      aria-label="Filter homepage destination inventory"
      className="grid gap-3 md:flex md:items-center"
    >
      <label className="relative min-w-0 md:flex-1">
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
      <label className="md:w-40 md:shrink-0">
        <span className="sr-only">Market</span>
        <AdminSelect name="market" defaultValue={market} aria-label="Market" className="bg-white" onChange={submitHomepageDestinationFilters}>
          <option value="ALL">All markets</option>
          {markets.map((option) => <option key={option} value={option}>{formatMarketLabel(option)}</option>)}
        </AdminSelect>
      </label>
      <label className="md:w-52 md:shrink-0">
        <span className="sr-only">Assignment type</span>
        <AdminSelect name="assignmentType" defaultValue={assignmentType} aria-label="Assignment type" className="bg-white" onChange={submitHomepageDestinationFilters}>
          <option value="ALL">All assignment types</option>
          {(["DIRECT_MARKET", "REGIONAL_ALIAS", "NEUTRAL_GLOBAL_ALIAS"] as HomepageDestinationAssignmentType[]).map(
            (type) => <option key={type} value={type}>{formatAssignmentType(type)}</option>,
          )}
        </AdminSelect>
      </label>
      <button type="submit" className="sr-only">Submit filters</button>
      {hasActiveFilters ? (
        <AdminLinkButton href="/admin/content/homepage-destinations" className="md:shrink-0">
          Clear filters
        </AdminLinkButton>
      ) : null}
    </form>
  );
}
