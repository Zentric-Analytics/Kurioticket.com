import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");
const invocation = results.slice(results.indexOf("<FlightResultsHeader"), results.indexOf("/>", results.indexOf("<FlightResultsHeader")) + 2);
const hotelInvocation = results.slice(results.indexOf("<HotelResultsHeader"), results.indexOf("/>", results.indexOf("<HotelResultsHeader")) + 2);
const header = results.slice(results.indexOf("function FlightResultsHeader"), results.indexOf("function HotelResultsHeader"));
const hotelHeader = results.slice(results.indexOf("function HotelResultsHeader"), results.indexOf("const HotelResultsShortcut"));
const styles = results.slice(results.indexOf("const s0 = StyleSheet.create"));
const routeCardStart = header.indexOf("s0.flightRouteSummaryCard");
const routeCardEnd = header.indexOf("</View>", routeCardStart) + "</View>".length;
const routeCard = header.slice(routeCardStart, routeCardEnd);
const rightActionRegion = header.slice(routeCardEnd);

const payload = buildSearchPlan("flight", {
  tripType: "round-trip",
  origin: "LOS",
  destination: "ABV",
  departureDate: "2030-08-19",
  returnDate: "2030-08-20",
  adults: "2",
  children: "1",
  infants: "1",
  cabin: "premium-economy",
}, new Date("2030-01-01T00:00:00Z")).plan?.payload;

test("Flight Results uses the Web route-and-metadata summary with accessible controls", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.match(invocation, /route=\{flightSummary\.route\}/);
  assert.match(invocation, /secondaryLine=\{flightSummary\.secondaryLine\}/);
  assert.match(results, /flightResultsSummary\(payload, locale\)/);
  assert.match(header, /accessibilityLabel="Flight search summary"/);
  assert.match(header, /accessibilityLabel="Go back"/);
  assert.match(header, /\{route\}/);
  assert.match(header, /accessibilityLabel=\{`Edit flight search\. \$\{route\}\. \$\{secondaryLine\}`\}[\s\S]*?onPress=\{onEdit\}/);
  assert.match(header, /<View accessible=\{false\} accessibilityElementsHidden style=\{s0\.flightRouteSummaryEdit\}><SquarePen/);
  assert.doesNotMatch(header, />Edit<\/Text>/);
  assert.doesNotMatch(invocation, /onLayout=/);
  const flightEditInvocation = results.slice(results.indexOf("<FlightEditSearchModal"), results.indexOf("/>", results.indexOf("<FlightEditSearchModal")) + 2);
  assert.doesNotMatch(flightEditInvocation, /topInset=\{topSafeAreaInset\}/);
  assert.doesNotMatch(results, /flightResultsHeaderHeight|setFlightResultsHeaderHeight|LayoutChangeEvent/);
});

test("Flight Results header receives one derived secondary line instead of rebuilding business context", () => {
  assert.match(header, /\{secondaryLine\}/);
  assert.doesNotMatch(header, /<ScrollView|horizontal|metadata/i);
  assert.match(header, /route: string;[\s\S]*?secondaryLine: string;[\s\S]*?onEdit: \(\) => void;/);
});

test("obsolete Flight Results metadata styles are removed", () => {
  for (const style of [
    "flightHeaderMetadataAlignmentRow",
    "flightHeaderMetadataInset",
    "flightHeaderMetadataScroller",
    "flightHeaderMetadataRow",
    "flightHeaderMetadataText",
    "flightHeaderMetadataSeparator",
  ]) {
    assert.doesNotMatch(results, new RegExp(style));
  }
});

