import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(
  resolve("src/features/search/ApprovedResultsScreen.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const quickControls = readFileSync(resolve("src/features/search/FlightResultsQuickControls.tsx"), "utf8");
const layoutStart = screen.indexOf("<Animated.SectionList");
const alternateLayoutStart = screen.indexOf(") : (\n        <>", layoutStart);
const flightLayout = screen.slice(layoutStart, alternateLayoutStart);

function styleBlock(name: string, nextName: string) {
  return screen.slice(screen.indexOf(`${name}:`), screen.indexOf(`${nextName}:`, screen.indexOf(`${name}:`)));
}

test("Flight Results owns a stronger light canvas while Hotel Results keeps the semantic canvas", () => {
  const root = screen.slice(screen.indexOf("<SafeAreaView"), screen.indexOf("</SafeAreaView>"));

  assert.match(screen, /const flightResultsLightCanvas = "#F5F7FB"/);
  assert.match(screen, /const flightCanvasColor = theme\.dark \? theme\.background : flightResultsLightCanvas/);
  assert.match(root, /<SafeAreaView style=\{\[s0\.safe, \{ backgroundColor: flightResults \? flightCanvasColor : theme\.background \}\]\}/);
  assert.match(flightLayout, /<Animated\.SectionList[\s\S]*?style=\{\[s0\.resultsScroll, \{ backgroundColor: flightCanvasColor \}\]\}/);
  assert.match(flightLayout, /renderSectionHeader[\s\S]*?<View style=\{\[s0\.flightFilterSectionHeader, \{ backgroundColor: flightCanvasColor \}\]\}>[\s\S]*?\{filterRail\}/);
  assert.match(screen, /function HotelResultsHeader[\s\S]*?backgroundColor: theme\.background/);
  assert.match(styleBlock("hotelCard", "hotelCardCompact"), /backgroundColor: "white"/);
  assert.match(screen, /s0\.card,[\s\S]*?backgroundColor: theme\.surface/);
});

test("flight results put fading dates before a native sticky filter rail", () => {
  const beforeList = screen.slice(screen.indexOf("<FlightResultsHeader"), layoutStart);
  const listHeader = flightLayout.slice(flightLayout.indexOf("ListHeaderComponent="), flightLayout.indexOf("renderItem="));
  const renderItem = flightLayout.slice(flightLayout.indexOf("renderItem="), flightLayout.indexOf("ListEmptyComponent="));
  assert.doesNotMatch(beforeList, /flightPersistentSearchControls|\{filterRail\}/);
  assert.match(listHeader, /ListHeaderComponent=\{status === "loading" \? \([\s\S]*?<FlightLoadingExperience[\s\S]*?\) : animatedFlightDateStrip\}/);
  assert.match(listHeader, /renderSectionHeader[\s\S]*?backgroundColor: flightCanvasColor[\s\S]*?\{filterRail\}/);
  assert.match(listHeader, /stickySectionHeadersEnabled/);
  assert.ok(listHeader.indexOf("ListHeaderComponent=") < listHeader.indexOf("renderSectionHeader="));
  assert.match(listHeader, /\{filterRail\}[\s\S]*?<FlightResultsSummaryRow/);
  assert.doesNotMatch(renderItem, /PriceAlert|flightResultCountLabel/);
  assert.match(renderItem, /<FlightCard/);
  assert.match(flightLayout, /initialNumToRender=\{6\}[\s\S]*?maxToRenderPerBatch=\{5\}[\s\S]*?updateCellsBatchingPeriod=\{50\}[\s\S]*?windowSize=\{7\}/);
  assert.match(readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8"), /numberOfLines=\{1\}[\s\S]*?nearbyDateInsightText[\s\S]*?Cheaper nearby:/);
  assert.doesNotMatch(flightLayout, /dateHeaderCollapsed|position:\s*"absolute"/);
});

test("date and filter rails retain their horizontal interactions", () => {
  const dateStrip = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");

  assert.match(dateStrip, /export function DateStrip[\s\S]*?<ScrollView[\s\S]*?horizontal/);
  assert.match(dateStrip, /onPress=\{\(\) => \{ if \(!active\) onSelect\(iso\); \}\}/);
  assert.match(dateStrip, /centeredIdentity\.current === searchIdentity[\s\S]*?scrollTo/);
  assert.match(screen, /const filterRail = \(product === "flight" \? \([\s\S]*?<FlightResultsQuickControls[\s\S]*?openSheet=\{openFlightSheet\}/);
  assert.match(screen, /sort=\{sort\}/);
  for (const label of ["Filters", "Airlines", "Stops"]) {
    assert.match(quickControls, new RegExp(`"${label}"`));
  }
});

test("persistent flight controls and scrolling count keep compact spacing", () => {
  const count = styleBlock("flightResultCount", "card");
  const rail = styleBlock("filterRail", "resultsScroll");
  const filterSection = styleBlock("flightFilterSectionHeader", "resultsScroll");
  const filters = styleBlock("filters", "modalBackdrop");
  const summary = styleBlock("flightResultsSummaryRow", "flightResultsCountColumn");
  assert.match(rail, /height: 44/);
  assert.match(filterSection, /paddingTop: 8/);
  assert.match(filters, /paddingHorizontal: 14/);
  assert.match(filters, /paddingVertical: 3/);
  assert.match(filters, /gap: 8/);
  assert.match(filters, /alignItems: "center"/);
  assert.match(summary, /paddingHorizontal: 14/);
  assert.match(summary, /flexDirection: "row"/);
  assert.match(summary, /justifyContent: "space-between"/);
  assert.match(count, /fontSize: 13/);
  assert.doesNotMatch(screen, /stickyFilterSurface|flightPersistentSearchControls/);
});

test("the compact rail remains structurally safe at supported phone widths", () => {
  assert.match(quickControls, /<ScrollView horizontal/);
  assert.match(quickControls, /showsHorizontalScrollIndicator=\{false\}/);
  assert.doesNotMatch(quickControls, /numColumns|width:\s*(?:320|360|375|390|412|430)/);
  assert.match(styleBlock("filters", "modalBackdrop"), /paddingHorizontal: 14/);
});

test("flight dates use full resolved fares in wider, single-line tiles", () => {
  const dateStrip = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");

  assert.match(screen, /flightDisplayPrices\.get\(result\.id\)/);
  assert.match(screen, /date: departureDate,[\s\S]*?formatted: displayed\.formatted,[\s\S]*?accessibilityLabel: displayed\.formatted/);
  assert.match(dateStrip, /const price = priceByDate\[iso\]/);
  assert.doesNotMatch(screen, /formatDateStripPrice/);
  assert.match(dateStrip, /flightResults && s\.flightDate/);
  assert.match(dateStrip, /flightDate: \{[\s\S]*?minWidth: 76,[\s\S]*?maxWidth: 96/);
  assert.match(dateStrip, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit/);
  assert.match(dateStrip, /flightDate: \{[\s\S]*?height: 70/);
  assert.match(dateStrip, /\{hasPrice \|\| flightResults \? \(/);
  assert.match(dateStrip, /: "—"\}/);
  assert.doesNotMatch(dateStrip, /ellipsizeMode="clip"/);
});

test("hotel summary and shortcuts participate in one measured vertical scroll", () => {
  const hotelLayout=screen.slice(alternateLayoutStart,screen.indexOf("<FlightSortSheet",alternateLayoutStart));
  assert.equal(hotelLayout.match(/<ScrollView ref=\{hotelScrollRef\}/g)?.length, 1);
  assert.match(hotelLayout,/<ScrollView ref=\{hotelScrollRef\}[\s\S]*?style=\{s0\.hotelIntroductoryControls\}[\s\S]*?<HotelResultsHeader[\s\S]*?\{filterRail\}[\s\S]*?<View style=\{\[s0\.body, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}>\{resultContent\}/);
  assert.match(hotelLayout,/nativeEvent\.layout\.y \+ nativeEvent\.layout\.height/);
  assert.match(hotelLayout,/setHotelIntroBoundary\(boundary\)/);
  assert.match(hotelLayout,/y > hotelIntroBoundary \+ \(visible \? -4 : 4\)/);
  assert.doesNotMatch(hotelLayout,/y\s*>\s*104/);
  assert.match(hotelLayout,/setHotelBackToTop\(y>600\)/);
  assert.doesNotMatch(flightLayout, /hotelIntroBoundary|setHotelCompactHeader/);
});
test("Hotel Results reclaims BottomNav space while retaining the native bottom safe area", () => {
  const sharedBody = styleBlock("body", "hotelResultsContent");
  const backToTop = styleBlock("hotelBackToTop", "filterRail");

  assert.match(screen, /const insets = useSafeAreaInsets\(\)/);
  assert.match(sharedBody, /paddingBottom: 92/);
  assert.match(screen, /style=\{\[s0\.body, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}/);
  assert.match(screen, /\{flightResults \? <BottomNav flightResults \/> : null\}/);
  assert.doesNotMatch(screen, /<BottomNav flightResults=\{flightResults\} \/>/);
  assert.doesNotMatch(backToTop, /bottom:/);
  assert.match(screen, /s0\.hotelBackToTop,\{bottom:Math\.max\(insets\.bottom \+ 16,16\)/);
  assert.doesNotMatch(screen, /hotelBackToTop[^\n]*bottom:(?:86|92)/);
});

test("Hotel Back-to-top keeps its geometry and scrolling behavior above the safe area", () => {
  const backToTop = styleBlock("hotelBackToTop", "filterRail");

  assert.match(screen, /setHotelBackToTop\(y>600\)/);
  assert.match(screen, /accessibilityLabel="Back to top"[\s\S]*?scrollTo\(\{y:0,animated:true\}\)/);
  assert.match(backToTop, /position:"absolute"/);
  assert.match(backToTop, /right:16/);
  assert.match(backToTop, /width:44/);
  assert.match(backToTop, /height:44/);
  assert.match(backToTop, /borderRadius:22/);
});

test("hotel surviving sections own moderate spacing without changing the shared flight rail", () => {
  const hotelHeader = screen.slice(
    screen.indexOf("function HotelResultsHeader"),
    screen.indexOf("function FlightSortModal"),
  );
  const introSpacing = styleBlock("hotelIntroductoryControls", "hotelHeader");
  const headerSpacing = styleBlock("hotelHeader", "hotelHeaderMainRow");
  const headerRow = styleBlock("hotelHeaderMainRow", "hotelHeaderSide");
  const headerSide = styleBlock("hotelHeaderSide", "hotelHeaderBack");
  const headerBack = styleBlock("hotelHeaderBack", "hotelHeaderControlPressed");
  const resultSpacing = styleBlock("hotelResultsContent", "flightResultsBody");

  assert.match(hotelHeader, /style=\{\[s0\.hotelHeader,/);
  assert.match(introSpacing, /marginBottom: 12/);
  assert.match(headerSpacing, /paddingBottom: 12/);
  assert.doesNotMatch(headerSpacing, /gap|height: 44|paddingTop|marginTop/);
  assert.match(headerRow, /width: "100%"/);
  assert.match(headerRow, /flexDirection: "row"/);
  assert.match(headerRow, /alignItems: "center"/);
  assert.match(headerSide, /width: 52/);
  assert.match(headerBack, /width: 44/);
  assert.match(headerBack, /height: 44/);
  assert.doesNotMatch(headerRow, /gap|height: 44/);
  assert.doesNotMatch(screen, /hotelHeaderMeta/);
  assert.match(resultSpacing, /paddingTop: 12/);
  assert.doesNotMatch(styleBlock("filterRail", "flightFilterSectionHeader"), /margin|paddingTop|paddingBottom/);
  assert.doesNotMatch(flightLayout, /hotelHeader|hotelResultsContent/);
});

test("the results date rail remains Flight-only, excludes multi-city, and uses safe date selection", () => {
  const flightDateStrip = screen.slice(
    screen.indexOf("const flightDateStrip ="),
    screen.indexOf("const flightDateStripOpacity"),
  );

  assert.match(flightDateStrip, /<DateStrip/);
  assert.match(flightDateStrip, /date=\{flightDate\}/);
  assert.match(flightDateStrip, /payload\.tripType === "one-way" \|\| payload\.tripType === "round-trip"/);
  assert.match(flightDateStrip, /onSelect=\{selectNearbyDate\}/);
  assert.doesNotMatch(flightDateStrip, /checkIn/);
  assert.match(screen, /const animatedFlightDateStrip = \([\s\S]*?\{flightDateStrip\}/);
});

test("Flight Results removes bell work without changing the shared notification implementation", () => {
  const topBar = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
  const unreadHook = readFileSync(
    resolve("src/features/notifications/useUnreadNotifications.ts"),
    "utf8",
  );

  assert.doesNotMatch(screen, /router\.push\("\/notifications"\)|useUnreadNotifications/);
  assert.match(topBar, /accessibilityLabel="Notifications"/);
  assert.match(topBar, /hasUnreadNotifications \? <View/);
  assert.match(unreadHook, /useFocusEffect/);
  assert.match(unreadHook, /travelApi\.notificationUnreadCount/);
});
