"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { useRouter } from "next/navigation";
import type { AdminIdentityDate, AdminIdentitySort } from "@/lib/adminIdentityDirectory";

export type UserTab = "ALL" | "REGISTERED" | "GUEST";

type Props = {
  query: string;
  role: string;
  status: string;
  tab: UserTab;
  sort: AdminIdentitySort;
  date: AdminIdentityDate;
  from: string;
  to: string;
  registeredCount: number;
  guestCount: number;
  pageHref: string;
  children: ReactNode;
};

const roles = [
  { value: "ALL", label: "All roles" },
  { value: "USER", label: "User" },
  { value: "SUPPORT", label: "Support" },
  { value: "ADMIN", label: "Admin" },
] as const;

const statuses = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING_DELETION", label: "Pending deletion" },
  { value: "DELETED", label: "Deleted" },
] as const;

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
  { value: "24h", label: "Last 24 hrs (legacy)" },
] as const;

const tabs: { value: UserTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "REGISTERED", label: "Registered" },
  { value: "GUEST", label: "Guests" },
];

function urlWith(base: URLSearchParams, values: Record<string, string>) {
  const params = new URLSearchParams(base);
  params.delete("identity"); // Old bookmarks remain valid; new URLs use tab=.
  params.delete("activity");
  params.delete("page");
  if ("date" in values && values.date !== "custom") {
    params.delete("from");
    params.delete("to");
  }
  for (const [key, value] of Object.entries(values)) {
    if (key === "q" && !value) params.delete("q");
    else params.set(key, value);
  }
  return "/admin/users?" + params.toString();
}

/**
 * Search and filters are draft-only until Apply filters is clicked.
 * Identity tabs remain independent navigation over the last applied filters.
 * The server remains authoritative for scoped identity records and counts.
 */
