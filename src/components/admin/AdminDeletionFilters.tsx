"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { AdminQueueLoadingState } from "./AdminQueueLoadingState";

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "READY_FOR_REVIEW", label: "Ready for review" },
  { value: "CANCELLED", label: "Cancelled / reactivated" },
  { value: "COMPLETED", label: "Completed" },
] as const;

/** Apply-only navigation, with the same record-area pending treatment as Support. */
export function AdminDeletionFilters({
  query,
  status,
  limit,
  children,
}: {
  query: string;
  status: string;
  limit: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const [draftStatus, setDraftStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearch(query);
    setDraftStatus(status);
  }, [query, status]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim().slice(0, 160));
    if (draftStatus) params.set("status", draftStatus);
    if (limit) params.set("limit", limit);
    // Intentionally omit cursor so each new filter starts on the first page.
    const queryString = params.toString();
    startTransition(() => router.push("/admin/account-deletions" + (queryString ? "?" + queryString : ""), { scroll: false }));
  }

  return (
    <div className="min-w-0">
      <form action="/admin/account-deletions" method="get" role="search"
        aria-label="Filter account deletion requests" onSubmit={applyFilters}
        className="flex min-w-0 flex-wrap items-center justify-end gap-2 border-b border-[#D8E1EC] pb-3">
        <div className="relative min-w-[180px] max-w-[440px] flex-[1_1_240px]">
          <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3.5 top-3 text-[#64748B]" />
          <label htmlFor="admin-deletion-search" className="sr-only">Search deletion requests by email or account name</label>
          <input id="admin-deletion-search" name="q" type="search"
            autoComplete="off" maxLength={160} value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search by email or account name"
            className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#374151] outline-none placeholder:text-[#64748B] transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
        </div>
        <div className="w-[174px] min-w-0 max-w-full shrink-0">
          <AdminDirectorySelect
            key={"deletion-status-" + status}
            name="status" label="Request status" value={draftStatus}
            options={statusOptions} plain align="end" onValueChange={setDraftStatus} />
        </div>
        <button type="submit" disabled={isPending}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
          Apply filters
        </button>
      </form>
      <div className="min-w-0" aria-busy={isPending}>
        {isPending ? <AdminQueueLoadingState label="Loading requests…" /> : children}
      </div>
    </div>
  );
}
