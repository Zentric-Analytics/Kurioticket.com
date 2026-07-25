"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminButton, AdminInput, AdminSelect } from "@/components/admin/AdminPageShell";
import { buildSupportHref, type SupportStatusFilter } from "./page-data";

export const SUPPORT_SEARCH_DEBOUNCE_MS = 400;

type Props = { q: string; category: string; status: SupportStatusFilter; categories: string[] };

export function SupportFilterToolbar({ q, category, status, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryRef = useRef(selectedCategory);
  const statusRef = useRef(selectedStatus);
  useEffect(() => {
    categoryRef.current = selectedCategory;
    statusRef.current = selectedStatus;
  }, [selectedCategory, selectedStatus]);

  const cancelDebounce = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const apply = useCallback((filters: { q: string; category: string; status: SupportStatusFilter }) => {
    const href = buildSupportHref(1, filters);
    if (href !== `${window.location.pathname}${window.location.search}`) router.replace(href, { scroll: false });
  }, [router]);

  useEffect(() => {
    cancelDebounce();
    timer.current = setTimeout(() => apply({ q: search, category: categoryRef.current, status: statusRef.current }), SUPPORT_SEARCH_DEBOUNCE_MS);
    return cancelDebounce;
  }, [apply, cancelDebounce, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelDebounce();
    apply({ q: search, category: selectedCategory, status: selectedStatus });
  }

  return (
    <form action="/admin/support" className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_auto] md:items-center" onSubmit={submit}>
      <label className="relative min-w-0">
        <span className="sr-only">Search tickets</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets..." aria-label="Search tickets" className="bg-white pl-9" />
      </label>
      <label><span className="sr-only">Category</span><AdminSelect name="category" value={selectedCategory} aria-label="Category" className="bg-white" onChange={(event) => { cancelDebounce(); setSelectedCategory(event.target.value); apply({ q: search, category: event.target.value, status: selectedStatus }); }}>
        <option value="ALL">Category</option>{categories.map((value) => <option value={value} key={value}>{formatOption(value)}</option>)}
      </AdminSelect></label>
      <label><span className="sr-only">Status</span><AdminSelect name="status" value={selectedStatus} aria-label="Status" className="bg-white" onChange={(event) => { cancelDebounce(); const value = event.target.value as SupportStatusFilter; setSelectedStatus(value); apply({ q: search, category: selectedCategory, status: value }); }}>
        <option value="ALL">Status</option><option value="OPEN">Open</option><option value="WAITING_ON_USER">Waiting on user</option><option value="WAITING_ON_TEAM">Waiting on team</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
      </AdminSelect></label>
      <AdminButton type="button" variant="secondary" className="w-full md:w-auto" onClick={() => { cancelDebounce(); setSearch(""); setSelectedCategory("ALL"); setSelectedStatus("ALL"); apply({ q: "", category: "ALL", status: "ALL" }); }}>
        <RotateCcw className="h-4 w-4 rounded-full" aria-hidden="true" /> Clear filters
      </AdminButton>
    </form>
  );
}

function formatOption(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
