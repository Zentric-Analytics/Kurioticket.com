import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const homepageHotelCountryCardSource = readFileSync(
  new URL("../data/homepageHotelCountryCards.ts", import.meta.url),
  "utf8",
);
const flagEmojiSource = readFileSync(
  new URL("../lib/region/flagEmoji.ts", import.meta.url),
  "utf8",
);
const hotelsPageSource = readFileSync(
  new URL("./hotels/page.tsx", import.meta.url),
  "utf8",
);

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

test("homepage hotel destination section sits between promo panels and newsletter with eight country cards", () => {
  const promoIndex = pageSource.indexOf("homePromoHotelsTitle");
  const hotelSectionIndex = pageSource.indexOf('aria-labelledby="homepage-hotel-destinations-heading"');
  const newsletterIndex = pageSource.indexOf("homeNewsletterTitle");
  const destinationIds = [...homepageHotelCountryCardSource.matchAll(/"([a-z]{2}-[a-z-]+)"/g)]
    .map((match) => match[1])
    .filter((id) => id.includes("-"))
    .slice(0, 8);

  assert.ok(promoIndex >= 0, "hotel promo panel should exist");
  assert.ok(hotelSectionIndex > promoIndex, "hotel destination section should follow promo panels");
  assert.ok(newsletterIndex > hotelSectionIndex, "newsletter should follow hotel destination section");
  assert.match(pageSource, /homepageHotelCountryCards/);
  assert.deepEqual(destinationIds, [
    "us-new-york",
    "gb-london",
    "fr-paris",
    "ae-dubai",
    "jp-tokyo",
    "mx-cancun",
    "it-rome",
    "sg-singapore",
  ]);
  assert.equal(new Set(destinationIds).size, 8, "country cards should be unique");
});

test("homepage hotel country cards use localized short labels, flags, valid images, and varied moderate layouts", () => {
  for (const key of [
    "homeHotelDestinationsCountry.unitedStates",
    "homeHotelDestinationsCountry.uk",
    "homeHotelDestinationsCountry.france",
    "homeHotelDestinationsCountry.uae",
    "homeHotelDestinationsCountry.japan",
    "homeHotelDestinationsCountry.mexico",
    "homeHotelDestinationsCountry.italy",
    "homeHotelDestinationsCountry.singapore",
  ]) {
    assert.match(homepageHotelCountryCardSource, new RegExp(key));
  }

  assert.match(flagEmojiSource, /\^\[A-Z\]\{2\}\$/);
  assert.match(flagEmojiSource, /String\.fromCodePoint\(0x1f1e6/);
  assert.match(pageSource, /getFlagEmojiFromCountryCode\(destination\.countryCode\)/);
  assert.match(pageSource, /aria-hidden="true"/);
  assert.doesNotMatch(pageSource, /\{destination\.countryCode\}\s*<\//);
  const hotelSectionSource = pageSource.slice(
    pageSource.indexOf('aria-labelledby="homepage-hotel-destinations-heading"'),
    pageSource.indexOf('homeNewsletterTitle'),
  );
  assert.doesNotMatch(hotelSectionSource, /font-black/);

  assert.match(homepageHotelCountryCardSource, /image: imageCard\.image/);
  assert.match(homepageHotelCountryCardSource, /imageAlt: imageCard\.imageAlt/);
  assert.match(homepageHotelCountryCardSource, /searchValue: destination\.searchValue/);

  const layoutVariants = [...homepageHotelCountryCardSource.matchAll(/layoutVariant: homepageHotelCountryLayoutVariants\[index\]/g)];
  assert.equal(layoutVariants.length, 1, "cards should be assigned shared layout variants");
  assert.match(homepageHotelCountryCardSource, /landscape/);
  assert.match(homepageHotelCountryCardSource, /square/);
  assert.match(homepageHotelCountryCardSource, /portraitSquare/);
  assert.match(homepageHotelCountryCardSource, /compactPortrait/);
  assert.doesNotMatch(homepageHotelCountryCardSource, /520px|min-h-\[520px\]|h-\[520px\]/);
  assert.doesNotMatch(homepageHotelCountryCardSource, /lg:min-h-\[(3[7-9][0-9]|[4-9][0-9]{2})px\]/);
});

test("hotels page source remains on the shared destination image catalog", () => {
  assert.match(hotelsPageSource, /destinationImageCatalog/);
  assert.doesNotMatch(hotelsPageSource, /homepageHotelCountryCards/);
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
