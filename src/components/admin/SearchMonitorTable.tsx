"use client";
import { hotelResultSummary } from "@/lib/hotels/hotelResultAccounting";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { searchActivityIdentityLabels, searchActivityPlatformLabel, searchDetailCrawlerName } from "@/lib/adminSearchDetailPresentation";
import { searchRoutePreview } from "@/lib/adminSearchRoutePreview";
import { formatViewerTimestamp } from "@/lib/adminLocalTime";
import { useEffect, useRef, useState } from "react";

import type { AdminSearchActivityRead } from "@/services/adminOperationalReadContract";

function SearchMonitorTableState({
  initialItems,
  initialCursor,
  query,
  referenceNow,
  timeZone = "UTC",
  detailQuery,
}: {
  initialItems: AdminSearchActivityRead[];
  initialCursor: string | null;
  query: string;
  referenceNow: string;
  timeZone?: string;
  detailQuery: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !cursor || loading || loadError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();

    async function loadMore() {
      const generation = generationRef.current;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      setLoading(true);
      setLoadError(false);
      try {
        const params = new URLSearchParams(query);
        params.set("limit", "100");
        params.set("cursor", cursor!);
        const response = await fetch("/api/admin/searches/activity?" + params.toString(), {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load more searches");
        const body = await response.json() as {
          status: string;
          data?: { items?: AdminSearchActivityRead[]; nextCursor?: string | null };
        };
        if (body.status !== "ok" || !body.data || !Array.isArray(body.data.items)) {
          throw new Error("Invalid search response");
        }
        if (generationRef.current !== generation || controller.signal.aborted) return;
        setItems((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...body.data!.items!.filter((item) => !seen.has(item.id))];
        });
        setCursor(body.data.nextCursor ?? null);
      } catch {
        if (controller.signal.aborted || generationRef.current !== generation) return;
        setLoadError(true);
      } finally {
        if (generationRef.current === generation && !controller.signal.aborted) {
          setLoading(false);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
    }
  }, [cursor, loading, loadError, query]);

  if (!items.length) {
    return (
      <div className="border-b border-[#E5E7EB] py-10 text-center">
        <p className="text-[14px] font-semibold text-[#111827]">No searches found</p>
        <p className="mt-1 text-[12px] text-[#6B7280]">No recorded searches match these filters.</p>
      </div>
    );
  }

  return (
    <>
      <div role="region" aria-label="Search activity table" tabIndex={0} className="admin-responsive-records admin-search-records focus-ring w-full min-w-0 max-w-full">
        <table className="w-full min-w-0 table-fixed border-collapse text-left">
          <colgroup>
            {[13, 8, 11, 11, 9, 8, 10, 9, 10, 11].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
          </colgroup>
          <caption className="sr-only">Search records matching the selected filters</caption>
          <thead>
            <tr className="border-b border-[#E5E7EB] text-[11px] uppercase tracking-[0.08em] text-[#6B7280]">
              <th scope="col" className="px-2 py-3 font-semibold">Created</th>
              <th scope="col" className="px-2 py-3 font-semibold">Product</th>
              <th scope="col" className="px-2 py-3 font-semibold">Platform</th>
              <th scope="col" className="px-2 py-3 font-semibold">Route / stay</th>
              <th scope="col" className="px-2 py-3 font-semibold">Currency</th>
              <th scope="col" className="px-2 py-3 font-semibold">Results</th>
              <th scope="col" className="px-2 py-3 font-semibold">Providers</th>
              <th scope="col" className="px-2 py-3 font-semibold">Identity</th>
              <th scope="col" className="px-2 py-3 font-semibold">Status</th>
              <th scope="col" className="px-2 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((search) => (
              <tr key={search.id} className="group relative cursor-pointer border-b border-[#E5E7EB] text-[13px] text-[#374151] hover:bg-[#FAFAFA] focus-within:bg-[#F8FAFC]">
                <td data-label="Created" className="px-2 py-3 align-top">{formatViewerTimestamp(search.createdAt, timeZone, referenceNow)}</td>
                <td data-label="Product" className="px-2 py-3 align-top font-semibold text-[#111827]">{productLabel(search.product)}</td>
                <td data-label="Platform" className="break-words px-2 py-3 align-top">
                  {searchActivityPlatformLabel(search.applicationSource)}
                  {search.appVersion ? <span className="mt-0.5 block text-[11px] text-slate-500">v{search.appVersion}</span> : null}
                </td>
                <td data-label="Route / stay" className="min-w-0 px-2 py-3 align-top">
                  <p data-search-route-preview className="overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[#111827]"
                     title={routeLabel(search.origin, search.destination)}
                     aria-label={routeLabel(search.origin, search.destination)}>
                    {searchRoutePreview(routeLabel(search.origin, search.destination))}
                  </p>
                  {formatSearchDates(search.checkIn, search.checkOut) ? (
                    <p data-search-route-dates className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-4 text-[#6B7280]"
                       title={formatSearchDates(search.checkIn, search.checkOut)}>
                      {formatSearchDates(search.checkIn, search.checkOut)}
                    </p>
                  ) : null}
                </td>
                <td data-label="Currency" className="px-2 py-3 align-top">{search.currency || "—"}</td>
                <td data-label="Results" className="px-2 py-3 align-top">{search.product === "HOTEL" ? <span className="block whitespace-normal break-words leading-4">{hotelResultSummary(search.resultCount, search.hotelPropertyCount)}</span> : formatNumber(search.resultCount)}</td>
                <td data-label="Providers" className="px-2 py-3 align-top" title={search.providerTelemetry ? [search.providers.join(", "), search.providerTelemetry.successful + " successful", search.providerTelemetry.failed + " failed", search.providerTelemetry.degraded + " degraded", search.providerTelemetry.disabled + " disabled"].filter(Boolean).join(" · ") : "No exact provider telemetry recorded"}>{search.providerTelemetry ? search.providerTelemetry.total : "—"}</td>
                <td data-label="Identity" className="px-2 py-3 align-top">
                  {searchActivityIdentityLabels[search.identity.kind]}
                  {search.identity.kind === "bot" && <span className="block break-words text-[11px] text-slate-600">{searchDetailCrawlerName(search.crawlerName)}</span>}
                </td>
                <td data-label="Status" className="px-2 py-3 align-top"><MonitorStatus status={search.status} /></td>
                <td data-label="Action" className="px-2 py-3 align-top">
                  <Link
                    href={detailHref(search, detailQuery)}
                    aria-label={`View details for ${productLabel(search.product)} search ${routeLabel(search.origin, search.destination)} at ${formatViewerTimestamp(search.createdAt, timeZone, referenceNow)}`}
                    className="inline-flex items-center gap-0.5 font-medium text-[#004BB8] underline-offset-2 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    View details <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cursor ? <div ref={sentinelRef} className="h-px" aria-hidden="true" /> : null}
      {loading ? <p className="py-3 text-center text-[11px] text-[#9CA3AF]">Loading more searches…</p> : null}
      {loadError ? (
        <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-rose-600">
          <span>Unable to load more searches.</span>
          <button
            type="button"
            onClick={() => setLoadError(false)}
            className="cursor-pointer font-semibold text-[#111827] underline underline-offset-2 hover:text-violet-700"
          >
            Retry
          </button>
        </div>
      ) : null}
    </>
  );
}

function MonitorStatus({ status }: { status: "SUCCESS" | "PARTIAL" | "FAILED" }) {
  const value = {
    SUCCESS: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
    PARTIAL: { label: "Partial", dot: "bg-amber-400", text: "text-amber-700" },
    FAILED: { label: "Failed", dot: "bg-rose-500", text: "text-rose-700" },
  }[status];

  return (
    <span className={"inline-flex items-center gap-1.5 font-semibold " + value.text}>
      <span className={"h-1.5 w-1.5 rounded-full " + value.dot} />
      {value.label}
    </span>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function productLabel(product: string) {
  return product === "FLIGHT" ? "Flight" : product === "HOTEL" ? "Hotel" : product === "CAR" ? "Car" : product === "PACKAGE" ? "Package" : product;
}

function routeLabel(origin: string | null, destination: string | null) {
  if (origin && destination) return origin + " → " + destination;
  return destination || origin || "Search request";
}

function formatSearchDates(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return "";
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  return format(checkIn) + (checkOut ? " → " + format(checkOut) : "");
}

function detailHref(search: AdminSearchActivityRead, detailQuery: string) {
  const params = new URLSearchParams(detailQuery);
  params.set("environment", search.environment);
  return "/admin/searches/" + search.id + "?" + params.toString();
}

export function SearchMonitorTable(props: Parameters<typeof SearchMonitorTableState>[0]) {
  return <SearchMonitorTableState key={JSON.stringify([props.query, props.initialItems, props.initialCursor])} {...props} />;
}
