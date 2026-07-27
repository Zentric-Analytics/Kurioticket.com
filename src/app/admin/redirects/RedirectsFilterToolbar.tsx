"use client";

import { FormEvent, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminInput, AdminLinkButton, AdminSelect } from "@/components/admin/AdminPageShell";
import { buildRedirectsHref, type parseRedirectsSearchParams, type RedirectStatusFilter } from "./page-data";

export function RedirectsFilterToolbar({ filters, providers }: { filters: ReturnType<typeof parseRedirectsSearchParams>; providers: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [provider, setProvider] = useState(filters.provider);
  const [status, setStatus] = useState(filters.status);
  const apply = (next: { q: string; provider: string; status: RedirectStatusFilter }) => router.replace(buildRedirectsHref(1, next), { scroll: false });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); apply({ q, provider, status }); }

  return <form action="/admin/redirects" onSubmit={submit} className="grid gap-3 md:grid-cols-[minmax(18rem,2fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_auto] md:items-center">
    <label className="relative min-w-0"><span className="sr-only">Search route or domain</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><AdminInput name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search route or domain..." aria-label="Search route or domain" className="bg-white pl-9" /></label>
    <label><span className="sr-only">Provider</span><AdminSelect name="provider" value={provider} aria-label="Provider" onChange={(event) => { const value = event.target.value; setProvider(value); apply({ q, provider: value, status }); }} className="bg-white"><option value="ALL">Provider</option>{providers.map((value) => <option key={value} value={value}>{value}</option>)}</AdminSelect></label>
    <label><span className="sr-only">Status</span><AdminSelect name="status" value={status} aria-label="Status" onChange={(event) => { const value = event.target.value as RedirectStatusFilter; setStatus(value); apply({ q, provider, status: value }); }} className="bg-white"><option value="ALL">Status</option><option value="RECORDED">Recorded</option></AdminSelect></label>
    <AdminLinkButton href="/admin/redirects" className="w-full md:w-auto"><RotateCcw className="h-4 w-4" aria-hidden="true" />Clear filters</AdminLinkButton>
  </form>;
}
