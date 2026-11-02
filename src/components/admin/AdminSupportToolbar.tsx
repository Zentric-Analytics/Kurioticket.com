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
  const [isPending, startTransition] = useTransition();
  const textRef = useRef(query);
  const editingRef = useRef(false);
  const lastSubmittedRef = useRef<string | null>(null);
  const paramsRef = useRef(new URLSearchParams(pageHref.split("?")[1] || ""));

  useEffect(() => {
    paramsRef.current = new URLSearchParams(pageHref.split("?")[1] || "");
  }, [pageHref]);

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
    const nextQuery = textRef.current.trim().slice(0, 160);
    const url = supportInboxHref(paramsRef.current, { q: nextQuery, ...values });
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    lastSubmittedRef.current = ("q" in values || nextQuery !== query) ? nextQuery : null;
    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }, [router, query]);

  // Match Users: search as you type, with a short debounce and no submit button.
  useEffect(() => {
    const nextQuery = searchText.trim().slice(0, 160);
    if (nextQuery === query) {
      if (lastSubmittedRef.current !== null && lastSubmittedRef.current !== nextQuery) {
        navigate({ q: nextQuery }, true);
        editingRef.current = false;
      } else {
        editingRef.current = false;
        lastSubmittedRef.current = null;
      }
      return;
    }
    if (!editingRef.current || nextQuery === lastSubmittedRef.current) return;
    const timer = window.setTimeout(() => {
      if (lastSubmittedRef.current === nextQuery || !editingRef.current) return;
      navigate({ q: nextQuery }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query, navigate]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = textRef.current.trim().slice(0, 160);
    if (nextQuery !== lastSubmittedRef.current && (nextQuery !== query || lastSubmittedRef.current !== null)) {
      navigate({ q: nextQuery }, true);
    }
  }

  const base = new URLSearchParams(pageHref.split("?")[1] || "");
  const href = (changes: Record<string, string>) => supportInboxHref(base, changes);
  const hasFilters = ["status", "priority", "category", "q", "from", "to"]
    .some(key => Boolean(base.get(key)));

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
    paramsRef.current = new URLSearchParams();
    startTransition(() => router.push("/admin/support", { scroll: false }));
  }

  return (
    <div className="min-w-0">
      <div className="pb-3">
        <form action="/admin/support" method="get" role="search" onSubmit={submitSearch} className="relative min-w-0">
          {["status", "priority", "category", "from", "to", "limit"].map(key => base.get(key)
            ? <input key={key} type="hidden" name={key} value={base.get(key) ?? ""} readOnly />
            : null)}
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-muted" />
          <label className="sr-only" htmlFor="admin-support-search">Search support tickets</label>
          <input
            id="admin-support-search"
            type="search"
            name="q"
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

      <div className="flex min-w-0 flex-col gap-x-4 gap-y-2 border-b border-border lg:flex-row lg:items-end lg:justify-between">
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
          className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-2 lg:shrink-0 lg:justify-end"
        >
          {["q", "status", "from", "to", "limit"].map(key => base.get(key)
            ? <input key={key} type="hidden" name={key} value={base.get(key) ?? ""} readOnly />
            : null)}
          <AdminDirectorySelect
            key={"priority-" + priority}
            name="priority"
            label="Ticket priority"
            value={priority}
            options={supportPriorityOptions}
            plain
            align="end"
            onValueChange={next => navigate({ priority: next })}
          />
          <AdminDirectorySelect
            key={"category-" + category}
            name="category"
            label="Ticket category"
            value={category}
            options={supportCategoryChoices(category)}
            plain
            align="end"
            onValueChange={next => navigate({ category: next })}
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
          <noscript>
            <button type="submit" className="focus-ring rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-foreground">
              Update filters
            </button>
          </noscript>
        </form>
      </div>

      <div aria-busy={isPending} className="relative min-w-0">
        {isPending ? (
          <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex min-h-[180px] items-start justify-center bg-white/75 pt-14 text-[13px] font-medium text-foreground">
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={18} className="animate-spin text-blue" aria-hidden="true" />
              Loading tickets…
            </span>
          </div>
        ) : null}
        <div className={isPending ? "opacity-40" : undefined}>{children}</div>
      </div>
    </div>
  );
}
