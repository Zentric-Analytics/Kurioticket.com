import assert from "node:assert/strict";
import test from "node:test";
import type { CreateMobileSavedItem, FlightResult, MobileSavedItem } from "../api/travelApi";
import { flightSavedSignature, mapFlightToSaved } from "./savedMapping";
import { SavedRepository, type SavedRepositoryDependencies } from "./savedRepositoryCore";

const flight = (id = "offer-old", provider = "duffel", departureTime = "2030-01-01T10:00:00Z") => ({
  id, provider, airlineName: "Example Air", originAirport: "LOS", destinationAirport: "LHR",
  departureTime, arrivalTime: "2030-01-01T16:00:00Z", price: 500, currency: "USD",
} as FlightResult);
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
