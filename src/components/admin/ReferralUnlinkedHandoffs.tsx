"use client";

import { Fragment, useEffect, useId, useState } from "react";

import { referralUnlinkedRecordsParams } from "@/lib/adminReferralHandoffNavigation";
import type {
  AdminHandoffRead,
  AdminHandoffScope,
  AdminOperationalList,
  AdminOperationalResult,
} from "@/services/adminOperationalReadContract";

type HandoffListResult = AdminOperationalResult<AdminOperationalList<AdminHandoffRead, AdminHandoffScope>>;
type ProductFilter = "" | "FLIGHT" | "HOTEL";
type LoadState = "idle" | "loading" | "ready" | "error";

type Props = {
  window: { start: string; end: string };
  environment: "staging" | "production";
  unlinkedCount: number;
  providers: string[];
};

const PAGE_SIZE = 25;
const selectClass = "h-9 min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#020617] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]";
const actionClass = "inline-flex min-h-9 items-center justify-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-all text-[12px] font-medium leading-5 text-[#020617]">{value || "—"}</dd>
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
    setResult(null);

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

  const list = loadState === "ready" && result?.status === "ok" ? result.data : null;
  const failure = result?.status === "forbidden"
    ? "You do not have permission to view these handoff records."
    : result?.status === "invalid"
      ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ")
      : "The handoff records are unavailable. No empty or zero result is assumed.";

  return (
    <section aria-labelledby="unlinked-handoffs" className="mt-5 min-w-0 border-t border-[#D8E1EC] pt-4">
      <h2 id="unlinked-handoffs" className="text-[15px] font-semibold">Unlinked handoffs</h2>
      <button type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => { setExpanded(previous => !previous); setSelectedId(null); }}
        className="mt-2 text-left text-[13px] font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        {expanded ? "Hide unlinked handoff records" : "View " + unlinkedCount.toLocaleString() + " handoffs without a linked search"}
      </button>

      {expanded ? (
        <div id={panelId} role="region" aria-label="Unlinked provider handoff records"
          className="mt-4 min-w-0 border-t border-[#E7ECF5] pt-4">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-5 gap-y-3">
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[#020617]">Handoff records</h3>
              <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
                Read-only provider referrals without a verified search link. Records stay within Providers.
                This list uses the selected attribution reporting window.
              </p>
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-3">
              <label className="grid min-w-0 gap-1 text-[12px] text-[#475569]">
                Provider
                <select className={selectClass + " max-w-[220px]"} value={provider} onChange={event => {
                  setProvider(event.target.value);
                  resetPage();
                }}>
                  <option value="">All providers</option>
                  {[...new Set(providers)].sort((a, b) => a.localeCompare(b)).map(name => (
                    <option value={name} key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[12px] text-[#475569]">
                Product
                <select className={selectClass} value={product} onChange={event => {
                  setProduct(event.target.value as ProductFilter);
                  resetPage();
                }}>
                  <option value="">All products</option>
                  <option value="FLIGHT">Flights</option>
                  <option value="HOTEL">Hotels</option>
                </select>
              </label>
              <button type="button" className={actionClass} onClick={() => {
                setSelectedId(null);
                setReload(value => value + 1);
              }}>Refresh records</button>
            </div>
          </div>

          {loadState === "loading" || loadState === "idle" ? (
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
                              aria-controls={detailId}
                              onClick={() => setSelectedId(current => current === handoff.id ? null : handoff.id)}
                              className="text-[12px] font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                              {selectedId === handoff.id ? "Close" : "Details"}
                            </button>
                          </td>
                        </tr>
                        {selectedId === handoff.id ? (
                          <tr>
                            <td colSpan={9} className="bg-[#FAFBFD] p-4">
                              <section id={detailId} aria-label="Provider handoff record details">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h4 className="text-[13px] font-semibold">Handoff details</h4>
                                  <span className="text-[11px] text-[#64748B]">Search link: {handoff.searchCorrelation.kind === "exact" ? "Verified" : "Unavailable"}</span>
                                </div>
                                <dl className="mt-3 grid min-w-0 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                                  <DetailField label="Handoff ID" value={handoff.id} />
                                  <DetailField label="Provider" value={handoff.provider} />
                                  <DetailField label="Product" value={handoff.product} />
                                  <DetailField label="Route or property" value={handoff.route} />
                                  <DetailField label="Price" value={handoff.price ? handoff.currency + " " + handoff.price : null} />
                                  <DetailField label="Created" value={dateLabel(handoff.createdAt)} />
                                  <DetailField label="Source page" value={handoff.sourcePage} />
                                  <DetailField label="Destination domain" value={handoff.destinationDomain} />
                                  <DetailField label="Environment" value={handoff.environment} />
                                  <DetailField label="Identity" value={handoff.identity.kind} />
                                  <DetailField label="User ID" value={handoff.identity.userId} />
                                  <DetailField label="Visitor ID" value={handoff.identity.visitorId} />
                                </dl>
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
                <button type="button" className={actionClass} disabled={pageIndex === 0}
                  onClick={() => { setSelectedId(null); setPageIndex(value => Math.max(0, value - 1)); }}>Previous</button>
                <button type="button" className={actionClass} disabled={!list.nextCursor}
                  onClick={() => {
                    if (!list.nextCursor) return;
                    setSelectedId(null);
                    setPageCursors(previous => [...previous.slice(0, pageIndex + 1), list.nextCursor]);
                    setPageIndex(value => value + 1);
                  }}>Next</button>
              </nav>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
