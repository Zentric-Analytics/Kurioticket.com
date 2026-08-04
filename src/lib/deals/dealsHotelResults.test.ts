import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { buildDealsHotelResultsSearchInput } from "./dealsHotelResults";

test("guided Hotel search maps canonical stay values exactly", () => {
  const search = { ...createDefaultDealsSearch(), hotelDestination: "Tokyo", hotelCheckIn: "2099-04-02", hotelCheckOut: "2099-04-09", hotelAdults: 2, hotelChildren: 3, hotelRooms: 2 };
  assert.deepEqual(buildDealsHotelResultsSearchInput(search), { destination: "Tokyo", checkIn: "2099-04-02", checkOut: "2099-04-09", guests: 5, rooms: 2 });
});
