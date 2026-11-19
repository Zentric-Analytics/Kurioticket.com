import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

test("both results surfaces use the response request ID and gate emission on visible current inventory", () => {
  for (const file of ["./FlightResultsClient.tsx", "./HotelResultsClient.tsx"]) {
    const text = source(file);
    assert.match(text, /requestId: journeyRequestId\(data.requestId\)/);
    assert.match(text, /displayedJourneyRequest\(\{ response: journeyResponse, currentSearchKey:/);
    assert.match(text, /useEffect\(\(\) => \{ journeyEvents.resultsViewed\(visibleJourneyRequestId\); \}/);
    assert.match(text, /searchRequestId=\{visibleJourneyRequestId\}/);
  }
});

test("opening flight or hotel details does not count as selecting an offer", () => {
  const flight = source("./FlightCard.tsx");
  const mobile = source("./MobileFlightCard.tsx");
  const hotel = source("./HotelCard.tsx");
  assert.match(flight, /router\.push\(resolvedDetailsHref\)/);
  assert.match(flight, /detailsHref=\{resolvedDetailsHref\}/);
  assert.doesNotMatch(flight, /recordSelection|journeyEvents\.offerSelected|onSelect=\{recordSelection\}/);
  assert.doesNotMatch(hotel, /recordSelection|journeyEvents\.offerSelected/);
  assert.match(hotel, /href=\{resolvedDetailsHref\}/);
  assert.match(mobile, /router\.push\(detailsHref\)/);
  // The results cards no longer wire a selection callback to mobile or desktop navigation.
  assert.doesNotMatch(flight, /onSelect=\{/);
});

test("normal flight and hotel detail handoffs record the selected offer independently of server handoff logging", () => {
  const flight = source("./flightDetails/StandaloneFlightDetails.tsx");
  const mobileFare = source("./flightDetails/MobileNativeFareInformationDeck.tsx");
  const hotel = source("./HotelDetailsClient.tsx");
  assert.doesNotMatch(flight.slice(flight.indexOf("function selectFare("), flight.indexOf("function handleFareKeyDown(")), /journeyEvents\\.offerSelected/);
  assert.match(flight, /async function continueToOffer[\\s\\S]*?journeyEvents.offerSelected[\\s\\S]*?fetch\\("\\/api\\/redirect"/);
  assert.doesNotMatch(flight.slice(flight.indexOf("function selectDeal("), flight.indexOf("function handleFareKeyDown(")), /journeyEvents\\.offerSelected/);
  assert.match(flight, /onSelectDeal\(deal.offerId, true\);\s*onViewDeal\(deal.offerId\)/);
  assert.match(mobileFare, /onSelectDeal\(deal.offerId, true\);\s*onViewDeal\(deal.offerId\)/);
  assert.match(hotel, /async function runProviderRedirect[\s\S]*?journeyEvents.offerSelected\("hotel", id, selectedOffer.provider\)[\s\S]*?fetch\("\/api\/redirect"/);
  assert.match(hotel, /onSelect=\{\(\) => setSelectedRoomId\(option.id\)\}/, "indicative planning-room choices are not actual provider offers");
  assert.match(source("./FlightDetailsClient.tsx"), /journeyEvents.offerSelected\("flight", flight.id, flight.provider\)/);
});

test("handoffs carry the original result selection context for alternate fares and hotel rates", () => {
  const flight = source("./flightDetails/StandaloneFlightDetails.tsx");
  const hotel = source("./HotelDetailsClient.tsx");
  assert.match(flight, /const handoff = journeyEvents.prepareHandoff\("flight", id\)/);
  assert.match(flight, /JSON.stringify\(\{ id: offerId, type: "flight", sourcePage: "flight_details", \.\.\.handoff\(\) \}\)/);
  assert.match(hotel, /const handoff = journeyEvents.prepareHandoff\("hotel", id\)/);
  assert.match(hotel, /id: offerId,[\s\S]*?type: "hotel",[\s\S]*?\.\.\.handoff\(\)/);
  const redirect = source("./RedirectClient.tsx");
  assert.match(redirect, /action.current\?\.key !== key/);
  assert.match(redirect, /\.\.\.action.current.metadata\(\)/);
  assert.doesNotMatch(redirect, /params.get\("(?:requestId|handoffId|visitorToken)"\)/);
});
