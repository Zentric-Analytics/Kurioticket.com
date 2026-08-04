import assert from "node:assert/strict";
import test from "node:test";
import { buildStaticHotelResults } from "@/services/travel/staticHotelResults";
import { classifyHotels } from "@/lib/travel/searchContract";
import { buildDealsHotelPropertyOptions, buildDealsHotelRoomOptions, confirmDealsHotelRoom, getStagedHotelProgress } from "./dealsHotelJourney";

const hotels = () => classifyHotels(buildStaticHotelResults({ destination: "London, United Kingdom", checkIn: "2027-06-01", checkOut: "2027-06-04", guests: 2, rooms: 1 }), [], "staged-test").results;

test("eligible property options preserve Hotel API order and omit ineligible results", () => {
  const source = hotels(); const invalid = hotels()[0]; invalid.totalPrice = 0; const options = buildDealsHotelPropertyOptions([invalid, ...source]);
  assert.deepEqual(options.map(option => option.id), source.map(result => result.id));
  assert.equal(options[0].result, source[0]);
});

test("each current property produces one stable, truthful room option", () => {
  const property = buildDealsHotelPropertyOptions(hotels())[0]; const first = buildDealsHotelRoomOptions(property); const second = buildDealsHotelRoomOptions(property);
  assert.equal(first.length, 1); assert.equal(first[0].id, second[0].id);
  assert.equal(first[0].roomType, property.result.roomType); assert.equal(first[0].sourcePrice, property.result.totalPrice); assert.equal(first[0].sourceCurrency, property.result.currency);
  assert.ok(!["Standard", "Deluxe", "Suite"].includes(first[0].roomType));
});

test("room confirmation preserves exact source fields and rejects unsafe inputs", () => {
  const property = buildDealsHotelPropertyOptions(hotels())[0]; const room = buildDealsHotelRoomOptions(property)[0];
  const confirmed = confirmDealsHotelRoom(room, { hotelCheckIn: "2027-06-01", hotelCheckOut: "2027-06-04" }, 123);
  assert.deepEqual(confirmed && { id: confirmed.id, roomType: confirmed.roomType, sourcePrice: confirmed.sourcePrice, sourceCurrency: confirmed.sourceCurrency, resultReceivedAt: confirmed.resultReceivedAt, detailsPath: confirmed.detailsPath }, { id: property.result.id, roomType: property.result.roomType, sourcePrice: property.result.totalPrice, sourceCurrency: property.result.currency, resultReceivedAt: 123, detailsPath: property.result.searchPolicy.action.kind === "internal-detail" ? property.result.searchPolicy.action.href : undefined });
  assert.equal(confirmDealsHotelRoom(room, { hotelCheckIn: "2027-06-01", hotelCheckOut: "2027-06-04" }), null);
  const price = property.result.totalPrice; property.result.totalPrice = 0; assert.equal(buildDealsHotelRoomOptions(property).length, 0); property.result.totalPrice = price;
  const action = property.result.searchPolicy.action; property.result.searchPolicy.action = { kind: "internal-detail", enabled: true, href: "https://evil.test/hotels/details/x" }; assert.equal(buildDealsHotelRoomOptions(property).length, 0); property.result.searchPolicy.action = action;
});

test("staged progress covers property, room, and truthful next product states", () => {
  assert.equal(getStagedHotelProgress("hotel-flight", "choose-property").steps[0].substate, "choose-property");
  assert.equal(getStagedHotelProgress("hotel-car", "choose-room").steps[0].substate, "choose-room");
  for (const [mode, next] of [["hotel-flight", "flight"], ["hotel-car", "car"], ["hotel-flight-car", "flight"]] as const) {
    const progress = getStagedHotelProgress(mode, "complete"); assert.equal(progress.steps[0].status, "completed"); assert.equal(progress.steps.find(step => step.status === "current")?.id, next); assert.equal(progress.steps.at(-1)?.status, "upcoming");
  }
});
