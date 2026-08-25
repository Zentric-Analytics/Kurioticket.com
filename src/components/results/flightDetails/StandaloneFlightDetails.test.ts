import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";

import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { flightDetailsRouteLabel, flightDetailsTotalLabel } from "@/lib/flights/flightDetailsContract";
import { buildFareDisplayRows, canUseOfferAirlineLogo, compactFareTerms, resolveSegmentCarrierName } from "@/components/results/flightDetails/flightDetailsPresentation";
import {
  buildMaterialFareChoices,
  buildStandaloneFlightDetails,
  validatesSearchContext,
} from "@/services/travel/standaloneFlightDetails";

const originalPartners = process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
afterEach(() => {
  if (originalPartners === undefined) delete process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
  else process.env.FLIGHT_HANDOFF_PARTNERS_JSON = originalPartners;
});

const search: FlightSearchParams = {
  tripType: "round-trip",
  origin: "ORD",
  destination: "LAS",
  departureDate: "2027-02-10",
  returnDate: "2027-02-17",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};

const leg = (
  direction: "outbound" | "return",
  origin: string,
  destination: string,
  date: string,
  airlineName: string,
  flightNumber: string,
) => ({
  direction,
  originAirport: origin,
  destinationAirport: destination,
  departureTime: `${date}T10:00:00Z`,
  arrivalTime: `${date}T14:00:00Z`,
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  segments: [{
    originAirport: origin,
    destinationAirport: destination,
    departureTime: `${date}T10:00:00Z`,
    arrivalTime: `${date}T14:00:00Z`,
    airlineName,
    flightNumber,
  }],
});

const fixture = (overrides: Partial<NormalizedFlightResult> = {}): NormalizedFlightResult => ({
  id: "duffel-selected-public-id",
  provider: "Duffel",
  providerOfferId: "off_server_secret",
  providerExpiresAt: Date.parse("2027-02-01T00:00:00Z"),
  airlineName: "Iberia",
  flightNumber: "IB100",
  originAirport: "ORD",
  destinationAirport: "LAS",
  departureTime: "2027-02-10T10:00:00Z",
  arrivalTime: "2027-02-10T14:00:00Z",
  duration: "4h",
  durationMinutes: 240,
  stops: 0,
  layovers: [],
  legs: [
    leg("outbound", "ORD", "LAS", "2027-02-10", "Iberia", "IB100"),
    leg("return", "LAS", "ORD", "2027-02-17", "British Airways", "BA200"),
  ],
  cabinClass: "economy",
  baggageInfo: "1 carry-on included",
  refundInfo: "Not refundable before departure",
  price: 198.1,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 80,
  riskScore: 20,
  comfortScore: 70,
  travelConfidenceScore: 80,
  travelEffortScore: 20,
  recommendationReasons: [],
  badges: [],
  ...overrides,
});

const noUpsells = async () => ({ provider: "Duffel", results: [], status: "success" as const, latencyMs: 2 });
const upsells = (...results: NormalizedFlightResult[]) => async () => ({ provider: "Duffel", results, status: "success" as const, latencyMs: 3 });

test("round trip preserves explicit outbound and return with their own carriers", async () => {
  const cached = fixture();
  const refreshed = fixture({ price: 205.4 });
  const details = await buildStandaloneFlightDetails({
    cachedSelected: cached,
    cachedAlternatives: [cached],
    search,
    now: 1,
    refresh: async () => ({ status: "changed", offer: refreshed }),
    discoverUpsells: noUpsells,
  });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.deepEqual(details.flight.legs?.map(({ direction, originAirport, destinationAirport }) => ({ direction, originAirport, destinationAirport })), [
    { direction: "outbound", originAirport: "ORD", destinationAirport: "LAS" },
    { direction: "return", originAirport: "LAS", destinationAirport: "ORD" },
  ]);
  assert.equal(details.flight.legs?.[0].segments[0].airlineName, "Iberia");
  assert.equal(details.flight.legs?.[0].segments[0].flightNumber, "IB100");
  assert.equal(details.flight.legs?.[1].segments[0].airlineName, "British Airways");
  assert.equal(details.flight.legs?.[1].segments[0].flightNumber, "BA200");
  assert.equal(details.flight.price, 205.4);
  assert.doesNotMatch(JSON.stringify(details), /providerOfferId|off_server_secret|rawProviderReference|partnerRedirectUrl|bookingUrl/);
});

