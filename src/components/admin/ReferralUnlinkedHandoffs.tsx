"use client";

import { Fragment, useEffect, useId, useState } from "react";
import { RefreshCw } from "lucide-react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";

import { referralUnlinkedRecordsParams } from "@/lib/adminReferralHandoffNavigation";
import type {
  AdminHandoffRead,
  AdminHandoffScope,
  AdminOperationalList,
  AdminOperationalResult,
} from "@/services/adminOperationalReadContract";

type HandoffListResult = AdminOperationalResult<AdminOperationalList<AdminHandoffRead, AdminHandoffScope>>;
type ProductFilter = "" | "FLIGHT" | "HOTEL" | "CAR";
type LoadState = "idle" | "loading" | "ready" | "error";

type Props = {
  window: { start: string; end: string };
  environment: "staging" | "production";
  unlinkedCount: number;
  providers: string[];
};

const PAGE_SIZE = 25;
const actionClass = "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D8E1EC] bg-white px-3.5 text-[13px] font-medium text-[#004BB8] transition-colors hover:border-[#B8C9DF] hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
}

function DetailField({ label, value, identifier = false }: { label: string; value: string | null; identifier?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#64748B]">{label}</dt>
      <dd className={"mt-1 text-[13px] font-medium leading-5 text-[#020617] " + (identifier ? "break-all" : "break-words")}>
        {value || "—"}
      </dd>
    </div>
  );
}

/** Providers-only presentation of the existing protected, read-only handoff
 * records. No Search Activity route or new data/authorization path is created. */
