import assert from "node:assert/strict";
import test from "node:test";
import { buildStaticHotelResults, calculateHotelStayNights, getStaticHotelById, searchStaticHotelCatalogue } from "./staticHotelResults";
import { staticHotelCatalogue, supportedStaticHotelDestinations } from "./staticHotelCatalogue";

const search = { destination:"London",checkIn:"2027-06-01",checkOut:"2027-06-04",guests:3,rooms:2 } as const;

test("static hotel catalogue is authoritative and destination relevant", () => {
  assert.equal(staticHotelCatalogue.length, 8);
  assert.deepEqual([...supportedStaticHotelDestinations], ["London","Paris","New York","Tokyo"]);
  assert.ok(searchStaticHotelCatalogue("LON").every(hotel => hotel.city === "London"));
  assert.deepEqual(searchStaticHotelCatalogue("Atlantis"), []);
  assert.deepEqual(searchStaticHotelCatalogue("Lagos, Nigeria"), []);
});

test("decorated supported destinations resolve only to their catalogue city", () => {
  for (const [destination, city] of [["London, United Kingdom", "London"], ["Paris, France", "Paris"], ["New York, NY", "New York"], ["New York, United States", "New York"], ["Tokyo, Japan", "Tokyo"], ["LON", "London"]]) {
    const results = searchStaticHotelCatalogue(destination);
    assert.ok(results.length > 0, destination);
    assert.ok(results.every(hotel => hotel.city === city), destination);
  }
});

test("static hotel results are deterministic planning estimates", () => {
  const first=buildStaticHotelResults(search), second=buildStaticHotelResults(search);
  assert.deepEqual(first,second);
  assert.ok(first.length>0);
  assert.equal(calculateHotelStayNights(search.checkIn,search.checkOut),3);
  assert.equal(first[0]!.totalPrice,first[0]!.pricePerNight*3);
  assert.equal(first[0].provider,"Kurioticket static catalogue");
  assert.equal(first[0].bookingUrl,"");
  assert.equal(first[0].partnerRedirectUrl,"");
});

test("details resolve from the same catalogue", () => {
  const selected=staticHotelCatalogue[0];
  assert.equal(getStaticHotelById(selected.id),selected);
  assert.equal(getStaticHotelById("unknown-hotel"),null);
});
