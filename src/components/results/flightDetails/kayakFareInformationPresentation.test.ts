import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { MobileNativeFareInformationDeck, type MobileFareInfoTab } from "./MobileNativeFareInformationDeck";
import { normalizeSandboxOffers } from "@/services/travel/kayakSandbox";
import { kayakFlightInformationFixture } from "@/services/travel/kayakFlightInformation.fixture";
import { kayakFlightCardModel } from "../kayakCardModels";
import { toFlightDetailsOffer } from "@/lib/searchCache";

function offer() { return toFlightDetailsOffer(kayakFlightCardModel(normalizeSandboxOffers("flights", kayakFlightInformationFixture())[0])!); }
function render(tab: MobileFareInfoTab, activeOffer = offer()) {
  const previousReact = Reflect.get(globalThis, "React"); Reflect.set(globalThis, "React", React);
  try {
    return renderToStaticMarkup(React.createElement(MobileNativeFareInformationDeck, {
      activeTab: tab, onTabChange: () => {}, activeOffer, locale: "en-US", selectedDealOfferId: null,
      onSelectDeal: () => {}, selectedCurrency: "USD", currencyRates: { USD: 1 }, isFallbackRate: false,
      pricesReady: true, redirecting: false, onViewDeal: () => {},
    }));
  } finally { if (previousReact === undefined) Reflect.deleteProperty(globalThis, "React"); else Reflect.set(globalThis, "React", previousReact); }
}

test("Flight Details tabs display clean structured KAYAK passenger facts in their intended category", () => {
  const details = render("details");
  for (const fact of ["Economy Saver", "Economy", "Boeing 737 MAX 8", "Boeing 787-8 Dreamliner", "3-3 seat layout", "3-3-3 seat layout", "Power &amp; USB outlets", "Power (some rows) &amp; USB", "Meal provided", "Seatback on-demand video", "Streaming entertainment", "Wi-Fi included", "Overnight flight (red-eye)", "Base fare", "$202", "$309"]) assert.ok(details.includes(fact), `missing ${fact}`);
  assert.doesNotMatch(details, /Fast web browsing|Available for a fee|Up to 21|1 carry-on included|PT120M|Taxes/);
  const conditions = render("conditions");
  for (const fact of ["1 carry-on included", "1 checked bag not included", "Airline baggage policy", "Example Airways", "Example Connect", "Up to 21 × 15 × 7 in", "Up to 21 × 15 × 9 in", "Up to 62 in total", "Up to 79 in total", "penalty"]) assert.ok(conditions.includes(fact), `missing ${fact}`);
  const extras = render("extras");
  for (const fact of ["Preferred seat", "$20", "Fast web browsing (fee)", "Available for a fee", "Available for 1 traveler", "Maximum quantity", "ORD → LAS"]) assert.ok(extras.includes(fact), `missing ${fact}`);
  for (const html of [details, conditions, extras]) assert.doesNotMatch(html, /Supplier information|segment Fares|quality Items|bag Number|equipment Type Name|provider-segment|unknown-code|rawBadge|Unmapped preview fact|cabin code/);
});

test("policies alone do not render included allowance and unpriced extras never render zero money", () => {
  const flight = offer(); flight.fareTerms = [];
  const conditions = render("conditions", flight);
  assert.match(conditions, /Airline baggage policy/); assert.doesNotMatch(conditions, /1 carry-on included|Checked bag included/);
  const extras = render("extras", flight);
  assert.match(extras, /Available for a fee/); assert.doesNotMatch(extras, /\$0(?:\.00)?</);
  flight.providerDetails!.optionalServices = [{ type: "seat", description: "Included optional selection", price: 0, currency: "USD" }];
  assert.match(render("extras", flight), /\$0(?:\.00)?</);
});

test("partial offers and aircraft-only segments have truthful clean empty states", () => {
  const flight = offer(); flight.providerDetails = undefined; flight.fareTerms = [];
  flight.legs![0].segments.forEach(segment => { segment.cabinDetails = undefined; segment.aircraft = undefined; });
  assert.match(render("details", flight), /Additional cabin details not supplied/);
  assert.match(render("conditions", flight), /Fare conditions unavailable/);
  assert.match(render("extras", flight), /No optional services/);
  flight.legs![0].segments[0].aircraft = { name: "Boeing 777-300ER" };
  assert.match(render("details", flight), /Boeing 777-300ER/);
});

test("every Flight Details implementation removes raw supplier rendering and consumes normalized facts", () => {
  for (const path of ["src/components/results/flightDetails/StandaloneFlightDetails.tsx", "src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx", "apps/mobile/src/features/search/NativeFlightDetails.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /SupplierInformation|suppliedFacts|Supplier information/);
    assert.match(source, /onboardFeatures/);
    assert.match(source, /airlineBaggagePolicies/);
    assert.match(source, /fee-unspecified/);
  }
});

test("changing the active offer refreshes facts without needing raw provider rows", () => {
  const first = offer(), second = structuredClone(first);
  second.legs![0].segments[0].cabinDetails![0].onboardFeatures = [{ kind: "power", description: "USB outlet" }];
  assert.match(render("details", first), /Power &amp; USB outlets/);
  const updated = render("details", second);
  assert.match(updated, /USB outlet/); assert.doesNotMatch(updated, /Power &amp; USB outlets/);
});

test("fee services render supplied per-traveler qualification and legacy schema terms never render", () => {
  const flight = offer();
  flight.providerDetails!.optionalServices = [{ type: "wifi", description: "Fast web browsing", price: 10, currency: "USD", pricedPerTraveler: true, maximumQuantity: 1, travelerCount: 2 }];
  const extras = render("extras", flight);
  assert.match(extras, /\$10 each/); assert.match(extras, /Maximum quantity per traveler/);
  const legacy = kayakFlightCardModel(normalizeSandboxOffers("flights", kayakFlightInformationFixture())[0])!;
  legacy.fareTerms = [{ category: "baggage", semantic: "informational", text: "checked Bag 1 · price: 35" }];
  legacy.providerDetails = { ...legacy.providerDetails, suppliedFacts: [{ label: "fees · checked Bag 1 · price", value: "35" }] } as typeof legacy.providerDetails;
  assert.doesNotMatch(render("conditions", toFlightDetailsOffer(legacy)), /checked Bag 1/);
});
