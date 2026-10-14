import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeSandboxOffers } from "@/services/travel/kayakSandbox";
import { kayakCarCardModel, kayakFlightCardModel } from "./kayakCardModels";
import { hotelSupplierFacts } from "@/lib/hotels/hotelSupplierFacts";
import { toPublicFlight } from "@/lib/searchCache";

const click = "https://affiliates.kayak.com/sandbox-clickout";
test("car supplier facts survive normalization and JSON without transport credentials", () => {
  const [offer] = normalizeSandboxOffers("cars", {
    currencyCode: "USD", priceMode: "total",
    results: [{ bookingOptions: [{ car: { brand: "Supplier car", fuel: "electric", passengers: 5, bags: 2, doors: "doors4", transmission: "automatic" }, price: { price: 100 }, bookingUrl: click, policy: { deposit: 200, token: "DO_NOT_EXPOSE" }, paymentType: "payAtPickup", rateType: "flexible" }] }],
  });
  assert.ok(offer);
  const result = kayakCarCardModel(offer, 2, "BOS");
  assert.deepEqual(JSON.parse(JSON.stringify(result)).offers[0].suppliedFacts, offer.attributes);
  assert.doesNotMatch(JSON.stringify(result), /DO_NOT_EXPOSE/);
  assert.ok(result.offers[0].suppliedFacts?.some(fact => fact.label === "payment Type"));
});
test("flight models retain all sanitized supplier attributes without altering fare conditions", () => {
  const attributes = [{ label: "Leg 1, segment 1 · equipment Type Name", value: "Airbus A350" }, { label: "Airline policy (not included allowance)", value: "Additional checked bag fees apply" }];
  const result = kayakFlightCardModel({ id: "flight", title: "Flight", description: "Supplier", details: [], price: 100, currency: "USD", priceBasis: "per person", testUrl: click, attributes,
    flightLegs: [{ segments: [{ origin: "SFO", destination: "LOS", departure: "2026-11-18T10:00:00", arrival: "2026-11-19T10:00:00", airline: "Airline", flightNumber: "A1" }] }],
  });
  assert.deepEqual(result?.providerDetails?.suppliedFacts, attributes);
  assert.deepEqual(toPublicFlight(result!).providerDetails?.suppliedFacts, attributes);
  assert.equal(result?.baggageInfo, "Baggage allowance not supplied by provider");
});
test("supplier text remains escaped and readable rather than inserted as HTML", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { SupplierInformation } = await import("./SupplierInformation");
  const html = renderToStaticMarkup(createElement(SupplierInformation, { facts: [{ label: "Policy", value: "<script>alert(1)</script> Full policy" }] }));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Full policy/);
  assert.doesNotMatch(html, /<script>/);
  assert.equal(renderToStaticMarkup(createElement(SupplierInformation, {})), "");
});
test("hotel facts retain false flags, policies and quotations without inventing absent fields", () => {
  assert.deepEqual(hotelSupplierFacts(null), []);
  const details = { source: "KAYAK" as const, overview: { selfRated: false, policies: [{ label: "Check-in", value: "After 3 PM" }] }, reviews: { quotes: [{ label: "Guest quote", value: "Great location" }] }, rate: { bundledRate: false, roomName: "King room", payLater: true } };
  assert.ok(hotelSupplierFacts(details).some(fact => fact.label === "Bundled rate" && fact.value === "No"));
  assert.ok(hotelSupplierFacts(details, false).some(fact => fact.value === "Great location"));
  assert.ok(!hotelSupplierFacts(details, false).some(fact => fact.value === "King room"));
});
test("remaining supplier-information surfaces preserve sanitized facts without truncation", () => {
  const source = (path: string) => readFileSync(path, "utf8");
  assert.match(source("src/components/results/flightDetails/StandaloneFlightDetails.tsx"), /activeOffer\.providerDetails\?\.suppliedFacts/);
  assert.match(source("apps/mobile/src/features/search/NativeFlightDetails.tsx"), /activeOffer\.providerDetails\?\.suppliedFacts/);
  // Keep the sanitized offer data in the models, but never append supplier
  // information sections to Cars Results cards on web or native.
  for (const path of [
    "src/components/results/CarResultCard.tsx",
    "apps/mobile/src/features/search/CarResultCard.tsx",
  ]) {
    assert.doesNotMatch(source(path), /SupplierInformation|NativeSupplierInformation|data-supplier-information|Supplier information/);
  }

  const webHotel = source("src/components/results/hotelDetails/StandaloneHotelDetails.tsx");
  assert.doesNotMatch(webHotel, /SupplierInformation|hotelSupplierFacts|Property information supplied by KAYAK/);

  assert.match(source("apps/mobile/src/features/search/HotelDetailsScreen.tsx"), /hotelSupplierFacts\(details\?\.providerDetails, false\)/);
  for (const path of ["src/components/results/SupplierInformation.tsx", "apps/mobile/src/features/search/NativeSupplierInformation.tsx"]) {
    const component = source(path);
    assert.match(component, /facts\.map/);
    assert.doesNotMatch(component, /slice\(|numberOfLines|dangerouslySetInnerHTML/);
  }
});
