import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { popularDestinationStays } from "./PopularDestinationStaysData";
import { homepageHotelDestinationParams, popularDestinationStayNavigation } from "./homepageCardNavigation";

const section = readFileSync(join(process.cwd(), "src/features/home/PopularDestinationStays.tsx"), "utf8");

test("uses one unsynchronised horizontal rail without a grid or wrapping", () => {
  assert.equal(section.match(/<ScrollView/g)?.length, 1);
  assert.match(section, /testID="popular-destination-stays-rail"/);
  assert.match(section, /\bhorizontal\b/);
  assert.match(section, /\bnestedScrollEnabled\b/);
  assert.match(section, /showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(section, /flexWrap|numColumns|pagingEnabled|scrollTo|autoScroll/);
});

test("matches the mobile-web portrait card and independent interaction structure", () => {
  assert.match(section, /cardWidth: 276/);
  assert.match(section, /imageHeight: 288/);
  assert.match(section, /ctaHeight: 72/);
  assert.match(section, /useWindowDimensions/);
  assert.match(section, /styles\.copy/);
  assert.match(section, /<AndroidFavoriteButton/);
  assert.match(section, /event\.stopPropagation\(\)/);
  assert.match(section, /<Pressable[\s\S]*Explore stays/);
  assert.doesNotMatch(section, /<Pressable\s+key=\{destination\.id\}/);
});

test("renders the complete web-aligned destination list and safe image fallback", () => {
  assert.equal(popularDestinationStays.length, 7);
  assert.deepEqual(popularDestinationStays.slice(1).map(({ city }) => city), ["London", "Johannesburg", "Accra", "Nairobi", "Istanbul", "Paris"]);
  assert.match(section, /popular-stay-image-fallback-/);
  assert.match(section, /onError=\{\(\) =>/);
  assert.match(section, /destination\.city/);
  assert.match(section, /destination\.country/);
});

test("Explore stays preserves destination context in the existing hotel-results contract", () => {
  assert.deepEqual(homepageHotelDestinationParams({ city: "London" }), { destination: "London" });
  assert.deepEqual(popularDestinationStayNavigation({ city: "London" }), {
    pathname: "/hotel-results",
    params: { destination: "London" },
  });
  assert.match(section, /router\.push\(popularDestinationStayNavigation\(destination\)\)/);
});
