import { createSearchDiagnostics } from "@/shared/search/diagnostics";
import { withSearchDiagnosticContext } from "@/lib/search/diagnosticContext";
import { diagnosticSearchResponse } from "@/lib/search/diagnosticResponse";
import { withOperationalGuestDevice } from "@/lib/operationalGuestDeviceObservation";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import ts from "typescript";
import type { OperationalSessionReference } from "@/lib/operationalSearchSession";
import { handoffTrackingId } from "@/services/providerHandoffStore";
import { countHotelInventory, readHotelResultAccounting } from "@/lib/hotels/hotelResultAccounting";
import { isProviderHotelResult } from "./hotelInventorySource";
import { createHotelOperationalBindingStore, kayakHotelSnapshot, returnedKayakHotelSnapshot } from "./hotelOperationalBinding";

const snapshot = "11111111-1111-4111-8111-111111111111";
const otherSnapshot = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";
const wrongRequestId = "44444444-4444-4444-8444-444444444444";
const provider = "KAYAK sandbox";
const result = (snapshotId = snapshot, row = "210:2") => ({ id: "kayak-sandbox:" + snapshotId + ":" + row, provider });

type Row = { cacheKey: string; vertical: string; resultId: string; normalizedResult: Record<string, unknown>; expiresAt: Date };
function fixture() {
  let clock = 1_800_000_000_000;
  const rows = new Map<string, Row>();
  let available = true;
  const tx = {
    $executeRaw: async () => 0,
    providerResultCache: {
      createMany: async ({ data, skipDuplicates }: { data: Row[]; skipDuplicates: boolean }) => {
        assert.equal(skipDuplicates, true);
        assert.equal(data.length, 1);
        const row = data[0];
        if (rows.has(row.cacheKey)) return { count: 0 };
        rows.set(row.cacheKey, structuredClone(row));
        return { count: 1 };
      },
      findUnique: async ({ where }: { where: { cacheKey: string } }) => rows.get(where.cacheKey) ?? null,
    },
  };
  type Database = NonNullable<ReturnType<Parameters<typeof createHotelOperationalBindingStore>[0]>>;
  const db = { $transaction: async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx) } as unknown as Database;
  const store = createHotelOperationalBindingStore(() => available ? db : null, () => clock);
  const session: OperationalSessionReference = { id: "55555555-5555-4555-8555-555555555555", environment: "staging", expiresAt: new Date(clock + 5 * 60_000) };
  return { store, session, rows, advance: (ms: number) => { clock += ms; }, unavailable: () => { available = false; } };
}

test("snapshot extraction accepts only normalized KAYAK offers scoped to a server snapshot", () => {
  assert.equal(kayakHotelSnapshot(result()), snapshot);
  assert.equal(kayakHotelSnapshot({ ...result(), provider: "Different provider" }), undefined);
  assert.equal(kayakHotelSnapshot({ id: "kayak-sandbox:210:2", provider }), undefined);
  assert.equal(kayakHotelSnapshot({ id: "kayak-sandbox:" + snapshot + ":", provider }), undefined);
  assert.equal(returnedKayakHotelSnapshot([result(), result(snapshot, "210:3")]), snapshot);
  assert.equal(returnedKayakHotelSnapshot([result(), result(otherSnapshot)]), undefined);
  assert.equal(returnedKayakHotelSnapshot([result(), { id: "kayak-sandbox:invalid", provider }]), undefined);
  assert.equal(returnedKayakHotelSnapshot([]), undefined);
});

