import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientUrl = new URL("../FlightResultsClient.tsx", import.meta.url);
const stageUrl = new URL("./DealsFlightResultsStage.tsx", import.meta.url);
const cardUrl = new URL("../FlightCard.tsx", import.meta.url);

test("guided Flight results keep request hydration and URL side effects local", async () => {
  const source = await readFile(clientUrl, "utf8");
  const nearbyEffectStart = source.lastIndexOf("const activeRequests = nearbyFareRequestsRef.current", source.indexOf("if (guidedMode) {\n      nearbyFareCacheRef.current.clear()"));
  const guidedNearbyGuard = source.slice(nearbyEffectStart, source.indexOf("const centerDate = parseDateValue"));
  assert.match(guidedNearbyGuard, /activeRequests\.forEach\(\(request\) => request\.controller\.abort\(\)\)/);
  assert.match(guidedNearbyGuard, /activeRequests\.clear\(\)/);
  assert.match(guidedNearbyGuard, /nearbyFareCacheRef\.current\.clear\(\)/);
  assert.doesNotMatch(guidedNearbyGuard, /getNearbyFareDateRange|buildNearbyFareSearchBody|fetch\("\/api\/flights\/search"/);

  const savedGuard = source.slice(source.indexOf("if (guidedMode) {\n      const timer = window.setTimeout(() => {\n        setBackendSavedTripIds"), source.indexOf("if (sessionStatus === \"loading\") return;", source.indexOf("setBackendSavedTripIds")));
  assert.doesNotMatch(savedGuard, /fetchBackendSavedTrips|readSavedTripIds|refreshBackendSavedTrips/);

  const filterSync = source.slice(source.indexOf("useEffect(() => {\n    if (guidedMode) return;"), source.indexOf("const activeFilterCount"));
  assert.match(filterSync, /router\.replace\(nextQuery \? `\/flights\/results\?\$\{nextQuery\}` : "\/flights"/);
});

test("guided Flight results expose sorting, mobile filters, and Retry focus targets", async () => {
  const source = await readFile(clientUrl, "utf8");
  const guidedBranch = source.slice(source.indexOf("if (guidedMode) return ("), source.indexOf("return (\n    <main"));
  assert.match(guidedBranch, /renderDesktopSortControl\(\)/);
  assert.match(guidedBranch, /renderMobileSortResultsRow\(\)/);
  assert.match(guidedBranch, /id="flight-mobile-filters-dialog"/);
  assert.doesNotMatch(guidedBranch, /MobileAirportPicker|renderCompactSearchForm|priceAlertDialogOpen|nearbyFares/);
  assert.match(guidedBranch, /renderGuidedRetryButton\(\)/);
  assert.match(source, /shouldBypassSnapshot = userInitiatedRetryRef\.current && guidedMode/);
  assert.match(source, /loadingFocusRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /resultsHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /emptyHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /errorHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test("guided Flight card accessibility and provider suppression stay intact", async () => {
  const [stage, card, client] = await Promise.all([
    readFile(stageUrl, "utf8"),
    readFile(cardUrl, "utf8"),
    readFile(clientUrl, "utf8"),
  ]);
  assert.match(client, /showProviderHandoffCopy=\{false\}/);
  assert.match(stage, /buildDealsFlightDetailsJourneyUrl\(search, flight\.id\)/);
  assert.match(card, /detailsHref \? <LinkButton/);
  assert.match(card, /aria-label=\{viewFlightAriaLabel\}/);
});
