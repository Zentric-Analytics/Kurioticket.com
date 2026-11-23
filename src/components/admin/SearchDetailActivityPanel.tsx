"use client";

import { useEffect, useState } from "react";

import type { SearchScopedActivityResult, SearchScopedEvent } from "@/services/adminSearchScopedActivityCore";

type Props = {
  searchId: string;
  environment: "staging" | "production";
  searchedAt: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
};

const PAGE_SIZE = 25;
const activityLabels: Record<SearchScopedEvent["stage"], string> = {
  SEARCH_COMPLETED: "Search completed",
  RESULTS_VIEWED: "Results viewed",
  OFFER_SELECTED: "Offer selected",
  PROVIDER_HANDOFF_STARTED: "Provider handoff started",
};
const buttonStyle = "inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50";

function timestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(date) + " UTC";
}
function handoffLabel(event: SearchScopedEvent) {
  if (!event.handoff) return null;
  const { price, currency, route } = event.handoff;
  const amount = price && currency && Number.isFinite(Number(price))
    ? currency + " " + Number(price).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;
  return [route, amount].filter(Boolean).join(" · ") || null;
}

/** A first-class section, not a hidden View activity link. It only loads
 * consented events linked to this exact search and verified provider handoffs. */
export function SearchDetailActivityPanel({ searchId, environment, searchedAt, status }: Props) {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SearchScopedActivityResult | null>(null);
  const cursor = cursors[pageIndex];

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setResult(null);
    const params = new URLSearchParams({ environment });
    if (cursor) params.set("cursor", cursor);
    void (async () => {
      try {
        const response = await fetch(
          "/api/admin/searches/" + encodeURIComponent(searchId) + "/activity?" + params.toString(),
          { method: "GET", credentials: "include", cache: "no-store", signal: controller.signal },
        );
        const data = await response.json() as SearchScopedActivityResult;
        if (!current) return;
        if (!data || !["ok", "invalid", "forbidden", "not_found", "unavailable"].includes(data.status)) {
          throw new Error("Unexpected activity response");
        }
        setResult(data);
      } catch {
        if (current && !controller.signal.aborted) setResult({ status: "unavailable" });
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => { current = false; controller.abort(); };
  }, [searchId, environment, cursor, request]);

  const list = !loading && result?.status === "ok" ? result.data : null;
  const errorMessage = result?.status === "forbidden"
    ? "You do not have permission to inspect this search's interactions."
    : result?.status === "not_found"
      ? "The search record is no longer available in this environment."
      : result?.status === "invalid"
        ? "The activity request is invalid. Return to the first page."
        : "Search-related interactions are temporarily unavailable. The original search remains recorded.";

  return (
    <section aria-label="User interactions" className="border-b border-[#E5E7EB] px-2 py-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[#111827]">User interactions</h2>
          <p className="mt-1 text-[12px] text-[#6B7280]">Recorded actions associated with this search only</p>
        </div>
        <button type="button" className={buttonStyle} onClick={() => {
          setPageIndex(0);
          setCursors([null]);
          setRequest(value => value + 1);
        }}>Refresh</button>
      </div>
      {pageIndex === 0 ? (
        <ol className="mt-3" aria-label="Recorded search milestone">
          <li className="grid min-w-0 gap-1 border-b border-[#E5E7EB] py-2 text-[12px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
              <div><p className="font-semibold text-[#111827]">Search recorded</p><p className="text-[#6B7280]">{timestamp(searchedAt)}</p></div>
            </div>
            <p className="text-[#475569] sm:self-center">Recorded status: {status.toLowerCase()}</p>
          </li>
        </ol>
      ) : null}
      {loading || !result ? (
        <p role="status" className="py-4 text-[12px] text-[#6B7280]">Loading verified user interactions…</p>
      ) : !list ? (
        <p role="alert" className="py-4 text-[12px] text-[#9A3412]">{errorMessage}</p>
      ) : list.events.length === 0 ? (
        <p role="status" className="py-3 text-[12px] text-[#6B7280]">
          {list.searchOnly
            ? "No eligible, verified interactions are available for this search. This does not prove that no action occurred."
            : "No additional verified interactions were recorded for this search on this page."}
        </p>
      ) : (
        <ol className="mt-1" aria-label="Verified search interactions">
          {list.events.map(event => (
            <li key={event.id} className="grid min-w-0 gap-1 border-b border-[#E5E7EB] py-2.5 text-[12px] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                <div>
                  <p className="font-semibold text-[#111827]">{activityLabels[event.stage]}</p>
                  <p className="text-[#6B7280]">{timestamp(event.occurredAt)}</p>
                </div>
              </div>
              <div className="min-w-0 self-center break-words text-[#475569]">
                {event.stage === "PROVIDER_HANDOFF_STARTED"
                  ? <><p>{event.provider ? "Handoff initiated to " + event.provider : "Provider handoff initiated"}</p>
                      {handoffLabel(event) ? <p className="mt-0.5 text-[#64748B]">{handoffLabel(event)}</p> : null}
                      <p className="mt-0.5 text-[11px] text-[#64748B]">Destination visit not independently confirmed</p></>
                  : event.provider ? "Provider: " + event.provider
                  : event.stage === "RESULTS_VIEWED" ? "Results viewed; exact number viewed is not recorded"
                  : event.stage === "OFFER_SELECTED" ? "Offer selected; offer details not recorded"
                  : "Search completed"}
              </div>
            </li>
          ))}
        </ol>
      )}
      {list && (list.nextCursor || pageIndex > 0) ? (
        <nav aria-label="Search interactions pagination" className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E7EB] pt-3">
          <span className="text-[12px] text-[#6B7280]">Page {pageIndex + 1} · Up to {PAGE_SIZE} events per page</span>
          <button type="button" className={buttonStyle} disabled={pageIndex === 0} onClick={() => setPageIndex(index => Math.max(0, index - 1))}>Previous</button>
          <button type="button" className={buttonStyle} disabled={!list.nextCursor} onClick={() => {
            if (!list.nextCursor) return;
            setCursors(previous => [...previous.slice(0, pageIndex + 1), list.nextCursor]);
            setPageIndex(index => index + 1);
          }}>Next</button>
        </nav>
      ) : null}
    </section>
  );
}
