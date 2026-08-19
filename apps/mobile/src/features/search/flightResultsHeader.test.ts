import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const results = read("src/features/search/ApprovedResultsScreen.tsx");
const searchUi = read("src/features/search/SearchUi.tsx");
const details = read("src/features/search/ApprovedDetailScreen.tsx");
const header = results.slice(
  results.indexOf("function FlightResultsHeader"),
  results.indexOf("const stopLabels"),
);

test("Flight Results replaces the branded notification TopBar with its compact summary header", () => {
  assert.match(results, /flightResults \? \(\s*<FlightResultsHeader/);
  assert.doesNotMatch(results, /<TopBar\s+flightResults=/);
  assert.doesNotMatch(results, /useUnreadNotifications|onNotificationsPress|hasUnreadNotifications/);
  assert.doesNotMatch(header, /<Logo|Notifications|<Bell/);
  assert.match(results, /<TopBar \/>/, "the unrelated hotel results header remains shared");
});

test("compact header keeps functional Back and Edit search controls", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(header, /accessibilityLabel="Edit search"[\s\S]*?onPress=\{onEdit\}/);
  assert.match(results, /onEdit=\{edit\}/);
  assert.match(results, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
});

test("Back, route block, and Edit search form one ordered header row", () => {
  assert.match(header, /accessibilityLabel="Go back"[\s\S]*?flightHeaderRouteBlock[\s\S]*?\{route\}[\s\S]*?\{metadata\}[\s\S]*?accessibilityLabel="Edit search"/);
  assert.match(results, /flightHeader: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"/);
  assert.match(results, /flightHeaderBack: \{[\s\S]*?width: 44,[\s\S]*?height: 44/);
});

test("route and metadata share a flexible block that cannot collide with Edit search", () => {
  assert.match(header, /<View style=\{s0\.flightHeaderRouteBlock\}>[\s\S]*?<Text[^>]*flightHeaderRoute[\s\S]*?\{route\}[\s\S]*?<Text[^>]*flightHeaderMetadata[\s\S]*?\{metadata\}[\s\S]*?<\/View>/);
  assert.match(results, /flightHeaderRouteBlock: \{ flexGrow: 1, flexShrink: 1, minWidth: 0 \}/);
  assert.match(results, /flightHeaderRoute: \{ minWidth: 0 \}/);
  assert.match(results, /flightHeaderEdit: \{[\s\S]*?minWidth: 106,[\s\S]*?minHeight: 44,[\s\S]*?flexShrink: 0/);
  assert.doesNotMatch(header, /numberOfLines/);
  assert.doesNotMatch(header, /ellipsizeMode|overflow:\s*["']hidden["']|position:\s*["']absolute["']/);
  assert.doesNotMatch(header, /<TopBar|height: 64/);
});

test("short code title reclaims space so Back, route, and Edit search stay aligned", () => {
  assert.doesNotMatch(header, /stackEditSearch|flightHeaderRouteBlockStacked|flightHeaderEditStacked/);
  assert.match(results, /flightHeader: \{[\s\S]*?flexDirection: "row"[\s\S]*?alignItems: "center"/);
  assert.match(results, /flightHeaderRouteBlock: \{ flexGrow: 1, flexShrink: 1, minWidth: 0 \}/);
});

test("route title uses uppercase codes directly from the current search payload", () => {
  assert.match(results, /route=\{`\$\{String\(payload\.origin \|\| ""\)\.toUpperCase\(\)\} ⇄ \$\{String\(payload\.destination \|\| ""\)\.toUpperCase\(\)\}`\}/);
  assert.doesNotMatch(results, /route=\{`[^`]*airportLabel/);
  assert.match(results, /const airportLabel = \(code: unknown\)[\s\S]*?return airport \? `\$\{airport\.city\} \(\$\{value\}\)` : value;/);
});

test("representative payload codes render without airport city lookups", () => {
  const route = (origin: unknown, destination: unknown) =>
    `${String(origin || "").toUpperCase()} ⇄ ${String(destination || "").toUpperCase()}`;

  assert.equal(route("los", "abv"), "LOS ⇄ ABV");
  assert.equal(route("lax", "jfk"), "LAX ⇄ JFK");
  assert.doesNotMatch(route("los", "abv"), /Lagos|Abuja|\(|\)/);
  assert.equal(route("current-origin", "current-destination"), "CURRENT-ORIGIN ⇄ CURRENT-DESTINATION");
});

test("compact header spacing stays tight without changing the date strip", () => {
  assert.match(results, /flightHeaderMetadata: \{ marginTop: 1 \}/);
  assert.match(results, /flightHeader: \{[\s\S]*?paddingBottom: 8/);
  assert.match(results, /<View>\{dateStrip\}<\/View>/);
  assert.match(results, /stickyHeaderIndices=\{\[1\]\}/);
});

test("flight metadata remains sourced and formatted exactly as before", () => {
  assert.match(results, /metadata=\{`\$\{shortDate\(String\(payload\.departureDate \|\| ""\)\)\} – \$\{shortDate\(String\(payload\.returnDate \|\| ""\)\)\}  ·  \$\{payload\.travelers\} Traveler/);
  assert.match(header, /\{metadata\}/);
});

test("shared TopBar and Flight Details actions remain unchanged", () => {
  assert.match(searchUi, /export function TopBar/);
  assert.match(searchUi, /<Logo \/>/);
  assert.match(searchUi, /accessibilityLabel="Notifications"/);
  assert.match(searchUi, /accessibilityLabel="Price alert"/);
  assert.match(searchUi, /accessibilityLabel="Share flight"/);
  assert.match(details, /<TopBar detail onPriceAlertPress=\{handlePriceAlert\} priceAlertDisabled=\{!priceAlertAvailable\} onSharePress=/);
});

test("compact header preserves themed colors and the existing bottom navigation", () => {
  assert.match(header, /backgroundColor: theme\.background/);
  assert.match(header, /color: theme\.textPrimary/);
  assert.match(header, /color: theme\.textSecondary/);
  assert.match(header, /backgroundColor: theme\.surface, borderColor: theme\.border/);
  assert.match(results, /<BottomNav flightResults=\{flightResults\} \/>/);
});