test("standalone details do not show price-only unbranded alternatives as fare choices", async () => {
  const selected = fixture();
  const priceOnlyAlternative = fixture({
    id: "duffel-price-only-alternative",
    providerOfferId: "off_price_only_alternative",
    price: 205,
  });
  const details = await buildStandaloneFlightDetails({
    cachedSelected: selected,
    cachedAlternatives: [selected, priceOnlyAlternative],
    search,
    now: 1,
    refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }),
    discoverUpsells: noUpsells,
  });
  assert.equal(details.status, "available");
  if (details.status === "available") assert.equal(details.fareChoices.length, 1);
});

test("one-way is valid without a return while a round trip missing return fails closed", () => {
  const outboundOnly = fixture({ legs: [fixture().legs![0]] });
  assert.equal(validatesSearchContext(outboundOnly, { ...search, tripType: "one-way", returnDate: undefined }), true);
  assert.equal(validatesSearchContext(outboundOnly, search), false);
});

test("connecting segments remain ordered and provider-authored", async () => {
  const connected = fixture();
  connected.legs![0] = {
    ...connected.legs![0],
    stops: 1,
    layovers: [{ airport: "DFW", duration: "1h 20m", quality: "good" }],
    segments: [
      { originAirport: "ORD", destinationAirport: "DFW", departureTime: "2027-02-10T08:00:00Z", arrivalTime: "2027-02-10T10:00:00Z", airlineName: "American Airlines", flightNumber: "AA123" },
      { originAirport: "DFW", destinationAirport: "LAS", departureTime: "2027-02-10T11:20:00Z", arrivalTime: "2027-02-10T14:00:00Z", airlineName: "American Airlines", flightNumber: "AA456" },
    ],
  };
  assert.deepEqual(connected.legs![0].segments.map(({ originAirport, destinationAirport }) => `${originAirport}-${destinationAirport}`), ["ORD-DFW", "DFW-LAS"]);
});

test("segment airline marks use the offer logo only for the same carrier identity", () => {
  const logo = "https://assets.example.test/iberia.svg";
  const segment = fixture().legs![0].segments[0];
  const matching = { ...segment, airlineName: "  IBERIA  " };
  const marketingFallback = { ...segment, airlineName: undefined, marketingCarrier: { name: "Iberia" } };
  const differentCarrier = { ...segment, airlineName: "Iberia Express" };
  assert.equal(resolveSegmentCarrierName(marketingFallback, "Iberia"), "Iberia");
  assert.equal(canUseOfferAirlineLogo(matching, "Iberia", logo), true);
  assert.equal(canUseOfferAirlineLogo(marketingFallback, "Iberia", logo), true);
  assert.equal(canUseOfferAirlineLogo(differentCarrier, "Iberia", logo), false);
  assert.equal(canUseOfferAirlineLogo(matching, "Iberia", null), false);
});

test("compact fare summaries prioritize restrictions and simplify only unambiguous outbound scope", () => {
  const terms = [
    { category: "fare", semantic: "informational", text: "Provider fare" },
    { category: "baggage", semantic: "positive", text: "Outbound: 1 carry-on included", legDirection: "outbound" },
    { category: "change", semantic: "negative", text: "Outbound: Changes not allowed", legDirection: "outbound" },
    { category: "refund", semantic: "negative", text: "Outbound: Not refundable", legDirection: "outbound" },
  ] satisfies NonNullable<NormalizedFlightResult["fareTerms"]>;
  assert.deepEqual(compactFareTerms(terms, "one-way").map(({ text }) => text), ["1 carry-on included", "Changes not allowed", "Not refundable"]);
  assert.deepEqual(compactFareTerms(terms, "round-trip").map(({ text }) => text), ["Outbound: 1 carry-on included", "Outbound: Changes not allowed", "Outbound: Not refundable"]);
});

