import { Search } from "lucide-react";

import {
  AdminButton,
  AdminInput,
  AdminLinkButton,
  AdminSelect,
} from "@/components/admin/AdminPageShell";

import {
  flightRoutePoolTypes,
  flightRouteVisibilities,
  formatFlightRoutePoolType,
  formatFlightRouteVisibility,
  type FlightRoutePoolType,
  type FlightRoutePoolTypeFilter,
  type FlightRouteVisibility,
  type FlightRouteVisibilityFilter,
} from "./page-data";

export function FlightRouteFilterToolbar({
  q,
  region,
  poolType,
  visibility,
  regions,
}: {
  q: string;
  region: string;
  poolType: FlightRoutePoolTypeFilter;
  visibility: FlightRouteVisibilityFilter;
  regions: string[];
}) {
  return (
    <form
      action="/admin/content/flight-routes"
      role="search"
      aria-label="Filter configured flight fare routes"
      className="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(9rem,1fr))_auto_auto] md:items-center"
    >
      <label className="relative min-w-0">
        <span className="sr-only">Search routes</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput
          name="q"
          defaultValue={q}
          placeholder="Search route ID or airport code..."
          aria-label="Search by route ID, origin or destination"
          className="bg-white pl-9"
        />
      </label>
      <label>
        <span className="sr-only">Market or region</span>
        <AdminSelect name="region" defaultValue={region} aria-label="Market or region" className="bg-white">
          <option value="ALL">All markets and regions</option>
          {regions.map((option) => <option key={option} value={option}>{option}</option>)}
        </AdminSelect>
      </label>
      <label>
        <span className="sr-only">Pool type</span>
        <AdminSelect name="poolType" defaultValue={poolType} aria-label="Pool type" className="bg-white">
          <option value="ALL">All pool types</option>
          {flightRoutePoolTypes.filter((type): type is FlightRoutePoolType => type !== "ALL").map(
            (type) => <option key={type} value={type}>{formatFlightRoutePoolType(type)}</option>,
          )}
        </AdminSelect>
      </label>
      <label>
        <span className="sr-only">Visibility</span>
        <AdminSelect name="visibility" defaultValue={visibility} aria-label="Visibility" className="bg-white">
          <option value="ALL">All visibility</option>
          {flightRouteVisibilities.filter((value): value is FlightRouteVisibility => value !== "ALL").map(
            (value) => <option key={value} value={value}>{formatFlightRouteVisibility(value)}</option>,
          )}
        </AdminSelect>
      </label>
      <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
      <AdminLinkButton href="/admin/content/flight-routes">Clear</AdminLinkButton>
    </form>
  );
}

