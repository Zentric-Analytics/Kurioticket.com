import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const popular = source("src/features/home/PopularDestinationStays.tsx");
const adventure = source("src/features/home/DiscoverNextAdventure.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");

test("Popular destination cards render at reduced dimensions while preserving horizontal scrolling", () => {
  assert.match(popular, /const cardWidth = Math\.min\(230, Math\.max\(190, width \* 0\.58\)\)/);
  assert.match(popular, /height:\s*290/);
  assert.match(popular, /image:\s*\{ flex:\s*1, justifyContent:\s*"flex-end", padding:\s*14 \}/);
  assert.match(popular, /paddingVertical:\s*8/);
  assert.match(popular, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
  assert.match(popular, /<AndroidFavoriteButton[\s\S]*style=\{styles\.heart\}/);
});

test("Discover cards use the compact editorial card layout with horizontal scrolling", () => {
  assert.match(adventure, /const cardWidth = Math\.min\(190, Math\.max\(160, width \* 0\.42\)\)/);
  assert.match(adventure, /card:\s*\{ height:\s*220/);
  assert.match(adventure, /imageFrame:\s*\{ height:\s*108/);
  assert.match(adventure, /<Image[\s\S]*resizeMode="cover"[\s\S]*style=\{styles\.image\}/);
  assert.match(adventure, /<Text numberOfLines=\{2\} style=\{styles\.cardTitle\}>\{card\.title\}<\/Text>/);
  assert.match(adventure, /<Text numberOfLines=\{1\} style=\{styles\.route\}>\{card\.originCode\} → \{card\.destinationCode\}<\/Text>/);
  assert.doesNotMatch(adventure, /tripSummary|ONE WAY|from:\s*\{/);
  assert.match(adventure, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
});

test("favorite buttons continue to function and card navigation is unchanged", () => {
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(adventure, /event\.stopPropagation\(\);\s*toggle\(card\.id\);/);
  assert.match(popular, /pathname:\s*"\/hotels",\s*params:\s*\{ destination:\s*destination\.city \}/);
  assert.match(adventure, /pathname:\s*"\/flights", params:\s*\{ from:\s*card\.originCode, to:\s*card\.destinationCode \}/);
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
