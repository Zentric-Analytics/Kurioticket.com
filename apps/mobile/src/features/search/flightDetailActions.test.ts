import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const topBarSource = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const stickyFooter = flightDetail.slice(flightDetail.indexOf("<View style={[d.sticky"), flightDetail.indexOf("</SafeAreaView>"));

test("flight details starts its existing price-alert creation flow from the header", () => {
  assert.match(flightDetail, /flightAlertPresentation\("flight", Boolean\(searchPlan\.plan\), \[result\]\)/);
  assert.match(flightDetail, /priceAlertAvailable = availability\.priceAlerts && alertPresentation\.enabled/);
  assert.match(flightDetail, /<TopBar detail onPriceAlertPress=\{handlePriceAlert\} priceAlertDisabled=\{!priceAlertAvailable\}/);
  assert.match(flightDetail, /travelApi\.createPriceAlert\(buildFlightPriceAlertPayload\(/);
  assert.match(flightDetail, /status === 401/);
  assert.match(flightDetail, /status === 409 && error\.details\?\.duplicate === true/);
  assert.doesNotMatch(stickyFooter, /Price alert|name="bell"/);
});
test("flight details footer only contains total information and the provider CTA", () => {
  assert.match(stickyFooter, />Total</);
  assert.match(stickyFooter, /\{formattedFare\}/);
  assert.match(stickyFooter, />Round trip</);
  assert.match(stickyFooter, /Continue to \$\{provider\}/);
  assert.doesNotMatch(stickyFooter, />Save<|name="heart"|stickyAction/);
});

test("detail TopBar exposes configurable accessible price-alert and share actions", () => {
  assert.match(topBarSource, /accessibilityLabel="Price alert"[\s\S]*?accessibilityState=\{\{ disabled: priceAlertDisabled \}\}[\s\S]*?onPress=\{onPriceAlertPress\}/);
  assert.match(topBarSource, /accessibilityLabel="Share flight" onPress=\{onSharePress\}/);
  assert.match(topBarSource, /onPriceAlertPress[\s\S]*?<FlowIcon name="heart" color=\{theme\.icon\}/);
  assert.match(flightDetail, /readSession,[\s\S]*?share: \(message\) => Share\.share\(\{ message \}\),[\s\S]*?message: flightShareMessage\(result, formattedFare\)/);
  assert.match(flightDetail, /"Sign in required", "Sign in to share this flight\."/);
  assert.match(flightDetail, /text: "Sign in", onPress: \(\) => router\.push\("\/email-auth"\)/);
  assert.match(flightDetail, /sharePendingRef\.current/);
});

test("flight details retains back and uses the dedicated current edit-search flow", () => {
  assert.match(topBarSource, /accessibilityLabel="Go back"[\s\S]*?onPress=\{\(\) => router\.back\(\)\}/);
  assert.match(flightDetail, /pathname: "\/edit-flight-search", params: flightEditSearchParams\(params\)/);
});
test("flight-results favorite control remains available", () => {
  const flightCard = resultsSource.slice(resultsSource.indexOf("function FlightCard"), resultsSource.indexOf("function HotelCard"));
  assert.match(flightCard, /const \{ savedFlights, toggle \} = useSavedFlights\(\)/);
  assert.match(flightCard, /<Heart/);
  assert.match(flightCard, /onPress=\{\(event\) => \{ event\.stopPropagation\(\); toggle\(result\); \}\}/);
});
