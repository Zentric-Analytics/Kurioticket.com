import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");

test("Profile exposes Saved & recent without changing the bottom tabs", () => {
  assert.match(source("src/features/profile/ProfileScreen.tsx"), /Saved & recent.*route: "\/saved"/);
  assert.match(source("src/features/profile/GuestProfileScreen.tsx"), /Saved & recent.*router\.push\("\/saved"\)/);
  assert.equal((source("app/(tabs)/_layout.tsx").match(/<Tabs\.Screen/g) ?? []).length, 4);
  assert.doesNotMatch(source("app/(tabs)/_layout.tsx"), /name="saved"/);
});

test("Saved & recent resolves existing records, protects guests, and supports removal and empty state", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /useSavedDestinations\(\)/);
  assert.match(screen, /popularDestinationStays\.find/);
  assert.match(screen, /nextAdventureCards\.find/);
  assert.match(screen, /destinations\.find/);
  assert.match(screen, /!isAuthenticated/);
  assert.match(screen, /router\.push\("\/\(tabs\)\/profile\/sign-in"\)/);
  assert.match(screen, /No saved favorites yet/);
  assert.match(screen, /Tap the heart on a destination to save it here\./);
  assert.match(screen, /event\.stopPropagation\(\); toggle\(item\.id\)/);
  assert.match(screen, /destinationMedia\(id\)\?\.source \?\? FALLBACK_SOURCE/);
  assert.match(screen, /failed \? FALLBACK_SOURCE : item\.image/);
  assert.match(screen, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(screen, /destinationId: destination\.id/);
  assert.match(screen, /airportCodes: destination\.airportCodes\.join\(","\)/);
  assert.match(screen, /to: destination\.primaryAirportCode/);
});

test("Explore and Profile share saved destination IDs, including search-only destinations", () => {
  const explore = source("src/features/explore/ExploreScreen.tsx");
  const saved = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(explore, /useSavedDestinations\(\)/);
  assert.match(saved, /useSavedDestinations\(\)/);
  assert.match(explore, /onToggle=\{\(\) => toggle\(r\.destination\.id\)\}/);
  assert.match(saved, /\[\.\.\.savedIds\]\.map\(savedItem\)/);
  assert.match(saved, /destinations\.find\(\(item\) => item\.id === id\)/);
  assert.match(saved, /toggle\(item\.id\)/);
});
