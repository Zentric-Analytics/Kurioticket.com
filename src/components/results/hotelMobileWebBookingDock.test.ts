import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync(
  new URL("./hotelDetails/StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("./HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);
const continuation = readFileSync(
  new URL("./hotelDetails/hotelBookingContinuation.ts", import.meta.url),
  "utf8",
);
const loading = readFileSync(
  new URL("./hotelDetails/HotelDetailsPageStates.tsx", import.meta.url),
  "utf8",
);

test("standalone web Hotel Rates receive the current actionable external provider", () => {
  assert.match(client, /const standaloneProviderOffers: HotelDetailsProviderOffer\[\]/);
  assert.match(client, /providerName: standaloneProviderName/);
  assert.match(client, /providerLogoUrl: hotel\.providerLogoUrl/);
  assert.match(client, /nightlyPrice: nightlyDisplayPrice\.formatted/);
  assert.match(client, /totalPrice: totalDisplayPrice\?\.formatted/);
  assert.match(client, /kind: "provider-handoff"/);
  assert.match(client, /providerOfferId: "current-provider"/);
  assert.match(client, /providerOffers=\{standaloneProviderOffers\}/);
  assert.match(client, /onProviderOfferHandoff=/);
  assert.match(client, /await continueToProvider\(true\)/);
});

test("standalone provider handoff remains server-authoritative", () => {
  assert.match(client, /fetch\("\/api\/redirect"/);
  assert.match(client, /type: "hotel"/);
  assert.match(client, /sourcePage: "hotel_details"/);
  assert.match(client, /window\.location\.href = data\.url/);
  const offerBlock = client.slice(
    client.indexOf("const standaloneProviderOffers"),
    client.indexOf("const guidedSelection"),
  );
  assert.doesNotMatch(offerBlock, /bookingUrl|partnerRedirectUrl|sourceUrl/);
});

test("Hotel selection defaults to the first actionable rate and preserves later user selection", () => {
  assert.match(
    continuation,
    /if \(selectedOfferId && actionableOffers\.some\(\(offer\) => offer\.id === selectedOfferId\)\) return selectedOfferId;/,
  );
  assert.match(continuation, /return actionableOffers\[0\]\?\.id \?\? null;/);
  assert.match(details, /internalRoomFlowAvailable \? \[kurioticketOffer\] : \[\]/);
});

test("mobile Hotel booking dock reflects the selected provider and action semantics", () => {
  assert.match(details, /const selectedProviderOffer =/);
  assert.match(details, /const bookingActionAvailable =/);
  assert.match(
    details,
    /bookingContinuation\.kind === "provider-handoff"[\s\S]*?props\.labels\.viewDeal[\s\S]*?props\.labels\.continueBooking/,
  );
  assert.match(details, /data-mobile-hotel-selected-rate/);
  assert.match(details, /mobileDockPrimaryPrice/);
  assert.match(details, /mobileDockProviderName/);
  assert.match(details, /mobileDockSupportingText/);
  assert.match(details, /aria-label=\{[\s\S]*?bookingActionLabel[\s\S]*?mobileDockProviderName/);
});

test("mobile Hotel booking dock remains usable on narrow phones and respects the safe area", () => {
  assert.match(details, /pb-\[calc\(0\.625rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(details, /grid-cols-\[minmax\(0,1fr\)_minmax\(124px,42%\)\]/);
  assert.match(details, /min-\[390px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(140px,0\.82fr\)\]/);
  assert.match(details, /text-\[18px\][\s\S]*?min-\[390px\]:text-\[20px\]/);
  assert.match(details, /min-h-12 w-full rounded-lg bg-blue px-2 text-\[12px\]/);
  assert.match(details, /min-\[390px\]:px-3 min-\[390px\]:text-\[13px\]/);
  assert.match(details, /bookingActionAvailable \? "min-w-0 pb-\[calc\(7\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test("Hotel Details loading dock uses the same narrow-phone geometry", () => {
  assert.match(loading, /data-hotel-loading-mobile-dock/);
  assert.match(loading, /grid-cols-\[minmax\(0,1fr\)_minmax\(124px,42%\)\]/);
  assert.match(loading, /min-\[390px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(140px,0\.82fr\)\]/);
  assert.match(loading, /env\(safe-area-inset-bottom\)/);
});
