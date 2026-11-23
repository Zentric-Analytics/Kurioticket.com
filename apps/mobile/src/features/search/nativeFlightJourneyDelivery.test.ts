import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flight = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");
const consent = readFileSync("src/features/privacy/AnalyticsConsentControl.tsx", "utf8");

test("iOS flight View deal does not double count an offer and settles queued consented journey stages", () => {
  const handoff = flight.slice(flight.indexOf("const handoff=async(offerId:string)"), flight.indexOf("const share=async"));
  assert.doesNotMatch(handoff, /trackSelectedOffer|offerSelected\(|providerDealSelected\(|flightFareSelected\(/,
    "the View deal button is not a separate selection action");
  assert.match(handoff, /setSelectedDealOfferId\(offerId\)/);
  const redirectIndex = handoff.indexOf("await travelApi.flightRedirect");
  const settleIndex = handoff.indexOf('if(Platform.OS === "ios") await journeyEvents.settleBeforeExternalHandoff(journeyRequestId)');
  const externalIndex = handoff.indexOf("await Linking.openURL(response.url)");
  assert.ok(redirectIndex > 0 && settleIndex > redirectIndex && externalIndex > settleIndex,
    "the provider redirect remains authoritative; do not open the external app before optional delivery has had a bounded chance");
});

test("native analytics settings show disconnected grant separately from a connected device", () => {
  assert.match(consent, /enabled \? state\.tracking \? "Analytics is ready on this device\."/);
  assert.match(consent, /enabled && !state\.tracking && !state\.pending/);
  assert.match(consent, /accessibilityLabel="Retry analytics connection"/);
  assert.match(consent, /value=\{enabled\}/);
});
