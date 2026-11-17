"use client";

import { useEffect, useId, useState } from "react";

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

const buttonStyle = "inline-flex min-h-9 items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F5F8FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50";

function timestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(date) + " UTC";
}

/** Renders only the selected search's validated journey events. The Users
 * directory and entire customer or guest timeline are never requested. */
export function SearchDetailActivityPanel({ searchId, environment, searchedAt, status }: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [request, setRequest] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchScopedActivityResult | null>(null);
  const cursor = cursors[pageIndex];

  useEffect(() => {
    if (!expanded) return;
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
  }, [expanded, searchId, environment, cursor, request]);

  const list = !loading && result?.status === "ok" ? result.data : null;
  const errorMessage = result?.status === "forbidden"
    ? "You do not have permission to inspect this search activity."
    : result?.status === "not_found"
      ? "The search record is no longer available in this environment."
      : result?.status === "invalid"
        ? "The activity request is invalid. Return to the first page."
        : "Search-related activity is temporarily unavailable. The original search record is still shown.";

  return (
    <div className="mt-3 min-w-0">
      <button type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => {
          setExpanded(previous => !previous);
          setCursors([null]);
          setPageIndex(0);
          setResult(null);
        }}
        className="text-[13px] font-semibold text-[#004BB8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25">
        {expanded ? "Hide activity" : "View activity"}
      </button>

      <div id={panelId} hidden={!expanded}>
        {expanded ? (
          <section aria-label="Activity for this search" className="mt-3 min-w-0 border-t border-[#E5E7EB] pt-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-[#111827]">Search-related activity</h3>
                <p className="mt-1 text-[12px] leading-5 text-[#6B7280]">
                  Verified activity associated with this search only. Other customer or guest history is not displayed.
                </p>
              </div>
              <button type="button" className={buttonStyle} onClick={() => {
                setPageIndex(0);
                setCursors([null]);
                setRequest(value => value + 1);
              }}>Refresh</button>
            </div>

            {pageIndex === 0 ? (
              <ol className="mt-4 space-y-3" aria-label="Recorded search milestone">
                <li className="min-w-0 border-l-2 border-[#C8D6EB] pl-3">
                  <p className="text-[12px] font-semibold text-[#111827]">Search recorded</p>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    {timestamp(searchedAt)} · {status.toLowerCase()} · Confirmed by the search record
                  </p>
                </li>
              </ol>
            ) : null}

            {loading || !result ? (
              <p role="status" className="py-4 text-[12px] text-[#6B7280]">Loading verified search activity…</p>
            ) : !list ? (
              <p role="alert" className="py-4 text-[12px] text-[#9A3412]">{errorMessage}</p>
            ) : list.events.length === 0 ? (
              <p role="status" className="py-4 text-[12px] text-[#6B7280]">
                {list.searchOnly
                  ? "No eligible, verified journey events are available for this search. The recorded search remains valid."
                  : "No additional verified journey events are linked to this search in this page of results."}
              </p>
            ) : (
                <ol className="mt-3 space-y-3" aria-label="Verified search journey events">
                  {list.events.map(event => (
                    <li key={event.id} className="min-w-0 border-l-2 border-[#C8D6EB] pl-3">
                      <p className="text-[12px] font-semibold text-[#111827]">{activityLabels[event.stage]}</p>
                      <p className="mt-0.5 break-words text-[12px] text-[#6B7280]">
                        {timestamp(event.occurredAt)}
                        {event.provider ? " · Provider: " + event.provider : ""}
                      </p>
                    </li>
                  ))}
                </ol>
            )}
            {list && (list.nextCursor || pageIndex > 0) ? (
                  <nav aria-label="Search activity pagination"
                    className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#E5E7EB] pt-3">
                    <span className="text-[12px] text-[#6B7280]">Page {pageIndex + 1} · Up to {PAGE_SIZE} events per page</span>
                    <button type="button" className={buttonStyle} disabled={pageIndex === 0} onClick={() => {
                      setPageIndex(index => Math.max(0, index - 1));
                    }}>Previous</button>
                    <button type="button" className={buttonStyle} disabled={!list.nextCursor} onClick={() => {
                      if (!list.nextCursor) return;
                      setCursors(previous => [...previous.slice(0, pageIndex + 1), list.nextCursor]);
                      setPageIndex(index => index + 1);
                    }}>Next</button>
                  </nav>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
