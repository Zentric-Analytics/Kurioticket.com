import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";
import { getTranslations } from "@/lib/i18n";
import { runInNewContext } from "node:vm";
import ts from "typescript";

import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import { flightDetailsRouteLabel, flightDetailsTotalLabel } from "@/lib/flights/flightDetailsContract";
import { buildFareDisplayRows, canUseOfferAirlineLogo, compactFareTerms, formatItineraryDepartureDate, resolveSegmentCarrierName } from "@/components/results/flightDetails/flightDetailsPresentation";
import {
  buildMaterialFareChoices,
  buildProviderAwareFlightDetails,
  buildStandaloneFlightDetails,
  validatesSearchContext,
} from "@/services/travel/standaloneFlightDetails";

const originalPartners = process.env.FLIGHT_HANDOFF_PARTNERS_JSON;
test("current traveler breakdown translates labels without changing canonical counts", async () => {
  const source = await readFile("src/components/results/flightDetails/StandaloneFlightDetails.tsx", "utf8");
  const ast = ts.createSourceFile("details.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const helper = ast.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "readTravelerSummary");
  assert.ok(helper);
  const js = ts.transpile(helper.getText(ast), { target: ts.ScriptTarget.ES2022 });
  const summarize = runInNewContext(`${js}; readTravelerSummary`, { Intl }) as (search: { adults: number; children: number; infants: number; travelers: number }, locale: string, t: (key: string) => string) => { count: number; label: string };
  for (const locale of ["th", "vi", "pl", "sv", "id"]) {
    const dictionary = getTranslations(locale);
    const result = summarize({ adults: 2, children: 1, infants: 1, travelers: 4 }, locale, key => dictionary[key]);
    assert.equal(result.count, 4);
    assert.equal(result.label, `2 ${dictionary.adultPlural}, 1 ${dictionary.childSingular}, 1 ${dictionary.infantSingular}`);
    const emptyBreakdown = summarize({ adults: 0, children: 0, infants: 0, travelers: 3 }, locale, key => dictionary[key]);
    assert.equal(emptyBreakdown.count, 3);
    assert.equal(emptyBreakdown.label, `3 ${dictionary["deals.travelerPlural"]}`);
  }
});

test("KAYAK cached fares use the shared contract without Duffel refresh or invented tiers", async () => {
  const selected = fixture({ id:"kayak-sandbox:selected", provider:"KAYAK sandbox", providerOfferId:"selected", fareBrandName:undefined, cabinClass:"Economy", price:125, currency:"USD", partnerRedirectUrl:"https://affiliates.kayak.com/sandbox-clickout", fareTerms:[] });
  const flex = fixture({ id:"kayak-sandbox:flex", provider:"KAYAK sandbox", providerOfferId:"flex", fareBrandName:"Provider Flexible", cabinClass:"Economy", price:175, currency:"USD", partnerRedirectUrl:"https://affiliates.kayak.com/sandbox-clickout", fareTerms:[{category:"fare",semantic:"informational",text:"Provider supplied flexible fare"}] });
  const wrong = fixture({ id:"kayak-sandbox:wrong", provider:"KAYAK sandbox", providerOfferId:"wrong", fareBrandName:"Wrong itinerary", legs:[leg("outbound","ORD","LAX","2027-02-10","Iberia","IB100"), fixture().legs![1]], partnerRedirectUrl:"https://affiliates.kayak.com/sandbox-clickout" });
  let refreshCalls=0;
  const details=await buildProviderAwareFlightDetails({cachedSelected:selected,cachedAlternatives:[selected,flex,wrong],search,now:1,refresh:async()=>{refreshCalls++;return {status:"unavailable"};}});
  assert.equal(details.status,"available");
  assert.equal(refreshCalls,0);
  if(details.status!=="available")return;
  assert.deepEqual(details.fareChoices.map(choice=>[choice.label,choice.offer.price,choice.offer.currency]),[["Economy",125,"USD"],["Provider Flexible",175,"USD"]]);
  assert.deepEqual(details.fareChoices.map(choice=>choice.distinguishingTerms),[[],flex.fareTerms]);
  assert.equal(details.fareChoices[0].selectedOffer,true);
  assert.equal(details.handoff.available,true);
});
test("current standalone trip summary uses localized labels and numeric formatting", async () => {
  const source = await readFile("src/components/results/flightDetails/StandaloneFlightDetails.tsx", "utf8");
  assert.match(source, /locale, t: dictionary/);
  assert.match(source, /new Intl\.NumberFormat\(locale\)\.format\(travelers\.count\)/);
  assert.match(source, /new Intl\.NumberFormat\(locale\)\.format\(legs\.length\)/);
  assert.match(source, /t\(travelers\.count === 1 \? "deals\.travelerSingular" : "deals\.travelerPlural"\)/);
  for (const locale of ["th", "vi", "pl", "sv", "id"]) {
    const translations = getTranslations(locale);
    const english = getTranslations("en");
    for (const key of ["roundTrip", "oneWay", "multiCity", "flights", "deals.travelerSingular", "deals.travelerPlural"]) {
      assert.ok(translations[key], `${locale}: ${key} must exist`);
      assert.notEqual(translations[key], english[key], `${locale}: ${key} must be translated`);
    }
  }
});
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

test("selected revalidation gates concurrent secondary fare discovery", async () => {
  const selected = fixture();
  const alternative = fixture({ id: "alternative", providerOfferId: "off_alternative", fareBrandName: "Flex", price: 240 });
  const selectedRefresh = deferred<{ status: "confirmed"; offer: NormalizedFlightResult }>();
  const alternativeRefresh = deferred<{ status: "confirmed"; offer: NormalizedFlightResult }>();
  const upsellDiscovery = deferred<Awaited<ReturnType<typeof noUpsells>>>();
  const events: string[] = [];
  const detailsPromise = buildStandaloneFlightDetails({
    cachedSelected: selected,
    cachedAlternatives: [selected, alternative],
    search,
    now: 1,
    refresh: ({ cachedOffer }) => {
      events.push(`refresh:${cachedOffer.id}`);
      return cachedOffer.id === selected.id ? selectedRefresh.promise : alternativeRefresh.promise;
    },
    discoverUpsells: () => {
      events.push("upsells");
      return upsellDiscovery.promise;
    },
  });
  await Promise.resolve();
  assert.deepEqual(events, [`refresh:${selected.id}`]);

  selectedRefresh.resolve({ status: "confirmed", offer: selected });
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, [`refresh:${selected.id}`, "upsells", `refresh:${alternative.id}`]);

  upsellDiscovery.resolve(await noUpsells());
  await Promise.resolve();
  let settled = false;
  void detailsPromise.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  alternativeRefresh.resolve({ status: "confirmed", offer: alternative });
  const details = await detailsPromise;
  assert.equal(details.status, "available");
  if (details.status === "available") assert.deepEqual(details.fareChoices.map(({ label }) => label), ["Economy", "Flex"]);
});

test("failed selected revalidation launches no secondary provider work", async () => {
  let secondaryCalls = 0;
  const details = await buildStandaloneFlightDetails({
    cachedSelected: fixture(), cachedAlternatives: [fixture({ id: "alternative", fareBrandName: "Flex" })], search, now: 1,
    refresh: async () => ({ status: "unavailable" }),
    discoverUpsells: async () => { secondaryCalls += 1; return noUpsells(); },
  });
  assert.equal(details.status, "unavailable");
  assert.equal(secondaryCalls, 0);
});

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