test("split baggage rows do not consume the source-term budget or hide material restrictions", () => {
  const terms = [
    { category: "fare", semantic: "informational", text: "Provider fare" },
    { category: "baggage", semantic: "positive", text: "Outbound: 1 carry-on included, 1 checked bag included", legDirection: "outbound" },
    { category: "change", semantic: "negative", text: "Outbound: Changes not allowed", legDirection: "outbound" },
    { category: "refund", semantic: "negative", text: "Outbound: Not refundable", legDirection: "outbound" },
  ] satisfies NonNullable<NormalizedFlightResult["fareTerms"]>;

  assert.deepEqual(compactFareTerms(terms, "one-way").map(({ text }) => text), [
    "1 carry-on included",
    "1 checked bag included",
    "Changes not allowed",
    "Not refundable",
  ]);
});

test("fare display rows safely split included carry-on and checked baggage without changing facts", () => {
  const combined = {
    category: "baggage",
    semantic: "positive",
    text: "Outbound: 1 checked bag included, 1 carry-on included",
    legDirection: "outbound",
  } satisfies NonNullable<NormalizedFlightResult["fareTerms"]>[number];
  const checkedOnly = { ...combined, text: "Outbound: 2 checked bags included" };
  const carryOnOnly = { ...combined, text: "Outbound: 1 carry-on included" };
  const unknown = { ...combined, text: "Outbound: Checked bag available for a fee" };
  const negative = { ...combined, semantic: "negative" as const, text: "Outbound: No checked bag included" };

  assert.deepEqual(buildFareDisplayRows(combined, "one-way"), [
    "1 carry-on included",
    "1 checked bag included",
  ]);
  assert.deepEqual(buildFareDisplayRows(combined, "round-trip"), [
    "Outbound: 1 carry-on included",
    "Outbound: 1 checked bag included",
  ]);
  assert.deepEqual(buildFareDisplayRows(checkedOnly, "one-way"), ["2 checked bags included"]);
  assert.deepEqual(buildFareDisplayRows(carryOnOnly, "one-way"), ["1 carry-on included"]);
  assert.deepEqual(buildFareDisplayRows(unknown, "one-way"), ["Checked bag available for a fee"]);
  assert.deepEqual(buildFareDisplayRows(negative, "one-way"), ["No checked bag included"]);

  const change = {
    category: "change",
    semantic: "negative",
    text: "Outbound: Changes not allowed before departure",
    legDirection: "outbound",
  } satisfies NonNullable<NormalizedFlightResult["fareTerms"]>[number];
  assert.deepEqual(
    compactFareTerms([combined, change], "one-way").map(({ text }) => text),
    [
      "1 carry-on included",
      "1 checked bag included",
      "Changes not allowed before departure",
    ],
  );

  const negativeRow = compactFareTerms([negative], "one-way")[0];
  assert.equal(negativeRow.term.semantic, "negative");
  assert.doesNotMatch(negativeRow.text, /^1 /);
});

test("unbranded exact offers never acquire synthetic fare identity from matching copy", () => {
  const choices = buildMaterialFareChoices([
    fixture({ id: "one", providerOfferId: "one", price: 205 }),
    fixture({ id: "two", providerOfferId: "two", price: 198.1 }),
    fixture({ id: "three", providerOfferId: "three", price: 199.86 }),
  ]);
  assert.equal(choices.length, 3);
  assert.deepEqual(choices.map(({ source }) => source.id), ["two", "three", "one"]);
});

