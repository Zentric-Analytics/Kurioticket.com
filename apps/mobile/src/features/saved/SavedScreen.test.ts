import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { MobileSavedItem } from "../../api/travelApi";
import { canonicalItemsNewestFirst } from "../../storage/savedRepositoryCore";
import { destinationById } from "../explore/destinationCatalogue";
import { destinationMedia, FALLBACK_SOURCE } from "../explore/destinationMedia";
import { formatFlightAccess } from "../explore/exploreModels";
import {
  regionBrowseCardLayout,
  REGION_BROWSE_IMAGE_ASPECT_RATIO,
  REGION_BROWSE_IMAGE_HEIGHT_RATIO,
} from "../explore/regionBrowseCardLayout";

const source = (path: string) => readFileSync(path, "utf8");
const item = (value: Record<string, unknown>) => value as MobileSavedItem;



test("Saved UI has one canonical visible source and keeps guest protection", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /canonicalSavedCards\(canonical\.items\)/);
  assert.doesNotMatch(screen, /savedIds|savedFlights|savedSections|savedCategoryOrder/);
  assert.doesNotMatch(screen, /useSavedFlights|popularDestinationStays/);
  assert.match(screen, /!isAuthenticated/);
  assert.match(screen, /signInHref\("\/saved"\)/);
});

test("flight, hotel, and search become the same stable card model", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /if \(item\.type === "flight"\)/);
  assert.match(screen, /if \(item\.type === "hotel"\)/);
  assert.match(screen, /const searchType = text\(item\.searchType\)/);
  assert.match(screen, /origin && destination \? `\$\{origin\} → \$\{destination\}`/);
  assert.equal((screen.match(/testID="saved-card"/g) ?? []).length, 2);
  assert.match(screen, /regionBrowseCardLayout\(windowWidth\)/);
  assert.doesNotMatch(screen, /popularStayCardLayout|POPULAR_STAY_LAYOUT/);
  assert.doesNotMatch(screen, /regionPreviewCardLayout/);
  assert.doesNotMatch(screen, /(?:height|width): 104/);
  assert.match(screen, /source=\{source\}/);
});

test("Saved and Explore region browse cards derive geometry from one layout helper", () => {
  const saved = source("src/features/saved/SavedScreen.tsx");
  const explore = source("src/features/explore/ExploreRegionScreen.tsx");
  assert.match(saved, /from "\.\.\/explore\/regionBrowseCardLayout"/);
  assert.match(explore, /from "\.\/regionBrowseCardLayout"/);
  assert.match(saved, /regionBrowseCardLayout\(windowWidth\)/);
  assert.match(explore, /regionBrowseCardLayout\(windowWidth\)/);
  assert.doesNotMatch(saved, /popularStayCardLayout|POPULAR_STAY_LAYOUT|footerHeight|height: 72/);
  const layout = regionBrowseCardLayout(390);
  assert.equal(layout.width, 374);
  assert.equal(layout.imageHeight, layout.width / REGION_BROWSE_IMAGE_ASPECT_RATIO);
  assert.equal(layout.imageHeight / layout.height, REGION_BROWSE_IMAGE_HEIGHT_RATIO);
  assert.equal(layout.informationHeight / layout.height, 0.4);
});

test("Saved cards have a full-width image, footer below it, and floating remove control", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  const image = screen.indexOf('testID="saved-card-image"');
  const remove = screen.indexOf('accessibilityLabel={`Remove ${model.title} from saved`}', image);
  const footer = screen.indexOf('testID="saved-card-footer"', remove);
  assert.ok(image >= 0 && remove > image && footer > remove);
  assert.match(screen, /imageFrame: \{ width: "100%", position: "relative"/);
  assert.match(screen, /removeTouchTarget: \{ position: "absolute"/);
  assert.match(screen, /card: \{ alignSelf: "center"/);
  assert.match(screen, /source=\{source\}/);
  assert.match(screen, /imageFailed \? FALLBACK_SOURCE : \(model\.media\?\.source \?\? FALLBACK_SOURCE\)/);
  assert.match(screen, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.doesNotMatch(screen, /popularDestinationStays.*image/);
});

test("canonical Abidjan saves retain metadata and resolve the same media as Explore", () => {
  const abidjan = destinationById.get("ci-abidjan");
  assert.ok(abidjan);
  assert.equal(abidjan.name, "Abidjan");
  assert.equal(abidjan.country, "Côte d’Ivoire");
  assert.equal(formatFlightAccess(abidjan.primaryAirportCode, abidjan.airportCodes), "Flights via ABJ");
  const media = destinationMedia(abidjan.imageDestinationId) ?? destinationMedia(abidjan.id);
  assert.ok(media);
  assert.notEqual(media.source, undefined);
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /destinationMedia\(canonicalDestination\.imageDestinationId\) \?\? destinationMedia\(canonicalDestination\.id\)/);
});

test("only canonical destination searches receive destination media", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  const flight = screen.slice(screen.indexOf('if (item.type === "flight")'), screen.indexOf('if (item.type === "hotel")'));
  const hotel = screen.slice(screen.indexOf('if (item.type === "hotel")'), screen.indexOf("const destinationId"));
  assert.doesNotMatch(flight, /destinationMedia/);
  assert.doesNotMatch(hotel, /destinationMedia/);
  assert.match(screen, /canonicalDestination\s*\? destinationMedia/);
  assert.match(screen, /model\.media\?\.source \?\? FALLBACK_SOURCE/);
  assert.ok(FALLBACK_SOURCE);
});

test("canonical destination saves use catalogue country and flight access instead of duplicate copy", () => {
  const abuDhabi = destinationById.get("ae-abu-dhabi");
  assert.ok(abuDhabi);
  assert.equal(abuDhabi.name, "Abu Dhabi");
  assert.equal(abuDhabi.country, "United Arab Emirates");
  assert.equal(formatFlightAccess(abuDhabi.primaryAirportCode, abuDhabi.airportCodes), "Flights via AUH");
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /const destinationId = text\(query\?\.destinationId\)/);
  assert.match(screen, /destinationById\.get\(destinationId\)/);
  assert.match(screen, /canonicalDestination\?\.name/);
  assert.match(screen, /canonicalDestination\?\.country/);
  assert.match(screen, /formatFlightAccess\(canonicalDestination\.primaryAirportCode, canonicalDestination\.airportCodes\)/);
});

