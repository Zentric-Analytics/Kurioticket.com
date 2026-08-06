import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");

test("Popular destination cards match the mobile website dimensions and layout", () => {
  assert.match(popular, /const CARD_WIDTH = 276/);
  assert.match(popular, /const IMAGE_HEIGHT = 288/);
  assert.match(popular, /const CTA_HEIGHT = 72/);
  assert.match(popular, /width:\s*CARD_WIDTH/);
  assert.match(popular, /height:\s*IMAGE_HEIGHT \+ CTA_HEIGHT/);
  assert.match(popular, /carousel:\s*\{ gap:\s*16/);
  assert.match(popular, /borderRadius:\s*16/);
  assert.match(popular, /paddingHorizontal:\s*16/);
  assert.match(popular, /<Text style=\{styles\.city\}>\{destination\.city\}<\/Text>[\s\S]*<Text style=\{styles\.country\}>\{destination\.country\}<\/Text>/);
  assert.match(popular, /<View style=\{styles\.ctaSection\}>[\s\S]*<Text style=\{styles\.ctaText\}>Explore stays<\/Text>/);
  assert.match(popular, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
  assert.match(popular, /<AndroidFavoriteButton[\s\S]*style=\{styles\.heart\}/);
});

test("Discover cards use the compact editorial card layout with horizontal scrolling", () => {
  assert.match(adventure, /const cardWidth = Math\.min\(190, Math\.max\(160, width \* 0\.42\)\)/);
  assert.match(adventure, /card:\s*\{ height:\s*187/);
  assert.match(adventure, /imageFrame:\s*\{ flex:\s*1, borderRadius:\s*18/);
  assert.match(adventure, /<Image[\s\S]*resizeMode="cover"[\s\S]*style=\{styles\.image\}/);
  assert.match(adventure, /<Svg pointerEvents="none" style=\{styles\.gradientOverlay\}/);
  assert.match(adventure, /<Text numberOfLines=\{2\} style=\{styles\.cardTitle\}>\{card\.title\}<\/Text>/);
  assert.match(adventure, /<Text numberOfLines=\{1\} style=\{styles\.route\}>\{card\.originCode\} → \{card\.destinationCode\}<\/Text>/);
  assert.doesNotMatch(adventure, /tripSummary|ONE WAY|from:\s*\{/);
  assert.match(adventure, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
});

test("favorite buttons continue to function and card navigation uses scoped helpers", () => {
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(adventure, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
  assert.match(popular, /router\.push\(popularDestinationStayNavigation\(destination\)\)/);
  assert.match(adventure, /router\.push\(discoverAdventureNavigation\(card\)\)/);
});

test("homepage sections outside popular stays and discovery remain in the same order", () => {
  const orderedSections = [
    "<HomeHero />",
    "<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker />",
    "<PopularDestinationStays />",
    "<DiscoverNextAdventure />",
    "<HomepageDealPromos />",
  ];

  let cursor = -1;
  for (const section of orderedSections) {
    const index = home.indexOf(section);
    assert.ok(index > cursor, `${section} remains after the previous homepage section`);
    cursor = index;
  }
});
