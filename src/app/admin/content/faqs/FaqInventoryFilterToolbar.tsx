import { Search } from "lucide-react";

import { AdminButton, AdminInput, AdminLinkButton, AdminSelect } from "@/components/admin/AdminPageShell";

import { faqCollectionFilters, formatFaqCollection, type FaqCollection, type FaqCollectionFilter } from "./page-data";

export function FaqInventoryFilterToolbar({ q, collection }: { q: string; collection: FaqCollectionFilter }) {
  return (
    <form
      action="/admin/content/faqs"
      role="search"
      aria-label="Filter FAQ definition inventory"
      className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_auto_auto] md:items-center"
    >
      <label className="relative min-w-0">
        <span className="sr-only">Search FAQ definitions</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" defaultValue={q} placeholder="Search FAQ definitions..." aria-label="Search by FAQ ID, question key, answer key or English fallback question" className="bg-white pl-9" />
      </label>
      <label>
        <span className="sr-only">FAQ collection</span>
        <AdminSelect name="collection" defaultValue={collection} aria-label="FAQ collection" className="bg-white">
          <option value="ALL">All FAQ collections</option>
          {faqCollectionFilters.filter((value): value is FaqCollection => value !== "ALL").map((value) => (
            <option key={value} value={value}>{formatFaqCollection(value)}</option>
          ))}
        </AdminSelect>
      </label>
      <AdminButton type="submit" variant="secondary">Apply filters</AdminButton>
      <AdminLinkButton href="/admin/content/faqs">Clear</AdminLinkButton>
    </form>
  );
}
