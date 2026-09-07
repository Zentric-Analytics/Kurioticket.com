import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const routeSource = read("app/flight-details.tsx");
const detailSource = read("src/features/search/NativeFlightDetails.tsx");
const navigationSource = read("src/features/search/flightDetailNavigation.ts");
const presentationSource = read("src/features/search/nativeFlightDetailsPresentation.ts");
const resultsSource = read("src/features/search/ApprovedResultsScreen.tsx");

test("Flight Details route mounts only the authoritative ID-based native screen", () => {
  assert.match(routeSource, /useLocalSearchParams/);
  assert.match(routeSource, /<NativeFlightDetails params=\{params\} \/>/);
  assert.doesNotMatch(routeSource, /import .*ApprovedDetailScreen|params\.result/);
  assert.match(navigationSource, /id: result\.id/);
  assert.doesNotMatch(navigationSource, /JSON\.stringify\(result\)|bookingUrl|partnerRedirectUrl/);
});

test("Back, Save, Share, and Edit search remain independent accessible actions", () => {
  assert.match(detailSource, /accessibilityLabel="Back to results"/);
  assert.match(detailSource, /label=\{saved \? "Remove saved flight" : "Save flight"\}/);
  assert.match(detailSource, /label="Share flight"/);
  assert.match(detailSource, /accessibilityLabel="Edit search"/);
  assert.match(detailSource, /shareFlightForAuthenticatedSession/);
  assert.match(detailSource, /Share\.share\(\{ message: shareMessage \}\)/);
  assert.match(detailSource, /pathname: "\/edit-flight-search", params: editParams/);
  assert.match(detailSource, /iconButton: \{ width: 44, height: 44/);
});

test("route summary, trip type, travelers, and total use the shared authoritative response", () => {
  assert.match(detailSource, /nativeFlightDetailsRoute\(details\)/);
  assert.match(detailSource, /tripTypeLabel\(details\)/);
  assert.match(detailSource, /travelerSummary\(details\)/);
  assert.match(detailSource, /flightDetailsTotalLabel\(details\.search\.travelers\)/);
  assert.match(presentationSource, /flightDetailsRouteLabel/);
  assert.match(presentationSource, /incomingCurrency/);
  assert.match(presentationSource, /result\.currency = incomingCurrency/);
});

test("Flight Details exposes full itinerary, fare choices, deals, fare details, conditions, and extras", () => {
  assert.match(detailSource, />Full itinerary</);
  assert.match(detailSource, />Pick your fare</);
  assert.match(detailSource, /Compare deals/);
  assert.match(detailSource, /Fare details/);
  assert.match(detailSource, /Fare conditions/);
  assert.match(detailSource, /Optional extras/);
  assert.match(detailSource, /segment\.originAirport/);
  assert.match(detailSource, /segment\.distanceKm/);
  assert.match(detailSource, /technicalStops/);
  assert.match(detailSource, /Price breakdown/);
  assert.match(detailSource, /Estimated CO₂/);
});

test("all fare choices and deals use the same resolved display-currency conversion", () => {
  assert.match(detailSource, /const choiceFare = displayPriceFor\(choice\.offer\.price, choice\.offer\.currency\)/);
  assert.match(detailSource, /const dealPrice = displayPriceFor\(deal\.price, deal\.currency\)/);
  assert.doesNotMatch(detailSource, /choice\.offer\.currency\} \$\{choice\.offer\.price\.toFixed/);
  assert.doesNotMatch(detailSource, /deal\.currency\} \$\{deal\.price\.toFixed/);
});

test("booking is server-revalidated and offer changes force review before another handoff", () => {
  assert.match(detailSource, /travelApi\.flightRedirect\(offerId\)/);
  assert.match(detailSource, /error\.details\?\.code === "offer_changed"/);
  assert.match(detailSource, /Review the refreshed price and terms before continuing/);
  assert.match(detailSource, /reload\(\)/);
  assert.doesNotMatch(detailSource, /authoritativeProviderUrl|bookingUrl|partnerRedirectUrl/);
  assert.match(resultsSource, /function FlightResultsHeader/);
});
