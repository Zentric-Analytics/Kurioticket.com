import test from "node:test";
import assert from "node:assert/strict";
import { classifyCars, classifyFlights, classifyHotels } from "./searchContract";

test("authoritative sources and truthful actions", () => {
  const flight = classifyFlights(
    [{ id: "f", provider: "Duffel" } as never],
    {
      tripType: "round-trip",
      origin: "ORD",
      destination: "LAS",
      departureDate: "2027-02-10",
      returnDate: "2027-02-17",
      adults: 1,
      children: 0,
      infants: 0,
      travelers: 1,
      cabinClass: "economy",
    },
    [],
    "r",
  );
  assert.equal(flight.source, "duffel");
  assert.equal(flight.results[0].searchPolicy.source, "duffel");
  assert.equal(flight.results[0].searchPolicy.action.kind, "internal-detail");
  if (flight.results[0].searchPolicy.action.kind === "internal-detail") {
    const url = new URL(flight.results[0].searchPolicy.action.href, "https://kurioticket.test");
    assert.equal(url.pathname, "/flights/details/f");
    assert.equal(url.searchParams.get("tripType"), "round-trip");
    assert.equal(url.searchParams.get("returnDate"), "2027-02-17");
    assert.equal(url.searchParams.get("adults"), "1");
    assert.equal(url.searchParams.get("cabinClass"), "economy");
  }

  const hotel = classifyHotels([{ id: "h", provider: "Kurioticket static catalogue" } as never], [], "r");
  assert.equal(hotel.source, "kurioticket-static-hotels");
  assert.equal(hotel.results[0].searchPolicy.bookable, false);
  assert.equal(hotel.results[0].searchPolicy.action.kind, "internal-detail");

  const car = classifyCars(
    [{ id: "c", offers: [] } as never],
    { pickupLocation: "LAX", dropoffLocation: "LAX", pickupDate: "2027-01-01", dropoffDate: "2027-01-02", pickupTime: "10:00", dropoffTime: "10:00", driverAge: "30" },
    "r",
  );
  assert.equal(car.source, "kurioticket-static-cars");
  assert.equal(car.results[0].searchPolicy.bookable, false);
  assert.equal(car.results[0].searchPolicy.action.kind, "internal-detail");
  assert.deepEqual(car.warnings, []);
});
