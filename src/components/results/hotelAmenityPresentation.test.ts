import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHotelAmenityPresentation,
  type HotelAmenityIconKey,
} from "./hotelAmenityPresentation";

const supportedIconKeys = new Set<HotelAmenityIconKey>([
  "wifi",
  "breakfast",
  "pool",
  "spa",
  "airportShuttle",
  "parking",
  "fitness",
  "workspace",
  "quietRooms",
  "frontDesk",
  "lateCheckIn",
  "kitchenette",
  "bikeStorage",
  "courtyard",
  "lounge",
  "restaurant",
  "airConditioning",
  "generic",
]);

test("invalid/non-array input returns []", () => {
  assert.deepEqual(buildHotelAmenityPresentation("Wi-Fi" as never), []);
});

test("non-string values are ignored", () => {
  assert.deepEqual(buildHotelAmenityPresentation([null, 42, "Pool"]), [
    {
      key: "pool-pool",
      label: "Pool",
      iconKey: "pool",
      translationKey: "hotelResults.filter.pool",
    },
  ]);
});

test("whitespace is normalized", () => {
  assert.equal(
    buildHotelAmenityPresentation(["  Late   check-in  "])[0]?.label,
    "Late check-in",
  );
});

test("input is not mutated", () => {
  const input = ["Wi-Fi", "Pool"];
  const copy = [...input];
  buildHotelAmenityPresentation(input);
  assert.deepEqual(input, copy);
});

test("Free Wi-Fi maps to wifi", () => {
  assert.equal(
    buildHotelAmenityPresentation(["Free Wi-Fi"])[0]?.iconKey,
    "wifi",
  );
});

test("Wi-Fi remains Wi-Fi", () => {
  assert.equal(buildHotelAmenityPresentation(["Wi-Fi"])[0]?.label, "Wi-Fi");
});

test("Breakfast included maps to breakfast", () => {
  assert.equal(
    buildHotelAmenityPresentation(["Breakfast included"])[0]?.iconKey,
    "breakfast",
  );
});

test("Breakfast available remains Breakfast available", () => {
  const item = buildHotelAmenityPresentation(["Breakfast available"])[0];
  assert.equal(item?.iconKey, "breakfast");
  assert.equal(item?.label, "Breakfast available");
});

test("Pool maps to pool", () =>
  assert.equal(buildHotelAmenityPresentation(["Pool"])[0]?.iconKey, "pool"));
test("Spa maps to spa", () =>
  assert.equal(buildHotelAmenityPresentation(["Spa"])[0]?.iconKey, "spa"));
test("Airport shuttle maps to airportShuttle", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Airport shuttle"])[0]?.iconKey,
    "airportShuttle",
  ));
test("Airport corridor is excluded", () =>
  assert.deepEqual(buildHotelAmenityPresentation(["Airport corridor"]), []));
test("Parking maps to parking", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Parking"])[0]?.iconKey,
    "parking",
  ));
test("Fitness room maps to fitness", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Fitness room"])[0]?.iconKey,
    "fitness",
  ));
test("Workspace maps to workspace", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Workspace"])[0]?.iconKey,
    "workspace",
  ));
test("Quiet rooms maps to quietRooms", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Quiet rooms"])[0]?.iconKey,
    "quietRooms",
  ));
test("24-hour desk maps to frontDesk", () =>
  assert.equal(
    buildHotelAmenityPresentation(["24-hour desk"])[0]?.iconKey,
    "frontDesk",
  ));
test("Late check-in maps to lateCheckIn", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Late check-in"])[0]?.iconKey,
    "lateCheckIn",
  ));
test("Kitchenette maps to kitchenette", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Kitchenette"])[0]?.iconKey,
    "kitchenette",
  ));
test("Bike storage maps to bikeStorage", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Bike storage"])[0]?.iconKey,
    "bikeStorage",
  ));
test("Courtyard maps to courtyard", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Courtyard"])[0]?.iconKey,
    "courtyard",
  ));
test("Waterfront is excluded", () =>
  assert.deepEqual(buildHotelAmenityPresentation(["Waterfront"]), []));
test("Waterfront lounge maps to lounge", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Waterfront lounge"])[0]?.iconKey,
    "lounge",
  ));
test("Unknown amenity uses generic", () =>
  assert.equal(
    buildHotelAmenityPresentation(["Pet grooming"])[0]?.iconKey,
    "generic",
  ));

test("cancellation/payment text is excluded", () => {
  assert.deepEqual(
    buildHotelAmenityPresentation([
      "Free cancellation",
      "Pay at property",
      "No prepayment",
    ]),
    [],
  );
});

test("meal-plan text is excluded", () => {
  assert.deepEqual(
    buildHotelAmenityPresentation([
      "Room only",
      "Half board",
      "Full board",
      "All-inclusive",
    ]),
    [],
  );
});

test("semantic duplicates collapse", () => {
  assert.deepEqual(
    buildHotelAmenityPresentation(["Wi-Fi", "Free Wi-Fi"]).map(
      (item) => item.label,
    ),
    ["Wi-Fi"],
  );
});

test("priority ordering is correct", () => {
  assert.deepEqual(
    buildHotelAmenityPresentation(
      ["Pet grooming", "Parking", "Breakfast available", "Wi-Fi"],
      8,
    ).map((item) => item.iconKey),
    ["wifi", "breakfast", "parking", "generic"],
  );
});

test("default limit is four", () => {
  assert.equal(
    buildHotelAmenityPresentation([
      "Wi-Fi",
      "Breakfast",
      "Pool",
      "Spa",
      "Parking",
    ]).length,
    4,
  );
});

test("limit eight works", () => {
  assert.equal(
    buildHotelAmenityPresentation(
      [
        "Wi-Fi",
        "Breakfast",
        "Pool",
        "Spa",
        "Parking",
        "Gym",
        "Desk",
        "Restaurant",
        "Garden",
      ],
      8,
    ).length,
    8,
  );
});

test("zero and negative limits return []", () => {
  assert.deepEqual(buildHotelAmenityPresentation(["Wi-Fi"], 0), []);
  assert.deepEqual(buildHotelAmenityPresentation(["Wi-Fi"], -1), []);
});

test("fractional limits are floored", () => {
  assert.equal(
    buildHotelAmenityPresentation(["Wi-Fi", "Breakfast", "Pool"], 2.9).length,
    2,
  );
});

test("every output has a label, key and supported iconKey", () => {
  const items = buildHotelAmenityPresentation(
    ["Wi-Fi", "Breakfast", "Pool", "Pet grooming"],
    8,
  );
  assert.ok(items.length > 0);
  for (const item of items) {
    assert.ok(item.label);
    assert.ok(item.key);
    assert.ok(supportedIconKeys.has(item.iconKey));
  }
});
