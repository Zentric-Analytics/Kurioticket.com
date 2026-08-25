import assert from "node:assert/strict";
import test from "node:test";
import { applyPackageDates, applyPackageDestination, createPackageSearch, includedProducts, packageModes, swapPackageAirports, transitionPackageMode, updatePackageParty } from "./packageSearchModel";

test("package modes keep the exact customer order and internal mapping", () => {
  assert.deepEqual(packageModes, [
    { value: "hotel-flight", label: "Flight + Hotel" },
    { value: "flight-car", label: "Flight + Car" },
    { value: "hotel-car", label: "Hotel + Car" },
    { value: "hotel-flight-car", label: "Flight + Hotel + Car" },
  ]);
});

test("fresh package searches start with one traveler and one room", () => {
  const search = createPackageSearch();

  assert.equal(search.mode, "hotel-flight");
  assert.equal(search.origin, "");
  assert.equal(search.originCode, "");
  assert.equal(search.adults, 1);
  assert.equal(search.children, 0);
  assert.equal(search.infants, 0);
  assert.equal(search.rooms, 1);
  assert.equal(search.petFriendly, false);
  assert.equal(search.adults + search.children + search.infants, 1);
  assert.equal(search.carPickupTime, "10:00");
  assert.equal(search.carReturnTime, "10:00");
});

test("package airport swap keeps text and code pairs and updates linked Car pickup", () => {
  const search = {
    ...createPackageSearch(),
    origin: "Los Angeles (LAX)",
    originCode: "LAX",
    destination: "New York (JFK)",
    destinationCode: "JFK",
    carPickupLocation: "New York (JFK)",
  };

  const swapped = swapPackageAirports(search);

  assert.deepEqual(
    { origin: swapped.origin, originCode: swapped.originCode },
    { origin: "New York (JFK)", originCode: "JFK" },
  );
  assert.deepEqual(
    { destination: swapped.destination, destinationCode: swapped.destinationCode },
    { destination: "Los Angeles (LAX)", destinationCode: "LAX" },
  );
  assert.equal(swapped.carPickupLocation, "Los Angeles (LAX)");
});

test("package airport swap preserves a custom unlinked Car pickup", () => {
  const swapped = swapPackageAirports({
    ...createPackageSearch(),
    origin: "Los Angeles (LAX)",
    originCode: "LAX",
    destination: "New York (JFK)",
    destinationCode: "JFK",
    carPickupLinked: false,
    carPickupLocation: "Custom downtown pickup",
  });

  assert.equal(swapped.carPickupLocation, "Custom downtown pickup");
});

test("package airport swap exchanges an origin with an empty destination", () => {
  const swapped = swapPackageAirports({
    ...createPackageSearch(),
    origin: "Los Angeles (LAX)",
    originCode: "LAX",
  });

  assert.deepEqual(
    {
      origin: swapped.origin,
      originCode: swapped.originCode,
      destination: swapped.destination,
      destinationCode: swapped.destinationCode,
    },
    { origin: "", originCode: "", destination: "Los Angeles (LAX)", destinationCode: "LAX" },
  );
});

test("package adults can be increased by the user but cannot fall below one", () => {
  const search = createPackageSearch();

  assert.equal(updatePackageParty(search, { adults: 2 }).adults, 2);
  assert.equal(updatePackageParty(search, { adults: 0 }).adults, 1);
});

test("package mode transitions preserve fresh and user-selected party values", () => {
  const modes = ["flight-car", "hotel-car", "hotel-flight-car", "hotel-flight"] as const;
  let fresh = createPackageSearch();
  let selected = updatePackageParty(fresh, { adults: 3, children: 1, infants: 1, rooms: 2 });

  for (const mode of modes) {
    fresh = transitionPackageMode(fresh, mode);
    selected = transitionPackageMode(selected, mode);
    assert.equal(fresh.adults, 1);
    assert.deepEqual(
      { adults: selected.adults, children: selected.children, infants: selected.infants, rooms: selected.rooms },
      { adults: 3, children: 1, infants: 1, rooms: 2 },
    );
  }
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
