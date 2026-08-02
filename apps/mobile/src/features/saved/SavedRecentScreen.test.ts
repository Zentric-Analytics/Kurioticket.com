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
});
