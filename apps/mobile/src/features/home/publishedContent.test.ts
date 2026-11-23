import assert from "node:assert/strict";
import test from "node:test";
import { hotelDestinations } from "../../../../../src/data/hotelDestinations";
import { createPublishedResource, parsePublishedFaqs, parsePublishedHome } from "./publishedContent";

const canonical = hotelDestinations[0];
const destination = { id: "cms-one", city: canonical.name, country: canonical.country, canonicalDestinationId: canonical.id, destinationSearchValue: canonical.searchValue, image: "/images/example.jpg", imageAlt: "Destination" };
const route = { id: "cms-route", originCode: "LHR", destinationCode: "JFK", originCity: "London", destinationCity: "New York", image: "/images/route.jpg", imageAlt: "New York" };
const body = (source: "cms" | "fallback" = "cms") => ({ destinations: { source, items: [destination] }, flightRoutes: { source, items: [route] } });
test("published cards retain canonical IDs, market-selected payload and native image shape", () => {
  const result = parsePublishedHome(body(), "https://kurioticket.com");
  assert.equal(result.destinations.source, "cms");
  assert.equal(result.destinations.items[0].canonicalDestinationId, canonical.id);
  assert.equal(result.destinations.items[0].image.uri, "https://kurioticket.com/images/example.jpg");
  assert.equal(result.flightRoutes.items[0].destinationCode, "JFK");
  assert.equal(parsePublishedHome(body("fallback"), "https://kurioticket.com").destinations.source, "fallback");
});
test("invalid canonical navigation, duplicate cards and unsafe image schemes are omitted", () => {
  const payload = body();
  payload.destinations.items = [destination, destination, { ...destination, id: "bad", canonicalDestinationId: "arbitrary-url" }];
  payload.flightRoutes.items = [{ ...route, image: "javascript:alert(1)" }, { ...route, id: "same", destinationCode: "LHR" }];
  const parsed = parsePublishedHome(payload, "https://kurioticket.com");
  assert.equal(parsed.destinations.items.length, 1); assert.equal(parsed.flightRoutes.items.length, 0);
});
test("an intentionally empty published scope stays empty and cannot resurrect bundled content", () => {
  const result = parsePublishedHome({ destinations: { source: "cms", items: [] }, flightRoutes: { source: "cms", items: [] } }, "https://kurioticket.com");
  assert.equal(result.destinations.items.length, 0);
  assert.throws(() => parsePublishedHome({ ...body(), destinations: { source: "draft", items: [destination] } }, "https://kurioticket.com"));
});
test("refreshes coalesce, replace content on publication and clear stale content on outage", async () => {
  let calls = 0, fail = false;
  const resource = createPublishedResource(async () => { calls++; if (fail) throw new Error("offline"); return body(); }, value => parsePublishedHome(value, "https://kurioticket.com"));
  await Promise.all([resource.refresh(), resource.refresh()]); assert.equal(calls, 1);
  assert.equal(resource.snapshot().state, "available");
  fail = true; await resource.refresh();
  assert.equal(resource.snapshot().state, "unavailable"); assert.equal(resource.snapshot().data, null);
  fail = false; await resource.refresh(); assert.equal(resource.snapshot().state, "available");
});
test("different markets/locales have independent resources; FAQ requires a published source", async () => {
  const us = createPublishedResource(async () => ({ source: "cms", items: [{ id: "us", question: "US question", answer: "US answer" }] }), parsePublishedFaqs);
  const fr = createPublishedResource(async () => ({ source: "fallback", items: [{ id: "fr", question: "Question française", answer: "Réponse" }] }), parsePublishedFaqs);
  await Promise.all([us.refresh(), fr.refresh()]);
  assert.equal(fr.snapshot().data?.items[0].id, "fr"); assert.equal(us.snapshot().data?.items[0].id, "us");
  assert.throws(() => parsePublishedFaqs({ source: "draft", items: [] }));
});
