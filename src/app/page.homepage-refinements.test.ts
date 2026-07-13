import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const hotelsPageSource = readFileSync(
  new URL("./hotels/page.tsx", import.meta.url),
  "utf8",
);

test("regional image cards keep start-search copy out of visible overlay", () => {
  const cardSource = pageSource.slice(
    pageSource.indexOf("function RegionalRouteCard"),
    pageSource.indexOf("function DiscoveryCardImage"),
  );

  assert.match(
    cardSource,
    /aria-label=\{`\$\{originCity\} to \$\{destinationCity\} flight search\.`\}/,
  );
  assert.doesNotMatch(cardSource, /homeRegionalRoutesStartSearch/);
  assert.doesNotMatch(cardSource, /Start search/);
});

test("homepage section order places trust between adventure and regional routes", () => {
  const adventureIndex = pageSource.indexOf("homeDiscoveryTitle");
  const trustIndex = pageSource.indexOf("homeTrustTitle");
  const regionalIndex = pageSource.indexOf(
    'aria-labelledby="regional-routes-heading"',
  );

  assert.ok(adventureIndex >= 0, "adventure section should exist");
  assert.ok(
    trustIndex > adventureIndex,
    "trust section should follow adventure cards",
  );
  assert.ok(
    regionalIndex > trustIndex,
    "regional routes should follow trust section",
  );
});

