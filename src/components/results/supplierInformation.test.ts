import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeSandboxOffers } from "@/services/travel/kayakSandbox";
import { kayakCarCardModel, kayakFlightCardModel, kayakHotelCardModel } from "./kayakCardModels";
import { hotelSupplierFacts } from "@/lib/hotels/hotelSupplierFacts";
import { toPublicFlight, toPublicHotel } from "@/lib/searchCache";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind, ScriptTarget, JsxEmit } from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import * as amenities from "./hotelAmenityPresentation";
import * as amenityLabels from "../../../apps/mobile/src/features/search/hotelAmenityLabel";
import * as aboutModel from "../../../apps/mobile/src/features/search/nativeHotelBookingDetailsModel";
import * as ratingSemantics from "@/lib/hotels/hotelRatingSemantics";
import * as hotelCurrency from "../../../apps/mobile/src/features/search/hotelDetailCurrency";
import * as hotelDetailsModel from "../../../apps/mobile/src/features/search/nativeHotelDetailsModel";
import * as ratePlacement from "../../../apps/mobile/src/features/search/nativeHotelRatePopoverPlacement";
import type { PublicHotelProviderDetails } from "@/lib/hotels/hotelProviderDetails";

const click = "https://affiliates.kayak.com/sandbox-clickout";

// Render the actual native owners with DOM host adapters. No metadata selection,
// policy rendering, normalization or review presentation logic is mocked.
function nativeHotelOwner(name: string) {
  const host = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  const theme = { dark: false, surface: "#fff", border: "#ccc", textPrimary: "#000", textSecondary: "#444", icon: "#222" };
  const dependencies: Record<string, unknown> = {
    react: React, "react/jsx-runtime": jsxRuntime,
    "react-native": { StyleSheet: { create: (styles: unknown) => styles }, View: host, Text: host, Pressable: host, ScrollView: host, Modal: () => null },
    "react-native-safe-area-context": { SafeAreaView: host },
    "lucide-react-native": new Proxy({}, { get: () => () => null }),
    "../../../../../src/components/results/hotelAmenityPresentation": amenities,
    "../../theme/tokens": { colors: { blue: "#004BB8" } },
    "../../theme/typography": { appFonts: {} },
    "./hotelAmenityLabel": amenityLabels,
    "./NativeHotelLocationSection": { NativeHotelLocationSection: () => null },
    "./NativeHotelDecisionSections": { NativeRelatedHotelsSection: () => null },
    "./nativeHotelBookingDetailsModel": aboutModel,
    "../../../../../src/lib/hotels/hotelRatingSemantics": ratingSemantics,
    "../../theme/AppTheme": { useAppTheme: () => ({ theme }) },
    "../../../../../src/lib/hotels/hotelSupplierFacts": { hotelSupplierFacts },
    "./hotelDetailCurrency": hotelCurrency,
    "./nativeHotelDetailsModel": hotelDetailsModel,
    "./ProviderLogo": { ProviderLogo: () => null },
    "./nativeHotelRatePopoverPlacement": ratePlacement,
  };
  const exports: Record<string, unknown> = {};
  const source = readFileSync(`apps/mobile/src/features/search/${name}.tsx`, "utf8");
  runInNewContext(transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022, jsx: JsxEmit.ReactJSX } }).outputText, {
    exports,
    require: (dependency: string) => {
      assert.ok(Object.hasOwn(dependencies, dependency), `Unexpected native renderer dependency: ${dependency}`);
      return dependencies[dependency];
    },
  });
  return {
    Component: exports[name] as React.ComponentType<Record<string, unknown>>,
    buildRates: exports.buildNativeHotelRateRows as (input: Record<string, unknown>) => Array<Record<string, unknown>>,
    theme,
  };
}

