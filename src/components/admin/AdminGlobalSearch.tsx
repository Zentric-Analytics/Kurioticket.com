"use client";

import Link from "next/link";
import { Clock3, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getAdminNavForRole, type AdminRole } from "@/lib/adminNavigation";

type RecordResult = {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

const RECENTS_KEY = "kurioticket-admin-recent-searches-v1";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function items(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return [];
  const list = (data as { items?: unknown }).items;
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

export function AdminGlobalSearch({ role, showPreviewTesters = false }: { role: AdminRole; showPreviewTesters?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [records, setRecords] = useState<RecordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsUnavailable, setRecordsUnavailable] = useState(false);

  const pages = useMemo(() => getAdminNavForRole(role, showPreviewTesters), [role, showPreviewTesters]);
  const normalized = query.trim().toLowerCase();
  const pageMatches = normalized
    ? pages.filter((item) => (item.label + " " + item.description).toLowerCase().includes(normalized)).slice(0, 10)
    : [];

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENTS_KEY) || "[]");
      if (Array.isArray(stored)) setRecent(stored.filter((item): item is string => typeof item === "string").slice(0, 8));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRecords([]);
      setLoading(false);
      setRecordsUnavailable(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setRecordsUnavailable(false);
      try {
        const encoded = encodeURIComponent(q);
        const responses = await Promise.all([
          fetch("/api/admin/support?q=" + encoded + "&limit=8", { credentials: "include", cache: "no-store", signal: controller.signal }),
          fetch("/api/admin/account-deletions?q=" + encoded + "&limit=8", { credentials: "include", cache: "no-store", signal: controller.signal }),
          fetch("/api/admin/searches?limit=50", { credentials: "include", cache: "no-store", signal: controller.signal }),
          fetch("/api/admin/provider-handoffs?limit=50", { credentials: "include", cache: "no-store", signal: controller.signal }),
        ]);
        if (responses.some((response) => !response.ok)) throw new Error("Search source unavailable");
        const [support, deletions, searches, handoffs] = await Promise.all(responses.map((response) => response.json()));
        const needle = q.toLowerCase();
        const has = (...values: unknown[]) => values.some((value) => text(value).toLowerCase().includes(needle));
        const next: RecordResult[] = [];

        next.push({
          id: "users:" + q,
          group: "Users",
          title: "Search users and guests for “" + q + "”",
          subtitle: "Name, email, user ID or guest ID",
          href: "/admin/users?q=" + encoded,
        });

        for (const item of items(support)) {
          next.push({
            id: "support:" + text(item.id),
            group: "Support",
            title: text(item.subject) || "Support ticket",
            subtitle: [text(item.email), text(item.status)].filter(Boolean).join(" · "),
            href: "/admin/support/" + encodeURIComponent(text(item.id)),
            badge: text(item.priority),
          });
        }

        for (const item of items(deletions)) {
          next.push({
            id: "deletion:" + text(item.id),
            group: "Account deletions",
            title: text(item.email) || "Deletion request",
            subtitle: text(item.status),
            href: "/admin/account-deletions/" + encodeURIComponent(text(item.id)),
            badge: text(item.status),
          });
        }

        for (const item of items(searches)) {
          const identity = item.identity && typeof item.identity === "object" ? item.identity as Record<string, unknown> : {};
          if (!has(item.id, item.requestId, item.origin, item.destination, item.product, item.status, identity.userId, identity.visitorId)) continue;
          const environment = text(item.environment);
          next.push({
            id: "search:" + text(item.id),
            group: "Searches",
            title: text(item.origin) && text(item.destination) ? text(item.origin) + " → " + text(item.destination) : text(item.destination) || text(item.product) + " search",
            subtitle: [text(item.requestId) || text(item.id), text(item.status)].filter(Boolean).join(" · "),
            href: "/admin/searches/" + encodeURIComponent(text(item.id)) + (environment ? "?environment=" + encodeURIComponent(environment) : ""),
            badge: text(item.product),
          });
        }

        for (const item of items(handoffs)) {
          const identity = item.identity && typeof item.identity === "object" ? item.identity as Record<string, unknown> : {};
          if (!has(item.id, item.provider, item.route, item.product, identity.userId, identity.visitorId)) continue;
          const environment = text(item.environment);
          next.push({
            id: "handoff:" + text(item.id),
            group: "Provider handoffs",
            title: text(item.route) || text(item.product) + " handoff",
            subtitle: text(item.provider),
            href: "/admin/redirects/" + encodeURIComponent(text(item.id)) + (environment ? "?environment=" + encodeURIComponent(environment) : ""),
            badge: text(item.provider),
          });
        }

        setRecords(next.slice(0, 32));
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setRecords([]);
          setRecordsUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function remember(value: string) {
    const clean = value.trim();
    if (!clean) return;
    setRecent((current) => {
      const next = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    window.localStorage.removeItem(RECENTS_KEY);
  }

  const groups = Array.from(new Set(records.map((item) => item.group)));

  return (
    <div className="-mx-4 -my-5 min-h-[calc(100vh-7rem)] bg-[#F5F7FB] sm:-mx-6 lg:-mx-10">
      <div className="sticky top-[104px] z-20 border-b border-[#D8E1EC] bg-white">
        <div className="mx-auto flex min-h-20 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Search size={21} className="shrink-0 text-[#64748B]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users, tickets, searches, handoffs, pages or IDs"
            aria-label="Search Kurioticket admin"
            className="h-16 min-w-0 flex-1 bg-transparent text-[17px] font-medium text-[#021C2B] outline-none placeholder:text-[#94A3B8]"
          />
          {query ? <button type="button" onClick={() => setQuery("")} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#004BB8] hover:bg-[#F3F6FA]">Clear</button> : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {!query.trim() ? (
          <section className="rounded-2xl border border-[#D8E1EC] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-[#021C2B]">Recent searches</h1>
                <p className="mt-1 text-sm text-[#64748B]">Stored only in this browser.</p>
              </div>
              {recent.length ? <button type="button" onClick={clearRecent} className="text-sm font-semibold text-[#004BB8] hover:underline">Clear recent searches</button> : null}
            </div>
            {recent.length ? (
              <div className="mt-4 divide-y divide-[#E8EDF3]">
                {recent.map((item) => (
                  <button key={item} type="button" onClick={() => setQuery(item)} className="flex w-full items-center gap-3 py-3 text-left text-[15px] font-medium text-[#021C2B] hover:text-[#004BB8]">
                    <Clock3 size={17} className="text-[#94A3B8]" />
                    <span className="truncate">{item}</span>
                  </button>
                ))}
              </div>
            ) : <p className="mt-6 rounded-xl bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">No recent searches yet.</p>}
          </section>
        ) : (
          <div className="space-y-6">
            {pageMatches.length ? (
              <section className="overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white">
                <div className="border-b border-[#E8EDF3] px-5 py-3"><h2 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">Pages</h2></div>
                <div className="p-2">{pageMatches.map((item) => { const Icon = item.icon; return (
                  <Link key={item.href} href={item.href} onClick={() => remember(query)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#004BB8]"><Icon size={17} /></span>
                    <span className="min-w-0"><span className="block text-[15px] font-semibold text-[#021C2B]">{item.label}</span><span className="block truncate text-sm text-[#64748B]">{item.description}</span></span>
                  </Link>
                ); })}</div>
              </section>
            ) : null}

            {loading ? <div className="rounded-2xl border border-[#D8E1EC] bg-white px-5 py-8 text-sm text-[#64748B]">Searching operational records…</div> : null}

            {!loading ? groups.map((group) => (
              <section key={group} className="overflow-hidden rounded-2xl border border-[#D8E1EC] bg-white">
                <div className="border-b border-[#E8EDF3] px-5 py-3"><h2 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">{group}</h2></div>
                <div className="p-2">{records.filter((item) => item.group === group).map((item) => (
                  <Link key={item.id} href={item.href} onClick={() => remember(query)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#F5F7FB]">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F6FA] text-[#004BB8]"><Search size={16} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-[#021C2B]">{item.title}</span><span className="block truncate text-sm text-[#64748B]">{item.subtitle}</span></span>
                    {item.badge ? <span className="shrink-0 rounded-full bg-[#EEF5FF] px-2.5 py-1 text-xs font-semibold text-[#004BB8]">{item.badge}</span> : null}
                  </Link>
                ))}</div>
              </section>
            )) : null}

            {recordsUnavailable ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">Operational record search is temporarily unavailable. Page search still works.</div> : null}

            {!loading && !recordsUnavailable && !pageMatches.length && !records.length && query.trim().length >= 2 ? (
              <div className="rounded-2xl border border-[#D8E1EC] bg-white px-5 py-12 text-center">
                <p className="text-base font-semibold text-[#021C2B]">No matching admin records</p>
                <p className="mt-1 text-sm text-[#64748B]">Try an email, customer name, ticket ID, request ID, route, provider or admin page name.</p>
              </div>
            ) : null}

            {query.trim().length < 2 ? <div className="rounded-2xl border border-[#D8E1EC] bg-white px-5 py-10 text-center text-sm text-[#64748B]">Type at least 2 characters to search operational records.</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