test("adventure fare line always renders From and only renders provider display price when valid", () => {
  const cardSource = pageSource.slice(
    pageSource.indexOf("function DiscoverySuggestionCard"),
    pageSource.indexOf("function buildDestinationCardHref"),
  );

  assert.match(cardSource, /hasFreshProviderPrice/);
  assert.match(cardSource, /expectedOriginCode/);
  assert.match(cardSource, /expectedDestinationCode/);
  assert.match(cardSource, /text-sm font-semibold leading-5 text-slate-700/);
  assert.match(
    cardSource,
    /text-base font-bold leading-5 tracking-tight text-slate-950/,
  );
  assert.match(cardSource, /\{displayPrice \? \(/);
});

test("programmatic carousel observer uses scrollend, animation frames, fallback timer, and cleanup", () => {
  const observerSource = pageSource.slice(
    pageSource.indexOf("function observeProgrammaticCarouselScroll"),
    pageSource.indexOf("function getDestinationRailTargetLogicalScroll"),
  );

  assert.match(observerSource, /addEventListener\("scrollend", settleNow/);
  assert.match(
    observerSource,
    /requestAnimationFrame\(checkForSettledPosition\)/,
  );
  assert.match(observerSource, /setTimeout\(settleNow, 1200\)/);
  assert.match(observerSource, /cancelAnimationFrame\(rafId\)/);
  assert.match(observerSource, /clearTimeout\(fallbackId\)/);
  assert.match(
    observerSource,
    /removeEventListener\("scroll", onScrollActivity\)/,
  );
  assert.match(observerSource, /requiredStableFrames = 2/);
});

test("previous-to-start programmatic completion clears the next-arrow gate and previous render state", () => {
  const scrollHandlerSource = pageSource.slice(
    pageSource.indexOf(
      'const scrollDestinationsRail = (direction: "left" | "right")',
    ),
    pageSource.indexOf("const t = (key: string)"),
  );

  assert.match(
    scrollHandlerSource,
    /const beforeState = measureDestinationRailState\(\)/,
  );
  assert.match(
    scrollHandlerSource,
    /const targetLogical = getDestinationRailTargetLogicalScroll/,
  );
  assert.match(scrollHandlerSource, /const targetIsStart = targetLogical <= 2/);
  assert.match(scrollHandlerSource, /setHasAdvancedWithNextArrow\(false\)/);
  assert.match(scrollHandlerSource, /setCanScrollDestinationsLeft\(false\)/);
  assert.match(scrollHandlerSource, /updateDestinationArrowState\(\)/);
});

test("homepage country directory replaces the hotel mosaic between promo panels and newsletter", () => {
  const promoIndex = pageSource.indexOf("homePromoHotelsTitle");
  const directoryIndex = pageSource.indexOf(
    'aria-labelledby="homepage-country-directory-heading"',
  );
  const newsletterIndex = pageSource.indexOf("homeNewsletterTitle");

  assert.ok(promoIndex >= 0, "hotel promo panel should exist");
  assert.ok(
    directoryIndex > promoIndex,
    "country directory should follow promo panels",
  );
  assert.ok(
    newsletterIndex > directoryIndex,
    "newsletter should follow country directory",
  );
  assert.match(pageSource, /countryDirectoryCountries/);
  assert.doesNotMatch(pageSource, /homepageHotelDestinationCards/);
});

test("homepage country directory uses closed-first inline independent column accordions", () => {
  const directorySource = pageSource.slice(
    pageSource.indexOf('aria-labelledby="homepage-country-directory-heading"'),
    pageSource.indexOf("homeNewsletterTitle"),
  );

  assert.match(pageSource, /countryDirectoryCountries/);
  assert.match(pageSource, /useState<\s*string \| null\s*>\(null\)/);
  assert.doesNotMatch(pageSource, /useState\(countryDirectoryCountries\[0\]/);
  assert.match(directorySource, /data-country-directory-columns="4"/);
  assert.match(directorySource, /data-independent-country-columns/);
  assert.match(directorySource, /data-country-directory-column/);
  assert.match(directorySource, /lg:grid-cols-4/);
  assert.match(directorySource, /sm:grid-cols-2/);
  assert.match(directorySource, /aria-expanded=\{isExpanded\}/);
  assert.match(directorySource, /aria-controls=\{panelId\}/);
  assert.match(directorySource, /expandedCountryDirectoryId === country\.id/);
  assert.match(
    directorySource,
    /current === country\.id \? null : country\.id/,
  );
  assert.match(directorySource, /data-inline-country-panel/);
  assert.match(directorySource, /data-product-sections="vertical"/);
  assert.match(
    directorySource,
    /data-product-section=\{category\.toLowerCase\(\)\}/,
  );
  assert.match(directorySource, /"Hotels",\s*"Flights",\s*"Cars"/);
  assert.match(
    directorySource,
    /onClick=\{\(event\) => event\.stopPropagation\(\)\}/,
  );
  assert.match(directorySource, /Apple_Color_Emoji/);
  assert.doesNotMatch(directorySource, /data-integrated-country-panel/);
  assert.doesNotMatch(directorySource, /data-product-column/);
  assert.doesNotMatch(directorySource, /sm:grid-cols-3/);
  assert.doesNotMatch(
    directorySource,
    /View all \{category\.toLowerCase\(\)\}/,
  );
  assert.doesNotMatch(directorySource, /rounded-xl border border-slate-200/);
  assert.doesNotMatch(directorySource, /\{country\.countryCode\}/);
});

test("homepage country directory only shows provider-backed prices when valid fares exist", () => {
  const directorySource = pageSource.slice(
    pageSource.indexOf('aria-labelledby="homepage-country-directory-heading"'),
    pageSource.indexOf("homeNewsletterTitle"),
  );

  assert.match(
    directorySource,
    /fareCardsByExactRoute\.get\(\s*link\.routeKey,?\s*\)/,
  );
  assert.match(directorySource, /hasFreshProviderPrice/);
  assert.match(directorySource, /formatDisplayPrice/);
  assert.match(directorySource, /displayPrice \? \(\s*<span/);
});

test("hotels page source remains on the shared destination image catalog", () => {
  assert.match(hotelsPageSource, /destinationImageCatalog/);
  assert.doesNotMatch(hotelsPageSource, /homepageHotelCountryCards/);
});

test("homepage country directory hotel links use existing hotel results contract", () => {
  const directoryDataSource = readFileSync(
    new URL("../data/homepageCountryDirectory.ts", import.meta.url),
    "utf8",
  );
  const hrefSource = directoryDataSource.slice(
    directoryDataSource.indexOf(
      "export function buildCountryDirectoryHotelHref",
    ),
    directoryDataSource.indexOf(
      "export function buildCountryDirectoryCarsHref",
    ),
  );

  assert.match(hrefSource, /pathname: "\/hotels\/results"/);
  assert.match(hrefSource, /destination/);
  assert.match(hrefSource, /checkIn/);
  assert.match(hrefSource, /checkOut/);
  assert.match(hrefSource, /guests: "2"/);
  assert.match(hrefSource, /rooms: "1"/);
});
