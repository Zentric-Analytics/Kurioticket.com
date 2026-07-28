import { Search } from "lucide-react";

import { AdminButton, AdminInput, AdminLinkButton, AdminSelect } from "@/components/admin/AdminPageShell";

import {
  formatHotelDestinationKind,
  hotelDestinationKinds,
  type HotelDestinationKindFilter,
} from "./page-data";

export function HotelDestinationFilterToolbar({ q, country, kind, countries }: {
  q: string;
  country: string;
  kind: HotelDestinationKindFilter;
  countries: string[];
}) {
  return (
    <form
      action="/admin/content/hotel-destinations"
      role="search"
      aria-label="Filter hotel search destinations"
      className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto_auto] md:items-center"
    >
      <label className="relative min-w-0">
        <span className="sr-only">Search destinations</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" defaultValue={q} placeholder="Search destination inventory..." aria-label="Search by ID, name, country, region, search value or alias" className="bg-white pl-9" />
      </label>
      <label>
        <span className="sr-only">Country</span>
        <AdminSelect name="country" defaultValue={country} aria-label="Country" className="bg-white">
          <option value="ALL">All countries</option>
          {countries.map((option) => <option key={option} value={option}>{option}</option>)}
        </AdminSelect>
      </label>
      <label>
        <span className="sr-only">Destination type</span>
        <AdminSelect name="kind" defaultValue={kind} aria-label="Destination type" className="bg-white">
          <option value="ALL">All destination types</option>
          {hotelDestinationKinds.filter((value) => value !== "ALL").map((value) => (
            <option key={value} value={value}>{formatHotelDestinationKind(value)}</option>
          ))}
        </AdminSelect>
      </label>
      <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
      <AdminLinkButton href="/admin/content/hotel-destinations">Clear</AdminLinkButton>
    </form>
  );
}
