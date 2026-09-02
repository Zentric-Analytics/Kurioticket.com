import assert from "node:assert/strict";
import test from "node:test";
import type { CarResult, CreateMobileSavedItem, FlightResult, MobileSavedItem } from "../api/travelApi";
import { carSavedSignature, flightSavedSignature, mapCarToSaved, mapFlightToSaved } from "./savedMapping";
import { SavedRepository, type SavedRepositoryDependencies } from "./savedRepositoryCore";

const flight = (id = "offer-old", provider = "duffel", departureTime = "2030-01-01T10:00:00Z") => ({
  id, provider, airlineName: "Example Air", originAirport: "LOS", destinationAirport: "LHR",
  departureTime, arrivalTime: "2030-01-01T16:00:00Z", price: 500, currency: "USD",
} as FlightResult);
const car = { id: "car-1", modelName: "Toyota Corolla", categoryLabel: "Compact", pickupLocation: "Lagos Airport", returnLocation: "Lagos Airport", rentalCompanyName: "Acme Cars", offers: [{ id: "offer-1", bookingProviderName: "Provider", rentalCompanyName: "Acme Cars", totalPrice: 120, pricePerDay: 60, currency: "USD" }] } as unknown as CarResult;
const carParams = { pickupLocation: "Lagos Airport", dropoffLocation: "Lagos Airport", pickupDate: "2030-01-01", pickupTime: "10:00", dropoffDate: "2030-01-03", dropoffTime: "10:00", driverAge: "30" };
const serverItem = (value: FlightResult, id = "saved-1") => ({
  ...mapFlightToSaved(value), id, createdAt: "2030-01-01T00:00:00Z",
} as MobileSavedItem);
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };
function harness(initial: MobileSavedItem[] = []) {
  let remote = [...initial];
  const creates: CreateMobileSavedItem[] = [];
  const removes: string[] = [];
  let createImpl: (value: CreateMobileSavedItem) => Promise<{ item: MobileSavedItem }> = async value => {
    const item = { ...value, id: `saved-${creates.length}`, createdAt: new Date().toISOString() } as MobileSavedItem;
    remote = [...remote, item]; return { item };
  };
  let removeImpl: (type: MobileSavedItem["type"], id: string) => Promise<unknown> = async (_type, id) => { remote = remote.filter(item => item.id !== id); };
  const dependencies: SavedRepositoryDependencies = {
    readCache: async () => remote, writeCache: async () => undefined, list: async () => ({ items: remote, summary: {} }),
    create: value => { creates.push(value); return createImpl(value); }, remove: (type, id) => { removes.push(id); return removeImpl(type, id); },
    readDestinations: async () => [], writeDestinations: async () => undefined, readFlights: async () => [], writeFlights: async () => undefined,
  };
  const repository = new SavedRepository("user", dependencies);
  return { repository, creates, removes, setCreate: (fn: typeof createImpl) => { createImpl = fn; }, setRemove: (fn: typeof removeImpl) => { removeImpl = fn; } };
}

test("canonical flight identity ignores transient offer ids but preserves provider and departure", () => {
  assert.equal(flightSavedSignature(flight("same")), flightSavedSignature(flight("same")));
  assert.equal(flightSavedSignature(flight("offer-old")), flightSavedSignature(flight("offer-new")));
  assert.notEqual(flightSavedSignature(flight("offer", "duffel", "2030-01-01T10:00:00Z")), flightSavedSignature(flight("offer", "duffel", "2030-01-01T11:00:00Z")));
  assert.notEqual(flightSavedSignature(flight("offer", "duffel")), flightSavedSignature(flight("offer", "amadeus")));
});

test("save and remove publish optimistic and final canonical snapshots", async () => {
  const save = harness(); await save.repository.refresh();
  const saveSnapshots: boolean[] = []; save.repository.subscribe(value => saveSnapshots.push(value.flights.has(flightSavedSignature(flight()))));
  await save.repository.toggleFlight(flight());
  assert.equal(saveSnapshots.includes(true), true); assert.equal(save.repository.snapshot().flights.has(flightSavedSignature(flight())), true);
  const remove = harness([serverItem(flight())]); await remove.repository.refresh();
  const removeSnapshots: boolean[] = []; remove.repository.subscribe(value => removeSnapshots.push(value.flights.has(flightSavedSignature(flight()))));
  await remove.repository.toggleFlight(flight("offer-new"));
  assert.equal(removeSnapshots.includes(false), true); assert.deepEqual(remove.removes, ["saved-1"]); assert.equal(remove.creates.length, 0);
  assert.equal(remove.repository.snapshot().flights.has(flightSavedSignature(flight())), false);
});

test("Car save and remove reconcile through the account repository", async () => {
  const h = harness(); await h.repository.refresh();
  await h.repository.toggleCar(car, carParams);
  const signature = carSavedSignature(car, carParams)!;
  assert.equal(h.repository.snapshot().cars.has(signature), true);
  assert.equal(h.creates[0]?.type, "car");
  assert.deepEqual((h.creates[0]?.payload as { searchParams?: unknown }).searchParams, carParams);
  await h.repository.toggleCar(car, carParams);
  assert.equal(h.repository.snapshot().cars.has(signature), false);
  assert.deepEqual(h.removes, ["saved-1"]);
});

