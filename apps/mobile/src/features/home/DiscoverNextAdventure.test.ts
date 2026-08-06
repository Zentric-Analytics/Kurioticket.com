import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const mobileSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const websiteSource = (path: string) => readFileSync(join(process.cwd(), "../..", path), "utf8");

const discovery = mobileSource("src/features/home/DiscoverNextAdventure.tsx");
const websiteHome = websiteSource("src/app/page.tsx");

test("the exact website DiscoverySuggestionCard mobile board is the measurement source", () => {
  assert.match(websiteHome, /function DiscoverySuggestionCard\(/);
  assert.match(websiteHome, /className="w-\[44vw\] min-w-\[170px\] max-w-\[210px\] shrink-0"/);
  assert.match(websiteHome, /mobileBoardCard \? "h-\[300px\] rounded-2xl/);
  assert.match(websiteHome, /className="flex w-max gap-3 pr-10"/);
  assert.match(websiteHome, /className=\{`-mx-4 overflow-x-auto px-4/);
  assert.match(discovery, /viewportWidthRatio: 0\.44/);
  assert.match(discovery, /minWidth: 170/);
  assert.match(discovery, /maxWidth: 210/);
  assert.match(discovery, /height: 300/);
  assert.match(discovery, /radius: 16/);
  assert.match(discovery, /gap: 12/);
  assert.match(discovery, /sideInset: 16/);
  assert.match(discovery, /trailingInset: 40/);
});

test("the shared Android and iOS card is a full-bleed image with bottom-left overlay copy", () => {
  assert.match(discovery, /card: \{ height: WEBSITE_DISCOVERY_CARD\.height, borderRadius: WEBSITE_DISCOVERY_CARD\.radius, overflow: "hidden" \}/);
  assert.match(discovery, /image: \{ width: "100%", height: "100%" \}/);
  assert.match(discovery, /resizeMode="cover"/);
  assert.match(discovery, /<Svg pointerEvents="none" style=\{styles\.gradientOverlay\}/);
  assert.match(discovery, /<Stop offset="0\.44" stopColor="#020617" stopOpacity="0\.34" \/>/);
  assert.match(discovery, /<Stop offset="1" stopColor="#020617" stopOpacity="0\.78" \/>/);
  assert.match(discovery, /cardCopy: \{ position: "absolute", left: 12, right: 12, bottom: 12, gap: 4 \}/);
  assert.match(discovery, /<View style=\{styles\.cardCopy\}>\s*<Text numberOfLines=\{2\} style=\{styles\.cardTitle\}>\{card\.title\}<\/Text>\s*<Text numberOfLines=\{1\} style=\{styles\.route\}>/);
  assert.doesNotMatch(discovery, /categoryPill|bg-white|contentPanel|Platform\.OS/);
});

test("website rail geometry preserves horizontal scrolling, inset, gap, and next-card visibility", () => {
  assert.match(discovery, /<ScrollView\s+horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
  assert.match(discovery, /width \* WEBSITE_DISCOVERY_CARD\.viewportWidthRatio/);
  assert.match(discovery, /carousel: \{ gap: WEBSITE_DISCOVERY_CARD\.gap,[\s\S]*paddingLeft: WEBSITE_DISCOVERY_CARD\.sideInset,[\s\S]*paddingRight: WEBSITE_DISCOVERY_CARD\.trailingInset/);
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
