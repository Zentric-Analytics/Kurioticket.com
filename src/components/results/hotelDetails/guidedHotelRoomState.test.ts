import assert from "node:assert/strict";
import test from "node:test";
import type { HotelRoomOption } from "@/lib/hotels/hotelRoomOptions";
import {
  findGuidedHotelRoom,
  getGuidedHotelRoomState,
  getHotelDetailsTaxesAndFeesIncluded,
} from "./guidedHotelRoomState";

const room = (
  id: string,
  overrides: Partial<HotelRoomOption> = {},
): HotelRoomOption => ({
  id,
  hotelId: "hotel-a",
  name: `A deliberately long planning room name ${id}`,
  bedConfiguration:
    "Bed configuration varies by room and remains a deliberately long truthful summary",
  features: ["Wi-Fi"],
  mealPlan: "Room only",
  cancellationInfo: "Final terms are not yet confirmed.",
  pricePerNight: id === "room-a" ? 200 : 275,
  totalPrice: id === "room-a" ? 1_200 : 1_650,
  currency: "USD",
  pricingKind: "indicative",
  availabilityKind: "planning",
  ...overrides,
});

test("guided room state distinguishes required, unavailable, and selected", () => {
  const options = [room("room-a"), room("room-b")];
  assert.equal(findGuidedHotelRoom(options, ""), null);
  assert.equal(getGuidedHotelRoomState(options, null), "selection-required");
  assert.equal(getGuidedHotelRoomState([], null), "room-options-unavailable");
  assert.equal(getGuidedHotelRoomState(options, options[0]!), "selected-room");
});

test("radio-style selection changes only identity and preserves exact room semantics", () => {
  const options = [room("room-a"), room("room-b")];
  const selectedA = findGuidedHotelRoom(options, "room-a");
  assert.equal(selectedA, options[0]);
  assert.equal(selectedA?.pricePerNight, 200);
  assert.equal(selectedA?.totalPrice, 1_200);

  const selectedB = findGuidedHotelRoom(options, "room-b");
  assert.equal(selectedB, options[1]);
  assert.notEqual(selectedB, selectedA);
  assert.equal(selectedB?.pricePerNight, 275);
  assert.equal(selectedB?.totalPrice, 1_650);
  assert.match(selectedB!.name, /deliberately long/);
  assert.match(selectedB!.bedConfiguration, /deliberately long/);
});

test("guided taxes belong only to the selected room while standalone keeps hotel taxes", () => {
  assert.equal(
    getHotelDetailsTaxesAndFeesIncluded("guided", true, null),
    undefined,
  );
  assert.equal(
    getHotelDetailsTaxesAndFeesIncluded(
      "guided",
      false,
      room("a", { taxesAndFeesIncluded: true }),
    ),
    true,
  );
  assert.equal(
    getHotelDetailsTaxesAndFeesIncluded(
      "guided",
      true,
      room("b", { taxesAndFeesIncluded: false }),
    ),
    false,
  );
  assert.equal(
    getHotelDetailsTaxesAndFeesIncluded("guided", true, room("c")),
    undefined,
  );
  assert.equal(
    getHotelDetailsTaxesAndFeesIncluded(
      "standalone",
      false,
      room("a", { taxesAndFeesIncluded: true }),
    ),
    false,
  );
});
