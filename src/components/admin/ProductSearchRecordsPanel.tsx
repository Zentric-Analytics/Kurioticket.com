"use client";

import * as React from "react";
import { Fragment, useCallback, useEffect, useId, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import type {
  ProductSearchDetails,
  ProductSearchFilter,
  ProductSearchPage,
  ProductSearchRecord,
  ProductSearchResult,
  ProductSearchWindow,
  ProviderProduct,
} from "@/services/adminProductSearchRecordsCore";

const buttonClass = "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#004BB8] transition-colors hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50";
const productFilterOptions = [
  { value: "ALL", label: "All searches" },
  { value: "EXCEPTIONS", label: "Exceptions" },
  { value: "SUCCESS", label: "Successful" },
  { value: "PARTIAL", label: "Partial" },
  { value: "FAILED", label: "Failed" },
  { value: "ZERO_RESULTS", label: "Zero results" },
] as const;
const windowOptions = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
] as const;

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }).format(date) + " UTC";
}
function dateOnly(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "Date unavailable";
}
function statusLabel(value: ProductSearchRecord["outcome"]) {
  return value === "ZERO_RESULTS" ? "Zero results" : value === "PARTIAL" ? "Partial" : value === "FAILED" ? "Failed" : "Successful";
}
function statusDot(value: ProductSearchRecord["outcome"]) {
  return value === "FAILED" ? "bg-rose-500" : value === "PARTIAL" || value === "ZERO_RESULTS" ? "bg-amber-500" : "bg-emerald-500";
}
function readError(result: ProductSearchResult<unknown> | null) {
  return result?.status === "forbidden" ? "Access to these records is not permitted."
    : result?.status === "invalid" ? "The selected filter or page is invalid. Reset the filters and try again."
    : result?.status === "not_found" ? "This record is no longer available in the current environment."
    : "Search records are temporarily unavailable. No records have been invented.";
}
function validStatus(value: unknown): value is ProductSearchResult<never>["status"] {
  return value === "ok" || value === "invalid" || value === "forbidden" || value === "not_found" || value === "unavailable";
}

/** A same-page shortcut, not a link to the Search Activity or Users department. */
export function ProductSearchJumpLink({ product }: { product: ProviderProduct }) {
  const label = product === "HOTEL" ? "View hotel searches" : "View car searches";
  const anchor = product === "HOTEL" ? "#hotel-search-records" : "#car-search-records";
  return (
    <a href={anchor}
      className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
      onClick={() => window.dispatchEvent(new CustomEvent("admin-product-search-show-all", { detail: product }))}>
      {label}
    </a>
  );
}

/** All product records, filters, pagination and diagnostics stay inside Providers.
 * Only the server-protected minimal record endpoints are used. */
