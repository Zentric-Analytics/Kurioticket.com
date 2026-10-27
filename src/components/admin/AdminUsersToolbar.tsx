"use client";

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
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3", label: "Last 3 months" },
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
  for (const [key, value] of Object.entries(values)) {
    if (key === "q" && !value) params.delete("q");
    else params.set(key, value);
  }
  return "/admin/users?" + params.toString();
}

/**
 * Keeps search, sort and filters independent without changing server-side
 * SQL/count/pagination semantics. Only the client navigation is optimistic:
 * the table always comes from the authorized server component.
 */
export function AdminUsersToolbar({
  query, role, status, tab, sort, date, registeredCount, guestCount, pageHref, children,
}: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(query);
  const [isPending, startTransition] = useTransition();
  const textRef = useRef(query);
  const editingRef = useRef(false);
  const lastSubmittedRef = useRef<string | null>(null);
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));

  useEffect(() => {
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
  }, [pageHref]);

  useEffect(() => {
    const onHistoryNavigation = () => {
      // Back/Forward is authoritative, even if a local draft or search is pending.
      editingRef.current = false;
      lastSubmittedRef.current = null;
      paramsRef.current = new URLSearchParams(window.location.search);
      const restoredQuery = (paramsRef.current.get("q") ?? "").trim().slice(0, 120);
      textRef.current = restoredQuery;
      setSearchText(restoredQuery);
    };
    window.addEventListener("popstate", onHistoryNavigation);
    return () => window.removeEventListener("popstate", onHistoryNavigation);
  }, []);

  // When navigating Back/Forward, reflect the URL in the input. Do not
  // overwrite an in-progress keystroke with an earlier response.
  useEffect(() => {
    if (!editingRef.current) {
      textRef.current = query;
      setSearchText(query);
      lastSubmittedRef.current = null;
    } else if (query === textRef.current.trim()) {
      editingRef.current = false;
      lastSubmittedRef.current = null;
    }
  }, [query, pageHref]);

  const navigate = useCallback((values: Record<string, string>, replace = false) => {
    const nextQuery = textRef.current.trim().slice(0, 120);
    const url = urlWith(paramsRef.current, { q: nextQuery, ...values });
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    // Only search changes participate in search debounce deduplication.
    lastSubmittedRef.current = ("q" in values || nextQuery !== query) ? nextQuery : null;
    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }, [router, query]);

  useEffect(() => {
    const nextQuery = searchText.trim().slice(0, 120);
    if (nextQuery === query) {
      if (lastSubmittedRef.current !== null && lastSubmittedRef.current !== nextQuery) {
        // A different search is in flight: explicitly restore this input.
        navigate({ q: nextQuery }, true);
        // Restoration is an explicit committed navigation, not a continuing edit.
        editingRef.current = false;
      } else {
        editingRef.current = false;
        lastSubmittedRef.current = null;
      }
      return;
    }
    if (!editingRef.current || nextQuery === lastSubmittedRef.current) return;
    // Enter and other immediate actions may have committed this value while
    // the debounce was pending. Never issue a second navigation for it.
    const timer = window.setTimeout(() => {
      if (lastSubmittedRef.current === nextQuery || !editingRef.current) return;
      navigate({ q: nextQuery }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query, navigate]);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = textRef.current.trim().slice(0, 120);
    if (nextQuery !== lastSubmittedRef.current && (nextQuery !== query || lastSubmittedRef.current !== null)) {
      navigate({ q: nextQuery }, true);
    }
  }

  const base = new URLSearchParams(pageHref.split("?")[1] || "");
  const href = (values: Record<string, string>) => urlWith(base, values);
  const counts: Record<UserTab, number> = {
    ALL: registeredCount + guestCount, REGISTERED: registeredCount, GUEST: guestCount,
  };

  function navigateLink(event: MouseEvent<HTMLAnchorElement>, values: Record<string, string>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(values);
  }

  return <div className="min-w-0">
    <div className="pb-3">
      <form action="/admin/users" method="get" onSubmit={onSearchSubmit} role="search" className="relative min-w-0">
        <input type="hidden" name="role" value={role} readOnly />
        <input type="hidden" name="status" value={status} readOnly />
        <input type="hidden" name="sort" value={sort} readOnly />
        <input type="hidden" name="date" value={date} readOnly />
        <input type="hidden" name="tab" value={tab} readOnly />
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-muted"/>
        <label className="sr-only" htmlFor="admin-user-search">Search users</label>
        <input
          id="admin-user-search"
          type="search"
          name="q"
          maxLength={120}
          value={searchText}
          onChange={event => {
            textRef.current = event.target.value;
            editingRef.current = true;
            // Retain the pending navigation to detect when an edit restores the previous query.
            setSearchText(event.target.value);
          }}
          placeholder="Search by name, email, user ID, or guest ID"
          className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted outline-none transition-colors hover:border-[#D8E1EC] focus:border-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] focus-visible:ring-0"
        />
      </form>

    </div>

    <div className="flex min-w-0 flex-col gap-x-4 gap-y-2 border-b border-border lg:flex-row lg:items-end lg:justify-between">
      <nav aria-label="User types" className="flex min-w-0 max-w-full shrink-0 items-center gap-5 overflow-x-auto">
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

      <form action="/admin/users" method="get"
        aria-label="Filter users"
        className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-2 lg:shrink-0 lg:justify-end">
        <input type="hidden" name="q" value={query} readOnly />
        <input type="hidden" name="sort" value={sort} readOnly />
        <input type="hidden" name="tab" value={tab} readOnly />
        {tab === "GUEST" ? <input type="hidden" name="status" value={status} readOnly /> : null}

        <AdminDirectorySelect key={"date-" + date} name="date" label="Date range" value={date} options={dateOptions}
          underlined align="end" onValueChange={next => navigate({ date: next })} />
        <AdminDirectorySelect key={"role-" + role} name="role" label="Account role" value={role} options={roles}
          underlined align="end" onValueChange={next => navigate({ role: next })} />
        {tab !== "GUEST" ? <AdminDirectorySelect key={"status-" + status} name="status" label="Account status"
          value={status} options={statuses} underlined align="end" onValueChange={next => navigate({ status: next })} /> : null}
        <noscript>
          <button type="submit" className="focus-ring col-span-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground">
            Update filters
          </button>
        </noscript>
      </form>
    </div>

    <div aria-busy={isPending} className="relative min-w-0">
      {isPending ? <div role="status" aria-live="polite"
        className="absolute inset-0 z-10 flex min-h-[180px] items-start justify-center bg-white/75 pt-14 text-[13px] font-medium text-foreground">
        <span className="inline-flex items-center gap-2"><LoaderCircle size={18} className="animate-spin text-blue" aria-hidden="true"/>Loading users…</span>
      </div> : null}
      <div className={isPending ? "opacity-40" : undefined}>{children}</div>
    </div>
  </div>;
}
