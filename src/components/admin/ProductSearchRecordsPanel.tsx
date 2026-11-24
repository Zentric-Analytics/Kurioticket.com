"use client";

import * as React from "react";
import { adminDisplayDateTime } from "@/lib/adminTimeZone";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";
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
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
] as const;

function dateLabel(value: string | null, timeZone: string) {
  return value ? adminDisplayDateTime(value, timeZone) : "—";
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

/** All product records, filters, pagination and diagnostics stay inside Providers.
 * Only the server-protected minimal record endpoints are used. */
export function ProductSearchRecordsPanel({ product }: { product: ProviderProduct }) {
  const timeZone = useAdminTimeZone();
  const disclosureId = useId();
  const sectionId = product === "HOTEL" ? "hotel-search-records" : "car-search-records";
  const [filter, setFilter] = useState<ProductSearchFilter>("EXCEPTIONS");
  const [windowValue, setWindowValue] = useState<ProductSearchWindow>("today");
  // Draft selectors must never trigger a records request until Apply filters.
  const [draftFilter, setDraftFilter] = useState<ProductSearchFilter>("EXCEPTIONS");
  const [draftWindow, setDraftWindow] = useState<ProductSearchWindow>("24h");
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
    // Preserve existing bookmarked URLs without reintroducing a redundant header action.
    if (window.location.hash === "#" + sectionId) {
      setFilter("ALL");
      setDraftFilter("ALL");
      resetPage();
    }
  }, [sectionId, resetPage]);

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

  const applyFilters = () => {
    setFilter(draftFilter);
    setWindowValue(draftWindow);
    resetPage();
    // Reapply the same filters from page one without leaving a perpetual spinner.
    if (draftFilter === filter && draftWindow === windowValue && pageIndex === 0) setReload(value => value + 1);
  };

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
            Product-specific searches, including failures and valid zero-result searches. The summary metrics above use today (UTC).
          </p>
        </div>
        <button type="button" disabled={loading} className={buttonClass}
          onClick={() => { setSelectedId(null); setReload(n => n + 1); }}>
          <RefreshCw size={14} aria-hidden="true" className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing…" : "Refresh records"}
        </button>
      </div>
      <div className="mt-4 grid min-w-0 grid-cols-1 items-center gap-x-3 gap-y-2 border-y border-[#E7ECF5] py-3 sm:grid-cols-[minmax(0,180px)_minmax(0,180px)_auto] sm:justify-start" role="group" aria-label="Search records filters">
        <div className="min-w-0">
          <SearchMonitorSelect label="Outcome" name="outcome" appearance="fare" value={draftFilter}
            options={productFilterOptions} onValueChange={value => setDraftFilter(value as ProductSearchFilter)} />
        </div>
        <div className="min-w-0">
          <SearchMonitorSelect label="Date range" name="period" appearance="fare" value={draftWindow}
            options={windowOptions} onValueChange={value => setDraftWindow(value as ProductSearchWindow)} />
        </div>
        <button type="button" onClick={applyFilters} disabled={loading}
          className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:opacity-60">
          Apply filters
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#64748B]">Showing recorded {product === "HOTEL" ? "hotel" : "car"} searches in this deployment only</p>

      <div role="region" aria-label="Product search records table" aria-busy={loading} tabIndex={0}
        className="mt-3 w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-[12px] leading-5">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#D8E1EC] text-[11px] font-medium uppercase tracking-wide text-[#64748B]">
              {(product === "HOTEL"
                ? ["Observed", "Destination", "Stay", "Outcome", "Results", "Latency", "Action"]
                : ["Observed", "Pick-up", "Drop-off", "Outcome", "Results", "Latency", "Action"]
              ).map(text => <th key={text} scope="col"
                className={"px-3 py-3 font-medium first:pl-0 " + (text === "Results" || text === "Latency"
                  ? "text-right" : text === "Action" ? "text-center" : "text-left")}>{text}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7ECF5]">
            {rows.map(record => {
              const expanded = selectedId === record.id;
              return <Fragment key={record.id}>
                <tr className="align-top hover:bg-[#FAFBFD]">
                  <td data-label="Observed" className="px-3 py-3 align-top tabular-nums first:pl-0">
                    <time dateTime={record.createdAt ?? undefined} className="block whitespace-normal leading-5">{dateLabel(record.createdAt, timeZone)}</time>
                  </td>
                  <td data-label={product === "HOTEL" ? "Destination" : "Pick-up"} className="min-w-0 px-3 py-3">
                    <p className="break-words font-medium text-[#020617]">{product === "HOTEL" ? record.destination || "—" : record.origin || "—"}</p>
                    {record.requestId ? <p className="mt-1 break-all text-[11px] leading-4 text-[#64748B]" title={record.requestId}>{record.requestId}</p> : null}
                  </td>
                  <td data-label={product === "HOTEL" ? "Stay" : "Drop-off"} className="min-w-0 break-words px-3 py-3">
                    {product === "HOTEL" ? (dateOnly(record.checkIn) + " → " + dateOnly(record.checkOut)) : record.destination || "—"}
                  </td>
                  <td data-label="Outcome" className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#475569]">
                      <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + statusDot(record.outcome)} />
                      {statusLabel(record.outcome)}
                    </span>
                  </td>
                  <td data-label="Results" className="px-3 py-3 text-right tabular-nums">{record.resultCount}</td>
                  <td data-label="Latency" className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{record.latencyMs === null ? "—" : record.latencyMs + " ms"}</td>
                  <td data-label="Action" className="px-2 py-3 text-center">
                    <button type="button" aria-expanded={expanded} aria-controls={disclosureId + "-" + record.id}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 font-semibold text-[#004BB8] hover:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
                      onClick={() => setSelectedId(current => current === record.id ? null : record.id)}>
                      {expanded ? "Close" : "Details"}
                      <ChevronDown size={13} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
                    </button>
                  </td>
                </tr>
                {expanded ? <tr className="bg-[#F7F9FC]"><td data-detail-panel colSpan={7} className="p-3 sm:p-5">
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
                          <Field label="Recorded" value={dateLabel(detail.data.search.createdAt, timeZone)} />
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
                                  <span className="text-[#64748B]">{dateLabel(provider.observedAt, timeZone)} · {provider.latencyMs === null ? "Latency unavailable" : provider.latencyMs + " ms"}</span>
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
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[#E7ECF5] pt-3">
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
