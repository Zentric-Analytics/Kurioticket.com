import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import type { ActivityRow } from "@/lib/adminIdentityJourney";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { ActivityTimeline } = jiti("./ActivityTimeline") as typeof import("./ActivityTimeline");

const at = new Date("2026-10-22T17:56:00.000Z");
const offer = (id: string, minute: number): ActivityRow => ({
  id, at: new Date(at.getTime() - minute * 60_000),
  stage: "OFFER_SELECTED", label: "Offer selected", detail: "Hotel · London · Provider A",
  product: "HOTEL", provider: "Provider A", journeyId: "qa-journey-1", journeyStartedAt: at,
});
const render = (events: ActivityRow[]) => renderToStaticMarkup(createElement(ActivityTimeline, {
  events, nextHref: null, environment: "staging",
}));

function eventMarkup(html: string, id: string) {
  const match = html.match(new RegExp('<li data-activity-id="' + id + '"[\\s\\S]*?</li>'));
  assert.ok(match, "Recorded event remains visible: " + id);
  return match[0];
}

test("Activity timeline groups repeated records in an accessible expandable card", () => {
  const rows = [offer("j-a", 0), offer("j-b", 1), offer("j-c", 2), offer("j-d", 3)];
  const html = renderToStaticMarkup(createElement(ActivityTimeline, {
    events: rows, nextHref: "/admin/users/guest/qa-user-1/activity?cursor=older", environment: "staging",
  }));
  assert.match(html, /Activity history/);
  assert.match(html, /4 recorded events/);
  assert.match(html, /Offer selected · 4 events/);
  assert.match(html, /Show all/);
  assert.equal((html.match(/data-activity-id=/g) || []).length, 0);
  assert.equal((html.match(/<time dateTime=/g) || []).length, 0);
  assert.equal((html.match(/>View<\/a>/g) || []).length, 1);
  assert.doesNotMatch(html, /Open journey|Open search/);
  assert.match(html, /environment=staging/);
  assert.match(html, /cursor=older/);
  assert.match(html, /Load older activity/);
  assert.doesNotMatch(html, /rounded-2xl|shadow-|rounded-xl|bg-slate-50/);
});

test("one recorded event displays singular grammar and no unnecessary disclosure", () => {
  const row: ActivityRow = { id: "j-only", at, journeyId: "journey-single",
    label: "Search completed", stage: "SEARCH_COMPLETED", detail: "Flight · LOS → DXB", product: "FLIGHT" };
  const html = render([row]);
  assert.match(html, /1 recorded event/);
  assert.doesNotMatch(html, /1 recorded events|selection-run|Older activity/);
  assert.match(html, /Flight · LOS → DXB/);
});

test("empty timeline remains readable without claiming no customer history", () => {
  const html = render([]);
  assert.match(html, /No activity recorded in this view/);
  assert.match(html, /No activity matches your filters/);
  assert.match(html, /0 recorded events/);
  assert.doesNotMatch(html, /selection-run/);
});

test("Activity Explorer organizes dates chronologically and retains every individual recorded event", () => {
  const earlier = new Date("2026-10-21T23:00:00.000Z");
  const later = new Date("2026-10-22T09:00:00.000Z");
  const rows: ActivityRow[] = [
    { id: "j-later", journeyId: "qa-date-later", label: "Results viewed", detail: "Flight · ABV → ACC", at: later, stage: "RESULTS_VIEWED", product: "FLIGHT" },
    { id: "j-earlier", journeyId: "qa-date-earlier", label: "Search completed", detail: "Hotel · Lagos", at: earlier, stage: "SEARCH_COMPLETED", product: "HOTEL" },
  ];
  const html = render(rows);
  assert.ok(html.indexOf("Oct 22, 2026") < html.indexOf("Oct 21, 2026"));
  assert.match(html, /aria-label="Activity on Oct 22, 2026"/);
  assert.match(html, /aria-label="Activity on Oct 21, 2026"/);
  assert.match(html, /Flight · ABV → ACC/);
  assert.match(html, /Hotel · Lagos/);
  assert.match(html, /aria-expanded="true"/);
  const oldest = renderToStaticMarkup(createElement(ActivityTimeline, { events: rows.slice().reverse(),
    nextHref: "/admin/users/guest/qa/activity?cursor=newer", environment: "staging", order: "oldest" }));
  assert.ok(oldest.indexOf("Oct 21, 2026") < oldest.indexOf("Oct 22, 2026"));
  assert.match(oldest, /Load newer activity/);
});

test("date journal preserves interleaved journeys in both chronological orders", () => {
  const start = new Date("2026-10-22T10:00:00.000Z");
  const rows: ActivityRow[] = [
    { id: "j-a10", journeyId: "journey-a", label: "Results viewed", detail: "Flight · Lagos", at: start, product: "FLIGHT" },
    { id: "j-b09", journeyId: "journey-b", label: "Results viewed", detail: "Hotel · Accra", at: new Date(start.getTime() - 3600000), product: "HOTEL" },
    { id: "j-a08", journeyId: "journey-a", label: "Search completed", detail: "Flight · Lagos", at: new Date(start.getTime() - 7200000), product: "FLIGHT" },
  ];
  const ordered = (events: ActivityRow[], order: "newest" | "oldest") =>
    renderToStaticMarkup(createElement(ActivityTimeline, { events, nextHref: null, environment: "staging", order }));
  const newest = ordered(rows, "newest");
  assert.ok(newest.indexOf('data-activity-id="j-a10"') < newest.indexOf('data-activity-id="j-b09"'));
  assert.ok(newest.indexOf('data-activity-id="j-b09"') < newest.indexOf('data-activity-id="j-a08"'));
  const oldest = ordered([...rows].reverse(), "oldest");
  assert.ok(oldest.indexOf('data-activity-id="j-a08"') < oldest.indexOf('data-activity-id="j-b09"'));
  assert.ok(oldest.indexOf('data-activity-id="j-b09"') < oldest.indexOf('data-activity-id="j-a10"'));
});

