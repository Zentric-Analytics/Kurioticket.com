import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const flightDetail = read("src/features/search/NativeFlightDetails.tsx");
const approvedDetail = read("src/features/search/ApprovedDetailScreen.tsx");
const hotelDetail = approvedDetail.slice(approvedDetail.indexOf("function HotelDetail"), approvedDetail.indexOf("function DetailsRow"));
const offer = approvedDetail.slice(approvedDetail.indexOf("function Offer"), approvedDetail.indexOf("const d = StyleSheet.create"));

test("native Flight Details presents live server deals and authoritative selected provider", () => {
  assert.match(flightDetail, /selected\.handoff\.available \? selected\.handoff\.providerName/);
  assert.match(flightDetail, /choice\.deals\.map/);
  assert.match(flightDetail, /deal\.providerName/);
  assert.match(flightDetail, /Continue to \$\{provider\}/);
  assert.match(flightDetail, /travelApi\.flightRedirect\(offerId\)/);
});

test("native Flight Details does not open provider URLs stored on a result snapshot", () => {
  assert.doesNotMatch(flightDetail, /authoritativeProviderUrl/);
  assert.doesNotMatch(flightDetail, /bookingUrl|partnerRedirectUrl/);
  assert.match(flightDetail, /await Linking\.openURL\(response\.url\)/);
  assert.match(flightDetail, /error\.details\?\.code === "offer_changed"/);
});

test("every displayed fare and provider deal uses resolved display currency", () => {
  assert.match(flightDetail, /displayPriceFor\(choice\.offer\.price, choice\.offer\.currency\)/);
  assert.match(flightDetail, /displayPriceFor\(deal\.price, deal\.currency\)/);
});

test("hotel continuation is available only for real internal rooms or provider truth", () => {
  assert.match(hotelDetail, /const internalRoomFlowAvailable = roomOptions\.length > 0/);
  assert.match(hotelDetail, /result\.searchPolicy\.bookable &&/);
  assert.match(hotelDetail, /nativeHotelOffers\(internalRoomFlowAvailable, providerBookable\)/);
  assert.match(hotelDetail, /const canContinue = selectedOffer !== null/);
  assert.match(hotelDetail, /disabled=\{!canContinue\}/);
  assert.match(offer, /selected && \{ borderColor: ui\.blue \}/);
});
