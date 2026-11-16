import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as saved from "@/services/savedRecentService";
import { createSavedHandlers } from "@/app/api/mobile/v1/saved/route";
import { ZodError } from "zod";

test("web/iOS/Android adapters share account-owned saved records, retries and deletion", async () => {
  const records: Array<Record<string, unknown>> = [];
  let userId: string | null = "account-a";
  let serial: Promise<unknown> = Promise.resolve();
  const makeModel = (type: string) => ({
    findFirst: async ({ where }: { where: Record<string, unknown> }) => records.find(row => row._modelType === type && Object.entries(where).every(([key, value]) => {
      const expected = value && typeof value === "object" && "equals" in value ? (value as { equals: unknown }).equals : value;
      return JSON.stringify(row[key] ?? null) === JSON.stringify(expected);
    })) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => { const row = { ...data, id: `saved-${records.length}`, _modelType: type, createdAt: new Date() }; records.push(row); return row; },
    upsert: async ({ create }: { create: Record<string, unknown> }) => {
      const existing = records.find(row => row.userId === create.userId && row.signature === create.signature);
      if (existing) return existing;
      const row = { ...create, id: `saved-${records.length}`, _modelType: type, createdAt: new Date() }; records.push(row); return row;
    },
  });
  const tx = { $executeRaw: async (strings: TemplateStringsArray) => { assert.match(strings.join("?"), /pg_advisory_xact_lock/); return 1; }, savedFlight: makeModel("flight"), savedHotel: makeModel("hotel"), savedCar: makeModel("car"), savedSearch: makeModel("search") };
  const write = saved.createSavedItemWriter(() => ({ $transaction: (task: (client: typeof tx) => Promise<unknown>) => { const result = serial.then(() => task(tx)); serial = result.catch(() => undefined); return result; } }) as never);
  const list: typeof saved.listUserSavedItems = async id => ({ items: records.filter(row => row.userId === id).map(row => ({ ...row, type: row._modelType })) as never, summary: { flights: 0, hotels: 0, cars: 0, searches: 0, total: records.filter(row => row.userId === id).length } });
  const remove: typeof saved.deleteUserSavedItem = async (id, input) => { const index = records.findIndex(row => row.userId === id && row.id === input.id && row._modelType === input.type); if (index < 0) throw new saved.SavedItemNotFoundError(); records.splice(index, 1); return; };
  const mobile = createSavedHandlers({ session: async () => userId ? { user: { id: userId, status: "ACTIVE" } } : null, list, create: write, remove });
  const modules: Record<string, unknown> = { "next/server": { NextResponse: { json: Response.json } }, "@/lib/web-api-auth": { requireWebApiSession: async () => userId ? { session: { user: { id: userId } } } : null }, zod: { ZodError }, "@/services/savedRecentService": { ...saved, createUserSavedItem: write, listUserSavedItems: list, deleteUserSavedItem: remove } };
  const web: { GET: (r: Request) => Promise<Response>; POST: (r: Request) => Promise<Response> } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/app/api/dashboard/saved/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: web, Response, URL, console, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const input = saved.createSavedItemInputSchema.parse({ type: "search", searchType: "hotel", label: "Paris", destination: "Paris", query: { destinationId: "fr-paris" }, userId: "attacker" });
  const request = (method: string, body?: unknown, platform?: string) => new Request("https://kurioticket.com/api/dashboard/saved", { method, ...(body ? { body: JSON.stringify(body) } : {}), headers: platform ? { "x-mobile-platform": platform } : {} });
  assert.equal((await web.POST(request("POST", input))).status, 201);
  for (const platform of ["ios", "android"]) {
    assert.equal((await (await mobile.GET(request("GET", undefined, platform))).json()).items.length, 1);
    assert.equal((await mobile.POST(request("POST", input, platform))).status, 201);
  }
  assert.equal(records.length, 1, "retry after a lost response must not duplicate the save");
  userId = "account-b";
  assert.equal((await (await mobile.GET(request("GET"))).json()).items.length, 0);
  assert.notEqual((await mobile.DELETE(request("DELETE", { type: "search", id: records[0].id }))).status, 200);
  assert.equal(records.length, 1);
  userId = "account-a";
  assert.equal((await mobile.DELETE(request("DELETE", { type: "search", id: records[0].id }))).status, 200);
  assert.equal((await (await web.GET(request("GET"))).json()).items.length, 0);
  for (const sample of [
    { type: "flight", provider: "Duffel", airlineName: "Duffel Airways", originAirport: "SFO", destinationAirport: "LAX", departureTime: "2026-12-16T11:36:00", arrivalTime: "2026-12-16T12:54:00", price: 54, currency: "USD", payload: {} },
    { type: "flight", provider: "Duffel", airlineName: "Airline", originAirport: "LHR", destinationAirport: "JFK", departureTime: "2030-01-01T10:00:00Z", arrivalTime: "2030-01-01T18:00:00Z", price: 100, currency: "USD", payload: {} },
    { type: "hotel", provider: "Partner", hotelName: "Hotel", destination: "Paris", checkIn: "2030-01-01T00:00:00Z", checkOut: "2030-01-02T00:00:00Z", totalPrice: 100, currency: "USD", payload: {} },
    { type: "car", resultId: "car", provider: "Partner", modelName: "Car", categoryLabel: "Compact", pickupLocation: "London", dropoffLocation: "London", pickupDate: "2030-01-01", dropoffDate: "2030-01-02", pickupTime: "10:00", dropoffTime: "10:00", driverAge: "30", totalPrice: 100, currency: "USD", payload: {} },
  ]) {
    const value = saved.createSavedItemInputSchema.parse(sample);
    assert.equal((await mobile.POST(request("POST", value, "ios"))).status, 201);
    assert.equal((await web.POST(request("POST", value))).status, 201);
    assert.equal((await mobile.POST(request("POST", value, "android"))).status, 201);
    assert.equal(records.length, 1, `${sample.type} retry is idempotent`);
    if (sample.type === "flight" && sample.originAirport === "SFO") {
      assert.equal((records[0].departureTime as Date).toISOString(), "2026-12-16T19:36:00.000Z");
      const time = (records[0].payload as { flightTime: { departure: { local: string } } }).flightTime;
      assert.equal(time.departure.local, "2026-12-16T11:36:00");
      userId = "account-b";
      assert.equal((await (await mobile.GET(request("GET"))).json()).items.length, 0);
      assert.equal((await mobile.DELETE(request("DELETE", { type: "flight", id: records[0].id }))).status, 404);
      userId = "account-a";
    }
    assert.equal((await (await web.GET(request("GET"))).json()).items.length, 1);
    assert.equal((await mobile.DELETE(request("DELETE", { type: sample.type, id: records[0].id }))).status, 200);
  }
  userId = null;
  assert.equal((await mobile.POST(request("POST", input, "ios"))).status, 401);
});