test("Car identity includes the complete rental context", async () => {
  const h = harness(); await h.repository.refresh();
  await h.repository.toggleCar(car, carParams);
  const laterTrip = { ...carParams, pickupDate: "2030-02-01", dropoffDate: "2030-02-03" };
  assert.notEqual(carSavedSignature(car, carParams), carSavedSignature(car, laterTrip));
  await h.repository.toggleCar(car, laterTrip);
  assert.equal(h.creates.length, 2);
  assert.deepEqual(h.removes, []);
});

test("persisted server hashes do not replace the canonical Car identity", async () => {
  const saved = { ...mapCarToSaved(car, carParams), signature: "server-sha256", id: "saved-car", createdAt: "2030-01-01T00:00:00Z" } as MobileSavedItem;
  const h = harness([saved]); await h.repository.refresh();
  assert.equal(h.repository.snapshot().cars.has(carSavedSignature(car, carParams)!), true);
  await h.repository.toggleCar(car, carParams);
  assert.deepEqual(h.removes, ["saved-car"]);
  assert.equal(h.creates.length, 0);
});

test("rapid duplicate toggles allow one mutation while different flights remain concurrent", async () => {
  const h = harness(); await h.repository.refresh(); const first = deferred<{ item: MobileSavedItem }>(); const second = deferred<{ item: MobileSavedItem }>();
  h.setCreate(value => h.creates.length === 1 ? first.promise : second.promise);
  const a = h.repository.toggleFlight(flight("a"));
  await h.repository.toggleFlight(flight("a-refresh"));
  const bFlight = { ...flight("b"), departureTime: "2030-01-02T10:00:00Z", arrivalTime: "2030-01-02T16:00:00Z" };
  const b = h.repository.toggleFlight(bFlight);
  assert.equal(h.creates.length, 2); assert.deepEqual(h.removes, []);
  first.resolve({ item: serverItem(flight("a"), "saved-a") }); second.resolve({ item: serverItem(bFlight, "saved-b") }); await Promise.all([a, b]);
});

test("same-time airlines have independent saved and pending state", async () => {
  const american = { ...flight("american"), airlineName: "American Airlines", flightNumber: "AA101" };
  const british = { ...flight("british"), airlineName: "British Airways", flightNumber: "BA101" };
  const h = harness([serverItem(british, "saved-british")]);
  await h.repository.refresh();
  const americanCreate = deferred<{ item: MobileSavedItem }>();
  h.setCreate(() => americanCreate.promise);
  const savingAmerican = h.repository.toggleFlight(american);
  const pending = h.repository.snapshot();
  assert.equal(pending.pendingFlightKeys.has(flightSavedSignature(american)), true);
  assert.equal(pending.pendingFlightKeys.has(flightSavedSignature(british)), false);
  assert.equal(pending.flights.has(flightSavedSignature(american)), true);
  assert.equal(pending.flights.has(flightSavedSignature(british)), true);
  americanCreate.resolve({ item: serverItem(american, "saved-american") });
  await savingAmerican;
  const removal = harness([serverItem(american, "saved-american"), serverItem(british, "saved-british")]);
  await removal.repository.refresh();
  await removal.repository.toggleFlight(american);
  const afterAmericanRemoval = removal.repository.snapshot();
  assert.equal(afterAmericanRemoval.flights.has(flightSavedSignature(american)), false);
  assert.equal(afterAmericanRemoval.flights.has(flightSavedSignature(british)), true);
  assert.deepEqual(removal.removes, ["saved-american"]);
});

test("create failure rolls optimistic state back and rejects", async () => {
  const h = harness(); await h.repository.refresh(); h.setCreate(async () => { throw new Error("offline"); });
  const states: boolean[] = []; h.repository.subscribe(value => states.push(value.flights.has(flightSavedSignature(flight()))));
  await assert.rejects(h.repository.toggleFlight(flight()), /offline/); assert.equal(states.includes(true), true); assert.equal(h.repository.snapshot().flights.size, 0);
});

test("remove failure restores saved state and rejects", async () => {
  const h = harness([serverItem(flight())]); await h.repository.refresh(); h.setRemove(async () => { throw new Error("offline"); });
  const states: boolean[] = []; h.repository.subscribe(value => states.push(value.flights.has(flightSavedSignature(flight()))));
  await assert.rejects(h.repository.toggleFlight(flight("new-id")), /offline/); assert.equal(states.includes(false), true); assert.equal(h.repository.snapshot().flights.has(flightSavedSignature(flight())), true);
});

test("successful create never republishes stale cache during canonical refresh or a later focus refresh", async () => {
  const h = harness();
  await h.repository.refresh();
  const states: boolean[] = [];
  h.repository.subscribe(value => states.push(value.flights.has(flightSavedSignature(flight()))));
  await h.repository.toggleFlight(flight());
  const optimisticIndex = states.indexOf(true);
  assert.notEqual(optimisticIndex, -1);
  assert.equal(states.slice(optimisticIndex).every(saved => saved), true);
  await h.repository.refresh();
  assert.equal(h.repository.snapshot().flights.has(flightSavedSignature(flight("new-transient-id"))), true);
});

test("successful delete never republishes a stale saved cache during canonical refresh", async () => {
  const h = harness([serverItem(flight())]);
  await h.repository.refresh();
  const states: boolean[] = [];
  h.repository.subscribe(value => states.push(value.flights.has(flightSavedSignature(flight()))));
  await h.repository.toggleFlight(flight("new-transient-id"));
  const afterOptimisticRemoval = states.slice(states.indexOf(false));
  assert.equal(afterOptimisticRemoval.every(saved => !saved), true);
  assert.equal(h.repository.snapshot().flights.size, 0);
});
