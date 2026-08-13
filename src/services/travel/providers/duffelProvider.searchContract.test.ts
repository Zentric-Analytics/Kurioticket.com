import assert from "node:assert/strict";
import test from "node:test";
import {
  DUFFEL_SEARCH_HTTP_TIMEOUT_MS,
  DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS,
  duffelSearchBody,
  duffelOfferRequestSearchUrl,
} from "./duffelProvider";

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
