import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { MobileSavedItem } from "../../api/travelApi";
import { canonicalItemsNewestFirst } from "../../storage/savedRepositoryCore";

const source = (path: string) => readFileSync(path, "utf8");
const item = (value: Record<string, unknown>) => value as MobileSavedItem;

test("Profile exposes Saved & recent without changing the bottom tabs", () => {
  assert.match(source("src/features/profile/profileModel.ts"), /label: "savedRecent"[\s\S]*?href: "\/saved"/);
  assert.match(source("src/features/profile/GuestProfileScreen.tsx"), /label: "savedRecent"[\s\S]*?href: "\/saved"/);
  assert.equal((source("app/(tabs)/_layout.tsx").match(/<Tabs\.Screen/g) ?? []).length, 4);
});

test("Saved UI has one canonical visible source and keeps guest protection", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /canonicalSavedCards\(canonical\.items\)/);
  assert.doesNotMatch(screen, /savedIds|savedFlights|savedSections|savedCategoryOrder/);
  assert.doesNotMatch(screen, /useSavedFlights|popularDestinationStays|destinationCatalogue/);
  assert.match(screen, /!isAuthenticated/);
  assert.match(screen, /pathname: "\/\(tabs\)\/profile\/sign-in"/);
});

test("flight, hotel, and search become the same stable card model", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /if \(item\.type === "flight"\)/);
  assert.match(screen, /if \(item\.type === "hotel"\)/);
  assert.match(screen, /const searchType = text\(item\.searchType\)/);
  assert.match(screen, /origin && destination \? `\$\{origin\} → \$\{destination\}`/);
  assert.equal((screen.match(/testID="saved-card"/g) ?? []).length, 2);
  assert.match(screen, /regionPreviewCardLayout\(windowWidth\)/);
  assert.doesNotMatch(screen, /(?:height|width): 104/);
  assert.match(screen, /source=\{FALLBACK_SOURCE\}/);
});

test("Saved and Explore cards derive responsive geometry from one layout helper", () => {
  const saved = source("src/features/saved/SavedRecentScreen.tsx");
  const explore = source("src/features/explore/ExploreScreen.tsx");
  const layout = source("src/features/explore/regionPreviewLayout.ts");
  assert.match(saved, /import \{ regionPreviewCardLayout \} from "\.\.\/explore\/regionPreviewLayout"/);
  assert.match(explore, /regionPreviewCardLayout\(windowWidth\)/);
  assert.match(layout, /REGION_PREVIEW_CARD_WIDTH_RATIO/);
  assert.match(layout, /height: previousHeight \+ \(imageHeight - previousImageHeight\)/);
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
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /return items\.map\(\(item\) => \{/);
  assert.doesNotMatch(screen, /savedSignature|const unique = new Map/);
});

test("reopen is only exposed with valid canonical data", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /result\?\.id \? \(\) => router\.push/);
  assert.match(screen, /const hasFlightRoute = searchType === "flight"/);
  assert.match(screen, /const hasHotelRoute = searchType === "hotel"/);
  assert.match(screen, /: undefined/);
});

test("all canonical types share confirmation, removal, propagation, and accessibility behavior", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /Alert\.alert\("Remove from saved\?"/);
  assert.match(screen, /text: "Cancel", style: "cancel"/);
  assert.match(screen, /text: "Remove", style: "destructive"/);
  assert.match(screen, /canonical\.remove\(item\.type, item\.id\)/);
  assert.match(screen, /event\.stopPropagation\(\); remove\(model\.item\)/);
  assert.match(screen, /`Remove \$\{model\.title\} from saved`/);
});

test("Saved and Recent keep their error feedback scoped to the owning tab", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /tab === "saved" && canonical\.error/);
  assert.match(screen, /tab === "recent" && recentError/);
  assert.doesNotMatch(screen, /syncError \|\| canonical\.error/);
  assert.match(screen, /setRecentError\(""\)/);
  assert.match(screen, /Unable to synchronize recent searches/);
});

test("empty copy covers canonical types while Recent semantics remain intact", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /No saved travel yet/);
  assert.match(screen, /Use Save on a flight, hotel, or search to keep it here\./);
  assert.match(screen, /travelApi\.recentSearches\(\)/);
  assert.match(screen, /travelApi\.deleteRecentSearch\(item\.id\)/);
  assert.match(screen, /travelApi\.clearRecentSearches\(\)/);
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