export function ProductSearchRecordsPanel({ product }: { product: ProviderProduct }) {
  const disclosureId = useId();
  const sectionId = product === "HOTEL" ? "hotel-search-records" : "car-search-records";
  const [filter, setFilter] = useState<ProductSearchFilter>("EXCEPTIONS");
  const [windowValue, setWindowValue] = useState<ProductSearchWindow>("24h");
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ProductSearchResult<ProductSearchPage> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductSearchResult<ProductSearchDetails> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const cursor = cursors[pageIndex] ?? null;

  const resetPage = useCallback(() => {
    setSelectedId(null);
    setPageIndex(0);
    setCursors([null]);
    setResult(null);
    setLoading(true);
  }, []);
  useEffect(() => {
    const openAll = (event: Event) => {
      if ((event as CustomEvent<ProviderProduct>).detail !== product) return;
      setFilter("ALL");
      resetPage();
      setReload(value => value + 1);
    };
    window.addEventListener("admin-product-search-show-all", openAll);
    if (window.location.hash === "#" + sectionId) openAll(new CustomEvent("admin-product-search-show-all", { detail: product }));
    return () => window.removeEventListener("admin-product-search-show-all", openAll);
  }, [product, sectionId, resetPage]);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    const params = new URLSearchParams({ product, filter, window: windowValue });
    if (cursor) params.set("cursor", cursor);
    void (async () => {
      try {
        const response = await fetch("/api/admin/providers/search-records?" + params.toString(), {
          method: "GET", cache: "no-store", credentials: "include", signal: controller.signal,
        });
        const data = await response.json() as ProductSearchResult<ProductSearchPage>;
        if (!data || !validStatus(data.status)) throw new Error("Invalid search response");
        if (current) setResult(data);
      } catch {
        if (current && !controller.signal.aborted) setResult({ status: "unavailable" });
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; controller.abort(); };
  }, [product, filter, windowValue, cursor, reload]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setDetailLoading(true);
    setDetail(null);
    void (async () => {
      try {
        const params = new URLSearchParams({ product });
        const response = await fetch(
          "/api/admin/providers/search-records/" + encodeURIComponent(selectedId) + "?" + params.toString(),
          { method: "GET", cache: "no-store", credentials: "include", signal: controller.signal },
        );
        const data = await response.json() as ProductSearchResult<ProductSearchDetails>;
        if (!data || !validStatus(data.status)) throw new Error("Invalid record details");
        if (current) setDetail(data);
      } catch {
        if (current && !controller.signal.aborted) setDetail({ status: "unavailable" });
      } finally {
        if (current) setDetailLoading(false);
      }
    })();
    return () => { current = false; controller.abort(); };
  }, [product, selectedId]);

  const page = result?.status === "ok" ? result.data : null;
  const rows = page?.items ?? [];
  const showError = !loading && result && result.status !== "ok";
  const nextCursor = page?.nextCursor ?? null;
  const heading = "Search exceptions and records";

  return (
    <section id={sectionId} aria-label={product === "HOTEL" ? "Hotel search records" : "Car search records"} className="min-w-0 scroll-mt-28 border-t border-[#D8E1EC] bg-white py-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-[#020617]">{heading}</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
            Product-specific searches, including failures and valid zero-result searches. The summary metrics above use a 24-hour window.
          </p>
        </div>
        <button type="button" disabled={loading} className={buttonClass}
          onClick={() => { setSelectedId(null); setReload(n => n + 1); }}>
          <RefreshCw size={14} aria-hidden="true" className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing…" : "Refresh records"}
        </button>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-end gap-3 border-y border-[#E7ECF5] py-3" role="group" aria-label="Search records filters">
        <div className="w-[180px] max-w-full">
          <SearchMonitorSelect label="Outcome" name="outcome" appearance="fare" value={filter}
            options={productFilterOptions} onValueChange={value => {
              setFilter(value as ProductSearchFilter); resetPage();
            }} />
        </div>
        <div className="w-[172px] max-w-full">
          <SearchMonitorSelect label="Date range" name="period" appearance="fare" value={windowValue}
            options={windowOptions} onValueChange={value => {
              setWindowValue(value as ProductSearchWindow); resetPage();
            }} />
        </div>
        <p className="pb-2 text-[11px] leading-4 text-[#64748B]">Showing recorded {product === "HOTEL" ? "hotel" : "car"} searches in this deployment only</p>
      </div>

      <div role="region" aria-label="Product search records table" aria-busy={loading} tabIndex={0}
        className="mt-3 w-full min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        <table className="w-full min-w-[900px] border-collapse text-left text-[12px] leading-5">
          <thead>
            <tr className="border-b border-[#D8E1EC] text-[11px] font-medium uppercase tracking-wide text-[#64748B]">
              {(product === "HOTEL"
                ? ["Observed", "Destination", "Stay", "Outcome", "Results", "Latency", "Action"]
                : ["Observed", "Pick-up", "Drop-off", "Outcome", "Results", "Latency", "Action"]
              ).map(text => <th key={text} scope="col" className="px-3 py-3 font-medium first:pl-0">{text}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECF5]">
            {rows.map(record => {
              const expanded = selectedId === record.id;
              return <Fragment key={record.id}>
                <tr className="align-top hover:bg-[#FAFBFD]">
                  <td className="whitespace-nowrap px-3 py-3 first:pl-0">{dateLabel(record.createdAt)}</td>
                  <td className="max-w-[240px] px-3 py-3">
                    <p className="break-words font-medium text-[#020617]">{product === "HOTEL" ? record.destination || "—" : record.origin || "—"}</p>
                    {record.requestId ? <p className="mt-0.5 break-all text-[11px] text-[#64748B]">{record.requestId}</p> : null}
                  </td>
                  <td className="max-w-[220px] break-words px-3 py-3">
                    {product === "HOTEL" ? (dateOnly(record.checkIn) + " → " + dateOnly(record.checkOut)) : record.destination || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#475569]">
                      <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + statusDot(record.outcome)} />
                      {statusLabel(record.outcome)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{record.resultCount}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{record.latencyMs === null ? "—" : record.latencyMs + " ms"}</td>
                  <td className="px-3 py-3">
                    <button type="button" aria-expanded={expanded} aria-controls={disclosureId + "-" + record.id}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-semibold text-[#004BB8] hover:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                      onClick={() => setSelectedId(current => current === record.id ? null : record.id)}>
                      {expanded ? "Close" : "Details"}
                      <ChevronDown size={13} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
                    </button>
                  </td>
                </tr>
                {expanded ? <tr className="bg-[#F7F9FC]"><td colSpan={7} className="p-3 sm:p-5">
                  <div id={disclosureId + "-" + record.id}
                    role="region" aria-label="Selected product search details" aria-busy={detailLoading}
                    className="rounded-xl border border-[#DBE3EE] bg-white p-4 sm:p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F172A]">Search details</h3>
                    {detailLoading || !detail ? (
                      <p role="status" className="mt-3 text-[12px] text-[#64748B]">Loading verified details…</p>
                    ) : detail.status !== "ok" ? (
                      <p role="alert" className="mt-3 text-[12px] text-[#9A3412]">{readError(detail)}</p>
                    ) : (
                      <>
                        <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                          <Field label="Search ID" value={detail.data.search.id} />
                          <Field label="Request ID" value={detail.data.search.requestId} />
                          <Field label="Recorded" value={dateLabel(detail.data.search.createdAt)} />
                          <Field label={product === "HOTEL" ? "Destination" : "Pick-up"} value={product === "HOTEL" ? detail.data.search.destination : detail.data.search.origin} />
                          <Field label={product === "HOTEL" ? "Stay dates" : "Drop-off"} value={product === "HOTEL" ? dateOnly(detail.data.search.checkIn) + " → " + dateOnly(detail.data.search.checkOut) : detail.data.search.destination} />
                          <Field label="Outcome" value={statusLabel(detail.data.search.outcome)} />
                          <Field label="Results" value={String(detail.data.search.resultCount)} />
                          <Field label="Latency" value={detail.data.search.latencyMs === null ? "Unavailable" : detail.data.search.latencyMs + " ms"} />
                          <Field label="Provider correlation" value={detail.data.providerEvidence === "exact" ? "Exact request-linked observations" : "No verified provider observations"} />
                        </dl>
                        <div className="mt-4 border-t border-[#E7ECF5] pt-3">
                          <h4 className="text-[12px] font-semibold text-[#0F172A]">Provider observations</h4>
                          {detail.data.providers.length ? (
                            <ul className="mt-2 divide-y divide-[#E7ECF5]">
                              {detail.data.providers.map(provider => (
                                <li key={provider.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-2 text-[12px]">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-[#0F172A]">{provider.provider} · {provider.status}</p>
                                    {provider.category ? <p className="text-[#64748B]">{provider.category}</p> : null}
                                  </div>
                                  <span className="text-[#64748B]">{dateLabel(provider.observedAt)} · {provider.latencyMs === null ? "Latency unavailable" : provider.latencyMs + " ms"}</span>
                                </li>
                              ))}
                            </ul>
                          ) : <p className="mt-2 text-[12px] text-[#64748B]">No exact provider observations are available for this search.</p>}
                        </div>
                      </>
                    )}
                  </div>
                </td></tr> : null}
              </Fragment>;
            })}
          </tbody>
        </table>
      </div>

      {loading && !page ? <p className="py-5 text-[12px] text-[#64748B]" role="status">Loading product-specific search records…</p> : null}
      {showError ? <p className="py-5 text-[12px] text-[#9A3412]" role="alert">{readError(result)}</p> : null}
      {!loading && page && rows.length === 0 ? <p className="py-5 text-[12px] text-[#64748B]" role="status">No recorded searches match this product, outcome and date range.</p> : null}
      {loading && page ? <p className="mt-2 text-[11px] text-[#64748B]" role="status">Refreshing records; current results remain visible.</p> : null}
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-end gap-3">
        <span className="text-[12px] text-[#64748B]">Page {pageIndex + 1} · Up to 25 records per page</span>
        <button type="button" className={buttonClass} disabled={loading || pageIndex === 0}
          onClick={() => {
            setSelectedId(null); setResult(null); setLoading(true);
            setPageIndex(index => Math.max(index - 1, 0));
          }}>Previous</button>
        <button type="button" className={buttonClass} disabled={loading || !nextCursor}
          onClick={() => {
            if (!nextCursor) return;
            setSelectedId(null); setResult(null); setLoading(true);
            setCursors(current => [...current.slice(0, pageIndex + 1), nextCursor]);
            setPageIndex(index => index + 1);
          }}>Next</button>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return <div className="min-w-0">
    <dt className="text-[11px] font-medium text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-all text-[12px] font-medium leading-5 text-[#334155]">{value || "—"}</dd>
  </div>;
}
