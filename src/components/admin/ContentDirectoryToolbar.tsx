"use client";

import Link from "next/link";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type MouseEvent, type ReactNode } from "react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { getCmsMarketName } from "@/lib/adminCmsMarketLabels";

const statuses = [
  { label: "All", value: "" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Draft", value: "DRAFT" },
  { label: "Hidden", value: "HIDDEN" },
  { label: "Archived", value: "ARCHIVED" },
] as const;

type Option = { label: string; value: string };

export function ContentDirectoryToolbar({
  path, query, status, market, markets = [], category, categories = [],
  searchLabel, children,
}: {
  path: string;
  query: string;
  status: string;
  market?: string;
  markets?: readonly string[];
  category?: string;
  categories?: string[];
  searchLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const paramsRef = useRef(new URLSearchParams(query));
  const editingRef = useRef(false);
  const [searchText, setSearchText] = useState(() => paramsRef.current.get("q") || "");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const appliedSearch = new URLSearchParams(query).get("q") || "";
  const searchTerm = searchText.trim().slice(0, 160);
  const loading = isPending || searchTerm !== appliedSearch;

  useEffect(() => {
    paramsRef.current = new URLSearchParams(query);
    if (!editingRef.current) setSearchText(appliedSearch);
    else if (appliedSearch === searchTerm) editingRef.current = false;
  }, [query, appliedSearch, searchTerm]);

  useEffect(() => {
    const onPop = () => {
      editingRef.current = false;
      setSubmitted(null);
      paramsRef.current = new URLSearchParams(window.location.search);
      setSearchText(paramsRef.current.get("q") || "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const hrefFor = useCallback((changes: Record<string, string>, reset = false) => {
    const params = reset ? new URLSearchParams() : new URLSearchParams(paramsRef.current);
    // Keep the origin of an overview visit when filters are cleared.
    if (reset && paramsRef.current.get("from") === "overview") params.set("from", "overview");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("cursor");
    const encoded = params.toString();
    return path + (encoded ? "?" + encoded : "");
  }, [path]);

  const navigate = useCallback((changes: Record<string, string>, replace = false, reset = false) => {
    const url = hrefFor(changes, reset);
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    startTransition(() => replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false }));
  }, [hrefFor, router]);

  useEffect(() => {
    if (!editingRef.current || searchTerm === appliedSearch || submitted === searchTerm) return;
    const timer = window.setTimeout(() => {
      setSubmitted(searchTerm);
      navigate({ q: searchTerm }, true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, appliedSearch, submitted, navigate]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTerm !== appliedSearch) {
      setSubmitted(searchTerm);
      navigate({ q: searchTerm }, true);
    }
  }

  function onTabClick(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    editingRef.current = false;
    setSubmitted(null);
    navigate({ q: searchTerm, status: next });
  }

  function clearFilters(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    editingRef.current = false;
    setSubmitted(null);
    setSearchText("");
    navigate({}, false, true);
  }

  const hasFilters = Boolean(searchTerm || status || category || (market && markets.length > 0 && market !== "ALL"));
  const marketOptions: Option[] = [{ value: "ALL", label: "All markets" }, ...markets.map(value => ({ value, label: getCmsMarketName(value) }))];
  const categoryOptions: Option[] = [{ value: "", label: "All categories" }, ...categories.map(value => ({ value, label: value }))];

  return (
    <div className="min-w-0">
      <form role="search" method="get" action={path} onSubmit={submitSearch} autoComplete="off" className="min-w-0">
        {status ? <input type="hidden" name="status" value={status} readOnly /> : null}
        {paramsRef.current.get("from") === "overview" ? <input type="hidden" name="from" value="overview" readOnly /> : null}
        <div className="relative mb-3">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 text-[#64748B]" />
          <label className="sr-only" htmlFor="cms-directory-search">{searchLabel}</label>
          <input
          id="cms-directory-search"
          type="search"
          name="q"
          value={searchText}
          maxLength={160}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={event => {
            editingRef.current = true;
            setSubmitted(null);
            setSearchText(event.target.value);
          }}
          placeholder={searchLabel}
          className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#374151] outline-none placeholder:text-[#64748B] focus:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2 border-b border-[#E5E7EB] lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Content publication status" className="flex min-w-0 items-center gap-5 overflow-x-auto">
          {statuses.map(tab => {
            const active = status === tab.value;
            return (
              <Link
                key={tab.value}
                href={hrefFor({ q: searchTerm, status: tab.value })}
                aria-current={active ? "page" : undefined}
                onClick={event => onTabClick(event, tab.value)}
                className={"focus-ring inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-[13px] " +
                  (active ? "border-[#004BB8] font-medium text-[#111827]" : "border-transparent text-[#64748B] hover:text-[#111827]")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 pb-1 lg:justify-end">
          {market && markets.length > 0 ? (
            <AdminDirectorySelect
              key={"market-" + market}
              label="Content market"
              name="market"
              value={market}
              options={marketOptions}
              plain
              spaciousMenu
              align="end"
              onValueChange={next => navigate({ q: searchTerm, market: next })}
            />
          ) : null}
          {category !== undefined ? (
            <AdminDirectorySelect
              key={"category-" + category}
              label="FAQ category"
              name="category"
              value={category}
              options={categoryOptions}
              plain
              spaciousMenu
              align="end"
              onValueChange={next => navigate({ q: searchTerm, category: next })}
            />
          ) : null}
          {hasFilters ? (
            <Link href={hrefFor({}, true)} onClick={clearFilters} className="inline-flex h-10 items-center text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]">
              Clear filters
            </Link>
          ) : null}
        </div>
      </div>
        <noscript>
          <button type="submit" className="mt-2 rounded-lg border border-[#D8E1EC] px-3 py-2 text-[13px] font-medium text-[#374151]">Update filters</button>
        </noscript>
      </form>

      <div aria-busy={loading} className="min-w-0">
        {loading ? (
          <div role="status" aria-live="polite" className="flex min-h-[180px] items-center justify-center text-[13px] font-medium text-[#475569]">
            <LoaderCircle size={18} aria-hidden="true" className="mr-2 animate-spin text-[#004BB8]" />
            Loading content…
          </div>
        ) : children}
      </div>
    </div>
  );
}
