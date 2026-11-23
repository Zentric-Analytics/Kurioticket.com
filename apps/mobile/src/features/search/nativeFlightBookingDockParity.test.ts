import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const availableStart = source.indexOf('return <SafeAreaView edges={[]} style={[s.safe,{backgroundColor:contentCanvasColor}]}');
const availableEnd = source.indexOf("function FlightDetailsLoadingSkeleton", availableStart);
const available = availableStart >= 0 && availableEnd > availableStart ? source.slice(availableStart, availableEnd) : "";
const dealsStart = source.indexOf('if(tab==="deals")');
const dealsEnd = source.indexOf('if(tab==="details")', dealsStart);
const deals = dealsStart >= 0 && dealsEnd > dealsStart ? source.slice(dealsStart, dealsEnd) : "";

test("loaded Flight Details removes the fixed Continue deal dock", () => {
  assert.ok(available.length > 0);
  assert.doesNotMatch(available, /s\.sticky|Continue deal|checkoutAction|checkoutTotal/);
  assert.match(available, /paddingBottom:28\+inset\.bottom/);
});

test("Compare deals owns the provider booking action", () => {
  assert.match(deals, /accessibilityRole="radiogroup" accessibilityLabel="Flight deal options"/);
  assert.match(deals, /accessibilityRole="radio"/);
  assert.match(deals, /accessibilityRole="button"/);
  assert.match(deals, />View deal<\/Text>/);
  assert.match(deals, /onSelectDeal\(deal\.offerId\);onViewDeal\(deal\.offerId\)/);
  assert.match(available, /onViewDeal=\{\(offerId\)=>void handoff\(offerId\)\}/);
});

test("provider booking keeps handoff readiness and offer-change recovery", () => {
  assert.match(source, /const handoff=async\(offerId:string\) => \{ if\(booking\|\|!displayPricesReady\)return;/);
  assert.match(source, /travelApi\.flightRedirect\(offerId, \{ handoff: journeyEvents.prepareHandoff\(journeyRequestId\) \}\)/);
  assert.match(source, /Linking\.openURL\(response\.url\)/);
  assert.match(source, /error\.details\?\.code==="offer_changed"/);
});

test("loading checkout remains until the separately scoped loading-state task", () => {
  const loading = source.slice(source.indexOf("function FlightDetailsLoadingSkeleton"));
  assert.match(loading, /testID="flight-details-loading-checkout"/);
  assert.match(loading, /style=\{\[s\.sticky/);
});
