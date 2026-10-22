import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/NativeFlightDetails.tsx");
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
  assert.ok(results.indexOf("const payload = plan.plan?.payload || {}") < results.indexOf("flightResultsSummary(payload, locale)"));
  assert.match(header, /accessibilityLabel="Flight search summary"/);
  assert.match(header, /accessibilityLabel="Go back"/);
  assert.match(header, /\{route\}/);
  assert.match(header, /accessibilityLabel=\{`Edit flight search\. \$\{route\}\. \$\{secondaryLine\}`\}[\s\S]*?onPress=\{onEdit\}/);
  assert.match(header, /<View accessible=\{false\} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style=\{s0\.flightRouteSummaryEdit\}>[\s\S]*?<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.flightRouteSummaryEditGlass\} \/>[\s\S]*?<SquarePen/);
  assert.doesNotMatch(header, />Edit<\/Text>/);
  assert.doesNotMatch(invocation, /onLayout=/);
  const flightEditInvocation = results.slice(results.indexOf("<FlightEditSearchModal"), results.indexOf("/>", results.indexOf("<FlightEditSearchModal")) + 2);
  assert.doesNotMatch(flightEditInvocation, /topInset=\{topSafeAreaInset\}/);
  assert.doesNotMatch(results, /flightResultsHeaderHeight|setFlightResultsHeaderHeight|LayoutChangeEvent/);
});

test("Flight Results header receives one derived secondary line and the existing filter rail", () => {
  assert.match(header, /\{secondaryLine\}/);
  assert.doesNotMatch(header, /<ScrollView|horizontal|metadata/i);
  assert.match(header, /route: string;[\s\S]*?secondaryLine: string;[\s\S]*?onEdit: \(\) => void;[\s\S]*?filterRail: ReactNode;/);
  assert.match(invocation, /filterRail=\{filterRail\}/);
  assert.match(header, /accessibilityLabel="Flight result filters"[\s\S]*?\{filterRail\}/);
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

test("Flight Results header keeps light glass on Back and the edit affordance", () => {
  assert.match(results, /import \{ DetailGlassSurface \} from "\.\/DetailGlassSurface"/);
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.flightHeaderBackGlass\} \/>[\s\S]*?<ArrowLeft size=\{25\} strokeWidth=\{2\} color="#0F172A" \/>/);
  assert.match(styles, /flightHeaderBackGlass: \{ position: "absolute", left: 2, right: 2, top: 2, bottom: 2, borderRadius: 20 \}/);
  assert.doesNotMatch(routeCard, /DetailGlassSurface|hotelLight/);
  assert.match(header, /style=\{s0\.flightRouteSummaryEdit\}[\s\S]*?<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.flightRouteSummaryEditGlass\} \/>/);
  assert.match(header, /backgroundColor: theme\.dark \? theme\.surface : flightResultsColors\.canvas/);
});