test("private binding survives a browser reload, but never another account, session or environment", async () => {
  const { store, session, rows } = fixture();
  for (const owner of [null, "account-a"]) {
    const id = owner === null ? snapshot : otherSnapshot;
    assert.equal(await store.remember(id, requestId, session, owner), true);
    assert.equal(await store.resolve(id, session, owner), requestId);
    assert.equal(await store.resolve(id, session, owner === null ? "account-a" : null), undefined);
    assert.equal(await store.resolve(id, { ...session, id: "66666666-6666-4666-8666-666666666666" }, owner), undefined);
    assert.equal(await store.resolve(id, { ...session, environment: "production" }, owner), undefined);
    assert.equal(await store.resolve(id, null, owner), undefined);
  }
  assert.equal(rows.size, 2);
  for (const row of rows.values()) {
    assert.ok(!row.cacheKey.startsWith("hotel:"));
    assert.deepEqual(Object.keys(row.normalizedResult).sort(), ["operationalSessionId", "requestId", "userId"]);
    assert.equal(+row.expiresAt, +session.expiresAt);
  }
});

test("duplicate snapshots cannot replace the original reference or extend its expiry", async () => {
  const { store, session, rows, advance } = fixture();
  assert.equal(await store.remember(snapshot, requestId, session, null), true);
  advance(60_000);
  const renewed = { ...session, expiresAt: new Date(+session.expiresAt + 30 * 60_000) };
  assert.equal(await store.remember(snapshot, wrongRequestId, renewed, "different-account"), false);
  assert.equal(await store.remember(snapshot, wrongRequestId, renewed, null), false);
  assert.equal(await store.resolve(snapshot, renewed, null), requestId);
  assert.equal(+Array.from(rows.values())[0].expiresAt, +session.expiresAt);
  advance(4 * 60_000);
  assert.equal(await store.resolve(snapshot, renewed, null), undefined);
  assert.equal(await store.resolve(snapshot, session, null), undefined);
});

test("missing evidence or a database outage never invents a binding", async () => {
  const { store, session, rows, unavailable } = fixture();
  assert.equal(await store.remember(snapshot, "not-a-uuid", session, null), false);
  assert.equal(await store.remember(snapshot, requestId, null, null), false);
  assert.equal(await store.remember(snapshot, requestId, { ...session, environment: "production" }, null), false);
  assert.equal(await store.resolve(snapshot, session, null), undefined);
  assert.equal(rows.size, 0);
  unavailable();
  assert.equal(await store.remember(snapshot, requestId, session, null), false);
  assert.equal(await store.resolve(snapshot, session, null), undefined);
});