export function ReferralUnlinkedHandoffs({ window, environment, unlinkedCount, providers }: Props) {
  const panelId = useId();
  const detailId = useId();
  const [expanded, setExpanded] = useState(false);
  const [provider, setProvider] = useState("");
  const [product, setProduct] = useState<ProductFilter>("");
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [result, setResult] = useState<HandoffListResult | null>(null);

  const cursor = pageCursors[pageIndex] ?? null;

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    let active = true;
    setLoadState("loading");
    // Keep the current rows visible on an explicit refresh; filters and page
    // navigation clear stale rows synchronously before triggering the read.

    const params = referralUnlinkedRecordsParams({
      start: window.start,
      end: window.end,
      environment,
      provider: provider || undefined,
      product: product || undefined,
      cursor,
      limit: PAGE_SIZE,
    });

    void (async () => {
      try {
        const response = await fetch("/api/admin/provider-handoffs?" + params.toString(), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const read = await response.json() as HandoffListResult;
        if (!active) return;
        if (!read || !["ok", "invalid", "forbidden", "not_found", "unavailable"].includes(read.status)) {
          throw new Error("Unexpected handoff response");
        }
        setResult(read);
        setLoadState("ready");
      } catch {
        if (!active || controller.signal.aborted) return;
        setResult(null);
        setLoadState("error");
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [expanded, window.start, window.end, environment, provider, product, cursor, reload]);

  const resetPage = () => {
    setPageCursors([null]);
    setPageIndex(0);
    setSelectedId(null);
    setResult(null);
    setLoadState("loading");
  };

  const list = result?.status === "ok" ? result.data : null;
  const providerOptions = [
    { value: "", label: "All providers" },
    ...[...new Set(providers)].sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name })),
  ];
  const failure = result?.status === "forbidden"
    ? "You do not have permission to view these handoff records."
    : result?.status === "invalid"
      ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ")
      : "The handoff records are unavailable. No empty or zero result is assumed.";

  return (
    <section aria-labelledby="unlinked-handoffs" className="mt-5 min-w-0 border-t border-[#D8E1EC] pt-4">
      <h2 id="unlinked-handoffs" className="text-[15px] font-semibold">Unlinked handoffs</h2>
      <button type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => { setExpanded(previous => !previous); setSelectedId(null); setResult(null); setLoadState("idle"); }}
        className="mt-2 text-left text-[13px] font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        {expanded ? "Hide unlinked handoff records" : "View " + unlinkedCount.toLocaleString() + " handoffs without a linked search"}
      </button>

      <div id={panelId} hidden={!expanded}>
      {expanded ? (
        <div role="region" aria-label="Unlinked provider handoff records" aria-busy={loadState === "loading"}
          className="mt-4 min-w-0 border-t border-[#E7ECF5] pt-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[#020617]">Handoff records</h3>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                Read-only provider referrals without a verified search link. Records stay within Providers.
                This list uses the selected attribution reporting window.
              </p>
            </div>
          </div>
          <div role="group" aria-label="Filter unlinked handoff records"
            className="mt-4 flex min-w-0 flex-wrap items-end gap-3 border-y border-[#E7ECF5] py-3">
            <div className="min-w-0 flex-[1_1_170px] sm:w-[210px] sm:flex-none">
              <span className="mb-1 block text-[12px] font-medium text-[#475569]">Provider</span>
              <SearchMonitorSelect label="Provider" name="provider" appearance="fare"
                value={provider} options={providerOptions} truncateLabel
                onValueChange={value => { setProvider(value); resetPage(); }} />
            </div>
            <div className="min-w-0 flex-[1_1_150px] sm:w-[170px] sm:flex-none">
              <span className="mb-1 block text-[12px] font-medium text-[#475569]">Product</span>
              <SearchMonitorSelect label="Product" name="product" appearance="fare"
                value={product} options={[
                  { value: "", label: "All products" },
                  { value: "FLIGHT", label: "Flights" },
                  { value: "HOTEL", label: "Hotels" },
                  { value: "CAR", label: "Cars" },
                ]}
                onValueChange={value => { setProduct(value as ProductFilter); resetPage(); }} />
            </div>
            <button type="button" className={actionClass + " w-full sm:w-auto"}
              disabled={loadState === "loading"}
              onClick={() => {
                setLoadState("loading");
                setReload(value => value + 1);
              }}>
              <RefreshCw size={15} aria-hidden="true"
                className={loadState === "loading" ? "animate-spin" : ""} />
              {loadState === "loading" ? "Refreshing…" : "Refresh records"}
            </button>
          </div>
          {loadState === "loading" && list ? (
            <p role="status" className="mt-2 text-[12px] text-[#64748B]">
              Refreshing current records; existing results remain visible.
            </p>
          ) : null}
          {(loadState === "loading" || loadState === "idle") && !list ? (
            <p role="status" className="py-6 text-[13px] text-[#64748B]">Loading provider handoffs…</p>
          ) : loadState === "error" || !list && result?.status !== "ok" ? (
            <p role="alert" className="py-6 text-[13px] text-[#9A3412]">
              {loadState === "error" ? "Unable to load handoff records. Try refreshing." : failure}
            </p>
          ) : list && list.items.length === 0 ? (
            <p role="status" className="py-6 text-[13px] text-[#64748B]">
              No unlinked provider handoffs match these filters in the selected window.
            </p>
          ) : list ? (
            <>
              <div role="region" tabIndex={0} aria-label="Unlinked handoff records table"
                className="mt-4 w-full min-w-0 overflow-x-auto">
                <table className="w-full min-w-[1040px] table-fixed text-[12px] leading-5">
                  <caption className="sr-only">Unlinked provider handoffs with expandable details</caption>
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[8%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[9%]" />
                    <col className="w-[13%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="border-y border-[#D8E1EC] text-left text-[#475569]">
                    <tr>{["Created (UTC)", "Product", "Provider", "Route / property", "Price", "Source page", "Destination", "Identity", "Action"].map(heading => (
                      <th key={heading} scope="col" className="px-2 py-2.5 font-medium first:pl-0">{heading}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7ECF5]">
                    {list.items.map(handoff => (
                      <Fragment key={handoff.id}>
                        <tr className="align-top hover:bg-[#FAFBFD]">
                          <td className="py-3 pr-2 tabular-nums">{dateLabel(handoff.createdAt)}</td>
                          <td className="break-words px-2 py-3">{handoff.product}</td>
                          <th scope="row" className="break-words px-2 py-3 text-left font-semibold">{handoff.provider}</th>
                          <td className="break-words px-2 py-3">{handoff.route || "—"}</td>
                          <td className="break-words px-2 py-3 tabular-nums">{handoff.price ? handoff.currency + " " + handoff.price : "—"}</td>
                          <td className="break-all px-2 py-3">{handoff.sourcePage || "—"}</td>
                          <td className="break-all px-2 py-3">{handoff.destinationDomain || "—"}</td>
                          <td className="break-words px-2 py-3">{handoff.identity.kind}</td>
                          <td className="px-2 py-3">
                            <button type="button" aria-expanded={selectedId === handoff.id}
                              aria-controls={selectedId === handoff.id ? detailId : undefined}
                              onClick={() => setSelectedId(current => current === handoff.id ? null : handoff.id)}
                              className="inline-flex min-h-8 items-center rounded-md px-2 text-[12px] font-semibold text-[#004BB8] hover:bg-[#EAF2FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                              {selectedId === handoff.id ? "Close" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {selectedId === handoff.id ? (
                          <tr>
                            <td colSpan={9} className="bg-[#F7F9FC] px-3 py-4 sm:px-5 sm:py-5">
                              <section id={detailId} aria-label="Provider handoff record details"
                                className="mx-auto w-full max-w-[960px] rounded-xl border border-[#DBE3EE] bg-white p-4 shadow-[0_4px_18px_-12px_rgba(15,23,42,0.22)] sm:p-5">
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="text-[14px] font-semibold text-[#0F172A]">Handoff details</h4>
                                    <p className="mt-1 text-[12px] text-[#64748B]">Read-only provider referral record</p>
                                  </div>
                                  <span className="inline-flex min-h-7 items-center rounded-full border border-[#D8E1EC] bg-[#F8FAFC] px-3 text-[11px] font-medium text-[#475569]">
                                    Search link: {handoff.searchCorrelation.kind === "exact" ? "Verified" : "Unavailable"}
                                  </span>
                                </div>
                                <div className="mt-4 border-t border-[#E7ECF5] pt-4">
                                  <h5 className="text-[12px] font-semibold text-[#334155]">Handoff information</h5>
                                  <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <DetailField label="Handoff ID" value={handoff.id} identifier />
                                    <DetailField label="Provider" value={handoff.provider} />
                                    <DetailField label="Product" value={handoff.product} />
                                    <DetailField label="Route or property" value={handoff.route} />
                                    <DetailField label="Price" value={handoff.price ? handoff.currency + " " + handoff.price : null} />
                                    <DetailField label="Created" value={dateLabel(handoff.createdAt)} />
                                  </dl>
                                </div>
                                <div className="mt-4 border-t border-[#E7ECF5] pt-4">
                                  <h5 className="text-[12px] font-semibold text-[#334155]">Source &amp; destination</h5>
                                  <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <DetailField label="Source page" value={handoff.sourcePage} />
                                    <DetailField label="Destination domain" value={handoff.destinationDomain} />
                                    <DetailField label="Environment" value={handoff.environment} />
                                  </dl>
                                </div>
                                <div className="mt-4 border-t border-[#E7ECF5] pt-4">
                                  <h5 className="text-[12px] font-semibold text-[#334155]">Identity &amp; correlation</h5>
                                  <dl className="mt-3 grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <DetailField label="Identity" value={handoff.identity.kind} />
                                    <DetailField label="User ID" value={handoff.identity.userId} identifier />
                                    <DetailField label="Visitor ID" value={handoff.identity.visitorId} identifier />
                                  </dl>
                                </div>
                              </section>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Unlinked handoff pagination" className="mt-2 flex flex-wrap items-center justify-end gap-4 border-t border-[#E7ECF5] py-3">
                <span className="text-[12px] tabular-nums text-[#64748B]">Page {pageIndex + 1}</span>
                <button type="button" className={actionClass} disabled={pageIndex === 0 || loadState === "loading"}
                  onClick={() => { setSelectedId(null); setResult(null); setLoadState("loading"); setPageIndex(value => Math.max(0, value - 1)); }}>Previous</button>
                <button type="button" className={actionClass} disabled={!list.nextCursor || loadState === "loading"}
                  onClick={() => {
                    if (!list.nextCursor) return;
                    setSelectedId(null);
                    setResult(null);
                    setLoadState("loading");
                    setPageCursors(previous => [...previous.slice(0, pageIndex + 1), list.nextCursor]);
                    setPageIndex(value => value + 1);
                  }}>Next</button>
              </nav>
            </>
          ) : null}
        </div>
      ) : null}
      </div>
    </section>
  );
}
