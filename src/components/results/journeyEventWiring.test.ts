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

test("real result-card activation records selection before existing navigation without instrumenting scroll or save", () => {
  const flight = source("./FlightCard.tsx");
  const mobile = source("./MobileFlightCard.tsx");
  const hotel = source("./HotelCard.tsx");
  assert.match(flight, /recordSelection\(\);\s*router.push\(resolvedDetailsHref\)/);
  assert.match(flight, /onClick=\{onSelect\}/);
  assert.match(mobile, /onSelect\?\.\(\); router.push\(detailsHref\)/);
  assert.equal((hotel.match(/onClick=\{recordSelection\}/g) ?? []).length, 2);
  assert.match(hotel, /journeyEvents.offerSelected\("hotel", hotel.id, hotel.provider, searchRequestId\)/);
});

test("normal flight and hotel detail handoffs record the selected offer independently of server handoff logging", () => {
  const flight = source("./flightDetails/StandaloneFlightDetails.tsx");
  const mobileFare = source("./flightDetails/MobileNativeFareInformationDeck.tsx");
  const hotel = source("./HotelDetailsClient.tsx");
  assert.match(flight, /function selectFare[\s\S]*?journeyEvents.offerSelected\("flight", id, fare.offer.provider\)/);
  assert.match(flight, /async function continueToOffer[\s\S]*?journeyEvents.offerSelected[\s\S]*?fetch\("\/api\/redirect"/);
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
