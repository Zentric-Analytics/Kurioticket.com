import assert from "node:assert/strict";
import test from "node:test";

import { buildHomepageRouteCardFlightHref } from "./homepageRouteCardLinks";

test("homepage popular destination card creates exact flight results link", () => {
  const href = buildHomepageRouteCardFlightHref({
    route: { originCode: "JFK", destinationCode: "LHR" },
    displayCurrency: "GBP",
    market: "GB",
    now: new Date("2026-06-09T00:00:00.000Z"),
  });

  assert.deepEqual(href, {
    pathname: "/flights/results",
    query: {
      tripType: "one-way",
      origin: "JFK",
      destination: "LHR",
      departureDate: "2026-07-24",
      travelers: "1",
      adults: "1",
      children: "0",
      infants: "0",
      cabinClass: "economy",
      currency: "GBP",
      market: "GB",
    },
  });
});

test("homepage discovery card preserves provider-backed exact route and selected currency", () => {
  const href = buildHomepageRouteCardFlightHref({
    fareSearch: {
      tripType: "one-way",
      origin: "LOS",
      destination: "NBO",
      departureDate: "2026-08-15",
      travelers: 1,
      adults: 1,
      children: 0,
      infants: 0,
      cabinClass: "economy",
      currency: "USD",
    },
    route: { originCode: "LOS", destinationCode: "NBO" },
    displayCurrency: "NGN",
    market: "NG",
  });

  assert.ok(href && typeof href === "object" && "query" in href);
  const query = href.query as Record<string, string>;
  assert.equal(query.origin, "LOS");
  assert.equal(query.destination, "NBO");
  assert.equal(query.currency, "NGN");
  assert.equal(query.market, "NG");
});

test("incomplete homepage card data does not create fake booking links", () => {
  assert.equal(
    buildHomepageRouteCardFlightHref({
      route: { originCode: "JFK" },
      displayCurrency: "USD",
    }),
    null,
  );
  assert.equal(
    buildHomepageRouteCardFlightHref({
      route: { originCode: "JFK", destinationCode: "JFK" },
      displayCurrency: "USD",
    }),
    null,
  );
});
