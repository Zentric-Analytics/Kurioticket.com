import assert from "node:assert/strict";
import test from "node:test";

import { kayakFlightCardModel } from "./kayakCardModels";

const logoUrl = "https://content.r9cdn.net/rimg/provider-logos/airlines/v/AA.png";

test("KAYAK provider-supplied segment airline logos survive shared flight normalization", () => {
  const model = kayakFlightCardModel({
    id: "logo",
    title: "Trip",
    description: "Seller",
    details: [],
    price: 100,
    currency: "USD",
    priceBasis: "total",
    testUrl: "https://affiliates.kayak.com/sandbox-clickout",
    flightLegs: [{
      segments: [{
        origin: "BOS",
        destination: "JFK",
        departure: "2099-10-12T10:00:00Z",
        arrival: "2099-10-12T11:00:00Z",
        airline: "American Airlines",
        airlineLogo: logoUrl,
        flightNumber: "AA 123",
      }],
    }],
  });

  const segment = model?.legs?.[0]?.segments[0] as Record<string, unknown> | undefined;
  assert.equal(segment?.airlineLogo, logoUrl);
});
