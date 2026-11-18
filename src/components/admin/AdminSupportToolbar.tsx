"use client";

import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
  pageHref: string;
  children: ReactNode;
};

/**
 * Same measured hierarchy and controls as AdminUsersToolbar:
 * full-width 44px search above 44px tabs and plain 40px dropdown triggers.
 * Support keeps its own statuses, categories and ticket-specific table.
 */
export function AdminSupportToolbar({ query, status, priority, category, pageHref, children }: Props) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(query);
  const [draftPriority, setDraftPriority] = useState(priority);
  const [draftCategory, setDraftCategory] = useState(category);
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
  }, [pageHref, priority, category]);

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

  // The Search field and both dropdowns stay drafts until Apply filters.
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Pressing Enter in the search box does not submit multiple independent filters.
  }

  const base = new URLSearchParams(pageHref.split("?")[1] || "");
  const href = (changes: Record<string, string>) => supportInboxHref(base, changes);
  const hasFilters = ["status", "priority", "category", "q", "from", "to"]
    .some(key => Boolean(base.get(key)));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchText.trim().slice(0, 160), priority: draftPriority, category: draftCategory });
  }

  function navigateLink(event: MouseEvent<HTMLAnchorElement>, values: Record<string, string>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(values);
  }

  function clearFilters(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    editingRef.current = false;
    lastSubmittedRef.current = null;
    textRef.current = "";
    setSearchText("");
    setDraftPriority("");
    setDraftCategory("");
    paramsRef.current = new URLSearchParams();
    startTransition(() => router.push("/admin/support", { scroll: false }));
  }

  return (
    <div className="min-w-0">
      <div className="pb-3">
        <form action="/admin/support" method="get" role="search" autoComplete="off" onSubmit={submitSearch} className="relative min-w-0">
          {["status", "priority", "category", "from", "to", "limit"].map(key => base.get(key)
            ? <input key={key} type="hidden" name={key} value={base.get(key) ?? ""} readOnly />
            : null)}
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-muted" />
          <label className="sr-only" htmlFor="admin-support-search">Search support tickets</label>
          <input
            id="admin-support-search"
            type="search"
            name="q"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={160}
            value={searchText}
            onChange={event => {
              textRef.current = event.target.value;
              editingRef.current = true;
              setSearchText(event.target.value);
            }}
            placeholder="Search by subject, name or email"
            className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-foreground placeholder:text-muted outline-none transition-colors hover:border-[#D8E1EC] focus:border-[#94A3B8] focus:outline-none focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] focus-visible:ring-0"
          />
        </form>
      </div>

      <div className="flex min-w-0 flex-col gap-x-4 gap-y-2 border-b border-border 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <nav aria-label="Support ticket status" className="flex min-w-0 max-w-full shrink-0 items-center gap-5 overflow-x-auto">
          {supportStatusTabs.map(item => {
            const active = status === item.value;
            return (
              <Link
                key={item.value}
                href={href({ status: item.value })}
                aria-current={active ? "page" : undefined}
                onClick={event => navigateLink(event, { status: item.value })}
                className={"focus-ring inline-flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] " +
                  (active
                    ? "border-blue font-medium text-foreground"
                    : "border-transparent font-normal text-muted hover:text-foreground")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          action="/admin/support"
          method="get"
          aria-label="Filter support tickets"
          onSubmit={applyFilters}
          className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,160px)_minmax(0,160px)_auto] sm:justify-end 2xl:shrink-0"
        >
          {["q", "status", "from", "to", "limit"].map(key => base.get(key)
            ? <input key={key} type="hidden" name={key} value={base.get(key) ?? ""} readOnly />
            : null)}
          <AdminDirectorySelect
            key={"priority-" + priority}
            name="priority"
            label="Ticket priority"
            value={draftPriority}
            options={supportPriorityOptions}
            plain
            align="end"
            onValueChange={setDraftPriority}
          />
          <AdminDirectorySelect
            key={"category-" + category}
            name="category"
            label="Ticket category"
            value={draftCategory}
            options={supportCategoryChoices(draftCategory)}
            plain
            align="end"
            onValueChange={setDraftCategory}
          />
          {hasFilters ? (
            <Link
              href="/admin/support"
              onClick={clearFilters}
              className="focus-ring inline-flex h-10 items-center whitespace-nowrap text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]"
            >
              Clear filters
            </Link>
          ) : null}
          <button type="submit" disabled={isPending} className="focus-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
            Apply filters
          </button>
        </form>
      </div>

      <div aria-busy={isLoadingResults} className="min-w-0">
        {isLoadingResults ? (
          <div role="status" aria-live="polite" className="flex min-h-[240px] items-center justify-center bg-white text-[13px] font-medium text-foreground">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={18} className="animate-spin text-blue" aria-hidden="true" />
              Loading tickets…
            </span>
          </div>
        ) : children}
      </div>
    </div>
  );
}
