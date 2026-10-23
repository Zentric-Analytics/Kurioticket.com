"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Search, X, Clock, Users, Activity, Server } from "lucide-react";
import type { AdminSearchResults } from "@/lib/adminSearchResults";

const categories = ["All", "Users", "Searches", "Providers"] as const;
type Category = typeof categories[number];
type SearchContextValue = {
  open: boolean; query: string; setQuery: (value: string) => void;
  show: () => void; close: () => void; recent: string[];
  remember: (value: string) => void; clearRecent: (value?: string) => void;
};
const SearchContext = createContext<SearchContextValue | null>(null);
function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("Admin search provider missing");
  return context;
}

export function AdminWorkspaceSearchProvider({ children, account }: { children: React.ReactNode; account: string }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const savedScroll = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const key = `admin-search-recent:${account}`;
  const open = openAt === pathname;
  const close = useCallback(() => {
    setOpenAt(null);
    requestAnimationFrame(() => { window.scrollTo({ top: savedScroll.current, behavior: "instant" }); (previousFocus.current?.isConnected ? previousFocus.current : document.querySelector<HTMLElement>("[data-admin-search-trigger]"))?.focus({ preventScroll: true }); });
  }, []);
  const show = useCallback(() => {
    savedScroll.current = window.scrollY;
    previousFocus.current = document.activeElement as HTMLElement;
    setQuery("");
    try { const value: unknown = JSON.parse(sessionStorage.getItem(key) || "[]"); setRecent(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 5) : []); } catch { setRecent([]); }
    setOpenAt(pathname);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [key, pathname]);
  function saveRecent(next: string[]) { setRecent(next); try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* Search still works when storage is blocked. */ } }
  function remember(value: string) { const q = value.trim(); if (q) saveRecent([q, ...recent.filter((item) => item !== q)].slice(0, 5)); }
  function clearRecent(value?: string) { saveRecent(value ? recent.filter((item) => item !== value) : []); }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (open) close(); else show(); }
      if (event.key === "Escape" && open) { event.preventDefault(); close(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, show]);
  return <SearchContext.Provider value={{ open, query, setQuery, show, close, recent, remember, clearRecent }}>{children}</SearchContext.Provider>;
}

export function AdminSearchTrigger() {
  const { show } = useSearch();
  return <button data-admin-search-trigger type="button" onClick={show} aria-keyshortcuts="Control+k Meta+k" className="focus-ring flex h-8 items-center gap-2 text-sm text-[#6b6b6b] hover:text-[#004bb8]"><Search size={15} /><span>Search</span><kbd className="hidden border border-zinc-200 px-1 text-[10px] sm:inline">Ctrl K</kbd></button>;
}

export function AdminSearchHeader({ children }: { children: React.ReactNode }) {
  const { open, query, setQuery, close, remember } = useSearch();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  return <>{open ? <form role="search" onSubmit={(event) => { event.preventDefault(); remember(query); }} className="flex min-h-14 items-center gap-3 px-4 sm:px-5 lg:px-8"><Search size={16} className="shrink-0 text-[#8a05ff]" /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search users, searches, providers" placeholder="Search users, searches, providers..." maxLength={120} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[#141414] outline-none" /><button type="button" onClick={close} className="focus-ring flex shrink-0 items-center gap-2 border-l border-zinc-200 pl-3 text-xs text-[#6b6b6b]"><X size={14} /><span className="hidden sm:inline">Close search</span><kbd>Esc</kbd></button></form> : children}</>;
}

export function AdminSearchContent({ children }: { children: React.ReactNode }) {
  const { open } = useSearch();
  return <><div hidden={open}>{children}</div>{open ? <SearchResults /> : null}</>;
}

