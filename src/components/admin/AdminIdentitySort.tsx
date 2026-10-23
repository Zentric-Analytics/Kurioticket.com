"use client";

import { ChevronDown } from "lucide-react";
import type { AdminIdentitySort } from "@/lib/adminIdentityDirectory";

type Props = {
  sort: AdminIdentitySort;
  pageHref: string;
};

/** Automatically submits the sorting choice without losing directory filters. */
export function AdminIdentitySort({ sort, pageHref }: Props) {
  const params = new URLSearchParams(pageHref.split("?")[1] || "");
  params.delete("page");
  params.delete("sort");

  return (
    <form action="/admin/users" method="get" className="flex min-w-0 items-center gap-2.5">
      {[...params].map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label htmlFor="admin-identity-sort" className="shrink-0 text-xs font-medium text-slate-500">
        Sort by
      </label>
      <span className="relative inline-flex min-w-0 items-center">
        <select
          id="admin-identity-sort"
          name="sort"
          defaultValue={sort}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="focus-ring h-10 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-3.5 pr-9 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name: A–Z</option>
          <option value="name_desc">Name: Z–A</option>
        </select>
        <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 text-slate-500" />
      </span>
      <noscript><button type="submit" className="text-xs font-medium text-slate-700 underline">Apply sort</button></noscript>
    </form>
  );
}
