import assert from "node:assert/strict";
import test from "node:test";
import { addCalendarDays, changeGuests, changeRooms, countLabel, defaultHotelDates, hotelSearchParams, initializeHotelForm, localDateFromIso, localIsoDate, validateHotelForm } from "./hotelSearchModel";

const now = new Date(2028, 0, 10, 23, 30);
test("empty and Explore route parameters initialize safely", () => {
  assert.deepEqual(initializeHotelForm({}, now).form, { destination: "", checkIn: "2028-01-24", checkOut: "2028-01-27", guests: 2, rooms: 1 });
  assert.equal(initializeHotelForm({ destination: ["Paris", "Bali"] }, now).form.destination, "Paris");
});
test("valid route state restores every field", () => assert.deepEqual(initializeHotelForm({ destination: "Paris", checkIn: "2028-02-01", checkOut: "2028-02-05", guests: "3", rooms: "2" }, now).form, { destination: "Paris", checkIn: "2028-02-01", checkOut: "2028-02-05", guests: 3, rooms: 2 }));
test("invalid incoming dates and counts use defaults without crashing", () => {
  const result = initializeHotelForm({ checkIn: "bad", checkOut: "2020-01-01", guests: "0", rooms: "10" }, now);
  assert.equal(result.form.guests, 2); assert.equal(result.form.rooms, 1); assert.ok(result.notice);
});
test("local calendar helpers handle month, year and leap boundaries", () => {
  assert.equal(addCalendarDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCalendarDays("2027-12-31", 1), "2028-01-01");
  assert.equal(localIsoDate(new Date(2028, 0, 10, 1)), "2028-01-10");
  assert.equal(localDateFromIso("2028-02-30"), undefined);
  assert.deepEqual(defaultHotelDates(now), { checkIn: "2028-01-24", checkOut: "2028-01-27" });
});
test("validation covers destination, date, guest and room contract", () => {
  const valid = { destination: " Paris ", checkIn: "2028-01-10", checkOut: "2028-01-11", guests: 3, rooms: 2 };
  assert.deepEqual(validateHotelForm(valid, now), {});
  assert.ok(validateHotelForm({ ...valid, destination: "  " }, now).destination);
  assert.ok(validateHotelForm({ ...valid, checkIn: "2028-01-09" }, now).checkIn);
  assert.ok(validateHotelForm({ ...valid, checkOut: "2028-01-10" }, now).checkOut);
  assert.ok(validateHotelForm({ ...valid, guests: 21 }, now).guests);
  assert.ok(validateHotelForm({ ...valid, rooms: 0 }, now).rooms);
  assert.ok(validateHotelForm({ ...valid, guests: 1, rooms: 2 }, now).rooms);
});
test("guest and room counters clamp and retain their invariant", () => {
  const form = { destination: "Paris", checkIn: "2028-02-01", checkOut: "2028-02-02", guests: 3, rooms: 3 };
  assert.deepEqual(changeGuests(form, -20), { ...form, guests: 1, rooms: 1 });
  assert.equal(changeGuests({ ...form, guests: 20 }, 50).guests, 20);
  assert.equal(changeRooms(form, 50).rooms, 3);
  assert.equal(changeRooms({ ...form, rooms: 1 }, -50).rooms, 1);
});
test("labels pluralize and navigation serializes all current values", () => {
  assert.equal(countLabel(1, "room"), "1 room"); assert.equal(countLabel(2, "guest"), "2 guests");
  assert.deepEqual(hotelSearchParams({ destination: " Paris ", checkIn: "2028-02-01", checkOut: "2028-02-02", guests: 3, rooms: 2 }), { destination: "Paris", checkIn: "2028-02-01", checkOut: "2028-02-02", guests: "3", rooms: "2" });
});
