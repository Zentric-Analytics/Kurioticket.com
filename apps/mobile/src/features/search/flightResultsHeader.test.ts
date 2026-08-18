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

test("route and metadata reclaim the old TopBar row without sacrificing responsive width", () => {
  assert.match(header, /<View style=\{s0\.flightHeaderContent\}>[\s\S]*?\{route\}[\s\S]*?\{metadata\}/);
  assert.match(results, /flightHeaderContent: \{ flex: 1, minWidth: 0/);
  assert.match(results, /flightHeaderRoute: \{ flex: 1, minWidth: 0 \}/);
  assert.match(results, /flightHeaderEdit: \{[\s\S]*?minWidth: 106,[\s\S]*?minHeight: 44,[\s\S]*?flexShrink: 0/);
  assert.doesNotMatch(header, /numberOfLines/);
  assert.doesNotMatch(header, /<TopBar|height: 64/);
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
