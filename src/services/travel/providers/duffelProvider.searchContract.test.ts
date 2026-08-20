import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DUFFEL_SEARCH_HTTP_TIMEOUT_MS,
  DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS,
  duffelSearchBody,
  duffelUpsellOffersUrl,
  duffelOfferRequestSearchUrl,
  selectGraphBackedDuffelOffers,
} from "./duffelProvider";
import { fetchJson, runProvider } from "../providerUtils";

test("Duffel Offer Request searches finish supplier work below the HTTP timeout", () => {
  assert.ok(DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS < DUFFEL_SEARCH_HTTP_TIMEOUT_MS);

  for (const view of ["itineraries", undefined] as const) {
    const url = new URL(duffelOfferRequestSearchUrl(view));
    assert.equal(url.pathname, "/air/offer_requests");
    assert.equal(url.searchParams.get("return_offers"), "true");
    assert.equal(
      url.searchParams.get("supplier_timeout"),
      String(DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS),
    );
    assert.equal(url.searchParams.get("view"), view ?? null);
  }
});

test("selected-offer upsells use the server-owned Duffel endpoint", () => {
  const url = new URL(duffelUpsellOffersUrl("off/id secret"));
  assert.equal(url.pathname, "/air/offers/off%2Fid%20secret/upsell_offers");
  assert.equal(url.origin, "https://api.duffel.com");
});

test("exact offer refresh requests current optional services without creating an order", async () => {
  const source = await readFile(new URL("./duffelProvider.ts", import.meta.url), "utf8");
  const exact = source.slice(source.indexOf("export function getDuffelFlightOffer"), source.indexOf("export function getDuffelFlightUpsellOffers"));
  assert.match(exact, /\?return_available_services=true/);
  assert.doesNotMatch(exact, /\/air\/orders|payment|passenger details/i);
});

test("upsell discovery is a bounded authenticated POST with no order creation", async () => {
  const source = await readFile(new URL("./duffelProvider.ts", import.meta.url), "utf8");
  const upsell = source.slice(source.indexOf("export function getDuffelFlightUpsellOffers"), source.indexOf("export async function checkDuffelHealth"));
  assert.match(upsell, /method: "POST"/);
  assert.match(upsell, /Authorization: `Bearer \$\{apiKey\}`/);
  assert.match(upsell, /"Duffel-Version": "v2"/);
  assert.match(upsell, /16000/);
  assert.doesNotMatch(upsell, /orders|passenger details|payment/i);
});

test("provider HTTP timeout aborts and propagates as provider_timeout", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as typeof fetch;
  try {
    const result = await runProvider("Duffel", async () => [await fetchJson("https://example.invalid", {}, 5)]);
    assert.equal(result.status, "failed");
    assert.equal(result.errorReason, "provider_timeout");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("flat-view reconciliation accepts only the safe graph-backed subset", () => {
  const graphIds = new Set(["off_kept", "off_missing"]);
  const kept = { id: "off_kept", marker: "normalized later" };
  const extra = { id: "off_not_in_graph", marker: "must never be accepted" };
  assert.deepEqual(
    selectGraphBackedDuffelOffers([kept, extra, null, { id: 42 }], graphIds),
    [kept],
  );
});

test("Deals Offer Requests keep split tickets disabled", () => {
  const request = duffelSearchBody({
    tripType: "round-trip",
    origin: "LHR",
    destination: "JFK",
    departureDate: "2030-01-01",
    returnDate: "2030-01-08",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
  });
  assert.equal(request.data.include_split_ticket, false);
});
