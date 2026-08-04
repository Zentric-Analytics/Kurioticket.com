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

test("Saved & recent resolves existing records, protects guests, and supports close removal and empty state", () => {
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
  assert.match(screen, /<FlowIcon name="close" color="#10254D" size=\{22\} \/>/);
  assert.doesNotMatch(screen, /<FlowIcon name="heart" color="#E11D48" size=\{22\} \/>/);
  assert.match(screen, /styles\.remove/);
  assert.match(screen, /remove: \{ width: 52, height: 52, flexShrink: 0, borderRadius: 26, backgroundColor: "#FFFFFF"/);
  assert.match(screen, /shadowOpacity: 0\.16/);
  assert.match(screen, /removePressed: \{ opacity: 0\.76, transform: \[\{ scale: 0\.94 \}\] \}/);
  assert.match(screen, /destinationMedia\(id\)\?\.source \?\? FALLBACK_SOURCE/);
  assert.match(screen, /failed \? FALLBACK_SOURCE : item\.image/);
  assert.match(screen, /onError=\{\(\) => \{ if \(!failed\) setFailed\(true\); \}\}/);
  assert.match(screen, /destinationId: destination\.id/);
  assert.match(screen, /airportCodes: destination\.airportCodes\.join\(","\)/);
  assert.match(screen, /to: destination\.primaryAirportCode/);
});

test("saved favorites use compact, stable cards and covered images", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /card: \{ height: 104,/);
  assert.match(screen, /image: \{ width: 112, height: 104, flexShrink: 0,/);
  assert.match(screen, /resizeMode="cover"/);
  assert.doesNotMatch(screen, /alignSelf: "stretch"/);
  assert.match(screen, /copy: \{ flex: 1, minWidth: 0,/);
  assert.match(screen, /<Text numberOfLines=\{2\}[^>]*styles\.name/);
  assert.match(screen, /items\.map\(\(item\) => <Pressable key=\{item\.id\}/);
});

test("saved destination media keeps catalogue resolution and a loop-safe fallback", () => {
  const screen = source("src/features/saved/SavedRecentScreen.tsx");
  assert.match(screen, /image: destinationMedia\(id\)\?\.source \?\? FALLBACK_SOURCE/);
  assert.match(screen, /source=\{failed \? FALLBACK_SOURCE : item\.image\}/);
  assert.match(screen, /if \(!failed\) setFailed\(true\)/);
});

test("Saved favorites uses the close icon only for saved-list removal while other favorite surfaces keep hearts", () => {
  const saved = source("src/features/saved/SavedRecentScreen.tsx");
  const flowIcon = source("src/features/flow/FlowIcon.tsx");
  const homeFavorite = source("src/features/home/AndroidFavoriteButton.tsx");
  const explore = source("src/features/explore/ExploreScreen.tsx");
  const details = source("src/features/explore/DestinationDetailsScreen.tsx");

  assert.match(flowIcon, /\| "close" \| "compass"/);
  assert.match(flowIcon, /close: <Path \{\.\.\.line\} d="M6 6l12 12M18 6 6 18" \/>/);
  assert.match(saved, /<FlowIcon name="close"/);
  assert.match(saved, /accessibilityLabel=\{`Remove \$\{item\.name\} from favorites`\}/);
  assert.match(saved, /toggle\(item\.id\)/);
  assert.match(saved, /No saved favorites yet/);
  assert.match(homeFavorite, /<FlowIcon name="heart"/);
  assert.match(homeFavorite, /onPress=\{onPress\}/);
  assert.match(homeFavorite, /androidFavoriteColors\.inactive/);
  assert.match(explore, /<AndroidFavoriteButton/);
  assert.match(details, /<AndroidFavoriteButton/);
  assert.doesNotMatch(`${homeFavorite}\n${explore}\n${details}`, /name="close"/);
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
