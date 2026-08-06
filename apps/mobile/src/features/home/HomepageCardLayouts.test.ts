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
  assert.match(popular, /const IMAGE_OVERLAY_HEIGHT = 112/);
  assert.match(popular, /width:\s*CARD_WIDTH/);
  assert.match(popular, /height:\s*IMAGE_HEIGHT \+ CTA_HEIGHT/);
  assert.match(popular, /imageFrame:\s*\{[\s\S]*?width:\s*"100%",[\s\S]*?height:\s*IMAGE_HEIGHT/);
  assert.match(popular, /image:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject,[\s\S]*?width:\s*"100%"/);
  assert.match(popular, /carousel:\s*\{ gap:\s*16/);
  assert.match(popular, /borderRadius:\s*16/);
  assert.match(popular, /paddingHorizontal:\s*16/);
  assert.match(popular, /<View style=\{styles\.imageFrame\}>[\s\S]*<Text style=\{styles\.city\}>\{destination\.city\}<\/Text>[\s\S]*<Text style=\{styles\.country\}>\{destination\.country\}<\/Text>[\s\S]*<\/View>\s*<View style=\{styles\.ctaSection\}>/);
  assert.match(popular, /<View style=\{styles\.ctaSection\}>[\s\S]*<Text style=\{styles\.ctaText\}>Explore stays<\/Text>/);
  assert.match(popular, /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/);
  assert.match(popular, /<View style=\{styles\.imageFrame\}>[\s\S]*<AndroidFavoriteButton[\s\S]*style=\{styles\.heart\}/);
  assert.match(popular, /<LinearGradient id="destinationOverlay"[\s\S]*stopOpacity=\{0\.55\}/);
  assert.doesNotMatch(popular, /copy:\s*\{[^}]*backgroundColor/);
  assert.match(popular, /heart:\s*\{[\s\S]*?top:\s*12,[\s\S]*?right:\s*12,[\s\S]*?width:\s*36,[\s\S]*?height:\s*36/);
  assert.match(popular, /style=\{styles\.heart\}/);
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

test("Popular destination stays is one shared Android and iOS implementation", () => {
  assert.match(home, /import \{ PopularDestinationStays \} from "\.\.\/home\/PopularDestinationStays"/);
  assert.match(home, /<PopularDestinationStays \/>/);
  assert.doesNotMatch(popular, /Platform|android|ios/);
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
