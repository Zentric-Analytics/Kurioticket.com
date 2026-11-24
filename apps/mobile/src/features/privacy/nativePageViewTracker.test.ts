import assert from "node:assert/strict";
import test from "node:test";
import { pageViewKey, pageViewInfo, publicPageViewPath } from "../../../../../src/lib/pageViewCatalog";
import { NativePageViewTracker } from "./nativePageViewTracker";

const first = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const second = "78e1de9e-6dfe-494f-9fdb-83726d83bf65";
function harness() {
  let context: number | null = null;
  let id = 0;
  const calls: {event: import("../../../../../src/lib/pageViewCatalog").PageViewPayload; context: number; signal: AbortSignal}[] = [];
  let retry = false;
  const tracker = new NativePageViewTracker({
    context: () => context, createId: () => String(++id),
    send: async (event, context, signal) => { calls.push({ event, context, signal }); if (retry) { retry = false; return { accepted: true, retryable: true }; } return { accepted: true }; },
    delay: async () => undefined,
  });
  return { tracker, calls, setContext: (value: number | null) => { context = value; tracker.contextChanged(); }, retry: () => { retry = true; } };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

test("actual Expo Router screen paths resolve to a closed native catalogue", () => {
  const routes = { "/": "home", "/profile": "dashboard", "/trips": "trips", "/explore": "explore",
    "/flights": "flights", "/flight-results": "flight_results", "/flight-details": "flight_details",
    "/hotels": "hotels", "/hotel-results": "hotel_results", "/hotel-details": "hotel_details",
    "/cars": "cars", "/car-results": "car_results", "/car-details": "car_details",
    "/packages": "packages", "/package-results": "package_results", "/saved": "saved",
    "/recent": "recent", "/price-alerts": "price_alerts", "/notifications": "notifications",
    "/support": "support", "/faq": "faq", "/settings": "settings", "/currency": "currency",
    "/language": "language", "/security": "security", "/personal-information": "personal_information",
    "/travel-preferences": "travel_preferences", "/email-preferences": "email_preferences",
    "/edit-flight-search": "edit_flight_search", "/profile/privacy-policy": "privacy_policy",
    "/profile/terms-of-service": "terms", "/explore/destination/private-id": "explore_destination",
    "/explore/region/private-region": "explore_region" };
  for (const [path, key] of Object.entries(routes)) assert.equal(pageViewKey(path, "native"), key, path);
  for (const path of ["/email-auth", "/profile/sign-in", "/connection-status", "/admin", "/support?secret=x", "/home#hotels"]) assert.equal(pageViewKey(path, "native"), null);
  assert.equal(pageViewInfo("explore_destination")?.nativePath, "/explore/destination/[id]");
  assert.equal(pageViewKey("/trips", "web"), null);
  assert.equal(publicPageViewPath("trips"), null);
  assert.equal(pageViewKey("/support", "web"), "support");
  assert.equal(publicPageViewPath("support"), "/support");
});

test("consent, foreground and duplicate rendering do not fabricate screen views", () => {
  const h = harness();
  h.tracker.observe("home", true);
  h.setContext(1);
  h.tracker.observe("home", false);
  assert.equal(h.calls.length, 0);
  h.tracker.observe("home", true);
  h.tracker.observe("home", true);
  h.tracker.observeHomeSection("home_hotels");
  h.tracker.observeHomeSection("home_hotels");
  h.tracker.observe("support", true);
  h.tracker.observe("home", true);
  assert.deepEqual(h.calls.map(call => call.event.pageKey), ["home", "home_hotels", "support", "home"]);
  h.setContext(null);
  h.tracker.observe("trips", true);
  assert.equal(h.calls.length, 4);
});

test("results arriving later enrich one visit; repeated actual searches receive distinct event IDs", () => {
  const h = harness();
  h.setContext(1);
  h.tracker.observe("flight_results", true);
  h.tracker.observeResult("flight_results", first);
  h.tracker.observeResult("flight_results", first);
  h.tracker.observeResult("flight_results", second);
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[0].event.eventId, h.calls[1].event.eventId);
  assert.equal(h.calls[1].event.requestId, first);
  assert.notEqual(h.calls[1].event.eventId, h.calls[2].event.eventId);
  assert.equal(h.calls[2].event.requestId, second);
  assert.equal(h.calls[0].signal.aborted, true);
});

test("retry uses the same event ID and withdrawal cancels pending requests", async () => {
  const h = harness();
  h.setContext(1);
  h.retry();
  h.tracker.observe("hotel_results", true, first);
  await tick();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[0].event.eventId, h.calls[1].event.eventId);
  h.retry();
  h.tracker.observe("support", true);
  h.setContext(null);
  await tick();
  assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].signal.aborted, true);
  h.setContext(2);
  h.tracker.observe("support", true);
  assert.equal(h.calls[3].context, 2);
  assert.notEqual(h.calls[2].event.eventId, h.calls[3].event.eventId);
});
