"use client";

import { FormEvent, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminInput, AdminLinkButton, AdminSelect } from "@/components/admin/AdminPageShell";
import { buildSearchesHref, type parseSearchesSearchParams, type SearchProviderFilter, type SearchStatusFilter, type SearchTypeFilter } from "./page-data";

export function SearchesFilterToolbar({ filters }: { filters: ReturnType<typeof parseSearchesSearchParams> }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [type, setType] = useState(filters.type);
  const [status, setStatus] = useState(filters.status);
  const [provider, setProvider] = useState(filters.provider);
  const apply = (next: { q: string; type: SearchTypeFilter; status: SearchStatusFilter; provider: SearchProviderFilter }) => router.replace(buildSearchesHref(1, next), { scroll: false });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ q, type, status, provider }); }

  return (
    <form action="/admin/searches" onSubmit={submit} className="grid gap-3 md:grid-cols-[minmax(18rem,2fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(11rem,1fr)_auto] md:items-center">
      <label className="relative min-w-0">
        <span className="sr-only">Search route</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search route..." className="bg-white pl-9" />
      </label>
      <label><span className="sr-only">Type</span><AdminSelect name="type" value={type} onChange={(event) => { const value = event.target.value as SearchTypeFilter; setType(value); apply({ q, type: value, status, provider }); }} className="bg-white"><option value="ALL">Type</option><option value="FLIGHT">Flight</option><option value="HOTEL">Hotel</option></AdminSelect></label>
      <label><span className="sr-only">Status</span><AdminSelect name="status" value={status} onChange={(event) => { const value = event.target.value as SearchStatusFilter; setStatus(value); apply({ q, type, status: value, provider }); }} className="bg-white"><option value="ALL">Status</option><option value="SUCCESS">Success</option><option value="PARTIAL">Partial</option><option value="FAILED">Failed</option></AdminSelect></label>
      <label><span className="sr-only">Provider</span><AdminSelect name="provider" value={provider} onChange={(event) => { const value = event.target.value as SearchProviderFilter; setProvider(value); apply({ q, type, status, provider: value }); }} className="bg-white"><option value="ALL">Provider</option><option value="FLIGHT">Flight provider</option><option value="HOTEL">Hotel provider</option></AdminSelect></label>
      <AdminLinkButton href="/admin/searches" className="w-full md:w-auto"><RotateCcw className="h-4 w-4" aria-hidden="true" />Clear filters</AdminLinkButton>
    </form>
  );
}
