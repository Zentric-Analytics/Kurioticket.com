import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const topBarSource = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const stickyFooter = flightDetail.slice(flightDetail.indexOf("<View style={[d.sticky"), flightDetail.indexOf("</SafeAreaView>"));

test("flight details moves its sole price-alert entry point to the header", () => {
  assert.match(flightDetail, /<TopBar detail onPriceAlertPress=\{\(\) => router\.push\("\/price-alerts"\)\} \/>/);
  assert.doesNotMatch(stickyFooter, /Price alert|name="bell"/);
  assert.equal(flightDetail.match(/router\.push\("\/price-alerts"\)/g)?.length, 1);
});

test("flight details footer only contains total information and the provider CTA", () => {
  assert.match(stickyFooter, />Total</);
  assert.match(stickyFooter, /\{formattedFare\}/);
  assert.match(stickyFooter, />Round trip</);
  assert.match(stickyFooter, /Continue to \$\{provider\}/);
  assert.doesNotMatch(stickyFooter, />Save<|name="heart"|stickyAction/);
});

test("detail TopBar renders an accessible themed price alert and retains share", () => {
  assert.match(topBarSource, /accessibilityLabel="Price alert"[\s\S]*?onPress=\{onPriceAlertPress\}[\s\S]*?name="bell" color=\{theme\.icon\}/);
  assert.match(topBarSource, /<FlowIcon name="share" color=\{theme\.icon\} \/>/);
  assert.match(topBarSource, /onPriceAlertPress[\s\S]*?<FlowIcon name="heart" color=\{theme\.icon\}/);
});

test("flight-results favorite control remains available", () => {
  const flightCard = resultsSource.slice(resultsSource.indexOf("function FlightCard"), resultsSource.indexOf("function HotelCard"));
  assert.match(flightCard, /const \{ savedFlights, toggle \} = useSavedFlights\(\)/);
  assert.match(flightCard, /<Heart/);
  assert.match(flightCard, /onPress=\{\(event\) => \{ event\.stopPropagation\(\); toggle\(result\); \}\}/);
});
