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

function contentDirectoryHref(path: string, source: URLSearchParams, changes: Record<string, string>, reset = false) {
  const params = reset ? new URLSearchParams() : new URLSearchParams(source);
  // Keep the origin of an overview visit when filters are cleared.
  if (reset && source.get("from") === "overview") params.set("from", "overview");
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete("cursor");
  const encoded = params.toString();
  return path + (encoded ? "?" + encoded : "");
}

export function ContentDirectoryToolbar({
  path, query, status, market, markets = [], country, countries = [], faqSearchOnly = false,
  searchLabel, children,
}: {
  path: string;
  query: string;
  status: string;
  market?: string;
  markets?: readonly string[];
  country?: string;
  countries?: readonly string[];
  faqSearchOnly?: boolean;
  searchLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const paramsRef = useRef(new URLSearchParams(query));
  const editingRef = useRef(false);
  const [searchText, setSearchText] = useState(() => new URLSearchParams(query).get("q") || "");
  const [draftMarket, setDraftMarket] = useState(market || "ALL");
  const [draftCountry, setDraftCountry] = useState(country || "");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const appliedSearch = new URLSearchParams(query).get("q") || "";
  const searchTerm = searchText.trim().slice(0, 160);
  // Editing any filter is draft-only. Loading begins exclusively after Apply or a navigation tab.
  const loading = isPending;

  useEffect(() => {
    paramsRef.current = new URLSearchParams(query);
    if (!editingRef.current) setSearchText(appliedSearch);
    else if (appliedSearch === searchTerm) editingRef.current = false;
  }, [query, appliedSearch, searchTerm]);

  const [previousMarket, setPreviousMarket] = useState(market);
  if (previousMarket !== market) {
    setPreviousMarket(market);
    setDraftMarket(market || "ALL");
  }
  const [previousCountry, setPreviousCountry] = useState(country);
  if (previousCountry !== country) {
    setPreviousCountry(country);
    setDraftCountry(country || "");
  }

  useEffect(() => {
    const onPop = () => {
      editingRef.current = false;
      setSubmitted(null);
      paramsRef.current = new URLSearchParams(window.location.search);
      setSearchText(paramsRef.current.get("q") || "");
      setDraftMarket(paramsRef.current.get("market") || "ALL");
      setDraftCountry(paramsRef.current.get("country") || "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const hrefFor = useCallback((changes: Record<string, string>, reset = false) =>
    contentDirectoryHref(path, new URLSearchParams(query), changes, reset), [path, query]);

  const navigate = useCallback((changes: Record<string, string>, replace = false, reset = false) => {
    const url = contentDirectoryHref(path, paramsRef.current, changes, reset);
    paramsRef.current = new URLSearchParams(url.split("?")[1] || "");
    startTransition(() => replace ? router.replace(url, { scroll: false }) : router.push(url, { scroll: false }));
  }, [path, router]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Search text remains draft-only. Only a deliberate Apply click navigates.
  }

  function applyFilters() {
    if (isPending) return;
    editingRef.current = false;
    setSubmitted(searchTerm);
    navigate({
      q: searchTerm,
      ...(market && markets.length ? { market: draftMarket } : {}),
      ...(country !== undefined ? { country: draftCountry } : {}),
    });
  }

  function onTabClick(event: MouseEvent<HTMLAnchorElement>, next: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    editingRef.current = false;
    setSubmitted(null);
    navigate({ q: appliedSearch, status: next });
  }

  const marketOptions: Option[] = [{ value: "ALL", label: "All markets" }, ...markets.map(value => ({ value, label: getCmsMarketName(value) }))];
  const countryOptions: Option[] = [{ value: "", label: "All countries" }, ...countries.map(value => ({ value, label: value }))];

  return (
    <div className="min-w-0">
      <form role="search" method="get" action={path} onSubmit={submitSearch} autoComplete="off" className="min-w-0">
        {status ? <input type="hidden" name="status" value={status} readOnly /> : null}
        {new URLSearchParams(query).get("from") === "overview" ? <input type="hidden" name="from" value="overview" readOnly /> : null}
        <div data-testid="cms-content-filter-row" className={"grid min-w-0 grid-cols-1 items-center gap-2 border-b border-[#E5E7EB] pb-3 sm:grid-cols-2 " + (faqSearchOnly ? "lg:grid-cols-[minmax(0,1fr)_120px]" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_120px]")}>
            <div className="relative min-w-0">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-[#64748B]" />
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
                className="h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-10 pr-3 text-[13px] text-[#374151] outline-none placeholder:text-[#64748B] focus:border-[#94A3B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]"
              />
            </div>
            {market !== undefined && markets.length > 0 ? (
              <div className="min-w-0">
                <AdminDirectorySelect
                  key={"market-" + market}
                  label="Content market"
                  name="market"
                  value={draftMarket}
                  options={marketOptions}
                  compact
                  attached
                  spaciousMenu
                  align="end"
                  onValueChange={setDraftMarket}
                />
              </div>
            ) : null}
            {country !== undefined ? (
              <div className="min-w-0">
                <AdminDirectorySelect
                  key={"country-" + country}
                  label="Hotel destination country"
                  name="country"
                  value={draftCountry}
                  options={countryOptions}
                  compact
                  attached
                  spaciousMenu
                  align="end"
                  onValueChange={setDraftCountry}
                />
              </div>
            ) : null}
          <button type="button" onClick={applyFilters} disabled={isPending}
            className="inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white transition hover:bg-[#003D97] disabled:opacity-60">
            Apply filters
          </button>
        </div>
        <div data-testid="cms-content-status-row" className="flex min-w-0 items-center border-b border-[#E5E7EB] py-1">
          <nav aria-label="Content publication status" className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-1">
            {statuses.map(tab => {
              const active = status === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={hrefFor({ q: appliedSearch, status: tab.value })}
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
        </div>
        <noscript><button type="submit" className="mt-2 h-10 rounded-lg border border-[#D8E1EC] px-3 text-[13px] font-medium text-[#374151]">Apply filters</button></noscript>
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
