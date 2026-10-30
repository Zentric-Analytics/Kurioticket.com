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
  assert.doesNotMatch(html, /<details|aria-expanded|<summary/);
});
test("destination-only searches, zero results and complete source paths remain readable", () => {
  const html = render([{ ...event, sourcePage: "/hotels/details/" + "a".repeat(300) }]);
  assert.match(html, /Paris, France/);
  assert.match(html, /0 results/);
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
