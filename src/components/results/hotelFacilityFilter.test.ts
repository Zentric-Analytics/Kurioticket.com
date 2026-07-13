import assert from "node:assert/strict";
import test from "node:test";

import type { PublicHotelResult } from "@/lib/types";

import {
  buildHotelFacilityFilterOptions,
  hotelMatchesFacilityFilters,
} from "./hotelFacilityFilter";

const t = (key: string) =>
  ({
    "hotelResults.filter.freeWifi": "Free Wi-Fi",
    "hotelResults.filter.parking": "Parking",
    "hotelResults.filter.pool": "Pool",
    "hotelResults.filter.spa": "Spa",
    "hotelResults.filter.airportShuttle": "Airport shuttle",
    "hotelResults.filter.fitnessCenter": "Fitness center",
    "hotelResults.filter.workspace": "Workspace",
    "hotelResults.filter.quietRooms": "Quiet rooms",
    "hotelResults.filter.frontDesk24": "24-hour front desk",
    "hotelResults.filter.lateCheckIn": "Late check-in",
  })[key] ?? key;

function hotel(id: string, amenities: string[]): PublicHotelResult {
  return {
    id,
    provider: "test",
    name: `Hotel ${id}`,
    rating: 4,
    location: "Test City",
    pricePerNight: 100,
    totalPrice: 100,
    currency: "USD",
    amenities,
    roomType: "Standard room",
    cancellationInfo: "Policy shown",
    bookingUrl: "https://example.com/book",
    partnerRedirectUrl: "https://example.com/partner",
    valueScore: 80,
    travelConfidenceScore: 80,
    arrivalSuitabilityScore: 80,
    recommendationReasons: [],
    badges: [],
  };
}

test("every legitimate amenity becomes an option, including universal facilities", () => {
  const options = buildHotelFacilityFilterOptions(
    [
      hotel("one", ["Wi-Fi", "Pool", "Pet grooming"]),
      hotel("two", ["Free Wi-Fi", "Spa"]),
    ],
    t,
  );

  assert.deepEqual(
    options.map((option) => option.value),
    ["wifi", "generic-pet grooming", "pool", "spa"],
  );
  assert.equal(options.find((option) => option.value === "wifi")?.count, 2);
});

test("known aliases collapse into one option", () => {
  const options = buildHotelFacilityFilterOptions(
    [
      hotel("one", ["Gym", "Fitness room", "Fitness center"]),
      hotel("two", ["Spa", "Wellness"]),
      hotel("three", ["Airport shuttle", "Airport transfer"]),
      hotel("four", ["Workspace", "Desk"]),
      hotel("five", ["Front desk", "24-hour desk", "Concierge desk"]),
      hotel("six", ["River-view lounge", "Waterfront lounge", "Lounge"]),
    ],
    t,
  );

  assert.equal(options.filter((option) => option.value === "fitness").length, 1);
  assert.equal(options.filter((option) => option.value === "spa").length, 1);
  assert.equal(
    options.filter((option) => option.value === "airportShuttle").length,
    1,
  );
  assert.equal(options.filter((option) => option.value === "workspace").length, 1);
  assert.equal(options.filter((option) => option.value === "frontDesk").length, 1);
  assert.equal(options.filter((option) => option.value === "lounge").length, 1);
});

test("a hotel contributes only once to a facility count", () => {
  const options = buildHotelFacilityFilterOptions(
    [hotel("one", ["Wi-Fi", "Free Wi-Fi", "Wireless internet"])],
    t,
  );

  assert.equal(options.find((option) => option.value === "wifi")?.count, 1);
});

test("generic legitimate facilities are included", () => {
  const options = buildHotelFacilityFilterOptions(
    [hotel("one", ["Rooftop yoga"]), hotel("two", ["Rooftop yoga"])],
    t,
  );

  assert.deepEqual(options, [
    { value: "generic-rooftop yoga", label: "Rooftop yoga", count: 2 },
  ]);
});

test("invalid facility-like text is excluded through amenity presentation rules", () => {
  const options = buildHotelFacilityFilterOptions(
    [
      hotel("one", [
        "Free cancellation",
        "Pay at property",
        "Room only",
        "Airport corridor",
        "Provider placeholder",
        "Verified partner inventory",
      ]),
    ],
    t,
  );

  assert.deepEqual(options, []);
});

test("options sort by count, then label", () => {
  const options = buildHotelFacilityFilterOptions(
    [
      hotel("one", ["Pool", "Spa", "Breakfast", "Parking"]),
      hotel("two", ["Pool", "Spa", "Parking"]),
      hotel("three", ["Pool"]),
    ],
    t,
  );

  assert.deepEqual(
    options.map((option) => option.value),
    ["pool", "parking", "spa", "breakfast"],
  );
  assert.deepEqual(
    options.map((option) => option.count),
    [3, 2, 2, 1],
  );
});

test("empty selection matches every hotel", () => {
  assert.equal(hotelMatchesFacilityFilters(hotel("one", []), []), true);
});

test("one selected facility matches correctly", () => {
  assert.equal(
    hotelMatchesFacilityFilters(hotel("one", ["Fitness center"]), ["fitness"]),
    true,
  );
  assert.equal(
    hotelMatchesFacilityFilters(hotel("two", ["Pool"]), ["fitness"]),
    false,
  );
});

test("several selected facilities use OR behavior", () => {
  assert.equal(
    hotelMatchesFacilityFilters(hotel("one", ["Pool"]), ["fitness", "pool"]),
    true,
  );
});

test("options and matching use identical canonical values", () => {
  const subject = hotel("one", ["Airport transfer", "Rooftop yoga"]);
  const options = buildHotelFacilityFilterOptions([subject], t);

  options.forEach((option) => {
    assert.equal(hotelMatchesFacilityFilters(subject, [option.value]), true);
  });
});

test("inputs are not mutated", () => {
  const hotels = [hotel("one", ["Wi-Fi", "Pool"]), hotel("two", ["Spa"])] as const;
  const snapshot = JSON.stringify(hotels);
  const selectedValues = ["wifi"];
  const selectedSnapshot = JSON.stringify(selectedValues);

  buildHotelFacilityFilterOptions([...hotels], t);
  hotelMatchesFacilityFilters(hotels[0], selectedValues);

  assert.equal(JSON.stringify(hotels), snapshot);
  assert.equal(JSON.stringify(selectedValues), selectedSnapshot);
});
