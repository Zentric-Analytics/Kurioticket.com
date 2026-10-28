"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2, CarFront, ChevronDown, ChevronRight, CircleDot, ExternalLink,
  ListChecks, MousePointerClick, Plane, Search,
} from "lucide-react";
import { groupContiguousActivityRows } from "@/lib/adminIdentityActivity";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const dayLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(at);
const hourLabel = (at: Date) => new Intl.DateTimeFormat("en", {
  hour: "numeric", minute: "2-digit", timeZone: "UTC",
}).format(at) + " UTC";

const productLabels = new Map([
  ["FLIGHT", "Flight"], ["HOTEL", "Hotel"], ["CAR", "Car"], ["PACKAGE", "Package"],
]);
const searchOutcomeLabels = new Map([
  ["SUCCESS", "Success"], ["PARTIAL", "Partial"], ["FAILED", "Failed"],
]);

/** Format only known display tokens; keep routes, provider brands and stored rows intact. */
function activityDetail(row: ActivityRow) {
  const parts = row.detail.split(" · ");
  const product = productLabels.get(row.product ?? "");
  if (product && parts[0]?.toUpperCase() === row.product) parts[0] = product;
  // Search writers append their recorded outcome. Other event types may end
  // with a provider name, which must never be interpreted as a search status.
  if (row.stage === "SEARCH_COMPLETED" && parts.length > 1) {
    const last = parts.length - 1;
    const outcome = searchOutcomeLabels.get(parts[last]);
    if (outcome) parts[last] = outcome;
  }
  return parts.join(" · ");
}

function ProductIcon({ product }: { product: string | null | undefined }) {
  if (product === "FLIGHT") return <Plane size={17} aria-hidden="true" />;
  if (product === "HOTEL") return <Building2 size={17} aria-hidden="true" />;
  if (product === "CAR") return <CarFront size={17} aria-hidden="true" />;
  return <CircleDot size={17} aria-hidden="true" />;
}
function EventIcon({ stage }: { stage: ActivityRow["stage"] }) {
  if (stage === "SEARCH_COMPLETED") return <Search size={15} aria-hidden="true" />;
  if (stage === "RESULTS_VIEWED") return <ListChecks size={15} aria-hidden="true" />;
  if (stage === "OFFER_SELECTED") return <MousePointerClick size={15} aria-hidden="true" />;
  if (stage === "PROVIDER_HANDOFF_STARTED") return <ExternalLink size={15} aria-hidden="true" />;
  return <CircleDot size={15} aria-hidden="true" />;
}
function detailHref(row: ActivityRow, environment: string, now: Date) {
  if (row.journeyId) {
    const to = new Date(Math.min(now.getTime(), row.at.getTime() + 86_400_000)).toISOString();
    const from = new Date(row.at.getTime() - 86_400_000).toISOString();
    return "/admin/journeys/" + encodeURIComponent(row.journeyId)
      + "?" + new URLSearchParams({ from, to, environment }).toString();
  }
  return null;
}
function RecordedEvent({ row }: { row: ActivityRow }) {
  return <li data-activity-id={row.id} className="flex min-w-0 flex-col gap-1.5 py-3 sm:flex-row sm:items-start sm:gap-4">
    <span aria-hidden="true" className="mt-0.5 hidden shrink-0 text-[#64748B] sm:block"><EventIcon stage={row.stage} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#0F172A]">{row.label}</p>
        <time dateTime={row.at.toISOString()} className="shrink-0 text-[12px] font-normal text-[#64748B]">{hourLabel(row.at)}</time>
      </div>
      <p className="mt-1 break-words text-[12px] leading-5 text-[#64748B]">{activityDetail(row) || "No additional details recorded"}</p>
    </div>
  </li>;
}
function dayGroups(events: ActivityRow[]) {
  const byDate = new Map<string, ActivityRow[]>();
  for (const row of events) {
    const date = row.at.toISOString().slice(0,10);
    byDate.set(date, [...(byDate.get(date) ?? []), row]);
  }
  return [...byDate].map(([date,rows]) => ({date,rows,journeys:groupContiguousActivityRows(rows)}));
}
function compactRuns(rows: ActivityRow[]) {
  const output: ActivityRow[][] = [];
  for (const row of rows) {
    const last = output.at(-1);
    if (last && last[0].stage === row.stage && last[0].product === row.product &&
      last[0].detail === row.detail && last[0].label === row.label &&
      last[0].provider === row.provider && last[0].journeyId === row.journeyId) last.push(row);
    else output.push([row]);
  }
  return output;
}
function journalTitle(rows: ActivityRow[]) {
  const summary = rows.find(row => row.stage === "SEARCH_COMPLETED")
    ?? rows.find(row => row.stage === "RESULTS_VIEWED") ?? rows[0];
  const parts = summary ? activityDetail(summary).split(" · ").filter(Boolean) : [];
  if (!parts.length) return "Recorded activity";
  // Use only already-sanitized, source-recorded product and route/destination.
  return parts.slice(0, 2).join(" · ");
}

