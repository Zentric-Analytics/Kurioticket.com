import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { popularDestinationStays } from "./PopularDestinationStaysData";
import {
  homepageHotelDestinationParams,
  popularDestinationStayNavigation,
} from "./homepageCardNavigation";

const section = readFileSync(
  join(process.cwd(), "src/features/home/PopularDestinationStays.tsx"),
  "utf8",
);

test("uses one unsynchronised horizontal rail without a grid or wrapping", () => {
  assert.equal(section.match(/<ScrollView/g)?.length, 1);
  assert.match(section, /testID="popular-destination-stays-rail"/);
  assert.match(section, /\bhorizontal\b/);
  assert.match(section, /\bnestedScrollEnabled\b/);
  assert.match(section, /showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(
    section,
    /flexWrap|numColumns|pagingEnabled|scrollTo|autoScroll/,
  );
});

test("matches the mobile-web portrait card and independent interaction structure", () => {
  assert.match(section, /cardWidth: 276/);
  assert.match(section, /imageHeight: 288/);
  assert.match(section, /ctaHeight: 72/);
  assert.match(section, /useWindowDimensions/);
  assert.match(section, /styles\.copy/);
  assert.match(
    section,
    /style=\{\[styles\.imageFrame, \{ height: imageHeight \}\]\}/,
  );
  assert.match(section, /style=\{styles\.ctaSection\}/);
  assert.match(section, /height: CTA_HEIGHT/);
  assert.match(section, /event\.stopPropagation\(\)/);
  assert.match(section, /<Pressable[\s\S]*Explore stays/);
  assert.doesNotMatch(section, /<Pressable\s+key=\{destination\.id\}/);
});

test("uses the shared Android favorite button and existing saved state", () => {
  assert.match(
    section,
    /import \{ AndroidFavoriteButton \} from "\.\/AndroidFavoriteButton"/,
  );
  assert.match(section, /const \{ savedIds, toggle \} = useSavedDestinations\(\)/);
  assert.match(section, /const saved = savedIds\.has\(destination\.id\)/);
  assert.match(
    section,
    /<AndroidFavoriteButton[\s\S]*saved=\{saved\}[\s\S]*label=\{`\$\{saved \? "Remove" : "Add"\} \$\{destination\.city\} \$\{saved \? "from" : "to"\} favorites`\}[\s\S]*event\.stopPropagation\(\);[\s\S]*toggle\(destination\.id\);[\s\S]*style=\{styles\.heart\}[\s\S]*\/>/,
  );
  assert.doesNotMatch(section, /<FlowIcon|heartUnsaved|heartSaved|heartPressed/);
  assert.doesNotMatch(section, /#F43F5E|#E11D48|fill=\{flowColors\.white\}/);
});

test("keeps destination copy over the image and the compact footer separate", () => {
  const imageFrame = section.indexOf("styles.imageFrame");
  const copy = section.indexOf("styles.copy", imageFrame);
  const imageFrameClose = section.indexOf("</View>", copy);
  const footer = section.indexOf("style={styles.ctaSection}", imageFrameClose);

  assert.ok(
    imageFrame < copy && copy < imageFrameClose && imageFrameClose < footer,
  );
  assert.match(section, /minWidth: 156/);
  assert.match(section, /height: 40/);
  assert.match(section, /justifyContent: "center"/);
  assert.match(
    section,
    /copy: \{[\s\S]*position: "absolute"[\s\S]*bottom: 16[\s\S]*left: 16[\s\S]*right: 16/,
  );
  assert.match(
    section,
    /heart: \{[\s\S]*position: "absolute"[\s\S]*top: 12[\s\S]*right: 12/,
  );
  assert.match(
    section,
    /ctaSection: \{[\s\S]*height: CTA_HEIGHT[\s\S]*alignItems: "flex-start"[\s\S]*justifyContent: "center"[\s\S]*paddingHorizontal: 16/,
  );
  assert.doesNotMatch(section, /ctaSection: \{[^}]*alignItems: "center"/);
});

test("renders unobstructed destination images without a dark overlay", () => {
  assert.match(section, /<ImageBackground[\s\S]*style=\{styles\.image\}/);
  assert.match(
    section,
    /<View pointerEvents="none" style=\{styles\.copy\}>[\s\S]*destination\.city[\s\S]*destination\.country/,
  );
  assert.doesNotMatch(
    section,
    /react-native-svg|<Svg|<Defs|<LinearGradient|<Rect|<Stop/,
  );
  assert.doesNotMatch(
    section,
    /IMAGE_OVERLAY_HEIGHT|imageOverlay|destinationOverlay|#020617/,
  );
});

test("renders the complete web-aligned destination list and safe image fallback", () => {
  assert.equal(popularDestinationStays.length, 7);
  assert.deepEqual(
    popularDestinationStays.slice(1).map(({ city }) => city),
    ["London", "Johannesburg", "Accra", "Nairobi", "Istanbul", "Paris"],
  );
  assert.match(section, /popular-stay-image-fallback-/);
  assert.match(section, /onError=\{\(\) =>/);
  assert.match(section, /destination\.city/);
  assert.match(section, /destination\.country/);
});

test("Explore stays preserves destination context in the existing hotel-results contract", () => {
  assert.deepEqual(homepageHotelDestinationParams({ city: "London" }), {
    destination: "London",
  });
  assert.deepEqual(popularDestinationStayNavigation({ city: "London" }), {
    pathname: "/hotel-results",
    params: { destination: "London" },
  });
  assert.match(
    section,
    /router\.push\(popularDestinationStayNavigation\(destination\)\)/,
  );
});
