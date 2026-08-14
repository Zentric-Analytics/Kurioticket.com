import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";
import { translations } from "../../../lib/i18n/en";
import { getLowestEstimateRoomId } from "./guidedHotelRoomPresentation";

const cardSource = readFileSync(
  new URL("./GuidedHotelRoomCard.tsx", import.meta.url),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

const room = (id: string, totalPrice: number): HotelRoomOption => ({
  id,
  hotelId: "hotel-1",
  name: `Room ${id}`,
  bedConfiguration: "One bed",
  features: ["Wi-Fi", "Desk"],
  mealPlan: "Room only",
  cancellationInfo: "Flexible planning terms",
  pricePerNight: totalPrice / 2,
  totalPrice,
  currency: "USD",
  pricingKind: "indicative",
  availabilityKind: "planning",
});

test("keeps native single-select radio semantics without nested buttons", () => {
  assert.match(cardSource, /type="radio"/);
  assert.match(cardSource, /name="guided-hotel-room"/);
  assert.match(cardSource, /checked=\{selected\}/);
  assert.match(cardSource, /onChange=\{onSelect\}/);
  assert.match(cardSource, /htmlFor=\{inputId\}/);
  assert.doesNotMatch(cardSource, /<button\b/);
  assert.match(clientSource, /useState\(""\)/);
  assert.match(
    clientSource,
    /onSelect=\{\(\) => setSelectedRoomId\(option\.id\)\}/,
  );
  assert.doesNotMatch(
    cardSource,
    /onGuidedSelection|guidedSelection|continueFlights|continueCars/,
  );
});

test("renders every truthful room fact and both accessible display prices", () => {
  for (const fact of [
    "option.name",
    "option.bedConfiguration",
    "option.features.map",
    "option.mealPlan",
    "option.cancellationInfo",
    "nightlyPrice.formatted",
    "nightlyPrice.title",
    "nightlyPrice.ariaLabel",
    "totalPrice.formatted",
    "totalPrice.title",
    "totalPrice.ariaLabel",
  ]) {
    assert.ok(cardSource.includes(fact), fact);
  }
  assert.match(cardSource, /selected \? selectedText : selectRoomText/);
  assert.match(cardSource, /aria-hidden="true"/);
});

test("derives the lowest estimate stably from current room totals", () => {
  assert.equal(getLowestEstimateRoomId([]), "");
  assert.equal(
    getLowestEstimateRoomId([room("higher", 300), room("lowest", 200)]),
    "lowest",
  );
  assert.equal(
    getLowestEstimateRoomId([room("first", 200), room("second", 200)]),
    "first",
  );
  assert.equal(
    translations["deals.guided.hotelDetails.lowestEstimate"],
    "Lowest estimate",
  );
});

test("does not add unsupported provider claims, room imagery, or extras", () => {
  for (const unsupported of [
    "frequently booked",
    "only 1 left",
    "only 2 left",
    "reviews",
    "sq m",
    "sleeps",
    "balcony",
    "city view",
    "non-refundable",
    "extras",
  ]) {
    assert.doesNotMatch(cardSource, new RegExp(unsupported, "i"));
  }
  assert.doesNotMatch(cardSource, /<img\b|\bImage\b|imageUrl|gallery/i);
});

test("guided cards stay scoped to guided Hotel Details and retain global confirmation", () => {
  assert.match(clientSource, /mode === "guided" \? \(/);
  assert.match(clientSource, /<GuidedHotelRoomCard/);
  assert.match(clientSource, /<HotelDetailsBookingPanel/);
  assert.match(clientSource, /onGuidedSelection\?\.\(guidedSelection\)/);
  assert.match(clientSource, /"room-options-unavailable"/);
  assert.match(clientSource, /guidedPriceState === "selection-required"/);
});
