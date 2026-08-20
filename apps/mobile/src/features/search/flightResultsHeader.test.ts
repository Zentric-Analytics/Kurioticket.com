import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buildSearchPlan } from "../flow/travelSearchModel";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");
const header = results.slice(
  results.indexOf("function FlightResultsHeader"),
  results.indexOf("const stopLabels"),
);
const styles = results.slice(results.indexOf("const s0 = StyleSheet.create"));

const flightPayload = (counts: { adults: number; children: number; infants: number }) => {
  const { plan } = buildSearchPlan("flight", {
    tripType: "round-trip",
    origin: "LOS",
    destination: "ABV",
    departureDate: "2030-08-19",
    returnDate: "2030-08-20",
    adults: String(counts.adults),
    children: String(counts.children),
    infants: String(counts.infants),
  }, new Date("2030-01-01T00:00:00Z"));
  assert.ok(plan);
  return plan.payload;
};

test("Flight Results uses its compact header and leaves the hotel TopBar unchanged", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.doesNotMatch(results, /<TopBar\s+flightResults=/);
  assert.match(results, /<TopBar \/>/);
  assert.doesNotMatch(header, /<Logo|Notifications|<Bell/);
});

test("route title contains only uppercase airport codes from the current payload", () => {
  assert.match(results, /route=\{`\$\{String\(payload\.origin \|\| ""\)\.toUpperCase\(\)\} \$\{payload\.tripType === "one-way" \? "→" : "⇄"\} \$\{String\(payload\.destination \|\| ""\)\.toUpperCase\(\)\}`\}/);
  assert.doesNotMatch(results, /route=\{`[^`]*airportLabel/);
  assert.doesNotMatch(header, /airport\.city|\([A-Z]{3}\)/);
});

