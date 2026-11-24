"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { AdminQueueLoadingState } from "./AdminQueueLoadingState";
import { useRouter } from "next/navigation";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { AdminQueueCustomDates, AdminQueueDateSelect } from "./AdminQueueDateControls";
import { localQueueDateTime, resolveAdminQueueWindow, validateCustomQueueWindow, type AdminQueueRange } from "@/lib/adminQueueDateRange";
import {
  supportCategoryChoices,
  supportInboxHref,
  supportPriorityOptions,
  supportStatusTabs,
} from "@/lib/adminSupportInboxNavigation";

type Props = {
  query: string;
  status: string;
  priority: string;
  category: string;
  range: AdminQueueRange;
  from: string;
  to: string;
  pageHref: string;
  children: ReactNode;
};

/** Search above a responsive tabs/filters row. Applied filters stay separate from drafts. */
export function AdminSupportToolbar({ query, status, priority, category, range, from, to, pageHref, children }: Props) {
  const router = useRouter();
  const timeZone = useAdminTimeZone();
  const [searchText, setSearchText] = useState(query);
  const [draftPriority, setDraftPriority] = useState(priority);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftRange, setDraftRange] = useState<AdminQueueRange>(range);
  const [customFrom, setCustomFrom] = useState(localQueueDateTime(from));
  const [customTo, setCustomTo] = useState(localQueueDateTime(to));
  const [dateError, setDateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Draft edits must not mark records as loading until Apply is submitted.
  const isLoadingResults = isPending;
  const textRef = useRef(query);
  const editingRef = useRef(false);
  const lastSubmittedRef = useRef<string | null>(null);
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));

  useEffect(() => {
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
    setDraftPriority(priority);
    setDraftCategory(category);
    setDraftRange(range);
    setCustomFrom(localQueueDateTime(from));
    setCustomTo(localQueueDateTime(to));
    setDateError(null);
  }, [pageHref, priority, category, range, from, to]);

  // Keep the search input synchronized on Back/Forward, as on Users.
  useEffect(() => {
    const onHistoryNavigation = () => {
      editingRef.current = false;
      lastSubmittedRef.current = null;
      paramsRef.current = new URLSearchParams(window.location.search);
      const restored = (paramsRef.current.get("q") ?? "").trim().slice(0, 160);
      textRef.current = restored;
      setSearchText(restored);
    };
    window.addEventListener("popstate", onHistoryNavigation);
    return () => window.removeEventListener("popstate", onHistoryNavigation);
  }, []);

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
    const nextQuery = query.trim().slice(0, 160);
    const url = supportInboxHref(paramsRef.current, { q: nextQuery, ...values });
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    lastSubmittedRef.current = ("q" in values || nextQuery !== query) ? nextQuery : null;
    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }, [router, query]);

  const base = new URLSearchParams(pageHref.split("?")[1] || "");
  const href = (changes: Record<string, string>) => supportInboxHref(base, changes);
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftRange === "custom") {
      const error = validateCustomQueueWindow(customFrom, customTo);
      if (error) { setDateError(error); return; }
    }
    const customWindow = draftRange === "custom" ? {
      range: draftRange,
      from: new Date(customFrom).toISOString(),
      to: new Date(customTo).toISOString(),
    } : resolveAdminQueueWindow({ range: draftRange }, new Date(), timeZone);
    setDateError(null);
    navigate({ q: searchText.trim().slice(0, 160), priority: draftPriority, category: draftCategory,
      range: draftRange, from: customWindow.from, to: customWindow.to });
  }

  function navigateLink(event: MouseEvent<HTMLAnchorElement>, values: Record<string, string>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(values);
  }

  return (
    <div className="min-w-0">
      <form
        action="/admin/support"
        method="get"
        role="search"
        aria-label="Filter support tickets"
        autoComplete="off"
        onSubmit={applyFilters}
        className="min-w-0 border-b border-[#D8E1EC] pb-3"
      >
        {["status", "limit"].map(key => base.get(key)
          ? <input key={key} type="hidden" name={key} value={base.get(key) ?? ""} readOnly />
          : null)}
        <div data-testid="support-search-row" className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_120px]">
          <div className="relative min-w-0">
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-muted" />
            <label className="sr-only" htmlFor="admin-support-search">Search support tickets</label>
            <input id="admin-support-search" type="search" name="q" autoComplete="off"
              autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={160}
              value={searchText}
              onChange={event => {
                textRef.current = event.target.value;
                editingRef.current = true;
                setSearchText(event.target.value);
              }}
              placeholder="Search by subject, name or email"
              className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted outline-none transition-colors hover:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
          </div>
          <AdminQueueDateSelect range={draftRange} onChange={value => { setDraftRange(value); setDateError(null); }} />
          <div data-testid="support-filter-controls" className="contents">
            <div className="min-w-0">
              <AdminDirectorySelect key={"priority-" + priority} name="priority" label="Ticket priority"
                value={draftPriority} options={supportPriorityOptions} compact
                onValueChange={setDraftPriority} />
            </div>
            <div className="min-w-0">
              <AdminDirectorySelect key={"category-" + category} name="category" label="Ticket category"
                value={draftCategory} options={supportCategoryChoices(draftCategory)} compact
                onValueChange={setDraftCategory} />
            </div>
            <button type="submit" disabled={isPending}
              className="focus-ring inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-2 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
              Apply filters
            </button>
          </div>
        </div>
        <AdminQueueCustomDates range={draftRange} from={customFrom} to={customTo}
          setFrom={setCustomFrom} setTo={setCustomTo} error={dateError} />
        <div data-testid="support-status-filter-row" className="mt-3 border-t border-[#E5E7EB] pt-2">
          <nav aria-label="Support ticket status" className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-1 2xl:flex-nowrap">
            {supportStatusTabs.map(item => {
              const active = status === item.value;
              return (
                <Link
                  key={item.value}
                  href={href({ status: item.value })}
                  aria-current={active ? "page" : undefined}
                  onClick={event => navigateLink(event, { status: item.value })}
                  className={"focus-ring inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] " +
                    (active
                      ? "border-blue font-medium text-foreground"
                      : "border-transparent font-normal text-muted hover:text-foreground")}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
        </div>
      </form>

      <div aria-busy={isLoadingResults} className="min-w-0">
        {isLoadingResults ? (
          <AdminQueueLoadingState label="Loading tickets…" />
        ) : children}
      </div>
    </div>
  );
}
