import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildHotelRoomFilterOptions, hotelMatchesRoomFilter, hotelRoomFilterText, hotelShortcutAvailability } from "./hotelFilterAvailability";
import { kayakHotelCardModel } from "./kayakCardModels";
import type { PublicHotelResult } from "@/lib/types";
import { groupHotelOffers } from "@/lib/hotels/groupHotelOffers";
import { countHotelsByStarRating } from "./hotelStarRatingFilter";
import { buildHotelFacilityFilterOptions } from "./hotelFacilityFilter";
import { normalizeSandboxOffers } from "@/services/travel/kayakSandbox";

test("filter counts count properties while retaining alternate rates and provider boundaries", () => {
  const rows = [
    { id: "a1", provider: "A", propertyGroupId: "one", roomType: "Suite", amenities: ["Pool"], classificationStars: 5 },
    { id: "a2", provider: "A", propertyGroupId: "one", roomType: "Suite", amenities: ["Pool"], classificationStars: 5 },
    { id: "a3", provider: "A", propertyGroupId: "one", roomType: "King", amenities: ["Wi-Fi"], classificationStars: 5 },
    { id: "b1", provider: "B", propertyGroupId: "one", roomType: "Suite", amenities: ["Pool"], classificationStars: 5 },
  ] as PublicHotelResult[];
  const snapshot = JSON.stringify(rows);
  assert.equal(countHotelsByStarRating(rows)[5], 2);
  assert.equal(countHotelsByStarRating(rows)[0], 2);
  assert.equal(buildHotelFacilityFilterOptions(rows, key => key).find(option => option.value === "pool")?.count, 2);
  for (const option of buildHotelRoomFilterOptions(rows)) {
    assert.equal(option.count, groupHotelOffers(rows.filter(row => hotelMatchesRoomFilter(row, [option.value]))).length);
  }
  assert.equal(groupHotelOffers(rows)[0].length, 3);
  assert.equal(JSON.stringify(rows), snapshot);
});

test("hotel address comes from its own provider result without search-city substitution", () => {
  const offers = normalizeSandboxOffers("hotels", { currency: "USD", priceMode: "total", results: [
    { id: "first", name: "First hotel", address: "Provider address A", rates: [{ roomName: "Suite", totalRate: 100, bookUri: "https://affiliates.kayak.com/sandbox-clickout" }] },
    { id: "second", name: "Second hotel", address: "Provider address B", rates: [{ roomName: "King", totalRate: 120, bookUri: "https://affiliates.kayak.com/sandbox-clickout" }] },
  ] });
  assert.equal(offers.length, 2);
  assert.equal(kayakHotelCardModel(offers[0], 1).location, "Provider address A");
  assert.equal(kayakHotelCardModel(offers[1], 1).location, "Provider address B");
});

test("provider room names reach filters without a catalogue profile", () => {
  const hotel = kayakHotelCardModel({ id: "room-filter", title: "Hotel", description: "Deluxe double room", details: [], price: 120, currency: "USD", priceBasis: "total", testUrl: "https://affiliates.kayak.com/sandbox-clickout" }, 2);
  assert.equal(hotel.catalogueProfile, undefined);
  assert.equal(hotelRoomFilterText(hotel), "Deluxe double room");
  assert.equal(hotelRoomFilterText({ roomType: "" }), "");
});

test("compact filters retain all categories with truthful availability, including one room option", () => {
  assert.deepEqual(hotelShortcutAvailability({ hasPricedResults: false, starCount: 0, facilityCount: 0, roomTypeCount: 0 }), { price: false, stars: false, amenities: false, roomTypes: false });
  assert.deepEqual(hotelShortcutAvailability({ hasPricedResults: true, starCount: 1, facilityCount: 1, roomTypeCount: 1 }), { price: true, stars: true, amenities: true, roomTypes: true });
});

test("room option construction and filtering share the provider field and compact controls never disappear", () => {
  const source = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");
  assert.match(source, /roomTypes: buildHotelRoomFilterOptions\(hotels\)/);
  assert.match(source, /hotelMatchesRoomFilter\(hotel, selectedFilters.roomTypes\)/);
  assert.doesNotMatch(source, /options.roomTypes.length > 1/);
  assert.match(source, /\{trigger\("price", mobilePriceShortcutLabel, priceFilterActive\)\}/);
  assert.match(source, /\{trigger\("roomTypes", mobileRoomTypesShortcutLabel, selectedFilters.roomTypes.length > 0\)\}/);
  assert.match(source, /aria-disabled=\{!availability\[menu\] && !active\}/);
  assert.match(source, /const option = roomOptions.find\(\(item\) => item.value === value\)/);
  assert.doesNotMatch(source, /ROOM_TYPE_FILTERS/);
});

test("selecting a supplied room name matches its displayed count rather than a broader taxonomy", () => {
  const hotels = ["Suite", "Penthouse Suite", "和室", ""].map(roomType => ({ roomType }) as PublicHotelResult);
  for (const option of buildHotelRoomFilterOptions(hotels)) {
    assert.equal(hotels.filter(hotel => hotelMatchesRoomFilter(hotel, [option.value])).length, option.count);
  }
  assert.equal(hotelMatchesRoomFilter(hotels[1], ["suite"]), false);
  assert.equal(hotelMatchesRoomFilter(hotels[2], ["和室"]), true);
  assert.equal(hotelMatchesRoomFilter(hotels[3], []), true);
});

test("supplied room names outside the static taxonomy remain available with accurate counts", () => {
  const hotels = ["Ocean View King", "Ocean View King", "和室", ""].map(roomType => ({ roomType }) as PublicHotelResult);
  assert.deepEqual(buildHotelRoomFilterOptions(hotels), [
    { value: "ocean view king", label: "Ocean View King", count: 2 },
    { value: "和室", label: "和室", count: 1 },
  ]);
});
