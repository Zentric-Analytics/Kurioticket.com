import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const favorite = source("src/features/home/AndroidFavoriteButton.tsx");
const shim = source("src/features/home/HomepageFavoriteButton.tsx");
const explore = source("src/features/explore/ExploreScreen.tsx");
const details = source("src/features/explore/DestinationDetailsScreen.tsx");
const savedRecent = source("src/features/saved/SavedScreen.tsx");

test("shared favorite preserves its existing default treatment", () => {
  assert.match(favorite, /background:\s*"rgba\(2,15,42,\.62\)"/);
  assert.match(favorite, /width:\s*40/);
  assert.match(favorite, /height:\s*40/);
  assert.match(favorite, /borderRadius:\s*20/);
  assert.match(favorite, /size=\{webParity \? 15 : 18\}/);
  assert.match(favorite, /unsavedStroke:\s*"#334155"/);
  assert.match(favorite, /savedStroke:\s*"#E92D55"/);
  assert.match(favorite, /savedFill:\s*"#E92D55"/);
  assert.match(favorite, /unsavedFill:\s*"none"/);
  assert.match(favorite, /variant\?: "default" \| "webParity"/);
  assert.match(favorite, /variant = "default"/);
  assert.match(shim, /export \{ AndroidFavoriteButton, androidFavoriteColors \}/);
});

test("web-parity image-overlay favorite exactly mirrors the mobile-web unsaved treatment", () => {
  assert.match(favorite, /unsavedBackground: "rgba\(255,255,255,0\.90\)"/);
  assert.match(favorite, /unsavedBorder: "rgba\(255,255,255,0\.80\)"/);
  assert.match(favorite, /unsavedStroke: "#64748B"/);
  assert.match(favorite, /unsavedFill: "none"/);
  assert.match(favorite, /webParitySurface: \{[\s\S]*position: "absolute",[\s\S]*top: 0,[\s\S]*right: 0,[\s\S]*width: 32,[\s\S]*height: 32,[\s\S]*borderRadius: 16,[\s\S]*borderWidth: 1/);
  assert.match(favorite, /size=\{webParity \? 15 : 18\}/);
  assert.match(favorite, /strokeWidth=\{webParity \? webParityFavoriteColors\.strokeWidth : androidFavoriteColors\.strokeWidth\}/);
  assert.match(favorite, /fill=\{saved \? \(webParity \? webParityFavoriteColors\.savedFill : androidFavoriteColors\.savedFill\) : \(webParity \? webParityFavoriteColors\.unsavedFill : androidFavoriteColors\.unsavedFill\)\}/);
});

test("web-parity image-overlay saved state remains visibly distinct", () => {
  assert.match(favorite, /savedBackground: "#FFF1F2"/);
  assert.match(favorite, /savedBorder: "#FECDD3"/);
  assert.match(favorite, /savedStroke: "#E11D48"/);
  assert.match(favorite, /savedFill: "#E11D48"/);
  assert.match(favorite, /saved \? styles\.webParitySaved : styles\.webParityUnsaved/);
});

test("shared Android favorite button keeps a minimum 44 by 44 touch target", () => {
  assert.match(favorite, /androidFavoriteHitSlop = \{ top: 2, bottom: 2, left: 2, right: 2 \}/);
  assert.match(favorite, /hitSlop=\{androidFavoriteHitSlop\}/);
});

test("Explore keeps the same heart placement while using the shared Android component", () => {
  assert.match(explore, /<AndroidFavoriteButton[\s\S]*label=\{`\$\{saved \? "Remove" : "Save"\} \$\{destination\.name\}`\}[\s\S]*style=\{s\.heart\}/);
  assert.match(explore, /heart:\s*\{[\s\S]*position:\s*"absolute",[\s\S]*right:\s*10,[\s\S]*top:\s*10,[\s\S]*\}/);
  assert.doesNotMatch(explore, /heart:\s*\{[\s\S]*width:\s*44[\s\S]*height:\s*44[\s\S]*borderRadius:\s*22[\s\S]*backgroundColor:\s*"rgba\(2,15,42,\.62\)"/);
});

test("all current save-enabled destination cards share one Android favorite component", () => {
  assert.match(details, /<AndroidFavoriteButton[\s\S]*onPress=\{onToggle\}/);
  assert.equal((`${details}\n${explore}`.match(/<AndroidFavoriteButton/g) ?? []).length, 2);
});

test("only image-card consumers opt into the mobile-web overlay variant", () => {
  const popular = source("src/features/home/PopularDestinationStays.tsx");
  const adventure = source("src/features/home/HomepageAdventureDiscovery.tsx");
  const region = source("src/features/explore/ExploreRegionScreen.tsx");
  for (const imageCard of [popular, adventure, explore, region]) {
    assert.match(imageCard, /<AndroidFavoriteButton[\s\S]*?variant="webParity"/);
  }
  assert.doesNotMatch(details, /variant="webParity"/);
  assert.doesNotMatch(savedRecent, /variant="webParity"/);
});

test("favorite behavior, navigation, and propagation remain unchanged", () => {
  const hook = source("src/storage/useSavedDestinations.ts");
  const store = source("src/storage/savedDestinationsStore.ts");
  assert.match(hook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(hook, /showFavoriteSignInPrompt\("\/saved"\);return;/);
  assert.match(store, /next\.has\(id\) \? next\.delete\(id\) : next\.add\(id\)/);
  assert.match(explore, /onPress=\{onSelect\}/);
});

test("favorite tokens are image-independent in light and dark modes", () => {
  assert.match(favorite, /unsavedStroke:\s*"#334155"/);
  assert.match(favorite, /savedStroke:\s*"#E92D55"/);
  assert.match(favorite, /savedFill:\s*"#E92D55"/);
  assert.match(favorite, /unsavedFill:\s*"none"/);
  assert.match(favorite, /background:\s*"rgba\(2,15,42,\.62\)"/);
  assert.match(favorite, /unsavedBackground: "rgba\(255,255,255,0\.90\)"/);
  assert.doesNotMatch(favorite, /useColorScheme|dark|light|theme/);
});

test("no old blue favorite circle remains and Saved & Recent keeps remove close control", () => {
  for (const [name, file] of [["button", favorite], ["explore", explore], ["details", details]] as const) {
    assert.doesNotMatch(file, /backgroundColor:\s*"rgba\(6,76,247,0\.92\)"/, `${name} removed blue saved background`);
    assert.doesNotMatch(file, /heartSaved/, `${name} does not keep a second heart design`);
  }
  assert.match(savedRecent, /<FlowIcon name="close"/);
  assert.match(savedRecent, /accessibilityLabel=\{`Remove \$\{model\.title\} from saved`\}/);
  assert.doesNotMatch(savedRecent, /<AndroidFavoriteButton/);
});
