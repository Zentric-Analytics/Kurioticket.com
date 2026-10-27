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
  assert.equal((html.match(/Open journey/g) || []).length, 1);
  assert.match(html, /environment=staging/);
  assert.match(html, /cursor=older/);
  assert.match(html, /Load older activity/);
  assert.doesNotMatch(html, /rounded-2xl|shadow-|rounded-xl|bg-slate-50/);
});

test("one recorded event displays singular grammar and no unnecessary disclosure", () => {
  const row: ActivityRow = { id: "j-only", at, journeyId: "journey-single",
    label: "Search completed", stage: "SEARCH_COMPLETED", detail: "Flight · LOS → DXB", product: "FLIGHT" };
  const html = renderToStaticMarkup(createElement(ActivityTimeline, { events: [row], nextHref: null, environment: "staging" }));
  assert.match(html, /1 recorded event/);
  assert.doesNotMatch(html, /1 recorded events|selection-run|Older activity/);
  assert.match(html, /Flight · LOS → DXB/);
});

test("empty timeline remains readable without claiming no customer history", () => {
  const html = renderToStaticMarkup(createElement(ActivityTimeline, { events: [], nextHref: null, environment: "staging" }));
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
  const html = renderToStaticMarkup(createElement(ActivityTimeline, { events: rows, nextHref: null, environment: "staging" }));
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
  const render = (events: ActivityRow[], order: "newest" | "oldest") =>
    renderToStaticMarkup(createElement(ActivityTimeline, { events, nextHref: null, environment: "staging", order }));
  const newest = render(rows, "newest");
  assert.ok(newest.indexOf('data-activity-id="j-a10"') < newest.indexOf('data-activity-id="j-b09"'));
  assert.ok(newest.indexOf('data-activity-id="j-b09"') < newest.indexOf('data-activity-id="j-a08"'));
  
  const oldest = render([...rows].reverse(), "oldest");
  assert.ok(oldest.indexOf('data-activity-id="j-a08"') < oldest.indexOf('data-activity-id="j-b09"'));
  assert.ok(oldest.indexOf('data-activity-id="j-b09"') < oldest.indexOf('data-activity-id="j-a10"'));
  
});