test("baggage and refund copy do not become provider fare-brand identity", () => {
  const choices = buildMaterialFareChoices([
    fixture(),
    fixture({ id: "refundable", providerOfferId: "refundable", baggageInfo: "1 checked bag included", refundInfo: "Refundable before departure", price: 240 }),
  ]);
  assert.equal(choices.length, 2);
  assert.match(choices[0].choice.distinguishingTerms.map(({ text }) => text).join(" "), /carry-on|refundable/i);
  assert.match(choices[1].choice.distinguishingTerms.map(({ text }) => text).join(" "), /checked bag|Refundable/i);
});

test("provider Basic, Standard, and Flex upsells produce sorted real choices", async () => {
  const selected = fixture({ fareBrandName: "Basic", price: 120 });
  const standard = fixture({ id: "standard", providerOfferId: "off_standard", fareBrandName: "Standard", price: 155 });
  const flex = fixture({ id: "flex", providerOfferId: "off_flex", fareBrandName: "Flex", price: 190 });
  const details = await buildStandaloneFlightDetails({ cachedSelected: selected, cachedAlternatives: [selected], search, now: 1, refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }), discoverUpsells: upsells(flex, standard) });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.deepEqual(details.fareChoices.map(({ label }) => label), ["Basic", "Standard", "Flex"]);
  assert.deepEqual(details.fareChoices.map(({ offer }) => offer.price), [120, 155, 190]);
  assert.equal(details.fareChoices[0].selectedOffer, true);
  assert.doesNotMatch(JSON.stringify(details), /providerOfferId|off_standard|off_flex|rawProviderReference|partnerRedirectUrl|bookingUrl/);
});

test("upsell failures and unsupported airlines fail soft to the selected fare", async () => {
  for (const discoverUpsells of [
    async () => ({ provider: "Duffel", results: [], status: "failed" as const, latencyMs: 10, errorCategory: "timeout" as const, errorReason: "provider_timeout" as const }),
    noUpsells,
  ]) {
    const details = await buildStandaloneFlightDetails({ cachedSelected: fixture(), cachedAlternatives: [fixture()], search, now: 1, refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }), discoverUpsells });
    assert.equal(details.status, "available");
    if (details.status === "available") assert.equal(details.fareChoices.length, 1);
  }
});

test("rejects mismatched, expired, invalid, and foreign-provider upsells", async () => {
  const mismatched = fixture({ id: "wrong-route", providerOfferId: "wrong-route", legs: [leg("outbound", "ORD", "LAX", "2027-02-10", "Iberia", "IB100"), fixture().legs![1]] });
  const expired = fixture({ id: "expired", providerOfferId: "expired", fareBrandName: "Flex", providerExpiresAt: 0 });
  const invalidPrice = fixture({ id: "invalid-price", providerOfferId: "invalid-price", fareBrandName: "Flex", price: 0 });
  const invalidCurrency = fixture({ id: "invalid-currency", providerOfferId: "invalid-currency", fareBrandName: "Flex", currency: "US" });
  const foreign = fixture({ id: "foreign", providerOfferId: "foreign", fareBrandName: "Flex", provider: "Other" });
  const details = await buildStandaloneFlightDetails({ cachedSelected: fixture(), cachedAlternatives: [fixture()], search, now: 1, refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }), discoverUpsells: upsells(mismatched, expired, invalidPrice, invalidCurrency, foreign) });
  assert.equal(details.status, "available");
  if (details.status === "available") assert.equal(details.fareChoices.length, 1);
});

test("higher-cabin provider upsells keep their real cabin", async () => {
  const premium = fixture({ id: "premium", providerOfferId: "premium", fareBrandName: undefined, cabinClass: "premium economy", price: 250 });
  const details = await buildStandaloneFlightDetails({ cachedSelected: fixture(), cachedAlternatives: [fixture()], search, now: 1, refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }), discoverUpsells: upsells(premium) });
  assert.equal(details.status, "available");
  if (details.status !== "available") return;
  assert.equal(details.fareChoices.length, 2);
  assert.equal(details.fareChoices[1].label, "Premium Economy");
  assert.equal(details.fareChoices[1].offer.cabinClass, "premium economy");
});

