import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelGalleryCandidates } from "@/components/results/hotelGalleryPresentation";
import {
  buildStaticHotelResults,
  buildStaticHotelRoomOptions,
  buildRelatedStaticHotelResults,
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
  assert.equal(staticHotelCatalogue.length, 12);
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

test("Park Plaza Westminster Bridge retains its verified central-London location", () => {
  const hotel = getStaticHotelById("park-plaza-westminster-bridge");
  assert.ok(hotel);
  assert.equal(hotel.name, "Park Plaza Westminster Bridge London");
  assert.equal(hotel.latitude, 51.501);
  assert.equal(hotel.longitude, -0.1167);
  assert.match(hotel.location, /200 Westminster Bridge Rd/i);
  assert.match(hotel.location, /SE1 7UT/i);
});

test("related hotels are same-city, deterministic, capped, and preserve stay pricing", () => {
  const parkPlaza = getStaticHotelById("park-plaza-westminster-bridge");
  assert.ok(parkPlaza);
  const related = buildRelatedStaticHotelResults(parkPlaza, search);
  assert.equal(related.length, 5);
  assert.equal(new Set(related.map((hotel) => hotel.id)).size, 5);
  assert.equal(new Set(related.map((hotel) => hotel.name)).size, 5);
  assert.ok(related.every((hotel) => hotel.id !== parkPlaza.id));
  assert.ok(related.every((hotel) => hotel.location.startsWith("London")));
  const firstRelated = related[0];
  assert.ok(firstRelated?.pricePerNight);
  assert.equal(firstRelated.totalPrice, firstRelated.pricePerNight * 3 * 2);
  assert.deepEqual(related, buildRelatedStaticHotelResults(parkPlaza, search));
});

test("every London property has exactly five unique same-city alternatives", () => {
  const londonHotels = searchStaticHotelCatalogue("London");
  assert.ok(londonHotels.length >= 6);

  for (const current of londonHotels) {
    const related = buildRelatedStaticHotelResults(current, search);
    assert.equal(related.length, 5, current.id);
    assert.equal(new Set(related.map((hotel) => hotel.id)).size, 5, current.id);
    assert.equal(
      new Set(related.map((hotel) => hotel.name)).size,
      5,
      current.id,
    );
    assert.ok(related.every((hotel) => hotel.id !== current.id), current.id);
    assert.ok(
      related.every((hotel) => hotel.location.startsWith("London")),
      current.id,
    );
    assert.ok(
      related.every(
        (hotel) =>
          typeof hotel.pricePerNight === "number" &&
          hotel.totalPrice === hotel.pricePerNight * 3 * 2,
      ),
      current.id,
    );
  }
});

test("new London records retain verified identity and location facts", () => {
  const expected = [
    ["park-plaza-county-hall-london", /1 Addington St.*SE1 7RY/i],
    ["citizenm-tower-of-london", /40 Trinity Square.*EC3N 4DJ/i],
    ["the-clermont-london-charing-cross", /Strand.*WC2N 5HX/i],
    ["sea-containers-london", /20 Upper Ground.*SE1 9PD/i],
  ] as const;
  for (const [id, address] of expected) {
    const hotel = getStaticHotelById(id);
    assert.ok(hotel, id);
    assert.equal(hotel.city, "London");
    assert.match(hotel.location, address);
    assert.ok(Number.isFinite(hotel.latitude));
    assert.ok(Number.isFinite(hotel.longitude));
  }
});
