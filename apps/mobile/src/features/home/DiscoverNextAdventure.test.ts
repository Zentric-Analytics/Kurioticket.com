import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("the shared homepage renders one discovery board immediately after popular stays", () => {
  const home = source("src/features/flow/HomeFlowScreen.tsx");
  const placement = /<PopularDestinationStays\s*\/>\s*<DiscoverNextAdventure\s*\/>/g;

  assert.equal([...home.matchAll(placement)].length, 1);
  assert.equal((home.match(/<DiscoverNextAdventure\s*\/>/g) ?? []).length, 1);
});

test("the discovery board matches the website mobile board and opens real flight routes", () => {
  const discovery = source("src/features/home/DiscoverNextAdventure.tsx");

  assert.match(discovery, /Discover your next adventure here/);
  assert.match(discovery, /Compare smart route ideas, flexible fares, and destinations picked for your region\./);
  assert.equal((discovery.match(/id: "ng-/g) ?? []).length, 8);
  assert.match(discovery, /nextAdventureCards\.map\(\(card\) => <AdventureCardView/);
  assert.match(discovery, /router\.push\(discoverAdventureNavigation\(card\)\)/);
  assert.match(discovery, /imageFailed \?/);
});


test("discover cards use premium editorial image overlays without changing carousel navigation", () => {
  const discovery = source("src/features/home/DiscoverNextAdventure.tsx");

  assert.match(discovery, /card: \{ height: 187, borderRadius: 18, overflow: "hidden" \}/);
  assert.match(discovery, /imageFrame: \{ flex: 1, borderRadius: 18/);
  assert.match(discovery, /<Svg pointerEvents="none" style=\{styles\.gradientOverlay\}/);
  assert.match(discovery, /<View style=\{styles\.cardCopy\}>[\s\S]*<Text numberOfLines=\{2\} style=\{styles\.cardTitle\}>\{card\.title\}<\/Text>[\s\S]*<Text numberOfLines=\{1\} style=\{styles\.route\}>\{card\.originCode\} → \{card\.destinationCode\}<\/Text>/);
  assert.doesNotMatch(discovery, /cardCopy: \{ flex: 1, justifyContent: "center"/);
  assert.doesNotMatch(discovery, /style=\{\(\{ pressed \}\) => \[styles\.card, flowStyles\.shadow/);
  assert.match(discovery, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
  assert.match(discovery, /router\.push\(discoverAdventureNavigation\(card\)\)/);
});

test("discover editorial content supports available categories and theme-aware light and dark overlays", () => {
  const discovery = source("src/features/home/DiscoverNextAdventure.tsx");

  assert.match(discovery, /category\?: string/);
  assert.match(discovery, /\{card\.category \? <Text numberOfLines=\{1\} style=\{\[styles\.categoryPill, ft\.theme\.dark && styles\.categoryPillDark\]\}>\{card\.category\}<\/Text> : null\}/);
  assert.match(discovery, /categoryPill: \{[\s\S]*backgroundColor: "rgba\(219,234,254,0\.92\)"[\s\S]*color: flowColors\.blue/);
  assert.match(discovery, /categoryPillDark: \{ backgroundColor: "rgba\(29,78,216,0\.58\)", color: "#DBEAFE" \}/);
  assert.match(discovery, /stopColor=\{ft\.theme\.dark \? "#020617" : "#071A48"\}/);
  assert.match(discovery, /stopOpacity=\{ft\.theme\.dark \? "0\.86" : "0\.72"\}/);
  assert.match(discovery, /cardTitle: \{ color: "white"[\s\S]*fontWeight: "800"/);
  assert.match(discovery, /route: \{ color: "rgba\(255,255,255,0\.84\)"[\s\S]*fontWeight: "700"/);
});

test("discover favorite button remains the shared top-right control with unchanged save behavior", () => {
  const discovery = source("src/features/home/DiscoverNextAdventure.tsx");

  assert.match(discovery, /<AndroidFavoriteButton[\s\S]*saved=\{saved\}[\s\S]*label=\{saved \? "Remove from saved routes" : "Save route"\}[\s\S]*event\.stopPropagation\(\);[\s\S]*toggle\(card\.id\);[\s\S]*style=\{styles\.heart\}/);
  assert.match(discovery, /heart: \{ position: "absolute", right: 12, top: 12 \}/);
});
