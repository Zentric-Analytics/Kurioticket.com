import assert from "node:assert/strict";
import test from "node:test";
import {
  getRoomAndStayValues,
  normalizeHotelDetailsSectionValues,
} from "./hotelDetailsSectionsPresentation";

test("trims, filters, and deduplicates values while preserving first-seen order", () => {
  const input = ["  Breakfast included  ", "", "BREAKFAST INCLUDED", " Taxes included "];
  const snapshot = [...input];

  assert.deepEqual(normalizeHotelDetailsSectionValues(input), [
    "Breakfast included",
    "Taxes included",
  ]);
  assert.deepEqual(input, snapshot);
});

test("keeps distinct room and meal-plan values", () => {
  assert.deepEqual(getRoomAndStayValues(" Deluxe room ", " Breakfast included "), [
    "Deluxe room",
    "Breakfast included",
  ]);
});

test("suppresses a meal plan already contained in the room description", () => {
  assert.deepEqual(getRoomAndStayValues("Deluxe room with BREAKFAST included", "breakfast included"), [
    "Deluxe room with BREAKFAST included",
  ]);
});

test("safely handles missing room and stay values", () => {
  assert.deepEqual(getRoomAndStayValues(undefined, null), []);
  assert.deepEqual(normalizeHotelDetailsSectionValues([]), []);
});
