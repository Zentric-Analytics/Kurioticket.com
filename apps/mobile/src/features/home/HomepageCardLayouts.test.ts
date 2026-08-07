import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const popular = source("src/features/home/PopularDestinationStays.tsx");
const home = source("src/features/flow/HomeFlowScreen.tsx");

test("Popular destination cards match the mobile website dimensions and layout", () => {
  assert.match(popular, /cardWidth: 276/);
  assert.match(popular, /imageHeight: 288/);
  assert.match(popular, /ctaHeight: 72/);
  assert.match(popular, /gap: 16/);
  assert.match(popular, /sideInset: 16/);
  assert.match(popular, /nextCardVisible: 67/);
  assert.match(popular, /const IMAGE_OVERLAY_HEIGHT = 112/);
  assert.match(popular, /width:\s*CARD_WIDTH/);
  assert.match(popular, /height:\s*IMAGE_HEIGHT \+ CTA_HEIGHT/);
  assert.match(
    popular,
    /imageFrame:\s*\{[\s\S]*?width:\s*"100%",[\s\S]*?height:\s*IMAGE_HEIGHT/,
  );
  assert.match(
    popular,
    /image:\s*\{[\s\S]*?\.\.\.StyleSheet\.absoluteFillObject,[\s\S]*?width:\s*"100%"/,
  );
  assert.match(popular, /gap: POPULAR_STAY_LAYOUT\.gap/);
  assert.match(popular, /borderRadius: POPULAR_STAY_LAYOUT\.radius/);
  assert.match(popular, /paddingHorizontal:\s*16/);
  assert.match(
    popular,
    /<View\s+style=\{styles\.imageFrame\}[\s\S]*?<Text style=\{styles\.city\}>\{destination\.city\}<\/Text>[\s\S]*?<Text style=\{styles\.country\}>\{destination\.country\}<\/Text>[\s\S]*?<\/View>\s*<View\s+style=\{styles\.ctaSection\}/,
  );
  assert.match(
    popular,
    /<View\s+style=\{styles\.ctaSection\}[\s\S]*?<Text style=\{styles\.ctaText\}>Explore stays<\/Text>/,
  );
  assert.match(
    popular,
    /<ScrollView[\s\S]*horizontal[\s\S]*contentContainerStyle=\{styles\.carousel\}/,
  );
  assert.match(
    popular,
    /<View\s+style=\{styles\.imageFrame\}[\s\S]*?<AndroidFavoriteButton[\s\S]*?style=\{styles\.heart\}/,
  );
  assert.match(
    popular,
    /<LinearGradient[\s\S]*?id="destinationOverlay"[\s\S]*?stopOpacity=\{0\.55\}/,
  );
  assert.doesNotMatch(popular, /copy:\s*\{[^}]*backgroundColor/);
  assert.match(
    popular,
    /heart:\s*\{[\s\S]*?top:\s*12,[\s\S]*?right:\s*12,[\s\S]*?width:\s*36,[\s\S]*?height:\s*36/,
  );
  assert.match(popular, /style=\{styles\.heart\}/);
  assert.doesNotMatch(popular, /cardSurface/);

  const mobileViewport = 375;
  const sideInset = 16;
  const cardWidth = 276;
  const gap = 16;
  assert.equal(mobileViewport - sideInset - cardWidth - gap, 67);
});

test("popular stay favorite buttons and navigation use shared helpers", () => {
  assert.match(popular, /event\.stopPropagation\(\);\s*toggle\(destination\.id\);/);
  assert.match(popular, /router\.push\(popularDestinationStayNavigation\(destination\)\)/);
});

test("Popular destination stays is one shared Android and iOS implementation", () => {
  assert.match(
    home,
    /import \{ PopularDestinationStays \} from "\.\.\/home\/PopularDestinationStays"/,
  );
  assert.match(home, /<PopularDestinationStays \/>/);
  assert.doesNotMatch(popular, /Platform|android|ios/);
});

test("homepage sections remain in the same order after popular stays", () => {
  const orderedSections = [
    "<HomeHero />",
    "<FlightSearchPanel compact enableHomepageDefaultOrigin homepageAirportPicker />",
    "<PopularDestinationStays />",
    "<HomepageDealPromos />",
  ];

  let cursor = -1;
  for (const section of orderedSections) {
    const index = home.indexOf(section);
    assert.ok(
      index > cursor,
      `${section} remains after the previous homepage section`,
    );
    cursor = index;
  }
});
