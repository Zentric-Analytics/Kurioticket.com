import assert from "node:assert/strict";
import test from "node:test";
import { rememberHotels, getHotelFromCache, getHotelDetailsCacheContext } from "../searchCache";
import type { NormalizedHotelResult } from "../types";

test("shared hotel snapshot isolates input and reader mutations", () => {
  const search = { destination: "Test city", checkIn: "2099-01-01", checkOut: "2099-01-02", guests: 1, rooms: 1 };
  const hotel = { id: "snapshot-isolation", name: "Original", provider: "test", amenities: ["Pool"] } as NormalizedHotelResult;
  rememberHotels([hotel], search);
  hotel.name = "Input mutation";
  hotel.amenities.push("Input mutation");
  const first = getHotelFromCache(hotel.id)!;
  assert.equal(first.name, "Original");
  assert.deepEqual(first.amenities, ["Pool"]);
  first.name = "Reader mutation";
  first.amenities.push("Reader mutation");
  assert.equal(getHotelFromCache(hotel.id)!.name, "Original");
  const context = getHotelDetailsCacheContext(hotel.id, search)!;
  assert.equal(context.hotel.name, "Original");
  assert.deepEqual(context.hotel.amenities, ["Pool"]);
  context.hotel.name = "Details mutation";
  assert.equal(getHotelDetailsCacheContext(hotel.id, search)!.hotel.name, "Original");
});
