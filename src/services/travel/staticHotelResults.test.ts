import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelGalleryCandidates } from "@/components/results/hotelGalleryPresentation";
import {
  buildStaticHotelResults,
  buildStaticHotelRoomOptions,
  calculateHotelStayNights,
  getStaticHotelById,
  searchStaticHotelCatalogue,
} from "./staticHotelResults";
import {
  staticHotelCatalogue,
  supportedStaticHotelDestinations,
} from "./staticHotelCatalogue";

const search = {
  destination: "London",
  checkIn: "2027-06-01",
  checkOut: "2027-06-04",
  guests: 3,
  rooms: 2,
} as const;

test("static hotel catalogue is authoritative and destination relevant", () => {
  assert.equal(staticHotelCatalogue.length, 8);
  assert.deepEqual(
    [...supportedStaticHotelDestinations],
    ["London", "Paris", "New York", "Tokyo"],
  );
  assert.ok(
    searchStaticHotelCatalogue("LON").every((hotel) => hotel.city === "London"),
  );
  assert.deepEqual(searchStaticHotelCatalogue("Atlantis"), []);
  assert.deepEqual(searchStaticHotelCatalogue("Lagos, Nigeria"), []);
});

test("decorated supported destinations resolve only to their catalogue city", () => {
  for (const [destination, city] of [
    ["London, United Kingdom", "London"],
    ["Paris, France", "Paris"],
    ["New York, NY", "New York"],
    ["New York, United States", "New York"],
    ["Tokyo, Japan", "Tokyo"],
    ["LON", "London"],
  ]) {
    const results = searchStaticHotelCatalogue(destination);
    assert.ok(results.length > 0, destination);
    assert.ok(
      results.every((hotel) => hotel.city === city),
      destination,
    );
  }
});

test("static hotel results are deterministic planning estimates", () => {
  const first = buildStaticHotelResults(search),
    second = buildStaticHotelResults(search);
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
  const firstHotel = first[0];
  assert.ok(firstHotel?.pricePerNight);
  assert.equal(calculateHotelStayNights(search.checkIn, search.checkOut), 3);
  assert.equal(firstHotel.totalPrice, firstHotel.pricePerNight * 3 * 2);
  assert.equal(firstHotel.provider, "Kurioticket static catalogue");
  assert.equal(firstHotel.bookingUrl, "");
  assert.equal(firstHotel.partnerRedirectUrl, "");
});

test("every static hotel supplies a distinct ten-image gallery with its approved lead image", () => {
  for (const hotel of staticHotelCatalogue) {
    assert.equal(hotel.imageUrls.length, 10, hotel.id);
    assert.equal(new Set(hotel.imageUrls).size, 10, hotel.id);
    assert.equal(hotel.imageUrls[0], hotel.imageUrl, hotel.id);
  }

  for (const result of buildStaticHotelResults(search)) {
    assert.equal(result.imageUrls?.length, 10, result.id);
    assert.equal(result.imageUrls?.[0], result.imageUrl, result.id);
    assert.equal(
      buildHotelGalleryCandidates(result.imageUrls, result.imageUrl).length,
      10,
      result.id,
    );
  }
});

test("every static property has safe, stable multi-room planning options with room-count pricing", () => {
  for (const hotel of staticHotelCatalogue) {
    assert.ok(hotel.roomOptions.length >= 2);
    assert.equal(
      new Set(hotel.roomOptions.map((option) => option.id)).size,
      hotel.roomOptions.length,
    );
    const oneRoom = buildStaticHotelRoomOptions(hotel, { ...search, rooms: 1 });
    const twoRooms = buildStaticHotelRoomOptions(hotel, search);
    assert.deepEqual(twoRooms, buildStaticHotelRoomOptions(hotel, search));
    for (const [index, option] of twoRooms.entries()) {
      assert.ok(option.name.trim() && option.bedConfiguration.trim());
      assert.ok(option.pricePerNight > 0);
      assert.equal(option.currency, "USD");
      assert.equal(option.pricingKind, "indicative");
      assert.equal(option.availabilityKind, "planning");
      assert.equal(option.totalPrice, option.pricePerNight * 3 * 2);
      assert.equal(option.totalPrice, oneRoom[index]!.totalPrice * 2);
      assert.doesNotMatch(
        JSON.stringify(option),
        /secret|supplier|rateKey|rawProvider/i,
      );
      assert.equal(option.bedConfiguration, hotel.bedSummary);
    }
  }
});

test("planning room facts are owned by their property and never invent generic beds", () => {
  const roomFacts = staticHotelCatalogue.flatMap((hotel) =>
    hotel.roomOptions.map((option) => ({ hotel, option })),
  );
  assert.ok(
    roomFacts.every(
      ({ hotel, option }) => option.bedConfiguration === hotel.bedSummary,
    ),
  );
  assert.ok(
    roomFacts.every(({ hotel, option }) =>
      option.name.startsWith(hotel.roomSummary),
    ),
  );
  for (const unsupportedClaim of [
    "One king bed",
    "One queen bed or two single beds",
    "Additional room space",
    "Seating area",
  ]) {
    assert.doesNotMatch(
      JSON.stringify(roomFacts),
      new RegExp(unsupportedClaim, "i"),
    );
  }
});

test("details resolve from the same catalogue", () => {
  const selected = staticHotelCatalogue[0];
  assert.equal(getStaticHotelById(selected.id), selected);
  assert.equal(getStaticHotelById("unknown-hotel"), null);
});
