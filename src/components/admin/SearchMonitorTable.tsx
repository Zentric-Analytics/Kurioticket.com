"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { AdminSearchRead } from "@/services/adminOperationalReadContract";

export function SearchMonitorTable({
  initialItems,
  initialCursor,
  query,
  referenceNow,
  detailQuery,
}: {
  initialItems: AdminSearchRead[];
  initialCursor: string | null;
  query: string;
  referenceNow: string;
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
    setItems(initialItems);
    setCursor(initialCursor);
    setLoading(false);
    setLoadError(false);
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [initialItems, initialCursor, query]);

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
        const response = await fetch("/api/admin/searches?" + params.toString(), {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load more searches");
        const body = await response.json() as {
          status: string;
          data?: { items?: AdminSearchRead[]; nextCursor?: string | null };
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
      <div className="border-b border-[#D7DCE3] py-10 text-center">
        <p className="text-[14px] font-semibold text-[#111827]">No searches found</p>
        <p className="mt-1 text-[12px] text-[#6B7280]">No recorded searches match these filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#D7DCE3] text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
              <th className="px-2 py-3 font-semibold">Created</th>
              <th className="px-2 py-3 font-semibold">Product</th>
              <th className="px-2 py-3 font-semibold">Route / stay</th>
              <th className="px-2 py-3 font-semibold">Market</th>
              <th className="px-2 py-3 font-semibold">Results</th>
              <th className="px-2 py-3 font-semibold">Providers</th>
              <th className="px-2 py-3 font-semibold">Duration</th>
              <th className="px-2 py-3 font-semibold">Identity</th>
              <th className="px-2 py-3 font-semibold">Status</th>
              <th className="px-2 py-3 font-semibold"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((search) => (
              <tr key={search.id} className="border-b border-[#E5E7EB] text-[12px] text-[#374151] hover:bg-[#FAFAFA]">
                <td className="whitespace-nowrap px-2 py-3 align-top">{formatCreated(search.createdAt, referenceNow)}</td>
                <td className="px-2 py-3 align-top font-semibold text-[#111827]">{productLabel(search.product)}</td>
                <td className="max-w-[260px] px-2 py-3 align-top">
                  <p className="font-semibold text-[#111827]">{routeLabel(search.origin, search.destination)}</p>
                  {formatSearchDates(search.checkIn, search.checkOut) ? (
                    <p className="mt-0.5 text-[10px] leading-4 text-[#9CA3AF]">{formatSearchDates(search.checkIn, search.checkOut)}</p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-2 py-3 align-top">{search.currency || search.market || "—"}</td>
                <td className="px-2 py-3 align-top">{formatNumber(search.resultCount)}</td>
                <td className="px-2 py-3 align-top" title={search.providerTelemetry ? [search.providers.join(", "), search.providerTelemetry.successful + " successful", search.providerTelemetry.failed + " failed", search.providerTelemetry.degraded + " degraded", search.providerTelemetry.disabled + " disabled"].filter(Boolean).join(" · ") : "No exact provider telemetry recorded"}>{search.providerTelemetry ? search.providerTelemetry.total : "—"}</td>
                <td className="whitespace-nowrap px-2 py-3 align-top">{formatLatency(search.latencyMs)}</td>
                <td className="px-2 py-3 align-top">{identityLabel(search.identity.kind)}</td>
                <td className="px-2 py-3 align-top"><MonitorStatus status={search.status} /></td>
                <td className="whitespace-nowrap px-2 py-3 text-right align-top">
                  <Link
                    href={"/admin/searches/" + search.id + "?" + (detailQuery ? detailQuery + "&" : "") + "environment=" + encodeURIComponent(search.environment)}
                    className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                  >
                    Open
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

function formatCreated(value: string, referenceNow: string) {
  const date = new Date(value);
  const now = new Date(referenceNow);
  const sameDay =
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate();
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
  if (sameDay) return "Today, " + time;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date) + ", " + time;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatLatency(value: number | null) {
  if (value === null) return "—";
  return (value / 1000).toFixed(1) + "s";
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

function identityLabel(kind: "registered" | "guest" | "unattributed") {
  return kind === "registered" ? "Registered" : kind === "guest" ? "Guest" : "Unattributed";
}
