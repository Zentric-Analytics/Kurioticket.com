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
const hotelHeader = results.slice(results.indexOf("function HotelResultsHeader"), results.indexOf("function FlightSortModal"));
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

test("Flight Results uses a route-only search-summary card with accessible controls", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.match(invocation, /route=\{`\$\{String\(payload\.origin/);
  assert.match(invocation, /payload\.tripType === "one-way" \? "→" : "⇄"/);
  assert.match(invocation, /payload\.destination/);
  assert.match(header, /accessibilityLabel="Flight search summary"/);
  assert.match(header, /accessibilityLabel="Go back"/);
  assert.match(header, /\{route\}/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(header, /<SquarePen[\s\S]*?accessible=\{false\}/);
  assert.doesNotMatch(header, />Edit<\/Text>/);
  assert.doesNotMatch(invocation, /onLayout=/);
  assert.match(results, /topInset=\{topSafeAreaInset\}/);
  assert.doesNotMatch(results, /flightResultsHeaderHeight|setFlightResultsHeaderHeight|LayoutChangeEvent/);
});

test("Flight Results header removes all secondary metadata and its component props", () => {
  for (const obsolete of [
    "Trip metadata row",
    "tripTypeLabel",
    "travelerCount",
    "cabinClass",
    "dateRange",
    "Traveler",
    "Travelers",
    "flightHeaderMetadataSeparator",
  ]) {
    assert.doesNotMatch(header, new RegExp(obsolete));
    assert.doesNotMatch(invocation, new RegExp(obsolete));
  }
  assert.doesNotMatch(header, /<ScrollView|horizontal|metadata/i);
  assert.match(header, /route: string;[\s\S]*?onEdit: \(\) => void;/);
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
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(results, /setEditSearchOpen\(true\)/);
  assert.doesNotMatch(results, /router\.push\(\{ pathname: "\/edit-flight-search"/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
});

test("Flight Results header separates Back, route summary, and Edit controls", () => {
  assert.match(styles, /flightHeaderMainRow: \{[\s\S]*?flexDirection: "row"/);
  assert.match(styles, /flightHeaderSide: \{ width: 52/);
  assert.match(header, /<View style=\{s0\.flightHeaderSide\}>[\s\S]*?accessibilityLabel="Go back"[\s\S]*?<View[\s\S]*?s0\.flightRouteSummaryCard/);
  assert.match(routeCard, /\{route\}/);
  assert.doesNotMatch(routeCard, /accessibilityLabel="Edit search"|SquarePen/);
  assert.match(rightActionRegion, /<View style=\{s0\.flightHeaderSide\}>[\s\S]*?accessibilityLabel="Edit search"[\s\S]*?<SquarePen/);
  assert.match(styles, /flightRouteSummaryCard: \{[\s\S]*?flex: 1,[\s\S]*?minWidth: 0,[\s\S]*?height: 46,[\s\S]*?borderWidth: 1,[\s\S]*?borderRadius: 10,[\s\S]*?alignItems: "stretch",[\s\S]*?justifyContent: "center"/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(styles, /flightRouteSummaryEdit: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  const flightEditStyle = styles.slice(styles.indexOf("flightRouteSummaryEdit:"), styles.indexOf("flightHeaderRouteBlock:"));
  assert.doesNotMatch(flightEditStyle, /position: "absolute"|right: 4|top: 4/);
  assert.match(header, /numberOfLines=\{1\}[\s\S]*?adjustsFontSizeToFit[\s\S]*?minimumFontScale=\{0\.85\}/);
  assert.match(header, /backgroundColor: theme\.surface/);
  assert.match(header, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(header, /style=\{\[s0\.flightHeader, \{ backgroundColor \}\]\}/);
  assert.match(header, /color: theme\.textPrimary/);
});

test("Flight Results route uses compact centered typography", () => {
  const routeTextStyle = styles.slice(styles.indexOf("flightRouteSummaryText:"), styles.indexOf("flightRouteSummaryEdit:"));
  assert.match(routeTextStyle, /width: "100%"/);
  assert.match(routeTextStyle, /paddingHorizontal: 14/);
  assert.match(routeTextStyle, /fontSize: 16/);
  assert.match(routeTextStyle, /lineHeight: 20/);
  assert.match(routeTextStyle, /fontWeight: "700"/);
  assert.match(routeTextStyle, /fontFamily: appFonts\.bold/);
  assert.match(routeTextStyle, /textAlign: "center"/);
  assert.doesNotMatch(routeTextStyle, /paddingHorizontal: 52|fontSize: 18|textAlign: "left"/);
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

test("Hotel Results replaces only its TopBar with a dynamic compact header", () => {
  assert.doesNotMatch(results, /<TopBar \/>/);
  assert.match(searchUi, /export function TopBar/);
  assert.match(results, /flightResults \? \([\s\S]*?<FlightResultsHeader[\s\S]*?\) : \(\s*<HotelResultsHeader/);
  assert.match(hotelInvocation, /destination=\{String\(payload\.destination/);
  assert.match(hotelHeader, /accessibilityLabel="Hotel search summary"/);
  assert.match(hotelHeader, /accessibilityLabel="Go back"[\s\S]*?router\.back\(\)/);
  assert.match(hotelHeader, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(hotelHeader, />Edit<\/Text>/);
});

test("Hotel Results shares Flight's balanced controls and truncates long destinations", () => {
  assert.match(hotelHeader, /style=\{s0\.flightHeaderMainRow\}/);
  assert.match(hotelHeader, /style=\{s0\.flightHeaderSide\}/);
  assert.match(hotelHeader, /s0\.flightHeaderBack/);
  assert.match(hotelHeader, /style=\{s0\.flightHeaderRouteBlock\}/);
  assert.match(hotelHeader, /s0\.flightHeaderRoute/);
  assert.match(hotelHeader, /s0\.flightHeaderEdit/);
  assert.match(hotelHeader, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?\{destination\}/);
  assert.match(styles, /flightHeaderSide: \{ width: 52/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(styles, /flightHeaderRouteBlock: \{ flex: 1, minWidth: 0, alignItems: "center"/);
  assert.match(styles, /flightHeaderEdit: \{[\s\S]*?width: 52,[\s\S]*?height: 44/);
});

test("Hotel Results removes header metadata while Edit preserves canonical search state", () => {
  assert.doesNotMatch(hotelInvocation, /metadata|checkIn|checkOut|rooms|guests|shortDate/);
  assert.doesNotMatch(hotelHeader, /metadata|hotelHeaderMeta/);
  assert.match(hotelHeader, /destination: string;[\s\S]*?onEdit: \(\) => void;/);
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