test("main controls and metadata render in two independent rows", () => {
  const mainRowStart = header.indexOf('<View accessibilityLabel="Flight route controls"');
  const metadataRowStart = header.indexOf('<View style={s0.flightHeaderMetadataAlignmentRow}>');
  const mainRow = header.slice(mainRowStart, metadataRowStart);
  const metadataRow = header.slice(metadataRowStart);
  assert.ok(mainRowStart >= 0 && metadataRowStart > mainRowStart);
  assert.match(mainRow, /accessibilityLabel="Go back"[\s\S]*?\{route\}[\s\S]*?accessibilityLabel="Edit search"/);
  assert.doesNotMatch(mainRow, /dateRange|travelerCount|cabinClass/);
  assert.match(metadataRow, /accessibilityLabel="Trip metadata row"[\s\S]*?<CalendarDays[\s\S]*?\{dateRange\}[\s\S]*?<User[\s\S]*?\{travelerCount\}[\s\S]*?<Briefcase[\s\S]*?\{cabinClass\}/);
  assert.doesNotMatch(header, /·/);
  assert.match(styles, /flightHeaderMainRow: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"/);
});

test("metadata uses modest, decorative semantic icons", () => {
  for (const icon of ["CalendarDays", "User", "Briefcase"]) {
    assert.match(header, new RegExp(`<${icon} accessibilityElementsHidden accessible=\\{false\\} color=\\{theme\\.icon\\} size=\\{16\\}`));
  }
});

test("metadata renders current dates without a redundant trip-type label", () => {
  assert.match(results, /shortDate\(String\(payload\.departureDate/);
  assert.match(results, /shortDate\(String\(payload\.returnDate/);
  assert.match(results, /dateRange=\{payload\.tripType === "one-way"/);
  assert.doesNotMatch(header, /Round trip|One way/);
});

test("traveler metadata uses the canonical total with singular and plural wording", () => {
  assert.match(results, /travelerCount=\{Number\(payload\.travelers\)\}/);
  assert.match(header, /travelerCount === 1 \? "Traveler" : "Travelers"/);
  assert.doesNotMatch(header, /\badults?\b/i);
  const travelerText = (count: number) => `${count} ${count === 1 ? "Traveler" : "Travelers"}`;
  assert.equal(travelerText(1), "1 Traveler");
  assert.equal(travelerText(2), "2 Travelers");
});

test("cabin class comes from current normalized search data", () => {
  assert.match(results, /cabinClass=\{cabinLabel\(payload\.cabinClass\)\}/);
  assert.match(results, /replace\(\/\[-_\]\+\/g, " "\)\.toLowerCase\(\)/);
  assert.equal(flightPayload({ adults: 1, children: 0, infants: 0 }).cabinClass, "economy");
});

test("canonical total includes adults, children, and infants", () => {
  assert.equal(flightPayload({ adults: 2, children: 1, infants: 1 }).travelers, 4);
  assert.equal(flightPayload({ adults: 2, children: 0, infants: 0 }).travelers, 2);
  assert.equal(flightPayload({ adults: 1, children: 2, infants: 0 }).travelers, 3);
  assert.equal(flightPayload({ adults: 1, children: 0, infants: 2 }).travelers, 3);
});

test("Back and Edit search retain their behavior and touch targets", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(styles, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(styles, /flightHeaderEdit: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
  assert.match(results, /onEdit=\{edit\}/);
  assert.match(results, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
});

test("route stays centered between balanced compact controls without overlap", () => {
  assert.match(styles, /flightHeaderSide: \{ width: 44, flexShrink: 0 \}/);
  assert.match(styles, /flightHeaderRouteBlock: \{ flex: 1, minWidth: 0, alignItems: "center"/);
  assert.doesNotMatch(header, />Edit search<\/Text>/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?<FilePenLine/);
  assert.doesNotMatch(header, /numberOfLines|ellipsizeMode|overflow:\s*["']hidden["']|position:\s*["']absolute["']/);
});

test("Edit search is an icon-only action without card decoration", () => {
  const editStyle = styles.slice(styles.indexOf("flightHeaderEdit:"), styles.indexOf("filterRail:"));
  assert.doesNotMatch(editStyle, /backgroundColor|border|shadow|elevation|borderRadius/);
  assert.doesNotMatch(header, /flightHeaderEditText/);
});

test("metadata stays horizontal without wrapping and scrolls on narrow screens", () => {
  assert.match(header, /<ScrollView[\s\S]*?accessibilityLabel="Trip metadata row"[\s\S]*?horizontal[\s\S]*?showsHorizontalScrollIndicator=\{false\}[\s\S]*?contentContainerStyle=\{s0\.flightHeaderMetadataRow\}/);
  assert.match(styles, /flightHeaderMetadataRow: \{[\s\S]*?flexDirection: "row"[\s\S]*?flexWrap: "nowrap"[\s\S]*?alignItems: "center"[\s\S]*?columnGap: 18/);
  assert.match(styles, /flightHeaderMetadataItem: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"[\s\S]*?flexShrink: 0,[\s\S]*?gap: 6/);
  assert.doesNotMatch(header, /numberOfLines|ellipsizeMode/);
});

test("metadata alignment clears the Back target without fragile absolute positioning", () => {
  assert.match(header, /<View style=\{s0\.flightHeaderMetadataAlignmentRow\}>[\s\S]*?<View style=\{s0\.flightHeaderMetadataInset\} \/>[\s\S]*?<ScrollView[\s\S]*?<\/ScrollView>/);
  assert.match(styles, /flightHeaderMetadataAlignmentRow: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"[\s\S]*?marginTop: 7/);
  assert.match(styles, /flightHeaderMetadataInset: \{ width: 52, flexShrink: 0 \}/);
  assert.doesNotMatch(styles.slice(styles.indexOf("flightHeaderMetadataAlignmentRow:"), styles.indexOf("flightHeaderMetadataItem:")), /position:|left:|right:/);
});

test("Back is an independent icon with pressed feedback and no card treatment", () => {
  assert.match(header, /style=\{\(\{ pressed \}\) => \[s0\.flightHeaderBack, pressed && s0\.flightHeaderControlPressed\]\}/);
  assert.match(styles, /flightHeaderControlPressed: \{ opacity: 0\.55 \}/);
  const backStyle = styles.slice(styles.indexOf("flightHeaderBack:"), styles.indexOf("flightHeaderRouteBlock:"));
  assert.doesNotMatch(backStyle, /backgroundColor|border|shadow|elevation|borderRadius/);
  assert.doesNotMatch(header.slice(header.indexOf('accessibilityLabel="Go back"'), header.indexOf("<ArrowLeft")), /backgroundColor|shadowColor|flightHeaderElevated/);
});

test("header spacing stays compact before the unchanged date strip", () => {
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(results, /<View>\{dateStrip\}<\/View>/);
  assert.match(results, /stickyHeaderIndices=\{\[1\]\}/);
});

test("metadata and controls preserve semantic light and dark theme colors", () => {
  assert.match(header, /backgroundColor: theme\.background/);
  assert.match(header, /color: theme\.textPrimary/);
  assert.match(header, /color: theme\.textSecondary/);
  assert.match(header, /color=\{theme\.icon\}/);
});

test("shared actions and bottom navigation remain unchanged", () => {
  assert.match(searchUi, /export function TopBar/);
  assert.match(details, /<TopBar detail onPriceAlertPress=\{handlePriceAlert\}/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