test("standalone searches keep their details and timestamps without a search navigation action", () => {
  const html = render([{ id: "s-unlinked", at, searchHistoryId: "search-unlinked",
    stage: "SEARCH_COMPLETED", label: "Search completed", detail: "FLIGHT · JFK → MIA · PARTIAL", product: "FLIGHT" }]);
  assert.doesNotMatch(html, /Open search|\/admin\/searches\//);
  const event = eventMarkup(html, "s-unlinked");
  assert.doesNotMatch(event, /<a\b|role="link"/);
  assert.match(event, /Search completed/);
  assert.match(event, /2026-10-22T17:56:00.000Z/);
});

test("one descriptive View action belongs to the journey heading rather than its events", () => {
  const rows: ActivityRow[] = [
    { id: "j-handoff", at, journeyId: "journey-paris", stage: "PROVIDER_HANDOFF_STARTED", label: "Provider handoff started", detail: "HOTEL · Paris, France · KAYAK sandbox", product: "HOTEL", provider: "KAYAK sandbox" },
    { id: "j-search", at: new Date(at.getTime() - 60000), journeyId: "journey-paris", searchHistoryId: "search-paris", stage: "SEARCH_COMPLETED", label: "Search completed", detail: "HOTEL · Paris, France · SUCCESS", product: "HOTEL" },
  ];
  const html = render(rows);
  assert.equal((html.match(/>View<\/a>/g) || []).length, 1);
  assert.match(html, /aria-label="View activity for Hotel · Paris, France"/);
  assert.doesNotMatch(html, /Open journey|Open search/);
  for (const row of rows) assert.doesNotMatch(eventMarkup(html, row.id), /<a\b/);
  const href = html.match(/href="([^\"]*\/admin\/journeys\/[^\"]*)"/)?.[1];
  assert.ok(href);
  const target = new URL(href.replaceAll("&amp;", "&"), "https://kurioticket.test");
  assert.equal(target.pathname, "/admin/journeys/journey-paris");
  assert.equal(target.searchParams.get("environment"), "staging");
  assert.equal(target.searchParams.get("from"), "2026-10-21T17:56:00.000Z");
  assert.equal(target.searchParams.get("to"), "2026-10-23T17:56:00.000Z");
});

test("known product and search-outcome labels are readable without rewriting identifiers or source data", () => {
  const cases = [
    ["FLIGHT", "FLIGHT · JFK → MIA · PARTIAL", "Flight · JFK → MIA · Partial"],
    ["HOTEL", "HOTEL · New York, NY · SUCCESS", "Hotel · New York, NY · Success"],
    ["CAR", "CAR · LAX → SFO · FAILED", "Car · LAX → SFO · Failed"],
    ["PACKAGE", "PACKAGE · ABV → ACC · SUCCESS", "Package · ABV → ACC · Success"],
    ["HOTEL", "Hotel · FLIGHT · SUCCESS · PARTIAL", "Hotel · FLIGHT · SUCCESS · Partial"],
  ];
  for (const [product, detail, expected] of cases) {
    const row: ActivityRow = { id: "s-format", at, product, detail, stage: "SEARCH_COMPLETED", label: "Search completed" };
    const html = render([row]);
    assert.ok(eventMarkup(html, row.id).includes(expected), expected);
    assert.equal(row.detail, detail, "Rendering does not mutate recorded detail");
  }
  const handoff = render([{ id: "r-brand", at, product: "HOTEL", provider: "KAYAK sandbox", stage: "PROVIDER_HANDOFF_STARTED", label: "Provider handoff started", detail: "HOTEL · Paris, FR · KAYAK sandbox" }]);
  assert.match(handoff, /Hotel · Paris, FR · KAYAK sandbox/);
  const brandNamedLikeStatus = render([{ id: "r-status-brand", at, product: "HOTEL", provider: "SUCCESS", stage: "PROVIDER_HANDOFF_STARTED", label: "Provider handoff started", detail: "HOTEL · Paris · SUCCESS" }]);
  assert.match(brandNamedLikeStatus, /Hotel · Paris · SUCCESS/);
});

test("compact repeated-search summaries use readable case without changing grouping", () => {
  const rows: ActivityRow[] = Array.from({ length: 4 }, (_, index) => ({
    id: "s-compact-" + index, at: new Date(at.getTime() - index * 60000),
    stage: "SEARCH_COMPLETED", label: "Search completed", product: "FLIGHT", detail: "FLIGHT · JFK → MIA · PARTIAL",
  }));
  const html = render(rows);
  assert.match(html, /4 searches · Flight · JFK → MIA · Partial/);
  assert.match(html, /Show all/);
  assert.match(html, /4 recorded events/);
  assert.doesNotMatch(html, /Open search|Open journey/);
});

test("unknown details and account activity are not indiscriminately title-cased", () => {
  const rows: ActivityRow[] = [
    { id: "s-unknown", at, product: null, stage: "SEARCH_COMPLETED", label: "Search completed", detail: "NASA · JFK → MIA · UNKNOWN_STATUS" },
    { id: "e-account", at, stage: "ACCOUNT_ACTIVITY", label: "Price alert created", detail: "SUCCESS · API reference ABC123" },
  ];
  const html = render(rows);
  assert.match(html, /NASA · JFK → MIA · UNKNOWN_STATUS/);
  assert.match(html, /SUCCESS · API reference ABC123/);
  assert.doesNotMatch(html, /Open search|Open journey/);
});
