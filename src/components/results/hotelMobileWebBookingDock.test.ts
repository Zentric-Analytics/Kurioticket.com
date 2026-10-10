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
const mobileDetails = readFileSync(
  new URL("./hotelDetails/MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);
const providerCard = readFileSync(new URL("./hotelDetails/HotelPriceComparisonSection.tsx", import.meta.url), "utf8");
const mobileStyles = readFileSync(new URL("./hotelDetails/HotelDetailsMobile.module.css", import.meta.url), "utf8");
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
  assert.match(client, /await runProviderRedirect\(targetWindow\)/);
});

test("standalone provider handoff remains server-authoritative", () => {
  assert.match(client, /fetch\("\/api\/redirect"/);
  assert.match(client, /type: "hotel"/);
  assert.match(client, /sourcePage: "hotel_details"/);
  assert.match(
    client,
    /if \(targetWindow && !targetWindow\.closed\) \{[\s\S]*?targetWindow\.location\.replace\(data\.url\);[\s\S]*?setRedirecting\(false\);[\s\S]*?\} else \{[\s\S]*?window\.location\.href = data\.url;[\s\S]*?\}/,
  );
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
  assert.match(details, /mobile \? <MobileHotelDetails/);
  assert.match(mobileDetails, /props\.roomChoices\.length \? \[\{/);
  assert.match(mobileDetails, /offers\.find\(offer => offer\.id === selectedId\) \?\? offers\[0\]/);
});

test("mobile Hotel inline rate actions target their own provider rather than an obsolete booking dock", () => {
  assert.match(mobileDetails, /offers\.map\(offer => <DesktopProviderOffer/);
  assert.match(mobileDetails, /selected=\{selected\?\.id === offer\.id\}/);
  assert.match(mobileDetails, /pendingOfferId=\{pending \? selected\?\.id \?\? null : null\}/);
  assert.match(mobileDetails, /offers\.find\(candidate => candidate\.id === offerId\)/);
  assert.match(mobileDetails, /if \(nextOffer\) void viewDeal\(nextOffer\)/);
  assert.match(mobileDetails, /offer\.action\.kind === "internal-room-flow"[\s\S]*setOverlay\("rooms"\)/);
  assert.match(providerCard, /View deal with \$\{offer\.providerName\}/);
  assert.match(providerCard, /disabled=\{disabled \|\| !onContinue\}/);
});

test("changing the selected Hotel rate clears stale provider handoff feedback", () => {
  assert.match(
    mobileDetails,
    /function selectProviderOffer\(offerId: string\) \{[\s\S]*?setHandoffError\(""\);[\s\S]*?setSelectedId\(offerId\);[\s\S]*?\}/,
  );
  assert.match(mobileDetails, /onSelect=\{selectProviderOffer\}/);
  const body = mobileDetails.match(/function selectProviderOffer\(offerId: string\) \{([^}]+)\}/)?.[1];
  assert.ok(body);
  const changes: unknown[] = [];
  new Function("offerId", "setHandoffError", "setSelectedId", body)(
    "next-provider", (value: string) => changes.push(value), (value: string) => changes.push(value),
  );
  assert.deepEqual(changes, ["", "next-provider"]);
});

test("web Hotel provider action stays live-price gated and server-authoritative", () => {
  assert.match(client, /const providerEnabled = canUseHotelDetailsProviderLink\(hotel\)/);
  assert.match(
    client,
    /mode === "standalone" &&[\s\S]*?providerEnabled &&[\s\S]*?nightlyDisplayPrice &&/,
  );
  assert.match(client, /fetch\("\/api\/redirect"/);
  assert.match(
    client,
    /if \(targetWindow && !targetWindow\.closed\) \{[\s\S]*?targetWindow\.location\.replace\(data\.url\);[\s\S]*?setRedirecting\(false\);[\s\S]*?\} else \{[\s\S]*?window\.location\.href = data\.url;[\s\S]*?\}/,
  );
});

test("mobile Hotel inline rate actions fit narrow phones and content respects the safe area", () => {
  assert.match(providerCard, /grid-cols-\[92px_minmax\(0,1fr\)_80px\]/);
  assert.match(providerCard, /h-8 w-\[80px\] shrink-0/);
  assert.match(providerCard, /text-\[16px\][\s\S]*min-\[360px\]:text-\[20px\]/);
  assert.match(mobileStyles, /padding-bottom: max\(16px, env\(safe-area-inset-bottom\)\)/);
});

test("Hotel Details loading dock uses the same narrow-phone geometry", () => {
  assert.match(loading, /data-hotel-loading-mobile-dock/);
  assert.match(loading, /grid-cols-\[minmax\(0,1fr\)_minmax\(124px,42%\)\]/);
  assert.match(loading, /min-\[390px\]:grid-cols-\[minmax\(0,1fr\)_minmax\(140px,0\.82fr\)\]/);
  assert.match(loading, /env\(safe-area-inset-bottom\)/);
});


test("mobile web external Hotel View deal reserves a new tab before the async redirect", () => {
  assert.match(mobileDetails, /window\.open\("about:blank", "_blank"\)/);
  assert.match(mobileDetails, /providerWindow\.opener = null/);
  assert.match(
    mobileDetails,
    /onProviderOfferHandoff\?\.\(offer\.action\.providerOfferId, providerWindow\)/,
  );
  assert.match(mobileDetails, /providerWindow && !providerWindow\.closed/);
  assert.match(mobileDetails, /providerWindow\.close\(\)/);
  assert.doesNotMatch(
    mobileDetails.slice(
      mobileDetails.indexOf("async function viewDeal"),
      mobileDetails.indexOf("const facts"),
    ),
    /window\.location\.href/,
  );
});
