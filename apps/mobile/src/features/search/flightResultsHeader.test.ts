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

const summary = (payload: Record<string, unknown>) => [
  payload.tripType === "one-way" ? "One way" : "Round trip",
  payload.tripType === "one-way"
    ? String(payload.departureDate)
    : `${payload.departureDate} – ${payload.returnDate}`,
  `${payload.travelers} ${Number(payload.travelers) === 1 ? "Traveler" : "Travelers"}`,
].join(" · ");

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
  assert.match(results, /route=\{`\$\{String\(payload\.origin \|\| ""\)\.toUpperCase\(\)\} ⇄ \$\{String\(payload\.destination \|\| ""\)\.toUpperCase\(\)\}`\}/);
  assert.doesNotMatch(results, /route=\{`[^`]*airportLabel/);
});

test("main controls and trip summary occupy independent rows", () => {
  assert.match(header, /<View accessibilityLabel="Flight route controls" style=\{s0\.flightHeaderMainRow\}>[\s\S]*?<\/View>\s*<View accessibilityLabel="Trip summary row" style=\{s0\.flightHeaderSummaryRow\}>/);
  const mainRow = header.slice(header.indexOf('accessibilityLabel="Flight route controls"'), header.indexOf('accessibilityLabel="Trip summary row"'));
  assert.match(mainRow, /accessibilityLabel="Go back"[\s\S]*?\{route\}[\s\S]*?accessibilityLabel="Edit search"/);
  assert.doesNotMatch(mainRow, /\{tripSummary\}/);
  assert.match(styles, /flightHeaderMainRow: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"/);
});

test("summary preserves trip type and dates while using canonical total traveler wording", () => {
  assert.match(results, /payload\.tripType === "one-way" \? "One way" : "Round trip"/);
  assert.match(results, /shortDate\(String\(payload\.departureDate/);
  assert.match(results, /shortDate\(String\(payload\.returnDate/);
  assert.match(results, /payload\.travelers[\s\S]*?"Traveler" : "Travelers"/);
  assert.doesNotMatch(header, /\badults?\b/i);
  assert.doesNotMatch(header, /cabin|economy|business|first/);
  assert.equal(summary({ tripType: "round-trip", departureDate: "Aug 19", returnDate: "Aug 20", travelers: 1 }), "Round trip · Aug 19 – Aug 20 · 1 Traveler");
  assert.equal(summary({ tripType: "one-way", departureDate: "Aug 19", travelers: 2 }), "One way · Aug 19 · 2 Travelers");
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
  assert.match(results, /onEdit=\{edit\}/);
  assert.match(results, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
});

test("route remains flexible and summary wraps beneath route content on narrow screens", () => {
  assert.match(styles, /flightHeaderRouteBlock: \{ flexGrow: 1, flexShrink: 1, minWidth: 0 \}/);
  assert.match(styles, /flightHeaderEdit: \{[\s\S]*?minWidth: 106,[\s\S]*?flexShrink: 0/);
  assert.match(styles, /flightHeaderSummaryRow: \{[\s\S]*?marginLeft: 46,[\s\S]*?paddingTop: 4/);
  assert.match(styles, /flightHeaderSummary: \{[^}]*flexShrink: 1/);
  assert.doesNotMatch(header, /numberOfLines|ellipsizeMode|overflow:\s*["']hidden["']|position:\s*["']absolute["']/);
});

test("header spacing stays compact before the unchanged date strip", () => {
  assert.match(styles, /flightHeader: \{[\s\S]*?paddingTop: 12,[\s\S]*?paddingBottom: 8/);
  assert.match(results, /<View>\{dateStrip\}<\/View>/);
  assert.match(results, /stickyHeaderIndices=\{\[1\]\}/);
});

test("summary and controls preserve semantic light and dark theme colors", () => {
  assert.match(header, /backgroundColor: theme\.background/);
  assert.match(header, /color: theme\.textPrimary/);
  assert.match(header, /color: theme\.textSecondary/);
  assert.match(header, /backgroundColor: theme\.surface, borderColor: theme\.border/);
  assert.match(header, /color=\{theme\.icon\}/);
});

test("shared actions and bottom navigation remain unchanged", () => {
  assert.match(searchUi, /export function TopBar/);
  assert.match(details, /<TopBar detail onPriceAlertPress=\{handlePriceAlert\}/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
