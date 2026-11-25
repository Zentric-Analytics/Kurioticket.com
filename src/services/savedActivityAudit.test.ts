import assert from "node:assert/strict";
import test from "node:test";
import { createSavedItemWriter, createSavedItemRemover, SavedItemNotFoundError,
  createSavedItemInputSchema } from "./savedRecentService";

type Item = Record<string, unknown> & { id: string; userId: string };
type Audit = { name: string; userId: string; metadata: Record<string, unknown> };
type State = { items: Item[]; audit: Audit[] };
function makeDatabase(failAudit = false) {
  let state: State = { items: [], audit: [] };
  const db = () => ({ $transaction: async (work: (tx: unknown) => Promise<unknown>) => {
    const draft = { items: state.items.map(item => ({ ...item })), audit: [...state.audit] };
    const model = (type: string) => ({
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        draft.items.find(item => item._model === type && Object.entries(where).every(([k, value]) => {
          if (k === "payload" || k === "query") return true; // metadata tested separately
          return JSON.stringify(item[k] ?? null) === JSON.stringify(value ?? null);
        })) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const item: Item = { ...data, id: "saved-" + (draft.items.length + 1), userId: String(data.userId), _model: type };
        draft.items.push(item); return item;
      },
      upsert: async ({ where, create }: { where: { userId_signature: { userId: string; signature: string } }; create: Record<string, unknown> }) => {
        const old = draft.items.find(item => item._model === type && item.userId === where.userId_signature.userId && item.signature === where.userId_signature.signature);
        if (old) return old;
        const item: Item = { ...create, id: "saved-" + (draft.items.length + 1), userId: String(create.userId), _model: type };
        draft.items.push(item); return item;
      },
      deleteMany: async ({ where }: { where: { id: string; userId: string } }) => {
        const before = draft.items.length;
        draft.items = draft.items.filter(item => !(item._model === type && item.id === where.id && item.userId === where.userId));
        return { count: before - draft.items.length };
      },
    });
    const tx = {
      $executeRaw: async () => 1,
      savedFlight: model("flight"), savedHotel: model("hotel"),
      savedCar: model("car"), savedSearch: model("search"),
      analyticsEvent: { create: async ({ data }: { data: Audit }) => {
        if (failAudit) throw new Error("Audit write failed");
        draft.audit.push(data); return { id: "audit-" + draft.audit.length };
      } },
    };
    const value = await work(tx);
    state = draft;
    return value;
  } });
  return { db: db as never, get: () => state };
}
const car = createSavedItemInputSchema.parse({
  type: "car", resultId: "car-001", provider: "partner", modelName: "Sedan",
  categoryLabel: "Economy", pickupLocation: "London", dropoffLocation: "London",
  pickupDate: "2027-01-01", pickupTime: "10:00", dropoffDate: "2027-01-03", dropoffTime: "10:00",
  driverAge: 30, totalPrice: 100, currency: "USD", payload: { result: { id: "car-001" } },
});
const hotel = createSavedItemInputSchema.parse({
  type: "hotel", provider: "partner", hotelName: "Test Hotel", destination: "Paris",
  checkIn: "2027-01-01T00:00:00Z", checkOut: "2027-01-02T00:00:00Z",
  totalPrice: 99, currency: "USD", payload: { hotelResultId: "hotel-001" },
});
const flight = createSavedItemInputSchema.parse({
  type: "flight", provider: "partner", airlineName: "Air Test",
  originAirport: "LOS", destinationAirport: "LHR",
  departureTime: "2027-01-01T10:00:00Z", arrivalTime: "2027-01-01T17:00:00Z",
  price: 100, currency: "USD", payload: { flightResultId: "flight-001" },
});

test("a real Save and Unsave write exactly one auditable event each, for every travel product", async () => {
  for (const input of [flight, hotel, car]) {
    const fixture = makeDatabase();
    const writer = createSavedItemWriter(fixture.db, true);
    const remove = createSavedItemRemover(fixture.db);
    const saved = await writer("user-a", input, { applicationSource: "IOS" });
    assert.equal(fixture.get().audit.length, 1);
    assert.equal(fixture.get().audit[0].name, "saved_item_confirmed");
    assert.equal(fixture.get().audit[0].metadata.product, input.type.toUpperCase());
    assert.equal(fixture.get().audit[0].metadata.recordPurpose, "essential_account_audit");
    assert.equal(fixture.get().audit[0].metadata.applicationSource, "IOS");
    const repeat = await writer("user-a", input, { applicationSource: "ANDROID" });
    assert.equal(repeat.id, saved.id);
    assert.equal(fixture.get().audit.length, 1, "idempotent save must not be another user action");
    await assert.rejects(() => remove("user-b", { type: input.type, id: saved.id }), SavedItemNotFoundError);
    assert.equal(fixture.get().audit.length, 1);
    await remove("user-a", { type: input.type, id: saved.id }, { applicationSource: "ANDROID" });
    assert.equal(fixture.get().items.length, 0);
    assert.equal(fixture.get().audit.length, 2);
    assert.equal(fixture.get().audit[1].name, "saved_item_removed");
    assert.equal(fixture.get().audit[1].metadata.product, input.type.toUpperCase());
    assert.equal(fixture.get().audit[1].metadata.recordPurpose, "essential_account_audit");
    assert.equal(fixture.get().audit[1].metadata.applicationSource, "ANDROID");
    assert.equal(fixture.get().audit[1].metadata.savedItemId, saved.id);
  }
});

test("account audit failure rolls back a saved mutation, preventing false success", async () => {
  const fixture = makeDatabase(true);
  const writer = createSavedItemWriter(fixture.db, true);
  await assert.rejects(() => writer("user-a", car));
  assert.equal(fixture.get().items.length, 0);
  assert.equal(fixture.get().audit.length, 0);
});

test("repeat Unsaves do not produce duplicate records", async () => {
  const fixture = makeDatabase();
  const writer = createSavedItemWriter(fixture.db, true);
  const remove = createSavedItemRemover(fixture.db);
  const saved = await writer("user-a", car);
  await remove("user-a", { type: "car", id: saved.id });
  await assert.rejects(() => remove("user-a", { type: "car", id: saved.id }), SavedItemNotFoundError);
  assert.equal(fixture.get().audit.length, 2);
});