test("canonical destination saves use the shared Explore flight handoff with a per-card duplicate-tap guard", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /const canonicalDestinationOpen = canonicalDestination/);
  assert.match(screen, /exploreFlightDestinationNavigation\(\{/);
  assert.match(screen, /primaryAirportCode: canonicalDestination\.primaryAirportCode/);
  assert.match(screen, /airportCodes: canonicalDestination\.airportCodes/);
  assert.match(screen, /if \(exploreNavigationPending\) return/);
  assert.match(screen, /canonicalDestinationOpen \?\?/);
});

test("non-Explore searches, actual flights, and hotels keep their existing navigation", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  const flight = screen.slice(screen.indexOf('if (item.type === "flight")'), screen.indexOf('if (item.type === "hotel")'));
  const hotel = screen.slice(screen.indexOf('if (item.type === "hotel")'), screen.indexOf("const destinationId"));
  assert.match(flight, /resultsReady \? "\/flight-results" : "\/flights"/);
  assert.match(hotel, /resultsReady \? "\/hotel-results" : "\/hotels"/);
  assert.doesNotMatch(flight, /exploreFlightDestinationNavigation/);
  assert.doesNotMatch(hotel, /exploreFlightDestinationNavigation/);
  assert.match(screen, /hasFlightRoute \? \(\) => router\.push\(\{ pathname: resultsReady \? "\/flight-results" : "\/flights", params \}\)/);
});

test("flight and hotel cards retain useful canonical presentation", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /text\(item\.airlineName\)/);
  assert.match(screen, /`\$\{origin\} → \$\{destination\}`/);
  assert.match(screen, /supporting: text\(item\.flightNumber\)/);
  assert.match(screen, /text\(item\.hotelName\)/);
  assert.match(screen, /text\(item\.destination\) \?\? "Hotel"/);
});

test("repository normalization preserves the newest canonical duplicate", () => {
  const duplicate = { type: "search", searchType: "hotel", label: "Stay", destination: "Rome", query: { destination: "Rome" } };
  const cards = canonicalItemsNewestFirst([
    item({ ...duplicate, id: "old", createdAt: "2026-01-01T00:00:00Z" }),
    item({ id: "flight", type: "flight", provider: "p", originAirport: "A", destinationAirport: "B", departureTime: "1", arrivalTime: "2", createdAt: "2026-01-02T00:00:00Z" }),
    item({ ...duplicate, id: "new", createdAt: "2026-01-03T00:00:00Z" }),
  ]);
  assert.deepEqual(cards.map((saved) => saved.id), ["new", "flight"]);
  const repository = source("src/storage/savedRepositoryCore.ts");
  assert.match(repository, /items=canonicalItemsNewestFirst\(items\)/);
  assert.doesNotMatch(repository, /new Map\(items\.map\(item=>\[savedSignature\(item\),item\]\)\)/);
});

test("Saved card mapping trusts repository normalization instead of deduplicating again", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /return items\.map\(\(item\) => \{/);
  assert.doesNotMatch(screen, /savedSignature|const unique = new Map/);
});

test("reopen is only exposed with valid canonical data", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /hasValidSearchPlan\("flight", storedParams\)/);
  assert.match(screen, /resultsReady \? "\/flight-results" : "\/flights"/);
  assert.match(screen, /resultsReady \? "\/hotel-results" : "\/hotels"/);
  assert.doesNotMatch(screen, /pathname: "\/flight-details"|pathname: "\/hotel-details"/);
  assert.match(screen, /const hasFlightRoute = searchType === "flight"/);
  assert.match(screen, /const hasHotelRoute = searchType === "hotel"/);
  assert.match(screen, /: undefined/);
});

test("all canonical types share confirmation, removal, propagation, and accessibility behavior", () => {
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.match(screen, /Alert\.alert\("Remove from saved\?"/);
  assert.match(screen, /text: "Cancel", style: "cancel"/);
  assert.match(screen, /text: "Remove", style: "destructive"/);
  assert.match(screen, /canonical\.remove\(item\.type, item\.id\)/);
  assert.match(screen, /event\.stopPropagation\(\); remove\(model\.item\)/);
  assert.match(screen, /`Remove \$\{model\.title\} from saved`/);
});







test("legacy destination and flight migration remains repository-only", () => {
  const repository = source("src/storage/savedRepositoryCore.ts");
  assert.match(repository, /readDestinations/);
  assert.match(repository, /readFlights/);
  assert.match(repository, /mapDestinationToSaved/);
  assert.match(repository, /mapFlightToSaved/);
  assert.match(repository, /previous state was restored/);
  assert.match(repository, /requested!==this\.revision/);
});


test("Saved route renders the independent Saved screen", () => {
  assert.match(source("app/saved.tsx"), /SavedScreen/);
  const screen = source("src/features/saved/SavedScreen.tsx");
  assert.doesNotMatch(screen, /recentSearches|deleteRecentSearch|clearRecentSearches|recentSearchNavigation|accessibilityRole="tab"/);
  assert.match(screen, />Saved<\/Text>/);
  assert.match(screen, /signInHref\("\/saved"\)/);
});
