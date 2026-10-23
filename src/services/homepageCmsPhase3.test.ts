import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const initService = readFileSync("src/services/homepageCmsService.ts", "utf8");
const initRoute = readFileSync("src/app/api/admin/content/homepage/initialize/route.ts", "utf8");
const publicService = readFileSync("src/services/publicCmsContentService.ts", "utf8");
const publicRoute = readFileSync("src/app/api/content/homepage/route.ts", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const destinationPrices = readFileSync("src/app/api/flights/destination-prices/route.ts", "utf8");
const fareService = readFileSync("src/services/homepageFareSnapshotService.ts", "utf8");
const overview = readFileSync("src/app/admin/content/homepage/page.tsx", "utf8");
const listPage = readFileSync("src/app/admin/content/homepage/[section]/page.tsx", "utf8");
const newPage = readFileSync("src/app/admin/content/homepage/[section]/new/page.tsx", "utf8");
const detailPage = readFileSync("src/app/admin/content/homepage/[section]/[id]/page.tsx", "utf8");
const editor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");

test("homepage CMS initialization is explicit, transactional, published and audited", () => {
  assert.match(initRoute, /requireAdminApiSession\(\)/);
  assert.match(initRoute, /hasRecentReauthentication/);
  assert.match(initService, /\$transaction/);
  assert.match(initService, /CMS_HOMEPAGE_INITIALIZED/);
  assert.match(initService, /cmsContentRevision\.create/);
  assert.match(initService, /HOMEPAGE_REFRESH_MARKET_CODES/);
  assert.match(initService, /getHomeDiscoveryImageCardsByRegion/);
  assert.match(initService, /getHomepageRegionalRouteCards/);
  assert.match(initService, /HOTEL_DESTINATION:GLOBAL/);
});

test("homepage CMS initialization preserves existing flight surface ordering", () => {
  const discoveryPosition = initService.indexOf("...discoveryCards");
  const regionalPosition = initService.indexOf("...regionalCards");
  const remainingPosition = initService.indexOf("...getHomeDiscoveryByRegion");
  assert.ok(discoveryPosition >= 0);
  assert.ok(regionalPosition > discoveryPosition);
  assert.ok(remainingPosition > regionalPosition);
});

test("homepage CMS admin supports market targeting and explicit lifecycle", () => {
  assert.match(overview, /Homepage destinations/);
  assert.match(overview, /Flight route cards/);
  assert.match(overview, /Hotel destinations/);
  assert.match(listPage, /homepageCmsMarkets/);
  assert.match(newPage, /getCmsContentScopeSummary/);
  assert.match(newPage, /redirect\("\/admin\/content\/homepage"\)/);
  assert.match(detailPage, /Revision history/);
  for (const action of ["Create draft", "Save draft", "Publish", "Hide", "Archive"]) {
    assert.match(editor, new RegExp(action));
  }
  assert.match(editor, /draftDirty/);
  assert.match(editor, /Save this draft before publishing the current edits/);
  assert.match(editor, /Canonical hotel destination/);
});

test("public homepage reads CMS through a no-store endpoint with static fallback", () => {
  assert.match(publicRoute, /getPublishedHomepageDestinations/);
  assert.match(publicRoute, /getPublishedFlightRoutes/);
  assert.match(publicRoute, /getPublishedHotelDestinations/);
  assert.match(publicRoute, /publishedHotels/);
  assert.match(publicRoute, /canonicalDestinationId/);
  assert.match(publicRoute, /Cache-Control": "no-store"/);
  assert.match(publicService, /readPublishedCmsContent<CmsHomepageDestination>/);
  assert.match(publicService, /readPublishedCmsContent<CmsFlightRoute>/);
  assert.match(publicService, /getPopularDestinationsByRegion/);
  assert.match(publicService, /getHomeDiscoveryByRegion/);
  assert.match(homepage, /\/api\/content\/homepage\?market=/);
  assert.match(homepage, /cmsContentForMarket/);
  assert.match(homepage, /destination\.canonicalDestinationId/);
  assert.match(homepage, /destination\.destinationSearchValue/);
});

test("homepage fare paths authorize and render published CMS routes", () => {
  assert.match(destinationPrices, /getPublishedHomepageDestinations/);
  assert.match(destinationPrices, /getPublishedFlightRoutes/);
  assert.match(destinationPrices, /allowedPopularDestinations/);
  assert.match(destinationPrices, /allowedDiscoveryRoutes/);
  assert.match(fareService, /getPublishedFlightRoutes/);
  assert.match(fareService, /publishedFlightRoutes\.source === "cms"/);
  assert.match(fareService, /isCmsManaged/);
});

test("Phase 3 does not move native mobile homepage merchandising onto CMS", () => {
  const mobileHome = readFileSync("apps/mobile/src/features/home/HomepageAdventureDiscoveryData.ts", "utf8");
  assert.match(mobileHome, /getMarketplaceHomeMerchandising/);
  assert.doesNotMatch(mobileHome, /api\/content\/homepage/);
});
