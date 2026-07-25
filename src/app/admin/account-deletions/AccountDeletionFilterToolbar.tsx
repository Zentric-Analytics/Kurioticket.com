"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { AdminButton, AdminInput } from "@/components/admin/AdminPageShell";
import { buildAccountDeletionHref, type AccountDeletionFilter } from "./page-data";

export const ACCOUNT_DELETION_SEARCH_DEBOUNCE_MS = 400;

export function AccountDeletionFilterToolbar({ q, status }: { q: string; status: AccountDeletionFilter }) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelDebounce = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const applySearch = useCallback((value: string) => {
    const href = buildAccountDeletionHref(1, { q: value.trim(), status });
    if (href !== `${window.location.pathname}${window.location.search}`) router.replace(href, { scroll: false });
  }, [router, status]);

  useEffect(() => {
    cancelDebounce();
    timer.current = setTimeout(() => applySearch(search), ACCOUNT_DELETION_SEARCH_DEBOUNCE_MS);
    return cancelDebounce;
  }, [applySearch, cancelDebounce, search]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancelDebounce();
    applySearch(search);
  }

  return (
    <form action="/admin/account-deletions" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" onSubmit={submit}>
      <label className="relative min-w-0">
        <span className="sr-only">Search requests</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <AdminInput name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." aria-label="Search requests" className="bg-white pl-9" />
      </label>
      <AdminButton type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => { cancelDebounce(); setSearch(""); router.replace("/admin/account-deletions", { scroll: false }); }}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Clear filters
      </AdminButton>
    </form>
  );
}
