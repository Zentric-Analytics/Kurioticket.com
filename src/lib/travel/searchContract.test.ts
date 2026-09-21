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

test("KAYAK shared search policy enters Kurioticket details before any provider handoff", () => {
  const response = classifyFlights(
    [{ id: "kayak-sandbox:one", provider: "KAYAK sandbox", partnerRedirectUrl: "https://affiliates.kayak.com/sandbox-clickout" } as never],
    { tripType: "one-way", origin: "BOS", destination: "JFK", departureDate: "2027-02-10", adults: 1, children: 0, infants: 0, travelers: 1, cabinClass: "economy" },
    [], "request",
  );
  assert.equal(response.results[0].searchPolicy.source, "kayak-sandbox");
  assert.equal(response.results[0].searchPolicy.bookable, false);
  assert.equal(response.results[0].searchPolicy.action.kind, "internal-detail");
  if (response.results[0].searchPolicy.action.kind === "internal-detail") {
    assert.match(response.results[0].searchPolicy.action.href, /^\/flights\/details\/kayak-sandbox%3Aone/);
  }
});

test("KAYAK car details destinations preserve the opaque ID and canonical search", () => {
  const id = "kayak-sandbox:opaque-provider-id:4";
  const search = { pickupLocation: "BOS", dropoffLocation: "BOS", pickupDate: "2027-02-10", dropoffDate: "2027-02-13", pickupTime: "10:30", dropoffTime: "16:00", driverAge: "30" };
  const response = classifyCars([{ id, inventorySource: "kayak-sandbox", offers: [] } as never], search, "request");
  const result = response.results[0];
  assert.equal(result.searchPolicy.source, "kayak-sandbox");
  assert.equal(result.searchPolicy.bookable, false);
  assert.equal(result.searchPolicy.action.kind, "internal-detail");
  if (result.searchPolicy.action.kind === "internal-detail") {
    const destination = new URL(result.searchPolicy.action.href, "https://kurioticket.test");
    assert.equal(destination.pathname, "/cars/details/kayak-sandbox%3Aopaque-provider-id%3A4");
    for (const [key, value] of Object.entries(search)) assert.equal(destination.searchParams.get(key), value);
  }
});
