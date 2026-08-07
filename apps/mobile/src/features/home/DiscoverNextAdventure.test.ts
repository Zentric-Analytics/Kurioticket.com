import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const mobileSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const websiteSource = (path: string) => readFileSync(join(process.cwd(), "../..", path), "utf8");

const discovery = mobileSource("src/features/home/DiscoverNextAdventure.tsx");
const websiteHome = websiteSource("src/app/page.tsx");

test("the discovery heading is concise and visually scannable", () => {
  assert.match(discovery, />Discover your next adventure<\/Text>/);
  assert.doesNotMatch(discovery, /Discover your next adventure here/);
});

test("the discovery cards use the website card measurements", () => {
  assert.match(websiteHome, /function DiscoverySuggestionCard\(/);
  assert.match(discovery, /height: 300/);
  assert.match(discovery, /imageHeight: 135/);
  assert.match(discovery, /radius: 16/);
  assert.match(discovery, /gap: 12/);
  assert.match(discovery, /sideInset: 16/);
});

test("the shared Android and iOS card uses the website image and white content structure", () => {
  assert.match(discovery, /imageFrame: \{ width: "100%", height: WEBSITE_DISCOVERY_CARD\.imageHeight/);
  assert.match(discovery, /resizeMode="cover"/);
  assert.match(discovery, /<View style=\{styles\.contentPanel\}>[\s\S]*cardTitle[\s\S]*styles\.route[\s\S]*styles\.tripSummary[\s\S]*styles\.from/);
  assert.match(discovery, /ONE WAY · ECONOMY · 1 TRAVELER/);
  assert.match(discovery, /<Text style=\{styles\.from\}>From<\/Text>/);
  assert.doesNotMatch(discovery, /gradientOverlay|Platform\.OS/);
});

test("the discovery board is a responsive two-column vertical grid", () => {
  assert.match(discovery, /<View style=\{styles\.grid\}>/);
  assert.match(discovery, /grid: \{ flexDirection: "row", flexWrap: "wrap", gap: WEBSITE_DISCOVERY_CARD\.gap/);
  assert.match(discovery, /card: \{ flexBasis: "47%", flexGrow: 1,[\s\S]*maxWidth: "50%"/);
  assert.doesNotMatch(discovery, /<ScrollView|horizontal|FlatList/);
});

test("card navigation and shared favorite behavior remain isolated and unchanged", () => {
  const favorite = mobileSource("src/features/home/AndroidFavoriteButton.tsx");
  assert.match(discovery, /router\.push\(discoverAdventureNavigation\(card\)\)/);
  assert.match(discovery, /<AndroidFavoriteButton[\s\S]*saved=\{saved\}/);
  assert.match(favorite, /accessibilityState=\{\{ selected: saved \}\}/);
  assert.match(discovery, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
  assert.match(discovery, /heart: \{ position: "absolute", right: 12, top: 12, width: 32, height: 32, borderRadius: 16 \}/);
});

test("the discovery board placement and unrelated homepage sections are unchanged", () => {
  const home = mobileSource("src/features/flow/HomeFlowScreen.tsx");
  assert.match(home, /<PopularDestinationStays \/>\s*<DiscoverNextAdventure \/>\s*<HomepageDealPromos \/>/);
  assert.equal((home.match(/<DiscoverNextAdventure \/>/g) ?? []).length, 1);
});
