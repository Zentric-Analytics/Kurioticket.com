import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSandboxOffers } from "./kayakSandbox";
import { kayakFlightCardModel } from "@/components/results/kayakCardModels";
import { kayakFlightInformationFixture } from "./kayakFlightInformation.fixture";

function normalized(data = kayakFlightInformationFixture(), criteria: Record<string, string> = {}) {
  const offer = normalizeSandboxOffers("flights", data)[0];
  return { offer, flight: kayakFlightCardModel(offer, criteria)! };
}

test("rich KAYAK structured facts preserve cabin, aircraft, duration and every supported onboard feature", () => {
  const { flight } = normalized();
  const segments = flight.legs![0].segments;
  assert.deepEqual(segments.map(s => s.aircraft?.name), ["Boeing 737 MAX 8", "Boeing 787-8 Dreamliner"]);
  assert.deepEqual(segments.map(s => s.duration), ["PT120M", "PT230M"]);
  assert.equal(flight.fareBrandName, "Economy Saver");
  assert.deepEqual(segments.map(s => s.cabinDetails?.[0].cabinClass), ["Economy", "Economy"]);
  assert.deepEqual(segments[0].cabinDetails?.[0].onboardFeatures, [
    { kind: "seat", description: '32" seat pitch · 3-3 seat layout' },
    { kind: "power", description: "Power & USB outlets" },
    { kind: "meal", description: "Meal provided" },
    { kind: "entertainment", description: "Seatback on-demand video" },
    { kind: "wifi", description: "Wi-Fi included" },
  ]);
  assert.deepEqual(segments[1].cabinDetails?.[0].onboardFeatures, [
    { kind: "seat", description: '31" seat pitch · 3-3-3 seat layout' },
    { kind: "power", description: "Power (some rows) & USB" },
    { kind: "entertainment", description: "Streaming entertainment" },
    { kind: "overnight", description: "Overnight flight (red-eye)" },
  ]);
  assert.ok(!JSON.stringify(segments).includes("provider-segment"));
});

test("fee-qualified Wi-Fi becomes an unpriced optional service with segment context", () => {
  const { flight } = normalized();
  assert.deepEqual(flight.providerDetails?.optionalServices, [
    { type: "seat", description: "Preferred seat", price: 20, currency: "USD", maximumQuantity: 1, travelerCount: 1, journeyContext: "BOS → ORD" },
    { type: "wifi", description: "Fast web browsing (fee)", pricing: "fee-unspecified", journeyContext: "ORD → LAS · BA 200" },
  ]);
});

test("multiple airline policies stay separate and never create purchased allowances", () => {
  const data = kayakFlightInformationFixture();
  data.results[0].bookingOptions[0].fees.carryOnBag = [];
  data.results[0].bookingOptions[0].fees.checkedBag = [];
  const { flight } = normalized(data);
  assert.deepEqual(flight.providerDetails?.airlineBaggagePolicies, [
    { carrierName: "Example Airways", carrierCode: "AA", carryOn: ["Up to 21 × 15 × 7 in"], checked: ["Up to 62 in total"] },
    { carrierName: "Example Connect", carrierCode: "BA", carryOn: ["Up to 21 × 15 × 9 in"], checked: ["Up to 79 in total"] },
  ]);
  assert.deepEqual(flight.fareTerms, []);
  assert.equal(flight.baggageInfo, "Baggage allowance not supplied by provider");
});

test("baggage entitlement keeps included, excluded, prohibited, priced and unknown distinctions", () => {
  for (const [restriction, expected] of [
    ["included", "1 checked bag included"],
    ["notIncluded", "1 checked bag not included · USD 35.00"],
    ["notAllowed", "1 checked bag not allowed"],
    ["mysteryEnum", "Checked bag allowance not supplied by provider"],
  ]) {
    const data = kayakFlightInformationFixture();
    data.results[0].bookingOptions[0].fees.checkedBag[0].restriction = restriction;
    assert.equal(normalized(data).flight.fareTerms?.find(t => /checked bag/i.test(t.text))?.text, expected);
  }
});

test("exact same-scope base/total prices do not imply taxes and scale only verified per-person mode", () => {
  const { flight } = normalized();
  assert.deepEqual(flight.providerDetails?.price, { baseAmount: 202, baseCurrency: "USD", totalAmount: 309, totalCurrency: "USD" });
  const perPerson = kayakFlightInformationFixture(); perPerson.priceMode = "perPerson";
  assert.deepEqual(normalized(perPerson, { adults: "2" }).flight.providerDetails?.price, { baseAmount: 404, baseCurrency: "USD", totalAmount: 618, totalCurrency: "USD" });
  const conflict = kayakFlightInformationFixture(); conflict.results[0].bookingOptions[0].fees.totalPrice = 900;
  assert.equal(normalized(conflict).flight.providerDetails?.price?.baseAmount, undefined);
});