function SearchResults() {
  const { query, setQuery, recent, clearRecent, remember, close } = useSearch();
  const q = query.trim();
  const [category, setCategory] = useState<Category>("All");
  const [response, setResponse] = useState<{ query: string; data?: AdminSearchResults; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" });
        if (!result.ok) throw new Error(result.status === 403 ? "Your admin session has expired. Sign in again to search." : "Search is temporarily unavailable. Try again.");
        const data: AdminSearchResults = await result.json();
        if (!controller.signal.aborted) setResponse({ query: q, data });
      } catch (error) { if (!controller.signal.aborted) setResponse({ query: q, error: error instanceof Error ? error.message : "Search unavailable." }); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, retry]);
  if (!q) return <section aria-label="Recent searches"><div className="flex items-center justify-between border-b border-zinc-200 pb-3"><h2 className="text-base font-semibold">Recent searches</h2>{recent.length ? <button onClick={() => clearRecent()} className="focus-ring text-xs text-[#6b6b6b]">Clear recent</button> : null}</div>{recent.length ? recent.map((term) => <div key={term} className="flex items-center gap-3 border-b border-zinc-100 py-3"><Clock size={15} className="text-[#6b6b6b]" /><button onClick={() => setQuery(term)} className="focus-ring min-w-0 break-words text-left text-sm">{term}</button><button onClick={() => clearRecent(term)} aria-label={`Remove recent search ${term}`} className="focus-ring p-1 text-[#6b6b6b]"><X size={14} /></button></div>) : <p className="py-5 text-sm text-[#6b6b6b]">Search by name, email, route, product, provider or status. Your recent searches will appear here.</p>}</section>;
  const data = response?.query === q ? response.data : undefined;
  const error = response?.query === q ? response.error : undefined;
  const groups = [{ name: "Users", key: "users", icon: Users }, { name: "Searches", key: "searches", icon: Activity }, { name: "Providers", key: "providers", icon: Server }] as const;
  const shown = groups.filter((group) => category === "All" || category === group.name);
  const count = data ? shown.reduce((total, group) => total + data[group.key].length, 0) : 0;
  return <section aria-label="Admin search results">
    <div aria-label="Search categories" className="mb-6 flex flex-wrap border-b border-zinc-200">{categories.map((name) => <button key={name} onClick={() => setCategory(name)} aria-pressed={category === name} className={`focus-ring border-b-2 px-4 py-2 text-sm ${category === name ? "border-[#8a05ff] text-[#8a05ff]" : "border-transparent text-[#6b6b6b]"}`}>{name}</button>)}</div>
    <p role="status" className="sr-only">{error || (!data ? "Searching" : `${count} results`)}</p>
    {!data && !error ? <p className="text-sm text-[#6b6b6b]">Searching…</p> : null}
    {error ? <div className="text-sm text-[#6b6b6b]">{error}<button className="focus-ring ml-3 text-[#8a05ff]" onClick={() => { setResponse(null); setRetry((value) => value + 1); }}>Retry</button></div> : null}
    {data?.databaseUnavailable ? <p className="mb-4 text-sm text-amber-800">User and search-log results are temporarily unavailable. Provider results are shown below.</p> : null}
    {data && count === 0 ? <p className="text-sm text-[#6b6b6b]">No matches for “{q}”{category !== "All" ? ` in ${category.toLowerCase()}` : ""}.</p> : null}
    {data ? shown.map(({ name, key, icon: Icon }) => data[key].length ? <section key={key} className="mb-6"><h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6b6b6b]">{name} · {data[key].length}</h2><ul>{data[key].map((item) => <li key={item.id}><Link href={item.href} onClick={() => { remember(q); close(); }} className="focus-ring flex items-center gap-3 border-b border-zinc-200 py-3 text-sm hover:bg-[#f6f0ff]"><Icon size={16} className="shrink-0 text-[#6b6b6b]" /><span className="min-w-0 flex-1 break-words font-medium text-[#141414]">{item.title}</span><span className="hidden max-w-[35%] truncate text-xs text-[#6b6b6b] md:block">{item.detail}</span><span className="shrink-0 text-xs text-[#6b6b6b]">{item.status}</span></Link></li>)}</ul></section> : null) : null}
  </section>;
}