test("mixed round-trip provider brands form an explicit leg combination", () => {
  const mixed = fixture({ fareBrandName: undefined, legs: [
    { ...fixture().legs![0], fareBrandName: "Basic" },
    { ...fixture().legs![1], fareBrandName: "Standard" },
  ] });
  assert.equal(buildMaterialFareChoices([mixed])[0].choice.label, "Basic / Standard");
});

test("provider fare brands pass through but are never manufactured", () => {
  assert.equal(buildMaterialFareChoices([fixture({ fareBrandName: "Flex" })])[0].choice.label, "Flex");
  assert.equal(buildMaterialFareChoices([fixture({ fareBrandName: undefined })])[0].choice.label, "Economy");
});

test("handoff identity comes from the allowlisted destination, not Duffel", () => {
  process.env.FLIGHT_HANDOFF_PARTNERS_JSON = JSON.stringify({ "book.partner.test": "Example Partner" });
  const choice = buildMaterialFareChoices([fixture({ partnerRedirectUrl: "https://book.partner.test/offer" })])[0].choice;
  assert.deepEqual(choice.handoff, { available: true, providerName: "Example Partner" });
  assert.notEqual(choice.handoff.available && choice.handoff.providerName, "Duffel");
  assert.deepEqual(buildMaterialFareChoices([fixture()])[0].choice.handoff, { available: false });
});

test("standalone UI renders every leg and segment from selected offer and uses attested CTA copy", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  for (const contract of [
    'index === 0 ? "OUTBOUND" : "RETURN"',
    "leg.segments.map",
    "const flight = selectedOffer",
    '"Continue to checkout"',
    'aria-disabled={!canContinue || redirecting}',
    "id: selectedOffer.id",
    'role="radiogroup"',
    'role="radio"',
    "term.semantic === \"positive\" ? Check",
    'event.key === "ArrowRight" || event.key === "ArrowDown"',
    'tabIndex={selected ? 0 : -1}',
    "selectedFare?.label",
    "selectedOffer.price",
    "<FarePanel activeTab={activeTab} offer={selectedOffer}",
    "Operated by {segment.operatingCarrier.name}",
    "Technical stop at {stop.airport.iataCode}",
    "Optional extra",
    "Estimated CO₂ emissions",
    "Base fare",
    "Fare basis:",
    "Time zone:",
    "Provider offer last updated",
    "Supported identity documents:",
    "Supported loyalty airline codes:",
    "Airline conditions",
    "conditions of carriage",
    "Offer airline:",
    'permission ? "Allowed" : "Included"',
    'service.pricedPerTraveler ? " each" : ""',
    "Maximum quantity per traveler",
    'condition.category === "change" ? "Changes"',
    "Flight distance:",
    "formatDistanceKm(segment.distanceKm, locale)",
    "Cabin and fare by flight",
    "segment.originAirport} → {segment.destinationAirport",
    "Provider source price breakdown",
    'currencyDisplay: "code"',
    'condition.scope === "trip" ? "Whole trip"',
    'condition.scope === "outbound" ? "Outbound only"',
    'condition.scope === "return" ? "Return only"',
    "carrierConditionsLinks(offer)",
    "new Map(entries.map((entry) => [entry.url, entry]))",
  ]) assert.ok(source.includes(contract), contract);
  assert.ok(!source.includes("function primaryLeg"));
  assert.ok(!source.includes('"Continue to provider"'));
  assert.ok(!source.includes("Total per traveler"));
  assert.ok(!source.includes("Price and availability are confirmed by the provider before purchase."));
  assert.ok(!source.includes("Review the provider’s final fare terms before booking."));
  assert.ok(!source.includes("ShieldCheck"));
  assert.ok(!source.includes("Included/allowed"));
  assert.ok(!source.includes("Not included/not allowed"));
  assert.ok(!source.includes("Provider fare refreshed"));
  assert.ok(!source.includes("Supported loyalty programmes:"));
  assert.match(source, /Checkout currently unavailable/);
  assert.match(source, /disabled=\{!canContinue \|\| redirecting\}/);
});