test("Audit #45: native Overview preserves routed and details-only sanitized policies in its existing owner", () => {
  const policy = "After 15:00 <script>unsafe()</script>";
  const quotation = "Quiet supplier quotation";
  const [offer] = normalizeSandboxOffers("hotels", {
    currencyCode: "USD", providers: { SELLER: { displayName: "Fixture Seller" } },
    results: [{ id: "overview-fixture", name: "Fixture Hotel", address: "10 Fixture Street", policies: [{ checkIn: policy, token: "DO_NOT_EXPOSE" }], reviewQuotes: [quotation], rates: [{ providerCode: "SELLER", roomName: "King room", totalRate: 300, hasFreeCancellation: true, canPayLater: true, bookUri: click }] }],
  });
  assert.ok(offer);
  const model = kayakHotelCardModel(offer, 3);
  const routed = JSON.parse(JSON.stringify(toPublicHotel(model)));
  assert.equal(Object.hasOwn(routed, "rawProviderReference"), false);
  assert.doesNotMatch(JSON.stringify(routed.providerDetails), /DO_NOT_EXPOSE/);
  assert.ok(JSON.stringify(routed.providerDetails.reviews).includes(quotation));
  const { Component, theme } = nativeHotelOwner("NativeHotelBookingDetails");
  const render = (result: unknown, providerDetails?: PublicHotelProviderDetails | null) => renderToStaticMarkup(React.createElement(Component, {
    result, providerDetails, theme, property: null, locationProperty: null, detailsStatus: "ready", classification: null, relatedHotels: [], relatedDestination: "Fixture City", onViewHotel: () => {}, onLookAroundInteractionChange: () => {},
  }));
  const normal = render(routed);
  const envelopeOnly = { ...routed };
  delete envelopeOnly.providerDetails;
  const enriched = render(envelopeOnly, routed.providerDetails);
  for (const html of [normal, enriched]) {
    assert.equal(html.split("After 15:00").length - 1, 1);
    assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|DO_NOT_EXPOSE|Supplier information|Property information supplied by KAYAK/);
    assert.ok(!html.includes(quotation));
  }
  assert.equal(enriched, normal, "enrichment must reuse the existing layout without a duplicate section");
  assert.equal(render(envelopeOnly), render(envelopeOnly, null));
  assert.equal(render(routed, null), render(envelopeOnly), "explicit null clears stale route metadata");
  assert.equal(render(routed, { source: "KAYAK" }), render(envelopeOnly), "empty authoritative metadata does not resurrect stale policies");
  const fresh: PublicHotelProviderDetails = { source: "KAYAK", overview: { policies: [{ label: "Rule", value: "Fresh policy" }, { label: "Duplicate", value: "Fresh policy" }] } };
  const refreshed = render(routed, fresh);
  assert.equal(refreshed.split("Fresh policy").length - 1, 1);
  assert.ok(!refreshed.includes("After 15:00"));
  const reviews = nativeHotelOwner("NativeHotelReviewsSection");
  const reviewsHtml = renderToStaticMarkup(React.createElement(reviews.Component, { result: { ...routed, reviewScore: 8.9, reviewScale: 10, reviewCount: 420, reviewSource: "KAYAK" } }));
  assert.ok(!reviewsHtml.includes(quotation));
  assert.match(reviewsHtml, /KAYAK/);
  const rates = nativeHotelOwner("NativeHotelRatesSection").buildRates({ offers: [], primaryHotel: routed, primaryProviderDetails: routed.providerDetails, nightlyPrice: null, totalPrice: null, hasPrice: true, displayCurrency: "USD", exchangeRates: {} });
  assert.equal(rates.length, 1);
  assert.equal(rates[0].offerId, routed.id);
  assert.equal(rates[0].providerName, "Fixture Seller");
  assert.equal(rates[0].roomName, "King room");
  assert.equal(rates[0].cancellationLabel, "Free cancellation");
  assert.equal(rates[0].paymentLabel, "Pay later");
  assert.equal(rates[0].sourceCurrency, "USD");
  assert.ok(!JSON.stringify(rates[0].rateFacts).includes("After 15:00"));
  assert.equal(routed.bookingUrl, model.bookingUrl);
  const screen = readFileSync("apps/mobile/src/features/search/HotelDetailsScreen.tsx", "utf8");
  assert.match(screen, /<NativeHotelBookingDetails\s+result=\{result\}\s+providerDetails=\{details\?\.providerDetails\}/);
});
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
test("flight models keep raw sanitized facts internal without altering fare conditions", () => {
  const attributes = [{ label: "Leg 1, segment 1 · equipment Type Name", value: "Airbus A350" }, { label: "Airline policy (not included allowance)", value: "Additional checked bag fees apply" }];
  const result = kayakFlightCardModel({ id: "flight", title: "Flight", description: "Supplier", details: [], price: 100, currency: "USD", priceBasis: "per person", testUrl: click, attributes,
    flightLegs: [{ segments: [{ origin: "SFO", destination: "LOS", departure: "2026-11-18T10:00:00", arrival: "2026-11-19T10:00:00", airline: "Airline", flightNumber: "A1" }] }],
  });
  assert.deepEqual(result?.rawProviderReference, { suppliedFacts: attributes });
  assert.equal("suppliedFacts" in (toPublicFlight(result!).providerDetails ?? {}), false);
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
  for (const path of ["src/components/results/flightDetails/StandaloneFlightDetails.tsx", "src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx", "apps/mobile/src/features/search/NativeFlightDetails.tsx"]) {
    assert.doesNotMatch(source(path), /SupplierInformation|NativeSupplierInformation|suppliedFacts|Supplier information/);
  }
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

  for (const path of ["src/components/results/SupplierInformation.tsx", "apps/mobile/src/features/search/NativeSupplierInformation.tsx"]) {
    const component = source(path);
    assert.match(component, /facts\.map/);
    assert.doesNotMatch(component, /slice\(|numberOfLines|dangerouslySetInnerHTML/);
  }
});
