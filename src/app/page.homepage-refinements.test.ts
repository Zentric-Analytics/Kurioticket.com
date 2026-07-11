import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("regional image cards keep start-search copy out of visible overlay", () => {
  const cardSource = pageSource.slice(pageSource.indexOf("function RegionalRouteCard"), pageSource.indexOf("function DiscoveryCardImage"));

  assert.match(cardSource, /aria-label=\{`\$\{originCity\} to \$\{destinationCity\} flight search\.`\}/);
  assert.doesNotMatch(cardSource, /homeRegionalRoutesStartSearch/);
  assert.doesNotMatch(cardSource, /Start search/);
});

test("homepage section order places trust between adventure and regional routes", () => {
  const adventureIndex = pageSource.indexOf("homeDiscoveryTitle");
  const trustIndex = pageSource.indexOf("homeTrustTitle");
  const regionalIndex = pageSource.indexOf('aria-labelledby="regional-routes-heading"');

  assert.ok(adventureIndex >= 0, "adventure section should exist");
  assert.ok(trustIndex > adventureIndex, "trust section should follow adventure cards");
  assert.ok(regionalIndex > trustIndex, "regional routes should follow trust section");
});

test("adventure fare line always renders From and only renders provider display price when valid", () => {
  const cardSource = pageSource.slice(pageSource.indexOf("function DiscoverySuggestionCard"), pageSource.indexOf("function buildDestinationCardHref"));

  assert.match(cardSource, /hasFreshProviderPrice/);
  assert.match(cardSource, /expectedOriginCode/);
  assert.match(cardSource, /expectedDestinationCode/);
  assert.match(cardSource, /text-sm font-semibold leading-5 text-slate-700/);
  assert.match(cardSource, /text-base font-bold leading-5 tracking-tight text-slate-950/);
  assert.match(cardSource, /\{displayPrice \? \(/);
});


test("programmatic carousel observer uses scrollend, animation frames, fallback timer, and cleanup", () => {
  const observerSource = pageSource.slice(pageSource.indexOf("function observeProgrammaticCarouselScroll"), pageSource.indexOf("function getDestinationRailTargetLogicalScroll"));

  assert.match(observerSource, /addEventListener\("scrollend", settleNow/);
  assert.match(observerSource, /requestAnimationFrame\(checkForSettledPosition\)/);
  assert.match(observerSource, /setTimeout\(settleNow, 1200\)/);
  assert.match(observerSource, /cancelAnimationFrame\(rafId\)/);
  assert.match(observerSource, /clearTimeout\(fallbackId\)/);
  assert.match(observerSource, /removeEventListener\("scroll", onScrollActivity\)/);
  assert.match(observerSource, /requiredStableFrames = 2/);
});

test("previous-to-start programmatic completion clears the next-arrow gate and previous render state", () => {
  const scrollHandlerSource = pageSource.slice(pageSource.indexOf('const scrollDestinationsRail = (direction: "left" | "right")'), pageSource.indexOf("const t = (key: string)"));

  assert.match(scrollHandlerSource, /const beforeState = measureDestinationRailState\(\)/);
  assert.match(scrollHandlerSource, /const targetLogical = getDestinationRailTargetLogicalScroll/);
  assert.match(scrollHandlerSource, /const targetIsStart = targetLogical <= 2/);
  assert.match(scrollHandlerSource, /setHasAdvancedWithNextArrow\(false\)/);
  assert.match(scrollHandlerSource, /setCanScrollDestinationsLeft\(false\)/);
  assert.match(scrollHandlerSource, /updateDestinationArrowState\(\)/);
});

test("homepage hotel destination section sits between promo panels and newsletter with six cards", () => {
  const promoIndex = pageSource.indexOf("homePromoHotelsTitle");
  const hotelSectionIndex = pageSource.indexOf('aria-labelledby="homepage-hotel-destinations-heading"');
  const newsletterIndex = pageSource.indexOf("homeNewsletterTitle");

  assert.ok(promoIndex >= 0, "hotel promo panel should exist");
  assert.ok(hotelSectionIndex > promoIndex, "hotel destination section should follow promo panels");
  assert.ok(newsletterIndex > hotelSectionIndex, "newsletter should follow hotel destination section");
  assert.match(pageSource, /homepageHotelDestinationIds = \[/);
  assert.match(pageSource, /"us-new-york"/);
  assert.match(pageSource, /"gb-london"/);
  assert.match(pageSource, /"fr-paris"/);
  assert.match(pageSource, /"ae-dubai"/);
  assert.match(pageSource, /"jp-tokyo"/);
  assert.match(pageSource, /"mx-cancun"/);
});

test("homepage hotel destination cards use existing hotel results contract", () => {
  const hrefSource = pageSource.slice(pageSource.indexOf("function buildHotelDestinationHref"), pageSource.indexOf("function CompareOffersIllustration"));

  assert.match(hrefSource, /pathname: "\/hotels\/results"/);
  assert.match(hrefSource, /destination: destination\.searchValue/);
  assert.match(hrefSource, /checkIn/);
  assert.match(hrefSource, /checkOut/);
  assert.match(hrefSource, /guests: "2"/);
  assert.match(hrefSource, /rooms: "1"/);
});