test("unknown facts stay sanitized internally and raw fields never become structured customer facts", () => {
  const data = kayakFlightInformationFixture();
  Object.assign(data.results[0].bookingOptions[0], { secretToken: "DO_NOT_EXPOSE", futureUrl: "https://private.test?apiKey=secret" });
  data.results[0].bookingOptions[0].segmentFares[0].qualityItems.push({ code: "unknown-code", displayName: "Unknown passenger-looking fact" });
  const { offer, flight } = normalized(data);
  assert.match(JSON.stringify(offer.flightUnmappedFacts), /Unmapped preview fact|Unknown passenger-looking fact/);
  assert.doesNotMatch(JSON.stringify(offer.flightUnmappedFacts), /DO_NOT_EXPOSE|https:\/\/private/);
  assert.doesNotMatch(JSON.stringify(flight.legs), /unknown-code|Unknown passenger-looking fact|rawBadge|equipment Type Name/);
});

test("partial quality/cabin data never substitutes codes or assigns ambiguous segment fares", () => {
  const data = kayakFlightInformationFixture();
  data.results[0].bookingOptions[0].segmentFares[0].cabin.displayName = "";
  data.results[0].bookingOptions[0].segmentFares[0].qualityItems = [{ code: "wifi", displayName: "" }];
  data.results[0].bookingOptions[0].segmentFares.push(structuredClone(data.results[0].bookingOptions[0].segmentFares[1]));
  const { flight } = normalized(data);
  assert.equal(flight.cabinClass, "Not supplied");
  assert.equal(flight.legs?.[0].segments[0].cabinDetails?.[0].cabinClass, undefined);
  assert.equal(flight.legs?.[0].segments[1].cabinDetails?.[0].onboardFeatures, undefined);
});

test("round-trip segments retain their own facts and repeat-carrier policies deduplicate", () => {
  const data = kayakFlightInformationFixture();
  data.results[0].legs.push({ id: "r" });
  Object.assign(data.legs, { r: { duration: 120, segments: [{ id: "return-segment" }] } });
  Object.assign(data.segments, { "return-segment": { ...data.segments["provider-segment-1"], origin: "LAS", destination: "BOS", equipmentTypeName: "Boeing 777-300ER" } });
  data.results[0].bookingOptions[0].segmentFares.push({ segmentId: "return-segment", cabin: { code: "economy", displayName: "Economy" }, qualityItems: [{ code: "power", displayName: "USB outlet" }] });
  const { flight } = normalized(data);
  assert.equal(flight.legs?.[1].segments[0].aircraft?.name, "Boeing 777-300ER");
  assert.deepEqual(flight.legs?.[1].segments[0].cabinDetails?.[0].onboardFeatures, [{ kind: "power", description: "USB outlet" }]);
  assert.equal(flight.providerDetails?.airlineBaggagePolicies?.length, 2);
});

test("explicit priced services preserve zero prices, penalties and supplied scope", () => {
  const data = kayakFlightInformationFixture();
  const option = data.results[0].bookingOptions[0];
  option.conditions.change.penalty.price = 0;
  option.optionalServices[0].price.price = 0;
  option.optionalServices[0].maximumQuantity = 2;
  const { flight } = normalized(data);
  assert.equal(flight.providerDetails?.conditions?.[0].penaltyAmount, 0);
  assert.equal(flight.providerDetails?.optionalServices?.[0].price, 0);
  assert.equal(flight.providerDetails?.optionalServices?.[0].maximumQuantity, 2);
  assert.equal(flight.providerDetails?.optionalServices?.[0].travelerCount, 1);
});

test("missing fields and unsupported optional-service shapes produce no invented facts", () => {
  const data = kayakFlightInformationFixture();
  const option = data.results[0].bookingOptions[0];
  option.optionalServices = [];
  option.segmentFares = [];
  option.conditions = {} as typeof option.conditions;
  assert.equal(normalized(data).flight.providerDetails?.optionalServices, undefined);
  assert.equal(normalized(data).flight.providerDetails?.conditions, undefined);
  assert.equal(normalized(data).flight.cabinClass, "Not supplied");
});
