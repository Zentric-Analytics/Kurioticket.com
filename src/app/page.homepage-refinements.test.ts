import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { countryDirectoryCountries } from "@/data/homepageCountryDirectory";

const countryDirectoryCategories = ["Hotels", "Flights", "Cars"] as const;

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
  assert.match(pageSource, /getSortedCountryDirectoryCountries\(locale, t\)/);
  assert.match(pageSource, /distributeCountryDirectoryColumns\(sortedCountryDirectoryCountries, 4\)/);
  assert.doesNotMatch(pageSource, /homepageHotelDestinationCards/);
});

test("homepage country directory uses closed-first inline independent column accordions", () => {
  const directorySource = pageSource.slice(
    pageSource.indexOf('aria-labelledby="homepage-country-directory-heading"'),
    pageSource.indexOf("homeNewsletterTitle"),
  );

  assert.match(pageSource, /getSortedCountryDirectoryCountries\(locale, t\)/);
  assert.match(pageSource, /distributeCountryDirectoryColumns\(sortedCountryDirectoryCountries, 4\)/);
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
  assert.match(directorySource, /<CountryFlag\s+countryCode=\{country\.countryCode\}/);
  assert.doesNotMatch(directorySource, /Apple_Color_Emoji|Segoe_UI_Emoji|Noto_Color_Emoji/);
  assert.doesNotMatch(directorySource, /data-integrated-country-panel/);
  assert.doesNotMatch(directorySource, /data-product-column/);
  assert.doesNotMatch(directorySource, /sm:grid-cols-3/);
  assert.doesNotMatch(
    directorySource,
    /View all \{category\.toLowerCase\(\)\}/,
  );
  assert.doesNotMatch(directorySource, /rounded-xl border border-slate-200/);
  assert.doesNotMatch(directorySource, /bg-gradient-to-br from-slate-100 via-white to-slate-200/);
  assert.doesNotMatch(directorySource, />\s*\{country\.countryCode\}\s*</);
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

test("homepage country directory flag, row, service, and dropdown typography are production-refined", () => {
  const directorySource = pageSource.slice(
    pageSource.indexOf('aria-labelledby="homepage-country-directory-heading"'),
    pageSource.indexOf("homeNewsletterTitle"),
  );

  assert.match(directorySource, /<CountryFlag\s+countryCode=\{country\.countryCode\}/);
  assert.match(directorySource, /data-country-row/);
  assert.match(directorySource, /border-b border-slate-100 bg-transparent/);
  assert.match(directorySource, /text-\[15px\] font-semibold leading-6 tracking-\[-0\.01em\] text-\[#07133F\]/);
  assert.match(directorySource, /text-\[10px\] font-semibold uppercase leading-4 tracking-\[0\.07em\] text-\[#004BB8\]/);
  assert.match(directorySource, /text-xs font-bold uppercase leading-4 tracking-\[0\.08em\] text-slate-900/);
  assert.match(directorySource, /text-sm font-normal leading-5 text-slate-800/);
  assert.match(directorySource, /\.slice\(0, 5\)/);
  assert.doesNotMatch(directorySource, /\{country\.flag\}/);
  assert.doesNotMatch(directorySource, /rounded-\[3px\]|bg-gradient-to-br from-slate-100 via-white to-slate-200/);
});


test("homepage country directory config targets five unique suggestions per supported product", () => {
  const underfilledCategories: string[] = [];

  for (const country of countryDirectoryCountries) {
    for (const category of countryDirectoryCategories) {
      const links = country.links[category];
      if (links.length < 5) underfilledCategories.push(`${country.id}:${category}`);
      assert.ok(links.length <= 5, `${country.id} ${category} should not exceed five curated suggestions`);
      assert.equal(new Set(links.map((link) => link.label)).size, links.length, `${country.id} ${category} labels should be unique`);
    }

    assert.equal(
      new Set(country.links.Hotels.map((link) => link.label.replace(/ stays$/, ""))).size,
      country.links.Hotels.length,
      `${country.id} hotel destinations should be unique`,
    );
    assert.equal(
      new Set(country.links.Cars.map((link) => link.label.replace(/ car hire$/, ""))).size,
      country.links.Cars.length,
      `${country.id} car locations should be unique`,
    );
    assert.equal(
      new Set(country.links.Flights.map((link) => link.routeKey)).size,
      country.links.Flights.length,
      `${country.id} flight routes should be unique`,
    );
  }

  assert.deepEqual(underfilledCategories, [], "no currently configured categories are truthfully underfilled");
});

test("homepage country directory links preserve exact search contracts", () => {
  for (const country of countryDirectoryCountries) {
    for (const link of country.links.Flights) {
      assert.match(link.routeKey ?? "", /^[A-Z]{3}-[A-Z]{3}$/);
      const [origin, destination] = link.routeKey?.split("-") ?? [];
      assert.notEqual(origin, destination, `${country.id} flight route should not reuse the same airport code`);
      assert.equal(typeof link.href, "object");
      assert.equal(link.href.pathname, "/flights/results");
      assert.equal(link.href.query?.origin, origin);
      assert.equal(link.href.query?.destination, destination);
      assert.match(String(link.href.query?.departureDate), /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(link.href.query?.tripType, "one-way");
      assert.equal(link.href.query?.travelers, "1");
      assert.equal(link.href.query?.adults, "1");
      assert.equal(link.href.query?.cabinClass, "economy");
      assert.equal(link.href.query?.currency, "USD");
      assert.equal(link.href.query?.market, "US");
    }

    for (const link of country.links.Hotels) {
      assert.equal(typeof link.href, "object");
      assert.equal(link.href.pathname, "/hotels/results");
      assert.ok(link.href.query?.destination);
      assert.match(String(link.href.query?.checkIn), /^\d{4}-\d{2}-\d{2}$/);
      assert.match(String(link.href.query?.checkOut), /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(link.href.query?.guests, "2");
      assert.equal(link.href.query?.rooms, "1");
    }

    for (const link of country.links.Cars) {
      assert.equal(typeof link.href, "string");
      const url = new URL(link.href, "https://www.kurioticket.test");
      assert.equal(url.pathname, "/cars/results");
      assert.ok(url.searchParams.get("pickupLocation"));
      assert.equal(url.searchParams.get("dropoffLocation"), url.searchParams.get("pickupLocation"));
      assert.match(url.searchParams.get("pickupDate") ?? "", /^\d{4}-\d{2}-\d{2}$/);
      assert.match(url.searchParams.get("dropoffDate") ?? "", /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(url.searchParams.get("pickupTime"), "10:00");
      assert.equal(url.searchParams.get("dropoffTime"), "10:00");
      assert.ok(url.searchParams.get("driverAge"));
    }
  }
});
