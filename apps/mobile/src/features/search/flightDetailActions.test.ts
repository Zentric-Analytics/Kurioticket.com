import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const detailSource = readFileSync(resolve("src/features/search/ApprovedDetailScreen.tsx"), "utf8");
const topBarSource = readFileSync(resolve("src/features/search/SearchUi.tsx"), "utf8");
const resultsSource = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const flightDetail = detailSource.slice(detailSource.indexOf("function FlightDetail"), detailSource.indexOf("function HotelDetail"));
const stickyFooter = flightDetail.slice(flightDetail.indexOf("<View style={[d.sticky"), flightDetail.indexOf("</SafeAreaView>"));

test("flight details gives its price-alert entry point the existing creation flow", () => {
  assert.match(flightDetail, /onPriceAlertPress=\{handlePriceAlert\}/);
  assert.match(flightDetail, /travelApi\.createPriceAlert\(buildFlightPriceAlertPayload\(alertPlan, parsed\.value, alertCurrency\)\)/);
  assert.match(flightDetail, /priceAlertDisabled=\{!priceAlertEnabled\}/);
  assert.doesNotMatch(stickyFooter, /Price alert|name="bell"/);
});

test("flight details footer only contains total information and the provider CTA", () => {
  assert.match(stickyFooter, />Total</);
  assert.match(stickyFooter, /\{formattedFare\}/);
  assert.match(stickyFooter, />Round trip</);
  assert.match(stickyFooter, /Continue to \$\{provider\}/);
  assert.doesNotMatch(stickyFooter, />Save<|name="heart"|stickyAction/);
});

test("detail TopBar renders accessible, configurable price-alert and share controls", () => {
  assert.match(topBarSource, /accessibilityLabel="Price alert"[\s\S]*?accessibilityState=\{\{ disabled: priceAlertDisabled \}\}[\s\S]*?onPress=\{onPriceAlertPress\}[\s\S]*?name="bell" color=\{theme\.icon\}/);
  assert.match(topBarSource, /accessibilityLabel="Share flight"[\s\S]*?onPress=\{onSharePress\}[\s\S]*?<FlowIcon name="share" color=\{theme\.icon\} \/>/);
  assert.match(topBarSource, /onSharePress \? \([\s\S]*?\) : \(\s*<FlowIcon name="share"/);
  assert.match(topBarSource, /onPriceAlertPress[\s\S]*?<FlowIcon name="heart" color=\{theme\.icon\}/);
});

test("Select and Continue share the authoritative provider handler", () => {
  assert.match(flightDetail, /<Offer[\s\S]*?onSelect=\{handleProviderBooking\}/);
  assert.match(flightDetail, /Continue to \$\{provider\}`\} onPress=\{handleProviderBooking\}/);
  assert.equal(flightDetail.match(/authoritativeProviderUrl\(result\)/g)?.length, 1);
});

test("flight share invokes native Share with safe presentation data", () => {
  assert.match(flightDetail, /Share\.share\(\{ message: flightShareMessage\(result, formattedFare\) \}\)/);
  assert.doesNotMatch(flightDetail.slice(flightDetail.indexOf("const handleShare"), flightDetail.indexOf("const handlePriceAlert")), /bookingUrl|partnerRedirectUrl/);
});

test("flight-results favorite control remains available", () => {
  const flightCard = resultsSource.slice(resultsSource.indexOf("function FlightCard"), resultsSource.indexOf("function HotelCard"));
  assert.match(flightCard, /const \{ savedFlights, toggle \} = useSavedFlights\(\)/);
  assert.match(flightCard, /<Heart/);
  assert.match(flightCard, /onPress=\{\(event\) => \{ event\.stopPropagation\(\); toggle\(result\); \}\}/);
});