test("standalone UI preserves the approved desktop and mobile blueprint composition", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  assert.match(source, /lg:grid-cols-\[minmax\(0,2\.45fr\)_minmax\(310px,0\.95fr\)\]/);
  assert.match(source, /className="hidden self-start rounded-\[13px\].*lg:block"/s);
  assert.doesNotMatch(source, /<aside className="[^"]*(?:sticky|fixed)|top-24/);
  assert.match(source, /function MobileCheckoutDock/);
  assert.doesNotMatch(source, /function MobileTripTotal/);
  assert.match(source, /fixed inset-x-0 bottom-0 z-\[90px\]|fixed inset-x-0 bottom-0 z-\[90\]/);
  assert.match(source, /pb-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /pb-\[calc\(6\.75rem\+env\(safe-area-inset-bottom\)\)\].*lg:pb-16/s);
  assert.match(source, /role="tablist"/);
  assert.equal((source.match(/role="tab"/g) || []).length, 1);
  assert.deepEqual(["Fare details", "Fare conditions", "Optional extras"].map((label) => source.includes(`label: "${label}"`)), [true, true, true]);
  assert.match(source, /useState<FareTab>\("details"\)/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /ArrowRight.*ArrowLeft/s);
  assert.doesNotMatch(source, />Selected<\/span>/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_minmax\(82px,1\.1fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /border-dashed border-\[#075EE8\]/);
  assert.match(source, /offerAirlineLogo=\{flight\.airlineLogo\}/);
  assert.match(source, /<SegmentAirlineMark segment=\{segment\}/);
  assert.match(source, /onError=\{\(\) => setLogoFailed\(true\)\}/);
  assert.match(source, /fareChoices\.length === 1 \? "max-w-\[310px\]"/);
  assert.match(source, /fareChoices\.length === 2 \? "sm:grid-cols-2 lg:max-w-\[632px\]"/);
  assert.match(source, /md:grid-cols-3 lg:max-w-\[954px\]/);
  assert.match(source, /xl:max-w-\[1276px\] xl:grid-cols-4/);
  assert.match(source, /: "w-\[min\(100%,310px\)\]"/);
  assert.doesNotMatch(source, /: "w-full"/);
  assert.doesNotMatch(source, /min-h-\[126px\]/);
  assert.doesNotMatch(source, /min-h-\[(?:1[2-9]\d|[2-9]\d\d)px\]/);
  assert.match(source, /w-\[min\(82vw,310px\)\] shrink-0 snap-start/);
  assert.match(source, /overflow-x-auto.*sm:grid/s);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "nearest", inline: "nearest" \}\)/);
  assert.match(source, /max-w-\[1470px\] px-0 sm:px-6 lg:px-\[34px\]/);
  assert.match(source, /border-y border-\[#E2E8F0\].*sm:rounded-\[13px\] sm:border.*sm:shadow-/s);
  assert.match(source, /ml-4.*sm:ml-0/);
  assert.match(source, /function FlightDetailsSkeleton[\s\S]*?px-0 sm:px-6 lg:px-8/);
  assert.match(source, /function FlightDetailsUnavailable[\s\S]*?px-0 sm:px-4/);
  assert.doesNotMatch(source, /lg:max-w-\[400px\]/);
  assert.doesNotMatch(source, /rounded-full border-2/);
  assert.doesNotMatch(source, /pl-6/);
  assert.doesNotMatch(source, /bg-slate-50 px-5 py-3 lg:px-6/);
  assert.doesNotMatch(source, /providerOfferId|rawProviderReference/);
});

