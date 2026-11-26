import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import type { AdminJourneyEvent } from "@/services/adminJourneyContract";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { JourneyEventHistory } = jiti("./JourneyEventHistory") as typeof import("./JourneyEventHistory");
const search = { id: "search-1", requestId: null, product: "HOTEL" as const,
  origin: null, destination: "Paris, France", checkIn: null, checkOut: null,
  status: "SUCCESS" as const, resultCount: 0, latencyMs: null };
const event: AdminJourneyEvent = { id: "event-1", type: "RESULTS_VIEWED", createdAt: "2026-10-27T12:15:43.519Z",
  product: "HOTEL", provider: null, sourcePage: "/hotels/results", search, handoff: null };
const render = (events: AdminJourneyEvent[]) => renderToStaticMarkup(createElement(JourneyEventHistory, { events }));

test("history keeps every repeated event in supplied order in one four-column table", () => {
  const html = render([event, { ...event, id: "event-2" }, { ...event, id: "event-3" }]);
  assert.equal((html.match(/<table/g) || []).length, 1);
  assert.equal((html.match(/<th\b/g) || []).length, 4);
  assert.equal((html.match(/data-journey-event=/g) || []).length, 3);
  assert.ok(html.indexOf('data-journey-event="event-1"') < html.indexOf('data-journey-event="event-2"'));
  assert.ok(html.indexOf('data-journey-event="event-2"') < html.indexOf('data-journey-event="event-3"'));
  assert.match(html, /Event History/);
  assert.match(html, /Step 1/);
  assert.match(html, /Step 2/);
  assert.match(html, /Step 3/);
  assert.doesNotMatch(html, /<details|aria-expanded|<summary/);
});
test("destination-only searches, zero results and complete source paths remain readable", () => {
  const html = render([{ ...event, sourcePage: "/hotels/details/" + "a".repeat(300) }]);
  assert.match(html, /Paris, France/);
  assert.match(html, /Property groups not recorded · 0 recorded results/);
  assert.match(html, /Success/);
  assert.match(html, new RegExp("/hotels/details/" + "a".repeat(300)));
  assert.doesNotMatch(html, /—|→ Paris|truncate|line-clamp/);
});
test("provider and handoff relationships do not merge different recorded providers", () => {
  const html = render([{ ...event, type: "PROVIDER_HANDOFF_STARTED", provider: "Selected provider",
    handoff: { id: "handoff-1", provider: "Handoff provider", route: "LOS → IST",
      destinationDomain: "example.invalid", searchCorrelation: "exact" } }]);
  for (const text of ["Selected provider", "Handoff provider", "example.invalid", "exact search link"]) assert.ok(html.includes(text));
});
test("missing details avoid dash-heavy cells and never invent search correlation", () => {
  const html = render([{ ...event, search: null, product: null, sourcePage: null,
    handoff: { id: "handoff-1", provider: "Provider", route: null, destinationDomain: null, searchCorrelation: "unavailable" } }]);
  assert.match(html, /Search details not recorded/);
  assert.match(html, /search link unavailable/);
  assert.doesNotMatch(html, /exact search link|—|undefined|null/);
  assert.match(render([]), /No events recorded in this window/);
});

test("a verified alert creation is one recorded step in its exact journey history", () => {
  const events = [
    { ...event, id: "search-1", type: "SEARCH_COMPLETED" as const },
    { ...event, id: "alert-1", type: "PRICE_ALERT_CREATED" as const },
    { ...event, id: "handoff-1", type: "PROVIDER_HANDOFF_STARTED" as const },
  ];
  const html = render(events);
  assert.equal((html.match(/data-journey-event=/g) || []).length, 3);
  assert.match(html, /Price alert created/);
  assert.match(html, /Step 2/);
  assert.ok(html.indexOf('data-journey-event="search-1"') < html.indexOf('data-journey-event="alert-1"'));
  assert.ok(html.indexOf('data-journey-event="alert-1"') < html.indexOf('data-journey-event="handoff-1"'));
});

test("verified result actions appear as individual chronological steps without invented shares", () => {
  const linked = [
    { ...event, id: "search-1", type: "SEARCH_COMPLETED" as const },
    { ...event, id: "save-1", type: "RESULT_SAVED" as const },
    { ...event, id: "share-1", type: "RESULT_SHARED" as const, action: "share_link_copied" as const },
    { ...event, id: "share-2", type: "RESULT_SHARED" as const, action: "share_sheet_completed" as const },
    { ...event, id: "unsave-1", type: "RESULT_UNSAVED" as const },
    { ...event, id: "handoff-1", type: "PROVIDER_HANDOFF_STARTED" as const },
  ];
  const html = render(linked);
  assert.equal((html.match(/data-journey-event=/g) || []).length, linked.length);
  assert.match(html, /Result saved/);
  assert.match(html, /Result unsaved/);
  assert.match(html, /Result link copied/);
  assert.match(html, /Share sheet completed/);
  assert.match(html, /Step 6/);
  assert.ok(html.indexOf('data-journey-event="search-1"') < html.indexOf('data-journey-event="save-1"'));
  assert.ok(html.indexOf('data-journey-event="share-1"') < html.indexOf('data-journey-event="unsave-1"'));
});

test("journey history shows property and offer counts only when recorded", () => {
  assert.match(render([{ ...event, search: { ...search, resultCount: 1653, hotelPropertyCount: 422 } }]), /422 property groups · 1,653 offers/);
  assert.match(render([{ ...event, search: { ...search, resultCount: 0, hotelPropertyCount: 0 } }]), /0 property groups · 0 offers/);
});

test("car journey history shows both recorded counts and never invents old totals", () => {
  const carSearch = { ...search, product: "CAR" as const, resultCount: 549 };
  const carEvent = { ...event, product: "CAR" as const, search: carSearch };
  assert.match(render([{ ...carEvent, search: { ...carSearch, carOfferCount: 2547 } }]), /549 car result groups · 2,547 rental offers/);
  assert.match(render([carEvent]), /549 recorded results · Rental offers not recorded/);
});