/** Presentation-only grouping; original event records and timestamps are retained. */
export function ActivityTimeline({ events, nextHref, environment, order = "newest", clearHref }: {
  events: ActivityRow[]; nextHref: string | null; environment: string;
  order?: "newest" | "oldest"; clearHref?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [runs, setRuns] = useState<Record<string, boolean>>({});
  const days = dayGroups(events);
  const newestDay = events.reduce((max,row) => row.at.toISOString().slice(0,10) > max ? row.at.toISOString().slice(0,10) : max, "");
  const now = new Date();
  return <section aria-labelledby="activity-history-title" className="min-w-0">
    <div className="flex items-center justify-between gap-3 pb-3">
      <h2 id="activity-history-title" className="text-[17px] font-semibold text-[#0F172A]">Activity history</h2>
      <span className="text-xs text-[#475569]">{events.length} recorded {events.length === 1 ? "event" : "events"}</span>
    </div>
    {!events.length ? <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="font-medium">No activity matches your filters</p><span className="sr-only">No activity recorded in this view</span>
      {clearHref ? <Link className="focus-ring mt-3 inline-block text-sm text-[var(--primary)] underline" href={clearHref}>Clear filters</Link> : null}
    </div> : <div className="space-y-6">
      {days.map(day => <section key={day.date} aria-label={"Activity on " + dayLabel(new Date(day.date + "T12:00:00Z"))}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{dayLabel(new Date(day.date + "T12:00:00Z"))} <span className="ml-1 text-xs font-normal text-[#475569]">UTC</span></h3>
          <span className="text-xs text-[#475569]">{day.journeys.filter(group => group.journeyId).length} journeys · {day.rows.length} events</span>
        </div>
        <div className="divide-y divide-[#E2E8F0] border-y border-[#E2E8F0]">{day.journeys.map(group => {
          const key = day.date + ":" + group.key;
          const open = expanded[key] ?? (day.date === newestDay && Boolean(group.journeyId));
          const first = group.events[0];
          const href = detailHref(first,environment,now);
          const title = journalTitle(group.events);
          return <div key={key} className="min-w-0 bg-transparent">
            {group.journeyId ? <div className="flex min-w-0 items-center justify-between gap-2 py-3">
              <button type="button" aria-expanded={open} aria-controls={"journey-" + key.replace(/[^a-zA-Z0-9_-]/g,"-")}
                onClick={() => setExpanded(previous => ({...previous,[key]:!open}))}
                className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left text-sm font-medium">
                <ProductIcon product={group.products[0]}/><span className="min-w-0 truncate">{title}</span>
                <span className="shrink-0 text-xs font-normal text-[#475569]">{group.events.length} events</span>
                <ChevronDown size={16} className={"shrink-0 transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true"/>
              </button>
              {href ? <Link href={href} aria-label={"View activity for " + title} className="focus-ring shrink-0 text-xs text-[var(--primary)] hover:underline">View</Link> : null}
            </div> : <h4 className="py-3 text-sm font-medium">Not linked to a journey</h4>}
            {(!group.journeyId || open) ? <ol id={"journey-" + key.replace(/[^a-zA-Z0-9_-]/g,"-")} className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] pl-5 sm:pl-8">
              {compactRuns(group.events).map(batch => {
                const first = batch[0], runKey = key + ":" + first.id;
                const revealed = runs[runKey];
                if (batch.length < 3) return batch.map(row => <RecordedEvent key={row.id} row={row}/>);
                return <li key={runKey} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{first.stage === "OFFER_SELECTED" ? "Offer selected · " + batch.length + " events" : batch.length + " " + (first.stage === "SEARCH_COMPLETED" ? "searches" : first.label.toLowerCase() + " events")} · {activityDetail(first)} · {batch.every(row => /success/i.test(row.detail + " " + row.label)) ? "all successful" : "recorded outcomes"}</span>
                    <span className="text-xs text-[#475569]">{hourLabel(batch[0].at)} – {hourLabel(batch[batch.length-1].at)}</span>
                    <button type="button" aria-expanded={Boolean(revealed)} className="focus-ring rounded-sm text-xs font-medium text-[var(--primary)] hover:underline" onClick={() => setRuns(p => ({...p,[runKey]:!revealed}))}>{revealed ? "Hide all" : "Show all"}</button>
                  </div>
                  {revealed ? <ol className="mt-2 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">{batch.map(row => <RecordedEvent key={row.id} row={row}/>)}</ol> : null}
                </li>;
              })}
            </ol> : null}
          </div>;
        })}</div>
      </section>)}
    </div>}
    {nextHref ? <div className="pt-4"><Link className="focus-ring text-sm font-medium text-[var(--primary)] hover:underline" href={nextHref}>{order === "oldest" ? "Load newer activity" : "Load older activity"} <ChevronRight size={15} className="inline" aria-hidden="true"/></Link></div> : null}
  </section>;
}