export function AdminUsersToolbar({
  query, role, status, tab, sort, date, from, to, registeredCount, guestCount, pageHref, children,
}: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(query);
  const [draftDate, setDraftDate] = useState<AdminIdentityDate>(date);
  const [draftRole, setDraftRole] = useState(role);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftDates, setDraftDates] = useState({ from, to });
  const [dateError, setDateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));
  const initialServerSync = useRef(true);

  // Navigations (tabs, Back/Forward, Apply) restore the authoritative URL.
  // Editing the search field or a dropdown never updates paramsRef or reloads data.
  useEffect(() => {
    // Initial draft state already comes from server props. A late hydration
    // effect must not erase an administrator's first typed search before Apply.
    if (initialServerSync.current) {
      initialServerSync.current = false;
      return;
    }
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
    setSearchText(query);
    setDraftDate(date);
    setDraftRole(role);
    setDraftStatus(status);
    setDraftDates({ from, to });
    setDateError(null);
  }, [pageHref, query, date, role, status, from, to]);

  useEffect(() => {
    const onHistoryNavigation = () => {
      const params = new URLSearchParams(window.location.search);
      paramsRef.current = params;
      setSearchText(params.get("q") || "");
      setDraftDate((params.get("date") || "today") as AdminIdentityDate);
      setDraftRole(params.get("role") || "ALL");
      setDraftStatus(params.get("status") || "ALL");
      setDraftDates({ from: params.get("from") || "", to: params.get("to") || "" });
      setDateError(null);
    };
    window.addEventListener("popstate", onHistoryNavigation);
    return () => window.removeEventListener("popstate", onHistoryNavigation);
  }, []);

  const navigate = useCallback((values: Record<string, string>) => {
    const url = urlWith(paramsRef.current, values);
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    startTransition(() => router.push(url, { scroll: false }));
  }, [router]);

  const validCustom = /^\d{4}-\d{2}-\d{2}$/.test(draftDates.from)
    && /^\d{4}-\d{2}-\d{2}$/.test(draftDates.to)
    && !Number.isNaN(Date.parse(draftDates.from))
    && !Number.isNaN(Date.parse(draftDates.to))
    && draftDates.from <= draftDates.to;

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    // Enter must not submit a draft. Only clicking Apply filters navigates.
    event.preventDefault();
  }

  function applyFilters() {
    if (isPending) return;
    if (draftDate === "custom" && !validCustom) {
      setDateError("Choose a valid start and end date (UTC).");
      return;
    }
    setDateError(null);
    navigate({
      q: searchText.trim().slice(0, 120),
      date: draftDate,
      role: draftRole,
      status: draftStatus,
      ...(draftDate === "custom" ? { from: draftDates.from, to: draftDates.to } : {}),
    });
  }

  const base = new URLSearchParams(pageHref.split("?")[1] || "");
  const href = (values: Record<string, string>) => urlWith(base, values);
  const counts: Record<UserTab, number> = {
    ALL: registeredCount + guestCount,
    REGISTERED: registeredCount,
    GUEST: guestCount,
  };

  function navigateLink(event: MouseEvent<HTMLAnchorElement>, values: Record<string, string>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(values);
  }

  return <div className="min-w-0">
    <form action="/admin/users" method="get" onSubmit={onSearchSubmit} role="search"
      aria-label="Filter users"
      data-testid="users-directory-filter-row"
      className="grid w-full min-w-0 grid-cols-1 items-center gap-2 border-b border-[#D8E1EC] pb-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_128px]">
      <input type="hidden" name="sort" value={sort} readOnly />
      <input type="hidden" name="tab" value={tab} readOnly />
      {tab === "GUEST" ? <input type="hidden" name="status" value={status} readOnly /> : null}
      {draftDate === "custom" && validCustom ? <>
        <input type="hidden" name="from" value={draftDates.from} readOnly />
        <input type="hidden" name="to" value={draftDates.to} readOnly />
      </> : null}

      <div className="relative min-w-0">
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-muted" />
        <label className="sr-only" htmlFor="admin-user-search">Search users</label>
        <input id="admin-user-search" type="search" name="q" maxLength={120}
          value={searchText} onChange={event => setSearchText(event.target.value)}
          placeholder="Search by name, email, user ID, or guest ID"
          className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted outline-none transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
      </div>
      <div className="min-w-0">
        <AdminDirectorySelect name="date" label="Date range" nativeExcludeValues={["custom"]}
          value={draftDate} options={dateOptions} compact
          onValueChange={next => { setDraftDate(next as AdminIdentityDate); setDateError(null); }} />
      </div>
      <div className="min-w-0">
        <AdminDirectorySelect name="role" label="Account role" value={draftRole} options={roles}
          compact onValueChange={setDraftRole} />
      </div>
      {tab !== "GUEST" ? <div className="min-w-0">
        <AdminDirectorySelect name="status" label="Account status" value={draftStatus} options={statuses}
          compact onValueChange={setDraftStatus} />
      </div> : <div className="min-w-0" aria-label="Account status does not apply to guests">
        <div className="flex h-10 items-center rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-[13px] text-[#64748B]">
          Status not applicable
        </div>
      </div>}
      <button type="button" onClick={applyFilters} disabled={isPending}
        className="focus-ring inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-2 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
        Apply filters
      </button>
      <noscript>
        <button type="submit" className="h-10 rounded-lg border border-[#D8E1EC] px-3 text-[13px] font-medium">
          Apply filters
        </button>
      </noscript>
    </form>

    {draftDate === "custom" ? <div data-testid="users-custom-date-fields" className="flex min-w-0 flex-wrap items-end gap-3 border-b border-[#D8E1EC] py-3">
      <label className="flex min-w-0 flex-col gap-1 text-xs text-[#475569]">From (UTC)
        <AdminCalendarInput ariaLabel="Custom start date UTC" value={draftDates.from}
          max={draftDates.to || undefined} onChange={event => { setDraftDates(current => ({ ...current, from: event.target.value })); setDateError(null); }}
          className="w-[210px] max-w-full" />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs text-[#475569]">To (UTC)
        <AdminCalendarInput ariaLabel="Custom end date UTC" value={draftDates.to}
          min={draftDates.from || undefined} onChange={event => { setDraftDates(current => ({ ...current, to: event.target.value })); setDateError(null); }}
          className="w-[210px] max-w-full" />
      </label>
      <button type="button" onClick={() => { setDraftDate(date); setDraftDates({ from, to }); setDateError(null); }}
        className="h-10 px-2 text-[13px] font-medium text-[#475569] hover:underline">
        Cancel custom dates
      </button>
      {dateError ? <p role="alert" className="text-[12px] font-medium text-rose-700">{dateError}</p> : null}
    </div> : null}

    <nav aria-label="User types" className="flex min-w-0 items-center gap-5 border-b border-[#D8E1EC]">
      {tabs.map(item => <Link
        key={item.value}
        href={href({ tab: item.value })}
        aria-current={tab === item.value ? "page" : undefined}
        onClick={event => navigateLink(event, { tab: item.value })}
        className={"focus-ring inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] " +
          (tab === item.value
            ? "border-blue font-medium text-foreground"
            : "border-transparent font-normal text-muted hover:text-foreground")}
      >
        {item.label} ({counts[item.value].toLocaleString()})
      </Link>)}
    </nav>

    <div aria-busy={isPending} className="relative min-w-0">
      {isPending ? <div role="status" aria-live="polite"
        className="absolute inset-0 z-10 flex min-h-[180px] items-start justify-center bg-white/75 pt-14 text-[13px] font-medium text-foreground">
        <span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin text-blue" aria-hidden="true" />Loading users…</span>
      </div> : null}
      <div className={isPending ? "opacity-40" : undefined}>{children}</div>
    </div>
  </div>;
}