test("actual redirect route takes the snapshot from the selected cached offer, not the request body", async () => {
  const source = readFileSync("src/app/api/redirect/route.ts", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  const tasks: Array<() => Promise<unknown>> = [];
  const records: Array<Record<string, unknown>> = [];
  const offer = { ...result(), bookingUrl: "https://provider.example/sandbox", location: "Test address", price: 100, currency: "USD" };
  const stubs: Record<string, unknown> = {
    "@/shared/search/diagnostics": { createSearchDiagnostics },
    "@/lib/search/diagnosticContext": { withSearchDiagnosticContext },
    "@/lib/search/diagnosticResponse": { diagnosticSearchResponse },
    "@/lib/productionSandboxPolicy": { productionSandboxHost: () => false },
    "@/services/travel/hotelInventorySource": { isProviderHotelResult: () => true },
    "next/server": { after: (task: () => Promise<unknown>) => tasks.push(task), NextResponse: { json: Response.json } },
    "@/lib/searchCache": { getHotelFromCache: (id: string) => id === offer.id ? offer : null, getFlightFromCache: async () => null },
    "@/lib/hotels/hotelResultAvailability": { getHotelPriceDetails: () => ({ totalPrice: 100, currency: "USD" }) },
    "@/lib/stagingSafety": { isStagingEnvironment: () => true },
    "@/services/travel/flightRedirectHandoff": { revalidateFlightRedirectHandoff: () => { throw new Error("not a flight"); } },
    "@/services/travel/kayakSandboxPublic": { sandboxBookingUrl: (value: string) => value },
    "@/services/travel/providerResultCache": { getProviderResult: async () => null },
    "@/services/providerHandoffActivity": { recordProviderHandoffActivity: async (_request: Request, value: Record<string, unknown>) => { records.push(value); } },
    "@/services/providerHandoffStore": { handoffTrackingId },
    "@/services/travel/hotelOperationalBinding": { kayakHotelSnapshot },
  };
  runInNewContext(compiled, { exports: exported, Request, Response, URL, require: (name: string) => {
    if (!(name in stubs)) throw new Error("Unexpected import: " + name);
    return stubs[name];
  } });
  assert.ok(exported.POST);
  // Browser context lost (no operationalRequestId), or a forged one.
  for (const supplied of [undefined, wrongRequestId]) {
    const response = await exported.POST(new Request("https://fixture.example/api/redirect", { method: "POST",
      body: JSON.stringify({ type: "hotel", id: offer.id, operationalRequestId: supplied, operationalHotelSnapshotId: otherSnapshot }) }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { url: offer.bookingUrl });
    await tasks.shift()!();
    assert.equal(records.at(-1)?.operationalHotelSnapshotId, snapshot);
    assert.equal(records.at(-1)?.operationalRequestId, undefined);
    assert.equal(records.at(-1)?.resultId, offer.id);
  }
  assert.equal(records.length, 2);
});

test("actual Android progressive route refuses an ownership-changing replay before calling the provider", async () => {
  const source = readFileSync("src/app/api/mobile/v1/hotels/progressive/route.ts", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { POST?: (request: Request) => Promise<Response> } = {};
  const { store, session } = fixture();
  const tasks: Array<() => Promise<unknown>> = [];
  const histories: Array<{ requestId: string; query: Record<string, unknown> }> = [];
  let providerCalls = 0;
  const stubs: Record<string, unknown> = {
    "@/shared/search/diagnostics": { createSearchDiagnostics },
    "@/lib/search/diagnosticContext": { withSearchDiagnosticContext },
    "@/lib/search/diagnosticResponse": { diagnosticSearchResponse },
    "node:crypto": { createHmac, randomUUID, timingSafeEqual },
    "@/services/travel/hotelAggregator": {
      hotelSearchRequiresCanonicalResponse: () => false,
      searchHotelBatch: async (_search: unknown, _context: unknown, snapshotId: string, checkpoint?: unknown) => {
        providerCalls++;
        const first = { ...result(snapshotId, "1:1"), propertyGroupId: "same-property" }, second = { ...result(snapshotId, "1:2"), propertyGroupId: "same-property" };
        return { supported: true, results: checkpoint ? [second] : [first], cumulative: checkpoint ? [first, second] : [first],
          batch: { providerRows: 2, checkpoint: checkpoint ? null : { nextPage: 1, total: 2, pageHashes: ["a".repeat(43)] } } };
      },
    },
    "@/lib/productionSandboxPolicy": { productionSandboxHost: () => false },
    "@/app/api/hotels/search/route": { POST: () => { throw new Error("unexpected canonical fallback"); } },
    "@/lib/searchNetworkObservation": { searchNetworkObservation: () => ({}) },
    "@/lib/operationalGuestDeviceObservation": { withOperationalGuestDevice },
    "next/server": { after: (task: () => Promise<unknown>) => tasks.push(task), NextResponse: { json: Response.json } },
    "@/lib/operationalSearchSession": {
      prepareOperationalSearchSession: (request: Request) => ({ reference: request.headers.get("x-fixture-session") === "changed"
        ? { ...session, id: "77777777-7777-4777-8777-777777777777" } : session }),
      operationalSessionMetadata: (reference: OperationalSessionReference) => ({ operationalSessionId: reference.id }),
      attachOperationalSearchSession: (response: Response) => response,
    },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async (request: Request) => ({ userId: request.headers.get("x-fixture-actor") || null, visitorId: null, applicationSource: "ANDROID" }) },
    "@/services/operationalActivityService": {
      logProviderCall: async () => {},
      logSearchHistory: async (value: { requestId: string; query: Record<string, unknown> }) => { histories.push(value); },
    },
    "@/services/analyticsService": { trackAnalyticsEvent: () => { assert.fail("no Analytics consent"); } },
    "@/lib/validation": { hotelSearchSchema: { safeParse: (value: unknown) => ({ success: true, data: value }) } },
    "@/lib/rate-limit": { getClientIp: () => "fixture", checkRateLimit: () => ({ allowed: true }) },
    "@/lib/kayak-client-ip": { getKayakClientIp: () => "fixture" },
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/services/travel/kayakSandbox": { isKayakSandboxEnabled: () => true, KayakError: Error },
    "@/lib/searchCache": { toPublicHotel: (value: unknown) => value },
    "@/lib/travel/searchContract": { classifyHotels: (results: unknown[], _warnings: unknown[], requestId: string) => ({ results, requestId, status: "available" }) },
    "@/services/travel/hotelOperationalBinding": { rememberHotelOperationalBinding: store.remember, resolveHotelOperationalBinding: store.resolve, returnedKayakHotelSnapshot },
    "@/lib/hotels/hotelResultAccounting": { countHotelInventory },
    "@/services/travel/hotelInventorySource": { isProviderHotelResult },
  };
  runInNewContext(compiled, { exports: exported, Request, Response, Headers, URL, Buffer, process: { env: { KAYAK_SANDBOX_API_KEY: "synthetic-cursor-key" } },
    require: (name: string) => {
      if (!(name in stubs)) throw new Error("Unexpected import: " + name);
      return stubs[name];
    } });
  assert.ok(exported.POST);
  const post = async (body: unknown, actor = "account-a", sessionChange = "same") => exported.POST!(new Request("https://fixture.example/api/mobile/v1/hotels/progressive", {
    method: "POST", headers: { "x-mobile-platform": "android", "x-fixture-actor": actor, "x-fixture-session": sessionChange }, body: JSON.stringify(body),
  }));
  const first = await post({ search: { destination: "Paris", checkIn: "2099-01-01", checkOut: "2099-01-02", guests: 1, rooms: 1 } });
  assert.equal(first.status, 200);
  const page = await first.json() as { nextCursor: string; requestId: string };
  assert.ok(page.nextCursor);
  await tasks.shift()!();
  assert.equal(providerCalls, 1);
  assert.equal(histories.length, 1);
  assert.equal(histories[0].requestId, page.requestId);
  assert.ok(histories[0].query.operationalHotelSnapshotId);
  assert.deepEqual(readHotelResultAccounting(histories[0].query, 1), { version: 1, offerCount: 1, propertyCount: 1 });
  assert.equal((await post({ cursor: page.nextCursor }, "account-b")).status, 400);
  assert.equal((await post({ cursor: page.nextCursor }, "account-a", "changed")).status, 400);
  assert.equal(providerCalls, 1, "a replay must not change cached inventory");
  assert.equal(tasks.length, 0, "a replay must not write search history");
  const final = await post({ cursor: page.nextCursor });
  assert.equal(final.status, 200);
  assert.equal((await final.json()).nextCursor, null);
  await tasks.shift()!();
  assert.equal(histories.length, 2);
  assert.equal(histories[1].requestId, page.requestId);
  assert.equal(histories[1].query.operationalHotelSnapshotId, histories[0].query.operationalHotelSnapshotId);
  assert.deepEqual(readHotelResultAccounting(histories[1].query, 2), { version: 1, offerCount: 2, propertyCount: 1 });
  const previous = process.env.TRAVEL_PROVIDER_MODE;
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  try {
    const guest = await post({ search: { destination: "Paris", checkIn: "2099-01-01", checkOut: "2099-01-02", guests: 1, rooms: 1 } }, "");
    assert.equal(guest.status, 200);
    await tasks.shift()!();
    assert.deepEqual(histories.at(-1)?.query.guestAccess, { version: 1, platform: "android", deviceLabel: "Android device", browser: null, os: "Android" });
    assert.ok(histories.slice(0, 2).every(history => !Object.hasOwn(history.query, "guestAccess")), "registered history does not acquire anonymous device metadata");
  } finally {
    if (previous === undefined) delete process.env.TRAVEL_PROVIDER_MODE; else process.env.TRAVEL_PROVIDER_MODE = previous;
  }
});
