import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("approved flight Edit search opens a local modal with current canonical params", () => {
  const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
  const editStart = source.indexOf("  const edit = () => {");
  const editEnd = source.indexOf("  const normalizeFlightPrice", editStart);
  const editHandler = source.slice(editStart, editEnd);

  assert.ok(editStart >= 0 && editEnd > editStart, "expected the ApprovedResultsScreen edit handler");
  assert.match(source, /const \[editSearchOpen, setEditSearchOpen\] = useState\(false\)/);
  assert.match(editHandler, /if \(product === "flight"\)[\s\S]*?setEditSearchOpen\(true\)[\s\S]*?return;/);
  assert.match(source, /<FlightEditSearchModal[\s\S]*?visible=\{editSearchOpen\}[\s\S]*?params=\{flightEditSearchParams\(params\)\}[\s\S]*?onClose=\{\(\) => setEditSearchOpen\(false\)\}/);
  assert.doesNotMatch(editHandler, /\/edit-flight-search|activeSearch/);
  assert.doesNotMatch(editHandler.slice(0, editHandler.indexOf('router.push({\n      pathname: "/hotels"')), /router\.(?:push|replace|back)/);
  assert.doesNotMatch(editHandler, /pathname: "\/flights"/);
});

test("results edit modal reuses the shared panel and dismisses locally", () => {
  const modal = readFileSync("src/features/search/FlightEditSearchModal.tsx", "utf8");
  assert.match(modal, /<Modal transparent animationType="slide" visible onRequestClose=\{onClose\}/);
  assert.match(modal, /accessibilityViewIsModal/);
  assert.match(modal, /accessibilityLabel="Close edit search"/);
  assert.match(modal, /keyboardShouldPersistTaps="handled"/);
  assert.match(modal, /<FlightSearchPanel params=\{params\} submitNavigation="replace" onBeforeNavigate=\{onClose\} editAppearance \/>/);
  assert.doesNotMatch(modal, /router\.|flightSearchParams|travelApi/);
});

test("dedicated edit screen hydrates the shared form, cancels, and replaces stale edit history on submit", () => {
  const screen = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(screen, /useLocalSearchParams<Record<string, string \| string\[\]>>\(\)/);
  assert.match(screen, /<FlightSearchPanel params=\{params\} submitNavigation="replace" editAppearance \/>/);
  assert.match(screen, /onPress=\{\(\) => router\.back\(\)\}/);
  assert.doesNotMatch(screen, /FlightsScreen|ResponsiveHero|Routes/);
  assert.match(panel, /router\[submitNavigation\]\(\{ pathname: "\/flight-results", params: flightSearchParams\(form\) \}\)/);
  assert.match(panel, /onBeforeNavigate\?\.\(\); router\[submitNavigation\]/);
});


test("edit flight search uses the unified responsive editor hierarchy", () => {
  const screen = readFileSync("src/features/flow/EditFlightSearchScreen.tsx", "utf8");
  const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");
  assert.match(screen, /Update your trip details/);
  assert.match(screen, /content: \{ flexGrow: 1/);
  assert.match(panel, /appearance=\{editAppearance \? "filled" : "default"\}/);
  assert.match(panel, /label: FLIGHT_TRIP_TYPE_LABELS\["one-way"\]/);
  assert.match(panel, /label: FLIGHT_TRIP_TYPE_LABELS\["multi-city"\] }/);
  assert.match(panel, /accessibilityLabel="Swap origin and destination"/);
  assert.match(panel, /editCard:\{borderWidth:0,borderRadius:22/);
  assert.match(panel, /form\.departureDate && form\.returnDate \? `\$\{displayDate\(form\.departureDate\)\} — \$\{displayDate\(form\.returnDate\)\}` : "Travel dates"/);
  assert.match(panel, /formatTravelerCabinSummary\(form\)/);
});
