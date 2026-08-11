import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { buildDealsProductSearchKeys } from "./dealsProductSearchKeys";

const search = () =>
  Object.assign(createDefaultDealsSearch(), {
    flightOriginCode: "los",
    flightDestinationCode: "lax",
    flightDepartureDate: "2027-01-01",
    flightReturnDate: "2027-01-05",
    hotelDestination: " Los Angeles ",
    hotelCheckIn: "2027-01-01",
    hotelCheckOut: "2027-01-05",
    carPickupLocation: " LAX ",
    carPickupDate: "2027-01-01",
    carReturnDate: "2027-01-05",
  });
test("product identities are deterministic and ignore UI-only context", () => {
  const a = search(),
    b = {
      ...a,
      mode: "hotel-flight-car" as const,
      stayDestinationLinked: false,
      carPickupLinked: false,
    };
  assert.deepEqual(
    buildDealsProductSearchKeys(a),
    buildDealsProductSearchKeys(b),
  );
});
test("each inventory-only input affects only its product", () => {
  const a = search(),
    base = buildDealsProductSearchKeys(a);
  for (const [field, value, product] of [
    ["flightCabinClass", "first", "flight"],
    ["hotelRooms", 2, "hotel"],
    ["carPickupTime", "14:00", "car"],
  ] as const) {
    const next = buildDealsProductSearchKeys({ ...a, [field]: value });
    assert.notEqual(next[product], base[product]);
    for (const other of ["hotel", "flight", "car"] as const)
      if (other !== product) assert.equal(next[other], base[other]);
  }
});
test("one-way ignores return date while round trips include it", () => {
  const a = { ...search(), flightTripType: "one-way" as const },
    b = { ...a, flightReturnDate: "2030-02-02" };
  assert.equal(
    buildDealsProductSearchKeys(a).flight,
    buildDealsProductSearchKeys(b).flight,
  );
  const r = { ...a, flightTripType: "round-trip" as const };
  assert.notEqual(
    buildDealsProductSearchKeys(r).flight,
    buildDealsProductSearchKeys({ ...r, flightReturnDate: "2030-02-02" })
      .flight,
  );
});
