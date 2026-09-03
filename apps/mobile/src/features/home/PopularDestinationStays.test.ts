import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getPopularDestinationStays,
  resolvePopularDestinationStay,
} from "./PopularDestinationStaysData";
import { destinationById } from "../explore/destinationCatalogue";
import { getMarketplaceHomeMerchandising } from "../../../../../src/shared/home/homeMerchandising";
import { popularDestinationsByMarket } from "../../../../../src/data/marketHomeContent";
import {
  homepageHotelDestinationParams,
  popularDestinationStayNavigation,
} from "./homepageCardNavigation";
import { buildSearchPlan } from "../flow/travelSearchModel";

const popularDestinationStays = getPopularDestinationStays("NG", "https://staging.kurioticket.com");

const section = readFileSync(
  join(process.cwd(), "src/features/home/PopularDestinationStays.tsx"),
  "utf8",
);
const layout = readFileSync(
  join(process.cwd(), "src/features/home/popularStayCardLayout.ts"),
  "utf8",
);
const navigationSource = readFileSync(
  join(process.cwd(), "src/features/home/homepageCardNavigation.ts"),
  "utf8",
);
const dataSource = readFileSync(
  join(process.cwd(), "src/features/home/PopularDestinationStaysData.ts"),
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

test("matches the mobile-web portrait card geometry", () => {
  assert.match(layout, /cardWidth: 276/);
  assert.match(layout, /imageHeight: 288/);
  assert.match(layout, /ctaHeight: 72/);
  assert.match(section, /useWindowDimensions/);
  assert.match(section, /popularStayCardLayout\(width\)/);
  assert.match(section, /styles\.copy/);
  assert.match(
    section,
    /style=\{\[styles\.imageFrame, \{ height: imageHeight \}\]\}/,
  );
  assert.match(section, /styles\.ctaSection/);
  assert.match(section, /height: CTA_HEIGHT/);
  assert.match(section, /<Pressable[\s\S]*Explore stays/);
});

test("makes the complete card an accessible destination control", () => {
  assert.match(
    section,
    /<Pressable\s+key=\{destination\.id\}[\s\S]*testID=\{`popular-stay-card-\$\{destination\.id\}`\}[\s\S]*accessibilityRole="button"[\s\S]*accessibilityLabel=\{`Explore stays in \$\{destination\.city\}, \$\{destination\.country\}`\}[\s\S]*router\.push\(popularDestinationStayNavigation\(destination\)\)/,
  );
  assert.match(
    section,
    /style=\{\(\{ pressed \}\) => \[[\s\S]*styles\.card[\s\S]*width: cardWidth,[\s\S]*height: imageHeight \+ CTA_HEIGHT[\s\S]*pressed && styles\.cardPressed/,
  );
  assert.match(section, /cardPressed: \{ opacity: 0\.96 \}/);

  const cardStart = section.indexOf("key={destination.id}");
  const cardEnd = section.indexOf(
    "</Pressable>",
    section.indexOf("</Pressable>", cardStart) + 1,
  );
  const image = section.indexOf("testID={`popular-stay-image-", cardStart);
  const footer = section.indexOf("testID={`popular-stay-cta-", cardStart);
  assert.ok(cardStart >= 0 && image > cardStart && footer > image && cardEnd > footer);
});

test("keeps nested actions independent from card navigation", () => {
  assert.match(
    section,
    /<AndroidFavoriteButton[\s\S]*onPress=\{\(event\) => \{\s*event\.stopPropagation\(\);\s*if \(canonicalDestination\) \{\s*toggle\(canonicalDestination\.id\);/,
  );
  assert.match(
    section,
    /<Pressable[\s\S]*onPress=\{\(event\) => \{\s*event\.stopPropagation\(\);\s*router\.push\(popularDestinationStayNavigation\(destination\)\);\s*\}\}[\s\S]*styles\.ctaPill/,
  );
});

test("uses the shared Android favorite button and existing saved state", () => {
  assert.match(
    section,
    /import \{ AndroidFavoriteButton \} from "\.\/AndroidFavoriteButton"/,
  );
  assert.match(section, /const \{ savedIds, toggle \} = useSavedDestinations\(\)/);
  assert.match(
    section,
    /const saved = canonicalDestination\s*\? savedIds\.has\(canonicalDestination\.id\)\s*:\s*false/,
  );
  assert.match(
    section,
    /<AndroidFavoriteButton[\s\S]*saved=\{saved\}[\s\S]*label=\{`\$\{saved \? "Remove" : "Add"\} \$\{destination\.city\} \$\{saved \? "from" : "to"\} favorites`\}[\s\S]*event\.stopPropagation\(\);[\s\S]*toggle\(canonicalDestination\.id\);[\s\S]*style=\{styles\.heart\}[\s\S]*\/>/,
  );
  assert.doesNotMatch(section, /<FlowIcon|heartUnsaved|heartSaved|heartPressed/);
  assert.doesNotMatch(section, /#F43F5E|#E11D48|fill=\{flowColors\.white\}/);
});

test("every Home stay resolves to the canonical Explore destination identity", () => {
  for (const card of popularDestinationStays) {
    const canonical = resolvePopularDestinationStay(card);
    assert.ok(canonical, `${card.id} must resolve`);
    assert.ok(canonical.id);
    assert.equal(canonical, destinationById.get(canonical.id));
  }
});

test("Dubai reads and toggles the canonical identity shared with Explore", () => {
  const dubai = popularDestinationStays.find(({ id }) => id === "ng-dubai")!;
  const canonicalDubai = resolvePopularDestinationStay(dubai)!;

  assert.equal(canonicalDubai.id, "ae-dubai");
  assert.notEqual(canonicalDubai.id, dubai.id);
  assert.equal(canonicalDubai, destinationById.get("ae-dubai"));
  assert.match(section, /savedIds\.has\(canonicalDestination\.id\)/);
  assert.match(section, /toggle\(canonicalDestination\.id\)/);
  assert.doesNotMatch(section, /toggle\(destination\.id\)/);
});

test("an unresolved Home card warns in development and never toggles its raw ID", () => {
  assert.equal(resolvePopularDestinationStay({ canonicalDestinationId: "not-real" }), undefined);
  assert.match(section, /__DEV__ && !canonicalDestination/);
  assert.match(section, /Could not resolve \$\{destination\.id\}/);
  assert.match(section, /if \(canonicalDestination\) \{\s*toggle\(canonicalDestination\.id\)/);
  assert.doesNotMatch(section, /toggle\(destination\.id\)/);
});

test("guest canonical toggles retain the existing sign-in prompt path", () => {
  const savedHook = readFileSync(
    join(process.cwd(), "src/storage/useSavedDestinations.ts"),
    "utf8",
  );
  assert.match(savedHook, /favoriteAction\(userId\) === "sign-in"/);
  assert.match(savedHook, /showFavoriteSignInPrompt\("\/saved"\)/);
});

test("keeps destination copy over the image and the compact footer separate", () => {
  const imageFrame = section.indexOf("styles.imageFrame");
  const copy = section.indexOf("styles.copy", imageFrame);
  const imageFrameClose = section.indexOf("</View>", copy);
  const footer = section.indexOf("styles.ctaSection", imageFrameClose);

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

test("themes the card, footer, CTA, pressed state, fallback, and shadows", () => {
  assert.match(section, /backgroundColor: ft\.colors\.card/);
  assert.match(section, /borderColor: ft\.colors\.border/);
  assert.match(section, /backgroundColor: ft\.colors\.surface/);
  assert.match(section, /backgroundColor: ft\.colors\.raised/);
  assert.match(section, /color: ft\.colors\.textPrimary/);
  assert.match(section, /backgroundColor: ft\.colors\.neutralImage/);
  assert.match(section, /shadowColor: ft\.colors\.shadow/);
  assert.match(section, /ft\.theme\.dark\s*\? ft\.colors\.status\s*: ft\.colors\.page/);
  assert.doesNotMatch(
    section,
    /rgba\(203, 213, 225, 0\.9\)|#CBD5E1|#F8FAFC|#1E293B/,
  );
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

test("renders the complete market-scoped web destination list and safe image fallback", () => {
  assert.equal(popularDestinationStays.length, 8);
  assert.deepEqual(
    popularDestinationStays.slice(1).map(({ city }) => city),
    ["London", "Johannesburg", "Accra", "Nairobi", "Istanbul", "Paris", "Dubai"],
  );
  assert.match(section, /popular-stay-image-fallback-/);
  assert.match(section, /onError=\{\(\) =>/);
  assert.match(section, /destination\.city/);
  assert.match(section, /destination\.country/);
});

test("uses the authoritative web image values", () => {
  const shared = getMarketplaceHomeMerchandising("NG").hotelDestinations;
  assert.deepEqual(popularDestinationStays.map(({ id }) => id), shared.map(({ id }) => id));
  assert.deepEqual(popularDestinationStays.map(({ image }) => image.uri), shared.map(({ image }) => image));
});

test("Explore stays creates a complete direct canonical Hotel exploration search", () => {
  const london = popularDestinationStays.find(({ city }) => city === "London");
  assert.ok(london);
  assert.deepEqual(homepageHotelDestinationParams(london), {
    destinationId: "gb-london",
    destination: "London, United Kingdom",
    intentSource: "home-popular-stays",
  });
  assert.deepEqual(popularDestinationStayNavigation(london, new Date("2030-01-01T00:00:00Z")), {
    pathname: "/hotel-results",
    params: { destinationId: "gb-london", destination: "London, United Kingdom", checkIn: "2030-01-29", checkOut: "2030-02-05", guests: "2", rooms: "1", sort: "cheapest", intentSource: "home-popular-stays" },
  });
  assert.match(
    section,
    /router\.push\(popularDestinationStayNavigation\(destination\)\)/,
  );
});

test("every supported marketplace Home Hotel card opens complete native results without a form fallback", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  for (const market of Object.keys(popularDestinationsByMarket)) {
    const cards = getPopularDestinationStays(market, "https://kurioticket.com");
    assert.ok(cards.length > 0, `${market}:cards`);
    for (const card of cards) {
      const navigation = popularDestinationStayNavigation(card, now);
      assert.notEqual(navigation, "/hotels", `${market}:${card.id}:no form fallback`);
      assert.equal(typeof navigation, "object", `${market}:${card.id}:results object`);
      if (typeof navigation === "object") {
        assert.equal(navigation.pathname, "/hotel-results", `${market}:${card.id}:results route`);
        assert.deepEqual(navigation.params, {
          destinationId: card.canonicalDestinationId,
          destination: card.destinationSearchValue,
          checkIn: "2030-01-29",
          checkOut: "2030-02-05",
          guests: "2",
          rooms: "1",
          sort: "cheapest",
          intentSource: "home-popular-stays",
        });
        assert.ok(
          buildSearchPlan("hotel", navigation.params, now).plan,
          `${market}:${card.id}:canonical Hotel search plan`,
        );
      }
    }
  }
});

test("promoted Home Hotel navigation cannot regress to city-only re-resolution or the manual Hotels form", () => {
  assert.doesNotMatch(navigationSource, /destinationByUnambiguousName|resolveHotelDiscoveryIntent/);
  assert.doesNotMatch(dataSource, /destinationByUnambiguousName\(destination\.city\)/);
  assert.doesNotMatch(navigationSource, /return [^;]*["']\/hotels["']/);
  assert.match(navigationSource, /pathname: ["']\/hotel-results["']/);
});