test("flight details entry keeps the opaque canonical route and results query", async () => {
  const client = await readFile(new URL("../FlightDetailsClient.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../FlightCard.tsx", import.meta.url), "utf8");
  assert.match(client, /const resultsQuery = searchParams\.toString\(\)/);
  assert.match(client, /`\/flights\/results\?\$\{resultsQuery\}`/);
  assert.match(client, /<StandaloneFlightDetails id=\{id\} resultsHref=\{resultsHref\}/);
  assert.match(card, /`\/flights\/details\/\$\{encodeURIComponent\(flight\.id\)\}`/);
  assert.ok(!client.includes("providerOfferId"));
  assert.ok(!client.includes("rawProviderReference"));
});

test("trip totals use canonical traveler count without changing provider amounts", () => {
  assert.equal(flightDetailsTotalLabel(1), "Trip total");
  assert.equal(flightDetailsTotalLabel(6), "Total for 6 travelers");
  const selectedTotal = fixture({ price: 5467.38 }).price;
  const alternateTotal = fixture({ price: 6120.25 }).price;
  assert.equal(selectedTotal, 5467.38);
  assert.equal(alternateTotal, 6120.25);
  assert.notEqual(selectedTotal, selectedTotal / 6);
});

test("multi-city details use the complete route chain for two through five flights", () => {
  const routeLegs = [
    { originAirport: "IAH", destinationAirport: "LOS" },
    { originAirport: "LOS", destinationAirport: "LAX" },
    { originAirport: "LAX", destinationAirport: "JFK" },
    { originAirport: "JFK", destinationAirport: "CDG" },
    { originAirport: "CDG", destinationAirport: "IAH" },
  ];

  assert.equal(flightDetailsRouteLabel("multi-city", routeLegs.slice(0, 2), "IAH", "LAX"), "IAH → LOS → LAX");
  assert.equal(flightDetailsRouteLabel("multi-city", routeLegs.slice(0, 3), "IAH", "JFK"), "IAH → LOS → LAX → JFK");
  assert.equal(flightDetailsRouteLabel("multi-city", routeLegs.slice(0, 4), "IAH", "CDG"), "IAH → LOS → LAX → JFK → CDG");
  assert.equal(flightDetailsRouteLabel("multi-city", routeLegs, "IAH", "IAH"), "IAH → LOS → LAX → JFK → CDG → IAH");
  assert.equal(
    flightDetailsRouteLabel("multi-city", [
      { originAirport: "IAH", destinationAirport: "LHR" },
      { originAirport: "CDG", destinationAirport: "FCO" },
    ], "IAH", "FCO"),
    "IAH → LHR · CDG → FCO",
  );
  assert.equal(flightDetailsRouteLabel("one-way", routeLegs.slice(0, 1), "Houston (IAH)", "London (LHR)"), "Houston → London");
  assert.equal(flightDetailsRouteLabel("round-trip", routeLegs.slice(0, 2), "Houston, TX", "London, UK"), "Houston → London");
});

test("provider brands with identical comparable facts receive no invented benefit", () => {
  const standard = fixture({ providerOfferId: "off_standard", fareBrandName: "Standard", price: 620.5 });
  const flex = fixture({ id: "duffel-flex", providerOfferId: "off_flex", fareBrandName: "Flex", price: 710.5 });
  const choices = buildMaterialFareChoices([standard, flex]);
  assert.equal(choices.length, 2);
  for (const { choice } of choices) {
    assert.match(choice.distinguishingTerms.at(-1)?.text || "", /No additional comparable fare benefits/);
    assert.doesNotMatch(choice.distinguishingTerms.map(({ text }) => text).join(" "), /more flexible|priority boarding|free changes/i);
  }
});