test("Flight Results header separates Back from one Web-aligned editable summary", () => {
  assert.match(styles, /flightHeaderMainRow: \{[\s\S]*?flexDirection: "row"/);
  assert.match(styles, /flightHeaderSide: \{ width: 44/);
  assert.match(styles, /flightHeaderMainRow: \{[^\n]*gap: 6/);
  assert.match(header, /<View style=\{s0\.flightHeaderSide\}>[\s\S]*?accessibilityLabel="Go back"[\s\S]*?<Pressable[\s\S]*?s0\.flightRouteSummaryCard/);
  assert.match(routeCard, /\{route\}/);
  assert.match(header, /accessibilityLabel=\{`Edit flight search[\s\S]*?<SquarePen/);
  assert.match(styles, /flightRouteSummaryCard: \{[\s\S]*?flex: 1,[\s\S]*?minWidth: 0,[\s\S]*?minHeight: 62,[\s\S]*?borderWidth: 1,[\s\S]*?borderRadius: 13,[\s\S]*?flexDirection: "row"/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(styles, /flightRouteSummaryEdit: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  const flightEditStyle = styles.slice(styles.indexOf("flightRouteSummaryEdit:"), styles.indexOf("hotelHeader:"));
  assert.match(flightEditStyle, /flightRouteSummaryEditGlass: \{ position: "absolute", left: 4, right: 4, top: 4, bottom: 4, borderRadius: 18 \}/);
  assert.match(header, /flightRouteSummaryText[\s\S]*?\{route\}[\s\S]*?flightRouteSummarySecondary[\s\S]*?\{secondaryLine\}/);
  assert.match(header, /backgroundColor: theme\.dark \? theme\.surface : flightResultsColors\.canvas/);
  assert.match(header, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(styles, /flightHeader: \{ paddingTop: 12 \}/); assert.match(styles, /flightHeaderMainRow: \{[^\n]*paddingBottom: 8 \}/);
  assert.match(header, /paddingLeft: Math\.max\(insets\.left \+ 6, 6\)/);
  assert.match(header, /paddingRight: Math\.max\(insets\.right \+ 10, 10\)/);
  assert.match(header, /color: theme\.textPrimary/);
});

test("Flight Results route uses the approved two-line native hierarchy", () => {
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

test("header-owned filters keep the approved Results sizes before the fare-calendar shell", () => {
  const headerMainBottom = Number(styles.match(/flightHeaderMainRow: \{[^\n]*paddingBottom: (\d+)/)?.[1]);
  const filterTop = Number(styles.match(/flightHeaderFilterRail: \{ paddingTop: (\d+)/)?.[1]);
  const filterBottom = Number(styles.match(/flightHeaderFilterRail: \{[^\n]*paddingBottom: (\d+)/)?.[1]);
  const navigatorHeight = Number(searchUi.match(/flightDateNavigator: \{ height: (\d+)/)?.[1]);
  const railHeight = Number(searchUi.match(/flightDateRail: \{ height: (\d+)/)?.[1]);

  assert.equal(headerMainBottom, 8, "route row keeps its existing bottom breathing room");
  assert.equal(filterTop, 8, "filter rail keeps its existing top breathing room");
  assert.equal(filterBottom, 8, "filter rail keeps its existing bottom breathing room");
  assert.equal(navigatorHeight, 80, "navigator fits the 70px tile and compact vertical padding");
  assert.equal(railHeight, navigatorHeight);
});

test("canonical flight search data remains available after presentation metadata removal", () => {
  assert.equal(payload?.tripType, "round-trip");
  assert.equal(payload?.departureDate, "2030-08-19");
  assert.equal(payload?.returnDate, "2030-08-20");
  assert.equal(payload?.travelers, 4);
  assert.equal(payload?.cabinClass, "premium-economy");
});

test("Hotel Results keeps its summary header above the fixed filter rail", () => {
  const headerPosition = results.indexOf("<HotelResultsHeader");
  const listPosition = results.indexOf("<SectionList", headerPosition);
  assert.ok(headerPosition >= 0 && headerPosition < listPosition);
  assert.match(results.slice(headerPosition, listPosition), /s0\.hotelFilterSectionHeader[\s\S]*?\{filterRail\}/);
  assert.doesNotMatch(results.slice(listPosition), /renderSectionHeader/);
  assert.equal(results.match(/<HotelResultsHeader/g)?.length, 1);
  assert.doesNotMatch(results, /hotelCompactHeader|setHotelCompactHeader|hotelIntroBoundary/);
});
test("Hotel Results owns a web-parity summary card without weakening Flight controls", () => {
  assert.doesNotMatch(hotelHeader, /flightHeaderMainRow|flightHeaderSide|flightHeaderRouteBlock|flightHeaderEdit/);
  assert.match(hotelHeader, /accessibilityLabel="Go back"[\s\S]*?onPress=\{\(\) => router\.back\(\)\}[\s\S]*?<ArrowLeft/);
  assert.match(hotelHeader, /accessibilityLabel=\{`Edit hotel search\. \$\{destination\}\. \$\{secondaryLine\}`\}[\s\S]*?onPress=\{onEdit\}/);
  assert.equal(hotelHeader.match(/<Pressable/g)?.length, 2, "Back and summary are independent press targets");
  assert.match(hotelHeader, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?\{destination\}/);
  assert.match(hotelHeader, /numberOfLines=\{1\}[\s\S]*?ellipsizeMode="tail"[\s\S]*?\{secondaryLine\}/);
  assert.match(hotelHeader, /accessible=\{false\}[\s\S]*?importantForAccessibility="no-hide-descendants"[\s\S]*?<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.doesNotMatch(hotelHeader, />Edit<|logo|profile|menu|Bell/);
  assert.match(hotelHeader, /paddingLeft: Math\.max\(insets\.left \+ 6, 6\)/);
  assert.match(hotelHeader, /paddingRight: Math\.max\(insets\.right \+ 10, 10\)/);
  assert.match(styles, /hotelHeader: \{ paddingTop: 12, paddingBottom: 8 \}/);
  assert.match(styles, /hotelHeaderMainRow: \{ width: "100%", flexDirection: "row", alignItems: "center", gap: 6 \}/);
  assert.match(styles, /hotelHeaderSide: \{ width: 44, flexShrink: 0 \}/);
  assert.match(styles, /hotelHeaderBack: \{ width: 44, height: 44/);
  assert.match(styles, /hotelSummaryCard: \{ flex: 1, minWidth: 0, minHeight: 62, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", overflow: "hidden" \}/);
  assert.doesNotMatch(styles.match(/hotelSummaryCard: \{[\s\S]*?\n  \},/)?.[0] ?? "", /width: "100%"/);
  assert.match(styles, /hotelSummaryText: \{ flex: 1, minWidth: 0, justifyContent: "center", paddingLeft: 14, paddingVertical: 9 \}/);
  assert.match(styles, /hotelSummaryEditSlot: \{ width: 44, height: 44, flexShrink: 0/);
  assert.match(hotelHeader, /backgroundColor: theme\.surface/);
  assert.match(hotelHeader, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(styles, /hotelSummaryDestination: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold/);
  assert.match(styles, /hotelSummarySecondary: \{ marginTop: 3, fontSize: 10\.5, lineHeight: 14, fontWeight: "500", fontFamily: appFonts\.medium/);
  const hotelEditSlotStyle = styles.match(/hotelSummaryEditSlot: \{[^\n]+/)?.[0] ?? "";
  assert.doesNotMatch(hotelEditSlotStyle, /position: "absolute"|margin(?:Left|Right|Start|End): -/);
  assert.doesNotMatch(hotelHeader, /position:\s*"absolute"|margin(?:Left|Right|Start|End):\s*-/);
});

test("Hotel Results uses light glass only on Back and the edit affordance", () => {
  assert.match(hotelHeader, /accessibilityLabel="Go back"[\s\S]*?<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.hotelHeaderBackGlass\} \/>[\s\S]*?<ArrowLeft size=\{25\} strokeWidth=\{2\} color="#0F172A" \/>/);
  assert.match(hotelHeader, /style=\{s0\.hotelSummaryEditSlot\}[\s\S]*?<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.hotelSummaryEditGlass\} \/>[\s\S]*?<SquarePen size=\{16\} strokeWidth=\{2\.2\} color="#0F172A" \/>/);
  assert.match(styles, /hotelHeaderBackGlass: \{ position: "absolute", left: 2, right: 2, top: 2, bottom: 2, borderRadius: 20 \}/);
  assert.match(styles, /hotelSummaryEditGlass: \{ position: "absolute", left: 4, right: 4, top: 4, bottom: 4, borderRadius: 18 \}/);
  assert.match(hotelHeader, /backgroundColor: theme\.surface/);
});

test("Hotel Results receives presentation-only summary copy while Edit preserves canonical search state", () => {
  assert.doesNotMatch(hotelInvocation, /metadata|shortDate/);
  assert.doesNotMatch(hotelHeader, /metadata|hotelHeaderMeta/);
  assert.match(hotelHeader, /destination: string;[\s\S]*?secondaryLine: string;[\s\S]*?onEdit: \(\) => void;/);
  assert.match(hotelInvocation, /destination=\{hotelSummary\.destination\}[\s\S]*?secondaryLine=\{hotelSummary\.secondaryLine\}[\s\S]*?onEdit=\{edit\}/);
  assert.match(results, /canonicalHotelDestination = String\(payload\.destination[\s\S]*?getHotelLocationFieldDisplay\(canonicalHotelDestination, locale\)[\s\S]*?buildHotelResultsSummary\(\{[\s\S]*?destination: hotelDestinationDisplay\.primary \|\| canonicalHotelDestination\.trim\(\)[\s\S]*?locale,/);
  assert.match(results, /<HotelEditSearchModal[\s\S]*?params=\{params\}/);
  assert.doesNotMatch(results, /pathname: "\/hotels"/);
  assert.doesNotMatch(read("src/features/search/hotelResultsSummary.ts"), /\.formatRange/);
});

test("Flight Details and result content remain present without a results-screen BottomNav", () => {
  assert.match(details, /accessibilityLabel="Back to results"/);
  assert.match(details, /<View testID="flight-details-itinerary-overlap"[^\n]*style=\{s\.itineraryStack\}>[\s\S]*?<Itinerary/);
  assert.doesNotMatch(details, />Flight itinerary<\/Text>/);
  assert.match(details, />Pick your fare<\/Text>/);
  assert.match(results, /<DateStrip/);
  assert.match(results, /<HotelCard/);
  assert.doesNotMatch(results.slice(results.indexOf("export function ApprovedResultsScreen"), results.indexOf("export function BottomNav")), /<BottomNav(?:\s|\/|>)/);
});

test("Flight Results header uses the approved native Results header treatment", () => {
  const flightHeaderStyle = styles.slice(styles.indexOf("flightHeader:"), styles.indexOf("hotelHeader:"));
  assert.match(flightHeaderStyle, /flightHeader: \{ paddingTop: 12 \}/); assert.match(flightHeaderStyle, /flightHeaderMainRow: \{[^\n]*paddingBottom: 8 \}/); assert.match(flightHeaderStyle, /flightHeaderFilterRail: \{ paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1 \}/);
  assert.match(flightHeaderStyle, /flightHeaderBack: \{ width: 44, height: 44,[^\n]*shadowColor: "#0F172A"[^\n]*shadowOffset: \{ width: 0, height: 2 \}[^\n]*shadowOpacity: 0\.12[^\n]*shadowRadius: 6[^\n]*elevation: 6/);
  assert.match(flightHeaderStyle, /flightRouteSummaryCard: \{ flex: 1, minWidth: 0, minHeight: 62, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", overflow: "hidden" \}/);
  assert.match(flightHeaderStyle, /flightRouteSummaryCopy: \{ flex: 1, minWidth: 0, justifyContent: "center", paddingLeft: 14, paddingVertical: 9 \}/);
  assert.match(flightHeaderStyle, /flightRouteSummaryText: \{ fontSize: 14, lineHeight: 18, fontWeight: "700", fontFamily: appFonts\.bold \}/);
  assert.match(flightHeaderStyle, /flightRouteSummarySecondary: \{ marginTop: 3, fontSize: 10\.5, lineHeight: 14, fontWeight: "500", fontFamily: appFonts\.medium \}/);
  assert.match(flightHeaderStyle, /flightRouteSummaryEdit: \{ width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center" \}/);
  assert.match(flightHeaderStyle, /flightRouteSummaryEditGlass: \{ position: "absolute", left: 4, right: 4, top: 4, bottom: 4, borderRadius: 18 \}/);

  assert.match(header, /backgroundColor: theme\.dark \? theme\.surface : flightResultsColors\.canvas/);
  assert.match(header, /borderColor: theme\.dark \? theme\.border : "#D8E1EC"/);
  assert.match(header, /<DetailGlassSurface dark=\{false\} variant="hotelLight" style=\{s0\.flightRouteSummaryEditGlass\} \/>/);
  assert.match(header, /<SquarePen size=\{16\} strokeWidth=\{2\.2\} color="#0F172A" \/>/);
  assert.match(header, /<ArrowLeft size=\{25\} strokeWidth=\{2\} color="#0F172A" \/>/);
});

