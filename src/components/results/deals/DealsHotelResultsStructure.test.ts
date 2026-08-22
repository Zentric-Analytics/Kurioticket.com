import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { translations } from "../../../lib/i18n/en";

test("guided Hotel results use truthful stay-details action copy", () => {
  assert.equal(
    translations["deals.guided.hotelResults.viewRooms"],
    "View stay details",
  );
  assert.equal(
    translations["deals.guided.hotelResults.viewRoomsFor"],
    "View stay details for {{hotelName}}",
  );
});

test("guided Hotel results adapt the shared results experience and HotelCard", async () => {
  const [stage, shared, card] = await Promise.all([
    readFile(new URL("./DealsHotelResultsStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../HotelResultsClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../HotelCard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(stage, /<HotelResultsExperience/);
  assert.match(stage, /buildDealsHotelDetailsJourneyUrl/);
  for (const forbidden of [
    "HotelSearchBar",
    "<main",
    "<h1",
    "/api/flights",
    "/api/cars",
    "writeDealsStagedJourneyPlan",
    "confirmDealsHotelRoom",
  ])
    assert.doesNotMatch(stage, new RegExp(forbidden));
  assert.match(shared, /<HotelCard/);
  assert.match(shared, /allowExternalAttribution=\{!guided\}/);
  assert.match(card, /allowExternalAttribution && isSafeHttpUrl/);
  assert.match(shared, /buildDetailsHref\?\.\(hotel\.id\) \?\? null/);
  assert.doesNotMatch(shared, /detailsHref=\{guided \?[^\n]*"#"/);
  assert.match(shared, /packages\.guided\.hotelResults\.viewRooms/);
  assert.match(shared, /packages\.guided\.hotelResults\.viewRoomsFor/);
  assert.match(shared, /packages\.guided\.hotelResults\.roomsUnavailableFor/);
  assert.match(card, /hotelResults\.estimatedStayTotal/);
  assert.match(card, /hotelResults\.pricePerNight/);
  assert.doesNotMatch(card, /package total/i);
  assert.match(card, /resolvedDetailsHref === null/);
});

test("guided Hotel Retry has a shared loading and completion focus lifecycle", async () => {
  const shared = await readFile(
    new URL("../HotelResultsClient.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(
    (shared.match(/onClick=\{retryGuidedHotelSearch\}/g) ?? []).length,
    2,
  );
  assert.match(shared, /retryFocusPendingRef\.current = true/);
  assert.match(
    shared,
    /guidedLoadingStatusRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(shared, /finalTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(shared, /retryFocusPendingRef\.current = false/);
  assert.match(shared, /ref=\{guidedLoadingStatusRef\}[^>]*tabIndex=\{-1\}/);
  assert.match(shared, /ref=\{guidedResultsHeadingRef\}[^>]*tabIndex=\{-1\}/);
  assert.match(
    shared,
    /ref=\{guided \? guidedErrorRef : undefined\}[\s\S]*?tabIndex=\{guided \? -1 : undefined\}/,
  );
});

test("guided Hotel results are a labelled region without a nested main", async () => {
  const shared = await readFile(
    new URL("../HotelResultsClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    shared,
    /role: "region", "aria-labelledby": "deals-guided-hotel-results-heading"/,
  );
  assert.match(
    shared,
    /<h2 ref=\{guidedResultsHeadingRef\} id="deals-guided-hotel-results-heading"/,
  );
  assert.match(shared, /const ResultsRoot = guided \? "div" : "main"/);
});

test("guided Hotel details uses shared details experience without provider exits", async () => {
  const [shell, stage, client] = await Promise.all([
    readFile(new URL("./DealsJourneyShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("./DealsHotelDetailsStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../HotelDetailsClient.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(shell, /<DealsHotelDetailsStage/);
  assert.match(stage, /<HotelDetailsClient/);
  assert.match(client, /mode === "guided"/);
  assert.match(client, /buildDealsHotelDetailsApiParams/);
  assert.match(client, /AbortController/);
  assert.match(client, /setResultReceivedAt\(Date\.now\(\)\)/);
  assert.doesNotMatch(
    stage,
    /writeDealsStagedJourneyPlan|writeDealsTripPlan|\/api\/redirect|window\.location|bookingUrl|partnerRedirectUrl/,
  );
});