test("compact fare rows stay within three decisions and do not hide material restrictions", () => {
  const terms = [
    { category: "fare", semantic: "informational", text: "Provider fare" },
    { category: "baggage", semantic: "positive", text: "Outbound: 1 carry-on included, 1 checked bag included", legDirection: "outbound" },
    { category: "change", semantic: "negative", text: "Outbound: Changes not allowed", legDirection: "outbound" },
    { category: "refund", semantic: "negative", text: "Outbound: Not refundable", legDirection: "outbound" },
  ] satisfies NonNullable<NormalizedFlightResult["fareTerms"]>;

  assert.deepEqual(compactFareTerms(terms, "one-way").map(({ text }) => text), [
    "1 carry-on included",
    "Changes not allowed",
    "Not refundable",
  ]);
});

test("identical round-trip baggage is consolidated only when the verified facts match", () => {
  const matching = [
    { category: "baggage", semantic: "positive", text: "Outbound: 1 carry-on included, 1 checked bag included", legDirection: "outbound" },
    { category: "baggage", semantic: "positive", text: "Return: 1 carry-on included, 1 checked bag included", legDirection: "return" },
    { category: "change", semantic: "negative", text: "Changes not allowed before departure" },
  ] satisfies NonNullable<NormalizedFlightResult["fareTerms"]>;
  assert.deepEqual(compactFareTerms(matching, "round-trip").map(({ text }) => text), [
    "1 carry-on included each way",
    "1 checked bag included each way",
    "Changes not allowed before departure",
  ]);

  const different = matching.map((term) => ({ ...term }));
  different[1].text = "Return: 1 carry-on included, 2 checked bags included";
  const differentRows = compactFareTerms(different, "round-trip").map(({ text }) => text);
  assert.ok(differentRows.includes("1 carry-on included each way"));
  assert.ok(!differentRows.some((text) => /checked bag included each way/i.test(text)));
});

test("long and unknown provider conditions remain complete in compact presentation", () => {
  const terms = [
    { category: "change", semantic: "negative", text: "Changes allowed with USD 1,870.00 penalty before departure" },
    { category: "fare", semantic: "informational", text: "Provider-specific condition ZYQ-42 applies" },
  ] satisfies NonNullable<NormalizedFlightResult["fareTerms"]>;
  assert.deepEqual(compactFareTerms(terms, "one-way").map(({ text }) => text), terms.map(({ text }) => text));
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
    '"Continue booking"',
    'aria-disabled={!canContinue || redirecting}',
    "id: offerId",
    'role="radiogroup"',
    'role="radio"',
    "term.semantic === \"positive\" ? Check",
    'event.key === "ArrowRight" || event.key === "ArrowDown"',
    'tabIndex={selected ? 0 : -1}',
    "activeOffer.price",
    "<FarePanel activeTab={activeTab} fare={selectedFare} offer={activeOffer}",
    "Operated by {segment.operatingCarrier.name}",
    "Technical stop at {stop.airport.iataCode}",
    "Optional extra",
    "Estimated CO₂ emissions",
    "Base fare",
    'label="Fare basis"',
    "Departure time zone",
    "Provider offer last updated",
    'label="Supported documents"',
    'label="Loyalty programmes"',
    'label="Airline"',
    "conditions of carriage",
    "provider.offerOwner.name",
    "conditionState(condition)",
    'service.pricedPerTraveler ? " each" : ""',
    "Maximum quantity per traveler",
    "conditionCategory(group.conditions[0])",
    "Flight distance:",
    "formatDistanceKm(segment.distanceKm, locale)",
    'label="Cabin"',
    "segment.originAirport} → {segment.destinationAirport",
    'label="Price breakdown"',
    "formatFlightResultCurrency",
    "conditionScope(condition)",
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
  assert.match(source, /Booking currently unavailable/);
  assert.match(source, /disabled=\{!canContinue \|\| redirecting\}/);
});

test("all Flight Details deal paths reserve and safely navigate a provider tab", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const start = source.indexOf("async function continueToOffer");
  const handoff = source.slice(start, source.indexOf("\n  if (!response", start));
  assert.match(handoff, /window\.open\("about:blank", "_blank"\)/);
  assert.match(handoff, /providerWindow\.opener = null/);
  assert.match(handoff, /referrerPolicy\.content = "no-referrer"/);
  assert.match(handoff, /fetch\("\/api\/redirect"/);
  assert.match(handoff, /providerWindow\.location\.replace\(data\.url\)[\s\S]*?setRedirecting\(false\)/);
  assert.doesNotMatch(handoff, /window\.location\.href\s*=/);
  assert.equal((handoff.match(/providerWindow\.close\(\)/g) ?? []).length, 2);
  assert.match(handoff, /result\.status === 409 && data\.code === "offer_changed"[\s\S]*?providerWindow\.close\(\)/);
  assert.match(source, /onContinue=\{\(\) => continueToOffer\(selectedDeal\?\.offerId \?\? selectedOffer\.id\)\}/);
  assert.match(source, /onViewDeal=\{continueToOffer\}/);
});

