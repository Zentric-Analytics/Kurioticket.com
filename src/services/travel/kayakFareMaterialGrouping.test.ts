import assert from "node:assert/strict";
import test from "node:test";

import { toPublicFlight } from "@/lib/searchCache";
import type { FlightSearchParams } from "@/lib/types";
import { kayakFlightCardModel } from "@/components/results/kayakCardModels";
import { normalizeSandboxOffers } from "./kayakSandbox";
import { buildProviderAwareFlightDetails } from "./standaloneFlightDetails";

const click = "https://affiliates.kayak.com/sandbox-clickout";
const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "BOS",
  destination: "JFK",
  departureDate: "2027-02-10",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

function normalizedOffers(checkedBagRestrictions: string[]) {
  const bookingOptions = checkedBagRestrictions.map((restriction, index) => ({
    type: "regular",
    providerCode: `SELLER${index + 1}`,
    displayPrice: { price: 500 + index },
    bookingUrl: click,
    fareFamily: { displayName: "Economy Saver" },
    segmentFares: [{ segmentId: "segment-one", cabin: { displayName: "Economy" } }],
    fees: {
      carryOnBag: [{ bagNumber: "first", restriction: "included" }],
      checkedBag: [{ bagNumber: "first", restriction }],
    },
  }));
  const sandboxOffers = normalizeSandboxOffers("flights", {
    currency: "USD",
    priceMode: "total",
    providers: Object.fromEntries(bookingOptions.map((option, index) => [option.providerCode, { displayName: `Seller ${index + 1}` }])),
    airlines: { AA: { displayName: "Test Airline" } },
    legs: { "leg-one": { segments: [{ id: "segment-one" }], duration: 60 } },
    segments: {
      "segment-one": {
        origin: "BOS",
        destination: "JFK",
        departureTime: "2027-02-10T10:00:00Z",
        arrivalTime: "2027-02-10T11:00:00Z",
        airline: "AA",
        flightNumber: "1",
      },
    },
    results: [{ id: "result-one", legs: [{ id: "leg-one" }], bookingOptions }],
  });
  return sandboxOffers.map((offer) => kayakFlightCardModel(offer)!).filter(Boolean);
}

test("KAYAK booking options with different provider-supplied checked-bag fees remain distinct fare products", async () => {
  const offers = normalizedOffers(["included", "notIncluded"]);
  const details = await buildProviderAwareFlightDetails({
    cachedSelected: offers[0],
    cachedAlternatives: offers,
    search,
    now: 1,
  });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 2);
});

test("KAYAK material fare identity stays server-only", () => {
  const [offer] = normalizedOffers(["included"]);
  const publicOffer = toPublicFlight(offer) as Record<string, unknown>;
  assert.equal(Object.hasOwn(publicOffer, "providerFareMaterialSignature"), false);
});
