"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { AdminQueueCustomDates, AdminQueueDateSelect } from "./AdminQueueDateControls";
import { localQueueDateTime, resolveAdminQueueWindow, validateCustomQueueWindow, type AdminQueueRange } from "@/lib/adminQueueDateRange";
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
  range,
  from,
  to,
  children,
}: {
  query: string;
  status: string;
  limit: string;
  range: AdminQueueRange;
  from: string;
  to: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const timeZone = useAdminTimeZone();
  const [search, setSearch] = useState(query);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftRange, setDraftRange] = useState<AdminQueueRange>(range);
  const [customFrom, setCustomFrom] = useState(localQueueDateTime(from));
  const [customTo, setCustomTo] = useState(localQueueDateTime(to));
  const [dateError, setDateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSearch(query);
    setDraftStatus(status);
    setDraftRange(range);
    setCustomFrom(localQueueDateTime(from));
    setCustomTo(localQueueDateTime(to));
    setDateError(null);
  }, [query, status, range, from, to]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim().slice(0, 160));
    if (draftStatus) params.set("status", draftStatus);
    if (limit) params.set("limit", limit);
    if (draftRange === "custom") {
      const error = validateCustomQueueWindow(customFrom, customTo);
      if (error) { setDateError(error); return; }
    }
    const selectedWindow = draftRange === "custom" ? {
      range: draftRange,
      from: new Date(customFrom).toISOString(),
      to: new Date(customTo).toISOString(),
    } : resolveAdminQueueWindow({ range: draftRange }, new Date(), timeZone);
    params.set("range", selectedWindow.range);
    if (selectedWindow.from) params.set("from", selectedWindow.from);
    if (selectedWindow.to) params.set("to", selectedWindow.to);
    setDateError(null);
    // Intentionally omit cursor so each new filter starts on the first page.
    const queryString = params.toString();
    startTransition(() => router.push("/admin/account-deletions" + (queryString ? "?" + queryString : ""), { scroll: false }));
  }

  return (
    <div className="min-w-0">
      <form action="/admin/account-deletions" method="get" role="search"
        aria-label="Filter account deletion requests" onSubmit={applyFilters}
        className="min-w-0 border-b border-[#D8E1EC] pb-3">
        <div data-testid="deletion-filters-row" className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px]">
          <div className="relative min-w-0">
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3.5 top-3 text-[#64748B]" />
            <label htmlFor="admin-deletion-search" className="sr-only">Search deletion requests by email or account name</label>
            <input id="admin-deletion-search" name="q" type="search"
              autoComplete="off" maxLength={160} value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by email or account name"
              className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#374151] outline-none placeholder:text-[#64748B] transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
          </div>
          <AdminQueueDateSelect range={draftRange} onChange={value => { setDraftRange(value); setDateError(null); }} />
          <div className="min-w-0">
            <AdminDirectorySelect key={"deletion-status-" + status} name="status"
              label="Request status" value={draftStatus} options={statusOptions}
              compact onValueChange={setDraftStatus} />
          </div>
          <button type="submit" disabled={isPending}
            className="focus-ring inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-2 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] disabled:opacity-60">
            Apply filters
          </button>
        </div>
        <AdminQueueCustomDates range={draftRange} from={customFrom} to={customTo}
          setFrom={setCustomFrom} setTo={setCustomTo} error={dateError} />
      </form>
      <div className="min-w-0" aria-busy={isPending}>
        {isPending ? <AdminQueueLoadingState label="Loading requests…" /> : children}
      </div>
    </div>
  );
}