test("Back retains navigation while Edit opens the local results overlay", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?router\.back\(\)/);
  assert.match(header, /Edit flight search[\s\S]*?onPress=\{onEdit\}/);
  assert.match(results, /setEditSearchOpen\(true\)/);
  assert.doesNotMatch(results, /router\.push\(\{ pathname: "\/edit-flight-search"/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
});

test("Flight Results header separates Back from one Web-aligned editable summary", () => {
  assert.match(styles, /flightHeaderMainRow: \{[\s\S]*?flexDirection: "row"/);
  assert.match(styles, /flightHeaderSide: \{ width: 52/);
  assert.match(header, /<View style=\{s0\.flightHeaderSide\}>[\s\S]*?accessibilityLabel="Go back"[\s\S]*?<Pressable[\s\S]*?s0\.flightRouteSummaryCard/);
  assert.match(routeCard, /\{route\}/);
  assert.match(header, /accessibilityLabel=\{`Edit flight search[\s\S]*?<SquarePen/);
  assert.match(styles, /flightRouteSummaryCard: \{[\s\S]*?flex: 1,[\s\S]*?minWidth: 0,[\s\S]*?minHeight: 62,[\s\S]*?borderWidth: 1,[\s\S]*?borderRadius: 13,[\s\S]*?flexDirection: "row"/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(styles, /flightRouteSummaryEdit: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  const flightEditStyle = styles.slice(styles.indexOf("flightRouteSummaryEdit:"), styles.indexOf("hotelIntroductoryControls:"));
  assert.doesNotMatch(flightEditStyle, /position: "absolute"|right: 4|top: 4/);
  assert.match(header, /flightRouteSummaryText[\s\S]*?\{route\}[\s\S]*?flightRouteSummarySecondary[\s\S]*?\{secondaryLine\}/);
  assert.match(header, /backgroundColor: theme\.surface/);
  assert.match(header, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(header, /style=\{\[s0\.flightHeader, \{ backgroundColor \}\]\}/);
  assert.match(header, /color: theme\.textPrimary/);
});

test("Flight Results route uses the left-aligned two-line Web hierarchy", () => {
  const routeTextStyle = styles.slice(styles.indexOf("flightRouteSummaryText:"), styles.indexOf("flightRouteSummaryEdit:"));
  assert.match(routeTextStyle, /fontSize: 14/);
  assert.match(routeTextStyle, /lineHeight: 18/);
  assert.match(routeTextStyle, /fontWeight: "700"/);
  assert.match(routeTextStyle, /fontFamily: appFonts\.bold/);
  assert.match(routeTextStyle, /flightRouteSummarySecondary: \{ marginTop: 3, fontSize: 10\.5, lineHeight: 14/);
  assert.doesNotMatch(routeTextStyle, /textAlign: "center"/);
});

test("visible Flight Results labels use scoped Inter families", () => {
  assert.match(styles, /flightResultCount: \{[^\n]*fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(searchUi, /flightPillText: \{[\s\S]*?fontWeight: "600",[\s\S]*?fontFamily: appFonts\.semibold/);
  assert.match(searchUi, /flightPillTextActive: \{ fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(searchUi, /pillText: \{ fontSize: 12, fontWeight: "700"/);
});

test("header and date rail use the structured Flight Results fare-calendar shell", () => {
  const headerBottom = Number(styles.match(/flightHeader: \{[\s\S]*?paddingBottom: (\d+)/)?.[1]);
  const navigatorHeight = Number(
    searchUi.match(/flightDateNavigator: \{ height: (\d+)/)?.[1],
  );
  const railHeight = Number(searchUi.match(/flightDateRail: \{ height: (\d+)/)?.[1]);

  assert.equal(headerBottom, 8, "header bottom padding separates the route summary and dates");
  assert.equal(navigatorHeight, 82, "navigator fits the 70px tile and compact vertical padding");
  assert.equal(railHeight, navigatorHeight);
  assert.equal(headerBottom + navigatorHeight, 90);
});

test("canonical flight search data remains available after presentation metadata removal", () => {
  assert.equal(payload?.tripType, "round-trip");
  assert.equal(payload?.departureDate, "2030-08-19");
  assert.equal(payload?.returnDate, "2030-08-20");
  assert.equal(payload?.travelers, 4);
  assert.equal(payload?.cabinClass, "premium-economy");
});

test("Hotel Results uses a scrolling summary and compact handoff header", () => { assert.match(results,/<ScrollView ref=\{hotelScrollRef\}[\s\S]*?<HotelResultsHeader[\s\S]*?\{filterRail\}/); assert.match(results,/hotelCompactHeader \?/); assert.match(results,/accessibilityLabel="Edit hotel search"/); });
test("Hotel Results owns a web-parity summary card without weakening Flight controls", () => {
  assert.doesNotMatch(hotelHeader, /flightHeaderMainRow|flightHeaderSide|flightHeaderRouteBlock|flightHeaderEdit/);
  assert.match(hotelHeader, /accessibilityLabel="Go back"[\s\S]*?onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(hotelHeader, /accessibilityLabel=\{`Edit hotel search\. \$\{destination\}\. \$\{secondaryLine\}`\}[\s\S]*?onPress=\{onEdit\}/);
  assert.equal(hotelHeader.match(/<Pressable/g)?.length, 2, "Back and the whole summary are the only press targets");
  assert.match(hotelHeader, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?\{destination\}/);
  assert.match(hotelHeader, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?\{secondaryLine\}/);
  assert.match(hotelHeader, /accessible=\{false\}[\s\S]*?importantForAccessibility="no-hide-descendants"[\s\S]*?<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.doesNotMatch(hotelHeader, />Edit<|logo|profile|menu|Bell/);
  assert.match(styles, /hotelHeader: \{ paddingHorizontal: 16,[\s\S]*?gap: 8/);
  assert.match(styles, /hotelHeaderBack: \{ width: 44, height: 44/);
  assert.match(styles, /hotelSummaryCard: \{[\s\S]*?width: "100%",[\s\S]*?minHeight: 64,[\s\S]*?borderWidth: 1,[\s\S]*?borderRadius: 13,[\s\S]*?paddingLeft: 16/);
  assert.match(styles, /hotelSummaryText: \{ flex: 1, minWidth: 0/);
  assert.match(styles, /hotelSummaryEditSlot: \{ width: 44, height: 44/);
  assert.match(hotelHeader, /backgroundColor: theme\.surface/);
  assert.match(hotelHeader, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(styles, /hotelSummaryDestination: \{ fontSize: 16, lineHeight: 20, fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(styles, /hotelSummarySecondary: \{ marginTop: 3, fontSize: 12\.5, lineHeight: 17, fontWeight: "600", fontFamily: appFonts\.semibold/);
});

test("Hotel Results receives presentation-only summary copy while Edit preserves canonical search state", () => {
  assert.doesNotMatch(hotelInvocation, /metadata|shortDate/);
  assert.doesNotMatch(hotelHeader, /metadata|hotelHeaderMeta/);
  assert.match(hotelHeader, /destination: string;[\s\S]*?secondaryLine: string;[\s\S]*?onEdit: \(\) => void;/);
  assert.match(hotelInvocation, /destination=\{hotelSummary\.destination\}[\s\S]*?secondaryLine=\{hotelSummary\.secondaryLine\}[\s\S]*?onEdit=\{edit\}/);
  assert.match(results, /buildHotelResultsSummary\(\{[\s\S]*?destination: String\(payload\.destination[\s\S]*?locale,/);
  assert.match(results, /<HotelEditSearchModal[\s\S]*?params=\{params\}/);
  assert.doesNotMatch(results, /pathname: "\/hotels"/);
});

test("Flight Details, result content, and bottom navigation contracts remain present", () => {
  assert.match(details, /accessibilityLabel="Flight details header"/);
  assert.match(details, /accessibilityLabel="Trip metadata row"/);
  assert.match(results, /<DateStrip/);
  assert.match(results, /<HotelCard/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