test("Flight Details reuses Flight Results selected-currency conversion and symbols", async () => {
  const files = await Promise.all([
    readFile(new URL("../FlightDetailsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8"),
    readFile(new URL("./MobileNativeFareRail.tsx", import.meta.url), "utf8"),
    readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of files) {
    for (const match of source.matchAll(/formatDisplayPrice\\(\\{[\\s\\S]*?\\}\\)/g)) {
      const call = match[0];
      if (!/sourceCurrency:/.test(call) || !/displayCurrency:/.test(call)) continue;
      assert.match(call, /convertSourceEstimate: true/);
      assert.match(call, /useFlightResultSymbols: true/);
      assert.match(call, /maximumFractionDigits: 0/);
      assert.doesNotMatch(call, /convertUsdEstimate: true/);
    }
  }
  const providerMoneySources = files.slice(1).join("\\n");
  assert.match(providerMoneySources, /formatFlightResultCurrency/);
  assert.doesNotMatch(providerMoneySources, /currencyDisplay: "code"/);
});

test("standalone UI preserves the approved desktop and mobile blueprint composition", async () => {
  const [source, mobileDeck] = await Promise.all([
    readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8"),
    readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(source, /max-w-\[1080px\] px-0 sm:px-6 lg:px-\[30px\]/);
  assert.doesNotMatch(source, /lg:grid-cols-\[minmax\(0,2\.45fr\)_minmax\(310px,0\.95fr\)\]/);
  assert.doesNotMatch(source, /data-desktop-checkout-summary|DesktopCheckoutSummary/);
  assert.doesNotMatch(source, /<aside className="[^"]*(?:sticky|fixed)|top-24/);
  assert.doesNotMatch(source, /function MobileCheckoutDock|function CheckoutButton|mobile-trip-total-heading/);
  assert.doesNotMatch(source, /fixed inset-x-0 bottom-0 z-\[90px\]|fixed inset-x-0 bottom-0 z-\[90\]/);
  assert.match(source, /pb-\[calc\(1\.75rem\+env\(safe-area-inset-bottom\)\)\][\s\S]*sm:pb-16/);
  assert.match(mobileDeck, /data-mobile-flight-deal-action/);
  assert.match(mobileDeck, />View deal</);
  assert.match(source, /role="tablist"/);
  assert.equal((source.match(/role="tab"/g) || []).length, 1);
  assert.deepEqual(["Compare deals", "Fare details", "Fare conditions", "Optional extras"].map((label) => source.includes(`label: "${label}"`)), [true, true, true, true]);
  assert.match(source, /useState<FareTab>\("deals"\)/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /ArrowRight[\s\S]*ArrowLeft/);
  assert.match(source, /data-desktop-fare-information-tabs[^>]*className="mt-5 hidden min-w-0 sm:flex lg:sticky lg:top-0 lg:z-40 lg:border-b lg:border-slate-200 lg:bg-white"/);
  assert.match(source, /min-h-11 flex-1 whitespace-nowrap border-b-\[3px\]/);
  assert.doesNotMatch(source, />Selected<\/span>/);
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_minmax\(120px,180px\)_minmax\(0,1fr\)\]/);
  assert.match(source, /border-dashed border-\[#075EE8\]/);
  assert.match(source, /offerAirlineLogo=\{flight\.airlineLogo\}/);
  assert.match(source, /<SegmentAirlineMark segment=\{segment\}/);
  assert.match(source, /onError=\{\(\) => setLogoFailed\(true\)\}/);
  assert.match(source, /fareChoices\.length === 1 \? "max-w-\[270px\]"/);
  assert.match(source, /fareChoices\.length === 2 \? "sm:grid-cols-2 lg:max-w-\[632px\]"/);
  assert.match(source, /md:grid-cols-3 lg:max-w-\[954px\]/);
  assert.match(source, /xl:max-w-\[1276px\] xl:grid-cols-4/);
  assert.match(source, /: "w-\[min\(100%,270px\)\] max-w-\[270px\]"/);
  assert.doesNotMatch(source, /: "w-full"/);
  const fareRailMarkup = source.slice(source.indexOf(`role="radiogroup"`), source.indexOf(`role="tablist"`));
  assert.match(fareRailMarkup, /min-h-\[154px\]/);
  assert.match(source, /w-\[min\(78vw,275px\)\] max-w-\[275px\] shrink-0 snap-center/);
  assert.doesNotMatch(source, /310px\)\] max-w-\[310px\]/);
  assert.match(source, /min-w-0 rounded-\[10px\]/);
  assert.match(source, /whitespace-normal break-words \[overflow-wrap:anywhere\].*\[word-break:normal\]/);
  assert.doesNotMatch(source, /text-overflow|ellipsis/);
  assert.match(source, /overflow-x-auto[\s\S]*sm:grid/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "nearest", inline: "nearest" \}\)/);
  assert.match(source, /max-w-\[1080px\] px-0 sm:px-6 lg:px-\[30px\]/);
  assert.match(source, /border-y border-\[#E2E8F0\][\s\S]*sm:rounded-\[13px\] sm:border[\s\S]*sm:shadow-/);
  assert.doesNotMatch(source, /<section className="[^"]*overflow-hidden[^"]*" aria-labelledby="flight-details-heading"/);
  assert.match(source, /data-testid="flight-details-hero"[^>]*className="[^"]*overflow-hidden[^"]*sm:rounded-t-\[12px\]/);
  assert.match(source, /ml-4.*sm:ml-0/);
  assert.match(source, /function FlightDetailsSkeleton[\s\S]*?<FlightDetailsLoadingShell/);
  assert.match(source, /function FlightDetailsUnavailable[\s\S]*?px-0 sm:px-4/);
  assert.doesNotMatch(source, /lg:max-w-\[400px\]/);
  assert.doesNotMatch(source, /rounded-full border-2/);
  assert.doesNotMatch(source, /pl-6/);
  assert.doesNotMatch(source, /bg-slate-50 px-5 py-3 lg:px-6/);
  assert.doesNotMatch(source, /providerOfferId|rawProviderReference/);
});

test("desktop Pick your fare cards mirror the native hierarchy without changing the mobile rail", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const desktopStart = source.indexOf('role="radiogroup" aria-label="Available fares"');
  const loadingStart = source.indexOf("data-desktop-fare-price-loading", desktopStart);
  const desktop = source.slice(desktopStart, loadingStart);
  const loadingEnd = source.indexOf("<MobileNativeFareInformationDeck", loadingStart);
  const loading = source.slice(loadingStart, loadingEnd);

  assert.ok(desktopStart > source.indexOf("<MobileNativeFareRail fares={fareChoices}"));
  assert.match(desktop, /data-desktop-fare-rail/);
  assert.match(desktop, /overflow-x-auto overscroll-x-contain/);
  assert.match(desktop, /sm:flex sm:snap-x sm:snap-mandatory/);
  assert.match(desktop, /data-desktop-fare-card[^>]*[\\s\\S]*?h-\\[150px\\] w-\\[250px\\] min-w-\\[250px\\] shrink-0 snap-start[\\s\\S]*?rounded-\\[15px\\] border-\\[1\\.5px\\]/);
  assert.match(desktop, /border-\[#075EE8\][\s\S]*?shadow-\[0_6px_16px/);
  assert.match(desktop, /border-\[#D7E0EC\][\s\S]*?shadow-\[0_2px_7px/);
  assert.doesNotMatch(desktop, /selected \? "[^"]*border-(?:2|\[2px\])/);
  assert.match(desktop, /data-desktop-fare-content className="min-w-0 pb-14"/);
  assert.match(desktop, /data-empty-benefits=\{!compactTerms\.length \|\| undefined\}/);
  assert.match(desktop, /data-desktop-fare-empty-benefits className="flex h-full min-w-0 flex-col items-center justify-center gap-5 pb-1"/);
  assert.match(desktop, /data-desktop-fare-identity className="mx-auto flex max-w-full items-center justify-center gap-\[7px\]"/);
  assert.match(desktop, /h-6 w-6 shrink-0[^"]*rounded-lg border/);
  assert.match(desktop, /line-clamp-2/);
  assert.match(desktop, /data-desktop-fare-benefits className="mt-1 space-y-1"/);
  assert.match(desktop, /data-desktop-fare-benefits[\s\S]*?<FareTerm[\s\S]*?data-desktop-fare-price/);
  assert.match(desktop, /\(\?:base\|total\)\\s\+price/);
  assert.match(desktop, /data-desktop-fare-price className="absolute inset-x-3 bottom-2 flex min-h-12 min-w-0 items-end justify-center"/);
  assert.match(desktop, /text-\[19px\] font-semibold[^"\n]*text-slate-950/);
  assert.doesNotMatch(desktop, /data-desktop-fare-price[\s\S]*?font-extrabold/);
  assert.doesNotMatch(desktop, /data-desktop-fare-price[\s\S]*?text-\[#075EE8\]/);
  assert.match(desktop, /tabular-nums[^"]*\[overflow-wrap:anywhere\]" aria-label=\{price\.ariaLabel\}>\{price\.formatted\}/);
  assert.match(desktop, /role="radio" aria-checked=\{selected\} tabIndex=\{selected \? 0 : -1\}/);
  assert.match(desktop, /onKeyDown=\{\(event\) => handleFareKeyDown\(event, index\)\}/);

  assert.match(loading, /data-desktop-fare-loading-card[\s\S]*?h-\[150px\] w-\[250px\] min-w-\[250px\] shrink-0[\s\S]*?rounded-\[15px\] border-\[1\.5px\]/);
  assert.match(loading, /pb-14[\s\S]*?justify-center gap-\[7px\][\s\S]*?space-y-\[5px\][\s\S]*?data-desktop-fare-loading-price className="absolute inset-x-3 bottom-2 flex min-h-12 items-end justify-center"/);
});

test("desktop compact fare cards shorten long provider benefit copy without changing mobile presentation", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const desktopStart = source.indexOf("data-desktop-fare-rail");
  const desktopEnd = source.indexOf("data-desktop-fare-price-loading", desktopStart);
  const desktop = source.slice(desktopStart, desktopEnd);
  const formatterStart = source.indexOf("function formatDesktopCompactFareBenefit");
  const formatterEnd = source.indexOf("function compactFareFeeAmount", formatterStart);
  const formatter = source.slice(formatterStart, formatterEnd);

  assert.match(desktop, /formatDesktopCompactFareBenefit\(row\.text\)/);
  assert.match(formatter, /Outbound\|Return\|Flight \\d\+/);
  assert.match(formatter, /Baggage not provided/);
  assert.match(formatter, /No additional fare benefits/);
  assert.match(formatter, /Change\/refund rules unavailable/);
  assert.match(formatter, /Refund rules unavailable/);
  assert.match(formatter, /Change rules unavailable/);
  assert.match(formatter, /Changes unavailable/);
  assert.match(formatter, /Refunds unavailable/);
  assert.match(formatter, /Changes not allowed/);
  assert.match(formatter, /Changes allowed/);
  assert.match(formatter, /Changes · .* fee/);
  assert.match(formatter, /Not refundable/);
  assert.match(formatter, /Refundable/);
  assert.match(formatter, /Refundable · .* fee/);
  assert.match(formatter, /Carry-on included/);
  assert.match(formatter, /Checked bag included/);
  assert.match(formatter, /withScope/);
  assert.doesNotMatch(formatter, /\\\\(?:d|s|\.)/);
  assert.match(source, /compactFareFeeAmount/);
  assert.doesNotMatch(
    source.slice(
      source.indexOf("<MobileNativeFareRail fares={fareChoices}"),
      desktopStart,
    ),
    /formatDesktopCompactFareBenefit/,
  );
});

test("desktop compact fare formatter handles multi-city scope without leaking provider prose", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function formatDesktopCompactFareBenefit");
  const end = source.indexOf("function compactFareFeeAmount", start);
  const formatter = source.slice(start, end);

  assert.match(formatter, /Flight \\d\+/);
  assert.match(formatter, /withScope\("Changes not allowed"\)/);
  assert.match(formatter, /withScope\("Changes allowed"\)/);
  assert.match(formatter, /withScope\("Not refundable"\)/);
  assert.match(formatter, /withScope\("Refundable"\)/);
  assert.match(formatter, /withScope\("Baggage not provided"\)/);
  assert.match(formatter, /No additional fare benefits/);
});

test("desktop compact fare benefit rows use smaller readable text and status icons", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const fareTermStart = source.indexOf("function FareTerm(");
  const fareTerm = source.slice(fareTermStart, source.indexOf("function ", fareTermStart + 20));

  assert.match(fareTerm, /compact \? "gap-\[5px\] text-\[11px\] leading-\[15px\]"/);
  assert.match(fareTerm, /compact \? "mt-px h-3\.5 w-3\.5"/);
  assert.match(fareTerm, /compact \? "h-\[9px\] w-\[9px\]"/);
  assert.match(fareTerm, /"gap-2 text-\[13px\] leading-5"/);
});

test("desktop Fare information uses underline-only tabs and unframed panels", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const tabsStart = source.indexOf("data-desktop-fare-information-tabs");
  const tabsEnd = source.indexOf('<div className="hidden sm:block">', tabsStart);
  const tabs = source.slice(tabsStart, tabsEnd);

  assert.match(tabs, /role="tablist" aria-label="Fare information"/);
  assert.match(tabs, /lg:sticky lg:top-0 lg:z-40/);
  assert.match(tabs, /lg:border-b lg:border-slate-200 lg:bg-white/);
  assert.doesNotMatch(tabs, /sm:sticky|sm:top-0/);
  assert.match(tabs, /role="tab"/);
  assert.match(tabs, /aria-selected=\{activeTab === tab\.id\}/);
  assert.match(tabs, /aria-controls=\{`fare-panel-\$\{tab\.id\}`\}/);
  assert.match(tabs, /tabIndex=\{activeTab === tab\.id \? 0 : -1\}/);
  assert.match(tabs, /onKeyDown=\{\(event\) => handleTabKeyDown\(event, index\)\}/);
  assert.match(tabs, /font-semibold text-\[#536B92\]/);
  assert.match(tabs, /activeTab === tab\.id \? "border-\[#075EE8\]" : "border-transparent"/);
  assert.doesNotMatch(tabs, /font-bold|font-extrabold|text-slate-950|overflow-x-auto/);

  assert.match(source, /function DesktopFarePanel/);
  assert.match(source, /data-desktop-fare-panel/);
  assert.match(source, /id=\{`fare-panel-\$\{id\}`\}/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /aria-labelledby=\{`fare-tab-\$\{id\}`\}/);
  assert.match(source, /className="py-4 sm:py-5"/);
  assert.doesNotMatch(source, /data-desktop-fare-panel[^>]*className="[^"]*(?:rounded|border|bg-white)/);
  assert.doesNotMatch(source, /No booking deals available/);
  assert.doesNotMatch(source, /No additional live provider deals were supplied for this fare\./);
  assert.match(source, /No fare price available/);
  assert.match(source, /The provider did not supply a usable price for this fare\./);
  assert.match(source, /divide-y divide-\[#D8E1EC\]/);
});

test("desktop Flight Details keeps price and booking action inside Compare deals", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const panelStart = source.indexOf("function CompareDealsPanel");
  const panelEnd = source.indexOf("function FareDetails", panelStart);
  const panel = source.slice(panelStart, panelEnd);

  assert.ok(panelStart >= 0 && panelEnd > panelStart);
  assert.match(panel, /data-desktop-flight-deal-list/);
  assert.match(panel, /data-desktop-flight-deal-card/);
  assert.match(panel, /data-desktop-flight-deal-action/);
  assert.match(panel, /className="max-w-\\[640px\\] space-y-2 py-1"/);
  assert.match(panel, /fallbackOffer\?\.bookingProviderName\?\.trim\(\)/);
  assert.match(panel, /fallbackOffer\?\.provider\?\.trim\(\)/);
  assert.match(panel, /displayedDeals = deals\.length/);
  assert.match(panel, /text-\[20px\] font-semibold leading-6/);
  assert.match(panel, /fare\?\.label \? `\$\{fare\.label\} · Trip total` : "Trip total"/);
  assert.doesNotMatch(panel, /data-desktop-flight-deal-benefits/);
  assert.match(panel, /"View deal"/);
  assert.match(panel, /"Unavailable"/);
  assert.match(panel, /h-9 w-\\[112px\\]/);
  assert.match(panel, /data-desktop-flight-provider-logo/);
  assert.match(panel, /min-h-\\[92px\\]/);
  assert.match(panel, /disabled=\{redirecting \|\| !canContinue\}/);
  assert.match(panel, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.doesNotMatch(source, /DesktopCheckoutSummary|data-desktop-checkout-summary/);
  assert.match(source, /function MobileCheckoutDock[\s\S]*?fixed inset-x-0 bottom-0[\s\S]*?lg:hidden/);
});

test("desktop loading shell no longer reserves a checkout sidebar", async () => {
  const source = await readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8");

  assert.match(source, /max-w-\[1080px\] px-0 sm:px-6 lg:px-\[30px\]/);
  assert.match(source, /aria-label="Loading flight details" className="min-w-0"/);
  assert.doesNotMatch(source, /data-desktop-checkout-summary-loading/);
  assert.doesNotMatch(source, /lg:grid-cols-\[minmax\(0,2\.45fr\)_minmax\(310px,0\.95fr\)\]/);
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



test("desktop Compare deals uses the shared Cars and Hotels price hierarchy", async () => {
  const source = await readFile(
    new URL("./StandaloneFlightDetails.tsx", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("function CompareDealsPanel");
  const end = source.indexOf("function FareDetails", start);
  const panel = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(panel, /deal\.providerName/);
  assert.match(panel, /price\.formatted/);
  assert.match(panel, /Trip total/);
  assert.match(panel, /View deal/);
  assert.match(panel, /rounded-xl border bg-white px-4 py-3/);
  assert.match(panel, /grid-cols-\\[minmax\\(0,1fr\\)_auto\\]/);
  assert.match(panel, /data-desktop-flight-deal-price[\s\S]*?mt-2 block min-w-0/);
  assert.match(panel, /inline-flex h-9 w-\\[112px\\]/);
  assert.match(panel, /data-provider-handoff-unavailable/);
  assert.match(panel, /disabled:bg-\\[#004BB8\\]/);
  assert.match(panel, /data-desktop-flight-deal-provider/);
  assert.match(panel, /deal\\.providerLogoUrl/);
  assert.match(panel, /BookingProviderLogo/);
  assert.doesNotMatch(source, /DUFFEL_PROVIDER_LOGO_URL/);
  assert.doesNotMatch(panel, /data-desktop-flight-deal-benefits/);
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

test("real handoff deals are grouped by fare, deduplicated, sorted, and public-safe", () => {
  process.env.FLIGHT_HANDOFF_PARTNERS_JSON = JSON.stringify({
    "american.test": "American Airlines",
    "agency.test": "Example Agency",
  });
  const offers = [
    fixture({ id: "aa-high", fareBrandName: "Basic", price: 210, partnerRedirectUrl: "https://american.test/high" }),
    fixture({ id: "aa-low", providerOfferId: "private-low", fareBrandName: "Basic", price: 188.61, partnerRedirectUrl: "https://american.test/low" }),
    fixture({ id: "agency", providerOfferId: "private-agency", fareBrandName: "Basic", price: 188.61, partnerRedirectUrl: "https://agency.test/book" }),
    fixture({ id: "no-handoff", providerOfferId: "private-none", fareBrandName: "Basic", price: 170, partnerRedirectUrl: "https://unconfigured.test/book" }),
  ];
  const [{ choice, memberOffers }] = buildMaterialFareChoices(offers);
  assert.equal(memberOffers.length, 4);
  assert.deepEqual(choice.deals.map(({ providerName, offerId, price, currency }) => ({ providerName, offerId, price, currency })), [
    { providerName: "American Airlines", offerId: "aa-low", price: 188.61, currency: "USD" },
    { providerName: "Example Agency", offerId: "agency", price: 188.61, currency: "USD" },
  ]);
  assert.doesNotMatch(JSON.stringify(choice), /private-low|private-agency|partnerRedirectUrl|bookingUrl|https:\/\//);
  assert.doesNotMatch(choice.deals.map(({ providerName }) => providerName).join(" "), /Duffel|Basic/);
});

test("fare choices are not manufactured into booking deals", () => {
  process.env.FLIGHT_HANDOFF_PARTNERS_JSON = JSON.stringify({ "seller.test": "Real Seller" });
  const choices = buildMaterialFareChoices([
    fixture({ fareBrandName: "Basic", partnerRedirectUrl: "https://seller.test/book" }),
    fixture({ id: "main", providerOfferId: "main-private", fareBrandName: "Main Cabin", price: 240 }),
    fixture({ id: "flex", providerOfferId: "flex-private", fareBrandName: "Flexible", price: 300 }),
  ]);
  assert.deepEqual(choices.map(({ choice }) => [choice.label, choice.deals.length]), [
    ["Basic", 1], ["Main Cabin", 0], ["Flexible", 0],
  ]);
});

test("details expose authoritative cabin class without provider secrets", async () => {
  const details = await buildStandaloneFlightDetails({ cachedSelected: fixture({ cabinClass: "business" }), cachedAlternatives: [fixture({ cabinClass: "business" })], search: { ...search, cabinClass: "business" }, now: 1, refresh: async ({ cachedOffer }) => ({ status: "confirmed", offer: cachedOffer }), discoverUpsells: noUpsells });
  assert.equal(details.status, "available");
  if (details.status === "available") assert.equal(details.search.cabinClass, "business");
  assert.doesNotMatch(JSON.stringify(details), /providerOfferId|rawProviderReference|partnerRedirectUrl|bookingUrl/);
});

test("Flight Details mobile web uses the native hero asset, geometry, curve, and screen-level controls", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const loadingSource = await readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8");
  await access("apps/mobile/assets/heroes/flight-details-hero.webp");
  assert.match(source, /data-testid="flight-details-hero"/);
  assert.match(source, /import flightDetailsHero from "\.\.\/\.\.\/\.\.\/\.\.\/apps\/mobile\/assets\/heroes\/flight-details-hero\.webp"/);
  assert.match(source, /min-h-\[318px\][\s\S]*pb-\[122px\][\s\S]*pt-\[calc\(env\(safe-area-inset-top\)\+64px\)\]/);
  assert.match(source, /data-flight-details-hero-curve/);
  assert.match(source, /M0 12 Q50 64 100 12 L100 64 L0 64 Z/);
  assert.match(source, /fixed left-4 top-\[calc\(env\(safe-area-inset-top\)\+8px\)\].*sm:hidden/);
  assert.match(source, /data-flight-details-mobile-floating-actions/);
  assert.match(source, /fixed right-4 top-\[calc\(env\(safe-area-inset-top\)\+8px\)\]/);
  assert.match(source, /h-11 w-\[88px\]/);
  assert.match(source, /aria-label=\{flightSaved \? "Remove saved flight" : "Save flight"\}/);
  assert.match(source, /aria-label="Share flight"/);
  assert.match(source, /mobileHeaderProtected \? "bg-\[#F3F6FA\]" : "bg-transparent"/);
  assert.match(source, /protectedHeight = \(mobileBackControlRef\.current\?\.getBoundingClientRect\(\)\.bottom \?\? 52\) \+ 12/);
  assert.match(loadingSource, /min-h-\[318px\]/);
  assert.match(loadingSource, /data-flight-details-loading-hero-curve/);
  assert.match(loadingSource, /fixed left-4 top-\[calc\(env\(safe-area-inset-top\)\+8px\)\]/);
  assert.match(loadingSource, /fixed right-4 top-\[calc\(env\(safe-area-inset-top\)\+8px\)\]/);
});

test("mobile web Flight Details removes the branded header and uses the native edge-to-edge available state", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const loading = await readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /<MobileFlightDetailsBrandHeader/);
  assert.doesNotMatch(loading, /<MobileFlightDetailsBrandHeader/);
  assert.match(source, /bg-\[#F3F6FA\]/);
  assert.match(source, /px-\[18px\] pb-4 pt-0/);
  assert.match(source, /data-mobile-native-itinerary-stack[\s\S]*-mx-\[10px\] -mt-\[104px\]/);
  assert.match(source, /data-flight-details-desktop-navigation/);
  assert.match(source, /aria-label="Back to flight results"/);
  assert.doesNotMatch(source, />Back to flight results<\/span>/);
  assert.match(source, /data-flight-details-desktop-actions/);
  assert.doesNotMatch(source, /data-flight-details-floating-actions/);
  assert.match(loading, /data-flight-details-loading-desktop-navigation/);
  assert.match(source, /function FlightDetailsUnavailable[\s\S]*Back to results/);
  assert.match(source, /const nativeTripLine = `[\\s\\S]*titleCase\(available\.search\.cabinClass\)/);
  assert.match(loading, /bg-\[#F3F6FA\]/);
  assert.match(loading, /data-mobile-native-itinerary-loading[\s\S]*-mx-\[10px\] -mt-\[104px\]/);
  assert.match(loading, /h-\[226px\]/);
});

test("desktop Flight Details overlays navigation controls on the hero image", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const loading = await readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8");
  const heroStart = source.indexOf('data-testid="flight-details-hero"');
  const heroEnd = source.indexOf("data-flight-details-hero-curve", heroStart);
  const hero = source.slice(heroStart, heroEnd);
  const navStart = hero.indexOf("data-flight-details-desktop-navigation");

  assert.ok(heroStart >= 0 && navStart >= 0);
  assert.match(
    hero,
    /data-flight-details-desktop-navigation[\s\S]*pointer-events-none absolute inset-x-0 top-0 z-20[\s\S]*sm:flex/,
  );
  assert.match(hero, /aria-label="Back to flight results"/);
  assert.match(hero, /data-flight-details-desktop-actions/);
  assert.match(hero, /aria-label=\{flightSaved \? "Remove saved flight" : "Save flight"\}/);
  assert.match(hero, /aria-label="Share flight"/);
  assert.match(hero, /rounded-full border border-white\/55 bg-white\/90/);
  assert.match(hero, /backdrop-blur-md/);
  assert.doesNotMatch(source.slice(0, heroStart), /data-flight-details-desktop-navigation/);
  assert.doesNotMatch(hero, /data-flight-details-desktop-compact-booking/);
  assert.match(
    loading,
    /data-flight-details-loading-desktop-navigation[\s\S]*pointer-events-none absolute inset-x-0 top-0 z-20[\s\S]*sm:flex/,
  );
});

test("Flight Details mobile cleanup uses native fare rail behavior and fare information", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const fareSource = await readFile(new URL("./MobileNativeFareRail.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /FlightEditSearchDrawer|editSearchLauncherRef|setEditSearchOpen|submitEditedSearch/);
  assert.match(source, /<MobileNativeFareRail fares=\{fareChoices\}/);
  assert.match(source, /data-mobile-native-fare-price-loading/);
  assert.match(source, /mobilePricesReady = !currencyRates\.isLoading/);
  assert.match(source, /Loading price…/);

  assert.match(fareSource, /data-mobile-native-fare-rail/);
  assert.match(fareSource, /gap-\[10px\].*pb-\[18px\].*pt-3.*pr-\[38px\]/);
  assert.match(fareSource, /w-\[clamp\(197px,calc\(197px\+\(100vw-320px\)\*0\.27\),217px\)\]/);
  assert.match(fareSource, /min-h-\[142px\]/);
  assert.match(fareSource, /rounded-\[15px\] border-\[1\.5px\]/);
  assert.match(fareSource, /text-\[19px\] font-semibold leading-\[23px\] tabular-nums/);
  assert.match(fareSource, /nativeFareBenefitRows\(/);
  assert.match(fareSource, /aria-expanded=\{expanded\}/);
  assert.match(fareSource, /Price unavailable/);
  assert.doesNotMatch(fareSource, /getCenteredFareScrollLeft|rail\.scrollTo|snap-mandatory|snap-start/);
});

test("mobile web Fare information deck mirrors native tabs and selection-only deal cards", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const deck = await readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8");

  assert.match(source, /<MobileNativeFareInformationDeck/);
  assert.match(source, /pricesReady=\{mobilePricesReady\}/);
  assert.match(deck, /data-mobile-native-fare-information-deck/);
  assert.match(deck, /<div ref=\{fareInformationTouchRailRef\} className="[^"]*touch-pan-y[^"]*overflow-x-auto[^"]*">\s*<div role="tablist" aria-label="Fare information"/);
  assert.doesNotMatch(deck, /touch-pan-x/);
  assert.doesNotMatch(deck, /useHorizontalRailAxisLockRef/);
  assert.match(deck, /role="tablist" aria-label="Fare information"/);
  assert.match(deck, /min-h-\[48px\]/);
  assert.match(deck, /gap-\[14px\]/);
  assert.match(deck, /flight-mobile-fare-info-tab-label/);
  assert.doesNotMatch(deck, /text-\[12px\] leading-4/);
  assert.match(deck, /style=\{\{ color: "#536B92" \}\}/);
  assert.doesNotMatch(deck, /color: selected \?/);
  assert.doesNotMatch(deck, /fontWeight: selected \?/);
  const styles = await readFile(new URL("../../../app/globals.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /@media \(max-width: 639px\) \{[\s\S]*?\.flight-mobile-fare-info-tab-label \{[\s\S]*?font-size: 14px !important;[\s\S]*?line-height: 20px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?-webkit-text-size-adjust: none;[\s\S]*?text-size-adjust: none;[\s\S]*?\}/,
  );
  assert.match(deck, /selected \? <span className="absolute -bottom-px left-0\.5 right-0\.5 h-\[3px\] rounded-\[2px\] bg-\[#0754F7\]"/);
  assert.match(deck, /left-0\.5 right-0\.5 h-\[3px\] rounded-\[2px\]/);

  assert.match(deck, /role="radiogroup" aria-label="Flight deal options"/);
  assert.match(deck, /min-h-24.*rounded-\[14px\]/);
  assert.match(deck, /priceAvailable = pricesReady/);
  assert.match(deck, /priceAvailable \? price\.formatted : "—"/);
  assert.doesNotMatch(deck, /View deal|onViewDeal/);
});

test("mobile web Fare information surfaces match native information hierarchy", async () => {
  const deck = await readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8");

  assert.match(deck, /<GroupLabel>Cabin<\/GroupLabel>/);
  assert.match(deck, /<GroupLabel>On board<\/GroupLabel>/);
  assert.match(deck, /<GroupLabel>Price breakdown<\/GroupLabel>/);
  assert.match(deck, /Estimated CO₂ emissions/);
  assert.match(deck, /Provider offer last updated/);
  assert.match(deck, /Fare conditions unavailable/);
  assert.match(deck, /<StatusIcon semantic=\{semantic\} \/>/);
  assert.match(deck, /<GroupLabel>Travel documents<\/GroupLabel>/);
  assert.match(deck, /<GroupLabel>Airline<\/GroupLabel>/);
  assert.match(deck, /conditions of carriage/);
  assert.match(deck, /<GroupLabel>Optional services<\/GroupLabel>/);
  assert.match(deck, /Maximum quantity per traveler/);
  assert.match(deck, /<GroupLabel>Loyalty programmes<\/GroupLabel>/);
  assert.doesNotMatch(deck, /rounded-\[10px\] border border-\[#E2E8F0\] p-4/);
});

test("mobile Compare deals owns booking actions without a fixed checkout dock", async () => {
  const [source, mobileDeck, loading] = await Promise.all([
    readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8"),
    readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8"),
    readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /nativeFlightDealSelection\(selectedDealOfferId, selectedFare\)/);
  assert.match(source, /const activeOffer = selectedDeal\?\.offer \?\? selectedOffer/);
  assert.match(source, /<MobileNativeFareInformationDeck[\s\S]*?redirecting=\{redirecting\}[\s\S]*?onViewDeal=\{continueToOffer\}/);
  assert.doesNotMatch(source, /MobileCheckoutDock|CheckoutButton|mobilePriceCandidate|canContinueMobile|mobile-trip-total-heading/);
  assert.doesNotMatch(source, /fixed inset-x-0 bottom-0 z-\[90\]/);

  assert.match(mobileDeck, /const displayedDeals = deals\.length/);
  assert.match(mobileDeck, /fallbackOffer\?\.bookingProviderName\?\.trim\(\)/);
  assert.match(mobileDeck, /fallbackOffer\?\.provider\?\.trim\(\)/);
  assert.match(mobileDeck, /data-mobile-flight-deal-list/);
  assert.match(mobileDeck, /data-mobile-flight-deal-card/);
  assert.match(mobileDeck, /data-mobile-flight-deal-action/);
  assert.match(mobileDeck, /data-mobile-flight-provider-logo/);
  assert.match(mobileDeck, /fare\?\.label \? `\$\{fare\.label\} · Trip total` : "Trip total"/);
  assert.match(mobileDeck, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.match(mobileDeck, /redirecting \? "Opening…" : "View deal"/);
  assert.match(mobileDeck, /disabled=\{redirecting \|\| !canContinue\}/);
  assert.doesNotMatch(mobileDeck, /No booking deals available|No additional live provider deals were supplied for this fare/);

  assert.doesNotMatch(loading, /fixed inset-x-0 bottom-0 z-\[90\]/);
  assert.doesNotMatch(loading, /min-h-\[88px\].*rounded-t-\[22px\]/);
  assert.match(loading, /pb-\[calc\(1\.75rem\+env\(safe-area-inset-bottom\)\)\][\s\S]*sm:pb-7/);
});

test("mobile fare rail starts naturally and preserves manual horizontal scrolling", async () => {
  const fareSource = await readFile(new URL("./MobileNativeFareRail.tsx", import.meta.url), "utf8");
  assert.match(fareSource, /overflow-x-auto/);
  assert.match(fareSource, /scrollIntoView\(\{ behavior: "smooth", block: "nearest", inline: "nearest" \}\)/);
  assert.doesNotMatch(fareSource, /useEffect\(|scrollTo\(|getCenteredFareScrollLeft|snap-mandatory|snap-start/);
});

test("mobile web Flight Details uses the refined fare typography without changing fare geometry", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const fareSource = await readFile(new URL("./MobileNativeFareRail.tsx", import.meta.url), "utf8");

  assert.match(source, /text-\[16px\] font-medium leading-\[21px\][^\"]*sm:text-\[18px\] sm:font-semibold sm:leading-tight[^\"]*">Pick your fare<\/h2>/);
  assert.match(fareSource, /text-\[19px\] font-semibold leading-\[23px\] tabular-nums/);
  assert.match(fareSource, /gap-\[10px\].*overflow-x-auto.*pb-\[18px\].*pt-3.*pr-\[38px\]/);
  assert.match(fareSource, /min-h-\[142px\] w-\[clamp\(197px,calc\(197px\+\(100vw-320px\)\*0\.27\),217px\)\]/);
  assert.doesNotMatch(fareSource, /text-\[19px\] font-extrabold leading-\[23px\] tabular-nums/);
});

test("itinerary headers use authoritative per-leg dates with a localized year", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  assert.equal(formatItineraryDepartureDate("2026-10-16", "en-US"), "Oct 16, 2026");
  assert.match(source, /departureDate=\{available\.search\.legs\[index\]\?\.departureDate \?\? leg\.departureTime\.slice\(0, 10\)\}/);
  assert.match(source, /<time dateTime=\{leg\.departureTime\}/);
  assert.match(source, /const departureLongDate = providerLocalFlightDateLong\(leg\.departureTime, locale\) \?\? formatItineraryDepartureDate\(departureDate, locale\)/);
  assert.match(source, /available\.search\.tripType === "multi-city" \? `FLIGHT \$\{index \+ 1\}`/);
});

test("mobile web Flight Details itinerary mirrors the native card hierarchy and surface treatment", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const start = source.indexOf("function ItineraryCard(");
  const end = source.indexOf("function FareTerm(", start);
  const itinerary = source.slice(start, end);

  assert.match(source, /data-mobile-native-itinerary-stack/);
  assert.match(source, /-mx-\[10px\] -mt-\[104px\] space-y-\[14px\]/);
  assert.match(itinerary, /data-mobile-native-itinerary-card/);
  assert.match(itinerary, /rounded-\[15px\].*border-\[#E1E7EF\].*bg-white.*shadow-\[0_6px_18px_rgba\(7,19,59,0\.14\)\]/);
  assert.match(itinerary, /data-flight-details-itinerary-gloss/);
  assert.match(itinerary, /linear-gradient\(135deg,rgba\(255,255,255,0\.78\)_0%,rgba\(255,255,255,0\.18\)_46%,rgba\(255,255,255,0\)_100%\)/);
  assert.match(itinerary, /text-\[19px\] font-extrabold leading-6 tabular-nums/);
  assert.match(itinerary, /providerLocalFlightDate\(leg\.departureTime, locale\)/);
  assert.match(itinerary, /providerLocalFlightDate\(leg\.arrivalTime, locale\)/);
  assert.match(itinerary, /h-1\.5 w-1\.5.*bg-\[#075EE8\][\s\S]*h-px.*bg-\[#94A3B8\]\/60[\s\S]*<NativeFlightGlyph className="h-4 w-4 shrink-0 text-\[#075EE8\]"/);
  assert.match(itinerary, /const stopStatus = leg\.stops === 0 \? "Non-stop" :/);
  assert.match(itinerary, /data-flight-details-connection-row/);
  assert.match(itinerary, /<Clock3 className="h-\[13px\] w-\[13px\] shrink-0 text-\[#5D7496\]"/);
  assert.match(itinerary, /preferSegmentLogo/);
  assert.match(itinerary, /Aircraft: \{aircraftName\}/);
  assert.match(itinerary, /Flight distance: \{formatDistanceKm\(segment\.distanceKm, locale\)\}/);
  assert.match(itinerary, />Flight info<\/p>/);
  assert.doesNotMatch(itinerary.slice(0, itinerary.indexOf("data-desktop-itinerary-card")), /Technical stop at/);
  assert.match(
    itinerary,
    /data-desktop-itinerary-card[^>]*className="hidden[^"]*sm:block[^"]*sm:shadow-\[0_6px_18px_rgba\(7,19,59,0\.10\)\]/,
  );
});

test("desktop Flight Details uses a compact endpoint hierarchy and reserves time zones for Flight info", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  const itineraryStart = source.indexOf("function ItineraryCard(");
  const desktopStart = source.indexOf("data-desktop-itinerary-card", itineraryStart);
  const desktopEnd = source.indexOf("</section>", desktopStart);
  const desktop = source.slice(desktopStart, desktopEnd);
  const journeyStart = desktop.indexOf("data-desktop-journey-summary");
  const airportStart = desktop.indexOf("data-desktop-airport-details");
  const segmentsStart = desktop.indexOf("data-desktop-segment-list");
  const flightInfoStart = desktop.indexOf("data-desktop-flight-info");
  const endpoints = desktop.slice(journeyStart, airportStart);
  const airportDetails = desktop.slice(airportStart, segmentsStart);
  const flightInfo = desktop.slice(flightInfoStart);

  assert.ok(desktopStart > itineraryStart);
  assert.deepEqual(
    [journeyStart, airportStart, segmentsStart, flightInfoStart].sort((a, b) => a - b),
    [journeyStart, airportStart, segmentsStart, flightInfoStart],
  );
  assert.match(endpoints, /<AirportTime time=\{leg\.departureTime\} airport=\{leg\.originAirport\} date=\{departureShortDate\}/);
  assert.match(endpoints, /<AirportTime time=\{leg\.arrivalTime\} airport=\{leg\.destinationAirport\} date=\{arrivalShortDate\}/);
  assert.doesNotMatch(endpoints + airportDetails, /timeZone=|Time zone:/);
  assert.match(airportDetails, /airportName\(departurePoint, leg\.originAirport\)/);
  assert.match(airportDetails, /airportName\(arrivalPoint, leg\.destinationAirport\)/);
  assert.match(desktop, /preferSegmentLogo/);
  assert.match(desktop, /Flight distance: \{formatDistanceKm\(segment\.distanceKm, locale\)\}/);
  assert.match(desktop, /Operated by \{segment\.operatingCarrier\.name\}/);
  assert.match(desktop, /Aircraft:/);
  assert.match(desktop, /segment\.technicalStops\?\.map/);
  assert.match(flightInfo, />Flight info<\/h3>/);
  assert.match(flightInfo, /departureTimeZone === arrivalTimeZone/);
  assert.match(flightInfo, />Time zone<\/dt>/);
  assert.match(flightInfo, />Departure time zone<\/dt>/);
  assert.match(flightInfo, />Arrival time zone<\/dt>/);
  assert.match(flightInfo, /\{departureTimeZone\}<\/dd>/);
  assert.match(flightInfo, /\{arrivalTimeZone\}<\/dd>/);
  assert.match(source, /legs\.map\(\(leg, index\) => <ItineraryCard/);
});

test("mobile web Flight Details loading itinerary matches native-parity geometry", async () => {
  const source = await readFile(new URL("./FlightDetailsLoadingShell.tsx", import.meta.url), "utf8");
  assert.match(source, /bg-\[#F3F6FA\]/);
  assert.match(source, /min-h-\[318px\]/);
  assert.match(source, /pb-\[122px\]/);
  assert.match(source, /data-mobile-native-itinerary-loading/);
  assert.match(source, /-mx-\[10px\] -mt-\[104px\]/);
  assert.match(source, /rounded-\[15px\].*border-\[#E1E7EF\].*bg-white.*shadow-\[0_6px_18px_rgba\(7,19,59,0\.14\)\]/);
  assert.match(source, /linear-gradient\(135deg,rgba\(255,255,255,0\.78\)_0%,rgba\(255,255,255,0\.18\)_46%,rgba\(255,255,255,0\)_100%\)/);
  assert.match(source, /sm:rounded-\[10px\] sm:border-slate-200 sm:bg-slate-100 sm:shadow-lg/);
  assert.match(source, /data-mobile-native-fare-loading/);
  assert.match(source, /h-\[142px\] w-\[clamp\(197px,calc\(197px\+\(100vw-320px\)\*0\.27\),217px\)\]/);
  assert.match(source, /rounded-\[15px\] border-\[1\.5px\] border-\[#D7E0EC\] bg-white/);
  assert.match(source, /gap-\[10px\].*pb-\[18px\].*pr-\[38px\]/);
  assert.match(source, /\{\[0, 1\]\.map/);
  assert.match(source, /data-flight-details-loading-hero-curve/);
  assert.doesNotMatch(source, /fixed inset-x-0 bottom-0 z-\[90\].*min-h-\[88px\]/);
});


test("desktop Fare information uses the native semantic hierarchy without changing the reference surfaces", async () => {
  const [source, mobileWeb, native] = await Promise.all([
    readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8"),
    readFile(new URL("./MobileNativeFareInformationDeck.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../../../apps/mobile/src/features/search/NativeFlightDetails.tsx", import.meta.url), "utf8"),
  ]);
  const desktop = source.slice(source.indexOf("function FarePanel("), source.indexOf("function formatProviderTimestamp"));

  for (const label of ["Cabin", "On board", "Price breakdown", "Travel documents", "Airline", "Optional services", "Loyalty programmes"]) {
    assert.match(desktop, new RegExp(`(?:label=\\"${label}\\"|>${label}<)`));
  }
  for (const fact of ["Fare brand", "Cabin product", "Fare basis", "Seat", "Wi-Fi", "Power", "Base fare", "Taxes", "Trip total"]) assert.match(desktop, new RegExp(fact));
  assert.match(desktop, /segment\.originAirport} → \{segment\.destinationAirport/);
  assert.match(desktop, /cabins\.map/);
  assert.match(desktop, /strong(?:\s|\n)*\/>/);
  assert.match(desktop, /<EmissionsRow/);
  assert.match(source, /Estimated CO₂ emissions/);
  assert.match(desktop, /Provider offer last updated/);
  assert.match(desktop, /divide-y divide-\[#D8E1EC\]/);
  assert.match(desktop, /<dl/);
  assert.match(desktop, /<dt/);
  assert.match(desktop, /<dd/);

  assert.match(desktop, /new Set\(conditions\.map/);
  assert.match(desktop, /conditionState\(condition\)/);
  assert.match(desktop, /conditionScope\(condition\)/);
  assert.match(desktop, /penaltyAmount/);
  assert.match(desktop, /Passport or identity information is required to complete\s+booking/);
  assert.match(desktop, /target="_blank"/);
  assert.match(desktop, /rel="noopener noreferrer"/);

  assert.match(desktop, /service\.description/);
  assert.match(desktop, /formatSourceMoney\(\s*service\.price,\s*service\.currency,\s*locale,?\s*\)/);
  assert.match(desktop, /Available for \{service\.travelerCount\}/);
  assert.match(desktop, /Maximum quantity per traveler/);
  assert.match(desktop, /service\.journeyContext/);

  assert.match(desktop, /role="radiogroup"/);
  assert.match(desktop, /aria-label="Flight deal options"/);
  assert.match(desktop, /role="radio"/);
  assert.match(desktop, /aria-checked=\{selected\}/);
  assert.match(desktop, /resolveDealIdentityMark\(deal\)/);
  assert.match(desktop, /fare\?\.label/);
  assert.match(desktop, /price\.formatted/);
  assert.doesNotMatch(desktop, /No booking deals available/);
  assert.doesNotMatch(desktop, /No additional live provider deals were supplied for this fare/);
  assert.match(desktop, /No fare price available/);
  assert.match(desktop, /The provider did not supply a usable price for this fare/);
  assert.match(desktop, /data-desktop-fare-panel/);
  assert.doesNotMatch(desktop, /rounded-\[10px\] border border-\[#E2E8F0\] p-4/);
  assert.match(desktop, /role="tabpanel"/);

  assert.match(mobileWeb, /function DetailsSurface/);
  assert.match(native, /groupLabel\("Optional services"\)/);
});


test("desktop selected deal drives fare information and the Compare deals action", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  assert.match(source, /const activeOffer = selectedDeal\?\.offer \?\? selectedOffer/);
  assert.match(source, /<FarePanel activeTab=\{activeTab\} fare=\{selectedFare\} offer=\{activeOffer\}[\s\S]*?selectedDealOfferId=\{selectedDeal\?\.offerId \?\? null\}[\s\S]*?onSelectDeal=\{setSelectedDealOfferId\}/);
  assert.match(source, /<MobileNativeFareInformationDeck[\s\S]*?activeOffer=\{activeOffer\}[\s\S]*?onViewDeal=\{continueToOffer\}/);
  assert.match(source, /onSelectDeal\(deal\.offerId\);\s*onViewDeal\(deal\.offerId\)/);
  assert.match(source, /tabIndex=\{selected \? 0 : -1\}/);
  assert.doesNotMatch(source, /DesktopCheckoutSummary|data-desktop-checkout-summary/);
});

test("Flight Details invalidates shared saved-flight result state after account mutations", async () => {
  const source = await readFile(new URL("./StandaloneFlightDetails.tsx", import.meta.url), "utf8");
  assert.match(source, /invalidateSavedFlightsClientCache/);
  assert.match(source, /setSavedFlightBackendId\(null\); invalidateSavedFlightsClientCache\(\)/);
});


test("desktop Flight Details has no sticky checkout rail", async () => {
  const source = await readFile(
    new URL("./StandaloneFlightDetails.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /DesktopCheckoutSummary|data-desktop-checkout-summary/);
  assert.doesNotMatch(source, /lg:sticky lg:top-6 lg:block/);
  assert.match(source, /data-desktop-flight-deal-action/);
});

test("desktop Flight Details hero actions stay icon-only while booking lives in Compare deals", async () => {
  const source = await readFile(
    new URL("./StandaloneFlightDetails.tsx", import.meta.url),
    "utf8",
  );
  const heroStart = source.indexOf('data-testid="flight-details-hero"');
  const heroEnd = source.indexOf("data-flight-details-hero-curve", heroStart);
  assert.ok(heroStart >= 0 && heroEnd > heroStart);
  const hero = source.slice(heroStart, heroEnd);

  assert.match(hero, /aria-label="Back to flight results"/);
  assert.match(hero, /aria-label=\{flightSaved \? "Remove saved flight" : "Save flight"\}/);
  assert.match(hero, /aria-label="Share flight"/);
  assert.doesNotMatch(hero, />Back to flight results<\/span>/);
  assert.doesNotMatch(hero, /<span>\{flightSaved \? "Saved" : "Save"\}<\/span>/);
  assert.doesNotMatch(hero, /<span>Share<\/span>/);
  assert.doesNotMatch(hero, /data-flight-details-desktop-compact-booking/);
  assert.doesNotMatch(hero, /data-flight-details-desktop-compact-price/);
  assert.doesNotMatch(hero, /data-flight-details-desktop-compact-cta/);
  assert.doesNotMatch(source, /data-desktop-checkout-summary/);
  assert.match(source, /data-desktop-flight-deal-action/);
});

