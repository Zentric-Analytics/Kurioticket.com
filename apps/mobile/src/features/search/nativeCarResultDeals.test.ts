import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { CarResult } from "../../api/travelApi";
import type { CarOffer } from "../../../../../src/lib/cars/types";
import { nativeCarOfferBookingUrl, nativeCarPrimaryBookingUrl, nativeCarResultDealChoices } from "./nativeCarResultDeals";

const offer = (id: string, provider: string, perDay: number, bookingUrl?: string): CarOffer => ({
  id, bookingProviderName: provider, rentalCompanyName: provider, currency: "USD",
  pricePerDay: perDay, totalPrice: perDay * 2,
  taxesAndFeesIncluded: true, payAtPickup: false, freeCancellation: true,
  ...(bookingUrl ? { bookingUrl } : {}),
});
const car = (
  offers: CarOffer[],
  inventorySource: CarResult["inventorySource"] = "kurioticket-static-cars",
): CarResult => ({
  inventorySource,
  offers,
  searchPolicy: { source: inventorySource, bookable: false, action: { kind: "internal-detail", enabled: true, href: "/cars/details/test" } },
} as CarResult);

test("native Cars shows the web's three real static Kurioticket prices without inventing links", () => {
  const result = car([
    offer("a", "Kurioticket", 139),
    offer("b", "Kurioticket", 146),
    offer("c", "Kurioticket", 153),
    offer("d", "Kurioticket", 160),
  ]);
  const choices = nativeCarResultDealChoices(result);
  assert.deepEqual(choices.map(({ offer: item }) => item.id), ["a", "b", "c"]);
  assert.deepEqual(choices.map(({ offer: item }) => item.pricePerDay), [139, 146, 153]);
  assert.ok(choices.every(({ providerName }) => providerName === "Kurioticket"));
  assert.ok(choices.every(({ bookingUrl }) => bookingUrl === null));
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
});

test("native Cars groups other providers the same way as web, preserving the cheapest seller offer", () => {
  const result = car([
    offer("b-high", "Provider B", 200),
    offer("a-low", "Provider A", 111, "https://sandbox-en-us.kayakaffiliates.com/in?offer=a"),
    offer("b-low", "Provider B", 135),
  ], "kayak-sandbox");
  const choices = nativeCarResultDealChoices(result);
  assert.deepEqual(choices.map(({ providerName }) => providerName), ["Provider A", "Provider B"]);
  assert.deepEqual(choices.map(({ offer: item }) => item.id), ["a-low", "b-low"]);
  assert.equal(choices[0]?.bookingUrl, "https://sandbox-en-us.kayakaffiliates.com/in?offer=a");
  assert.equal(choices[1]?.bookingUrl, null);
});

test("native result-card actions only accept credential-free HTTPS, with stricter sandbox clickout rules", () => {
  const staticCar = car([offer("a", "Kurioticket", 139)]);
  for (const unsafe of [
    "http://seller.example/deal", "https://user:password@seller.example/deal",
    "javascript:alert(1)", "https:///deal",
  ]) {
    assert.equal(nativeCarOfferBookingUrl(staticCar, offer("a", "Kurioticket", 139, unsafe)), null, unsafe);
  }
  assert.equal(nativeCarOfferBookingUrl(staticCar, offer("a", "Kurioticket", 139, "https://seller.example/deal")), "https://seller.example/deal");

  const sandboxCar = car([], "kayak-sandbox");
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://seller.example/deal")), null);
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://sandbox-en-us.kayakaffiliates.com/in?api_key=secret")), null);
  assert.equal(nativeCarOfferBookingUrl(sandboxCar, offer("s", "KAYAK", 111, "https://affiliates.kayak.com/sandbox-clickout")), "https://affiliates.kayak.com/sandbox-clickout");
});

test("main View deal opens only a genuine provider action; never a Cars details route", () => {
  const result = car([offer("a", "Kurioticket", 139)]);
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.searchPolicy.action = { kind: "provider", enabled: true, href: "https://seller.example/deal" };
  assert.equal(nativeCarPrimaryBookingUrl(result), "https://seller.example/deal");
  result.searchPolicy.action = { kind: "provider", enabled: true, href: "http://seller.example/deal" };
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.searchPolicy.action = { kind: "none", enabled: false };
  assert.equal(nativeCarPrimaryBookingUrl(result), null);
  result.offers[0] = offer("a", "Kurioticket", 139, "https://seller.example/offer");
  assert.equal(nativeCarPrimaryBookingUrl(result), "https://seller.example/offer");
});

test("native inline provider card keeps logos, individual prices and disabled unavailable actions", () => {
  const picker = readFileSync("src/features/search/NativeCarResultOfferPicker.tsx", "utf8");
  const card = readFileSync("src/features/search/CarResultCard.tsx", "utf8");
  const results = readFileSync("src/features/search/ApprovedCarResultsScreen.tsx", "utf8");
  const theme = readFileSync("src/theme/AppTheme.tsx", "utf8");

  assert.match(picker, /nativeCarResultDealChoices\(result\)/);
  assert.match(picker, /kurioticket-icon-blue\.png/);
  assert.match(picker, /resolveTravelProviderLogo\(logoUrl\)/);
  assert.match(picker, /presentCarOfferCurrency\(offer, displayCurrency, rates\)/);
  assert.match(picker, /Linking\.openURL\(bookingUrl\)/);
  assert.match(picker, /disabled=\{!bookingUrl\}/);
  assert.match(card, /<NativeCarResultOfferPicker result=\{result\}/);
  assert.match(card, /disabled=\{!primaryBookingUrl\}/);
  assert.doesNotMatch(results, /\/car-details/);
  assert.match(results, /backgroundColor:theme\.dark\?theme\.surface:CAR_RESULTS_LIGHT_CANVAS/);
  assert.match(theme, /priceAlertSurface: "#EDF6FF"/);
  assert.match(theme, /priceAlertBorder: "#C8DFF7"/);
});
