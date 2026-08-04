import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const shared = source("src/components/FavoriteButton.tsx");
const wrapper = source("src/features/home/HomepageFavoriteButton.tsx");
const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");
const explore = source("src/features/explore/ExploreScreen.tsx");
const details = source("src/features/explore/DestinationDetailsScreen.tsx");
const savedRecent = source("src/features/saved/SavedRecentScreen.tsx");

test("Explore-style favorite button is the shared dark translucent circular heart", () => {
  assert.match(shared, /background:\s*"rgba\(2,15,42,\.62\)"/);
  assert.match(shared, /size:\s*44/);
  assert.match(shared, /borderRadius:\s*22/);
  assert.match(shared, /iconSize:\s*24/);
  assert.match(shared, /active:\s*"#E92D55"/);
  assert.match(shared, /inactive:\s*"white"/);
  assert.doesNotMatch(shared, /fill=\{saved \?/);
  assert.match(shared, /accessibilityState=\{\{ selected: saved, disabled \}\}/);
});

test("Explore cards and search rows render the shared favorite button", () => {
  assert.equal((explore.match(/<FavoriteButton/g) ?? []).length, 2);
  assert.match(explore, /style=\{s\.heart\}/);
  assert.match(explore, /style=\{s\.rowHeart\}/);
  assert.doesNotMatch(explore, /<Pressable[\s\S]{0,220}<FlowIcon name="heart"/);
});

test("homepage save-enabled cards use the same shared Explore-style component", () => {
  assert.match(popular, /<FavoriteButton[\s\S]*toggle\(destination\.id\)/);
  assert.match(adventure, /<FavoriteButton[\s\S]*toggle\(card\.id\)/);
  assert.equal((`${popular}
${adventure}`.match(/<FavoriteButton/g) ?? []).length, 2);
  assert.match(wrapper, /<FavoriteButton/);
});

test("destination details uses the same shared Explore-style favorite button", () => {
  assert.match(details, /<FavoriteButton[\s\S]*onPress=\{onToggle\}/);
  assert.doesNotMatch(details, /heart:\s*\{[^}]*backgroundColor:\s*"white"/);
});

test("save-enabled cards do not render old blue or alternate white favorite circles", () => {
  const saveSurfaces = `${shared}
${wrapper}
${popular}
${adventure}
${explore}
${details}`;
  assert.doesNotMatch(saveSurfaces, /backgroundColor:\s*"rgba\(6,76,247,0\.92\)"/);
  assert.doesNotMatch(saveSurfaces, /backgroundColor:\s*"#FFFFFF"|background:\s*"#FFFFFF"|heart:\s*\{[^}]*backgroundColor:\s*"white"/);
  assert.doesNotMatch(saveSurfaces, /color=\{saved \? "#E92D55" : NAVY\}/);
  assert.doesNotMatch(saveSurfaces, /heartSaved/);
});

test("favorite interactions preserve guest sign-in, authenticated save, and card press isolation", () => {
  const hook = source("src/storage/useSavedDestinations.ts");
  const store = source("src/storage/savedDestinationsStore.ts");
  assert.match(hook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(hook, /showFavoriteSignInPrompt\(\); return;/);
  assert.match(store, /next\.has\(id\) \? next\.delete\(id\) : next\.add\(id\)/);
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(adventure, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
});

test("Saved & Recent keeps its remove close control and no unsupported cards gain saves", () => {
  assert.match(savedRecent, /<FlowIcon name="close"/);
  assert.match(savedRecent, /accessibilityLabel=\{`Remove \$\{item\.name\} from favorites`\}/);
  assert.match(savedRecent, /toggle\(item\.id\)/);
  assert.doesNotMatch(savedRecent, /<FavoriteButton/);
});
