import assert from "node:assert/strict";
import test from "node:test";
import { applyPackageDates, applyPackageDestination, createPackageSearch, includedProducts, packageModes, transitionPackageMode, updatePackageParty } from "./packageSearchModel";

test("package modes keep the exact customer order and internal mapping", () => {
  assert.deepEqual(packageModes, [
    { value: "hotel-flight", label: "Flight + Hotel" },
    { value: "flight-car", label: "Flight + Car" },
    { value: "hotel-car", label: "Hotel + Car" },
    { value: "hotel-flight-car", label: "Flight + Hotel + Car" },
  ]);
});

test("shared destination and dates feed linked car fields through mode transitions", () => {
  let search = applyPackageDestination(createPackageSearch(), "Paris", "CDG");
  search = applyPackageDates(search, "2027-04-02", "2027-04-09");
  search = transitionPackageMode(search, "hotel-flight-car");
  assert.equal(search.carPickupLocation, "Paris");
  assert.equal(search.carPickupDate, "2027-04-02");
  assert.equal(search.carReturnDate, "2027-04-09");
  assert.deepEqual(includedProducts(search.mode), { flight: true, hotel: true, car: true });
  assert.equal(transitionPackageMode(search, "hotel-flight").destination, "Paris");
});

test("package party limits coordinate adults, children, infants, and rooms", () => {
  let search = updatePackageParty(createPackageSearch(), { adults: 2, children: 6, infants: 5, rooms: 99 });
  assert.ok(search.adults + search.children + search.infants <= 9);
  assert.ok(search.infants <= search.adults);
  assert.equal(search.rooms, 6);
  search = transitionPackageMode(search, "hotel-car");
  search = updatePackageParty(search, { adults: 12, children: 3, infants: 0 });
  assert.ok(search.adults + search.children <= 12);
});
