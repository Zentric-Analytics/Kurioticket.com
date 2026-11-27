import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createHash, randomUUID } from "node:crypto";
import { encodeCohort, decodeCohort, isCohortManifest } from "@/lib/search/cohortEncoding";
import { publishCohort } from "@/lib/search/publishCohort";
import { publishHotelCohortAliases } from "./publishHotelCohortAliases";
import { hotelOccupancy } from "@/lib/hotels/hotelOccupancy";
import type { NormalizedHotelResult, HotelSearchParams } from "@/lib/types";
type Cached = { normalizedResult: unknown; searchContext: unknown; expiresAt: Date };
type Cache = { rememberHotelSearchCohort: (rows: NormalizedHotelResult[], search: HotelSearchParams) => Promise<boolean>; getProviderResult: (vertical: string, id: string) => Promise<NormalizedHotelResult | null>; getProviderResultWithContext: (vertical: string, id: string) => Promise<{ result: NormalizedHotelResult; searchContext: unknown } | null>; getHotelSearchCohort: (search: HotelSearchParams, now?: number, id?: string) => Promise<NormalizedHotelResult[]> };
function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {} as T;
  runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, console: { info() {}, error() {} }, Date, Map, Buffer, performance, structuredClone, URL, URLSearchParams, Request, Response, process: { env: {} } });
  return exports;
}
function fixture() {
  const rows = new Map<string, Cached>(); let failLookup = false;
  const dependencies = {
    "@/lib/productionSandboxPolicy": { productionSandboxInventory: () => false },
    "node:crypto": { createHash, randomUUID }, "@/lib/hotels/hotelOccupancy": { hotelOccupancy },
    "@/lib/search/cohortEncoding": { encodeCohort, decodeCohort, isCohortManifest },
    "@/lib/search/publishCohort": { publishCohort }, "./publishHotelCohortAliases": { publishHotelCohortAliases },
    "@/lib/search/cacheWriteGate": { runCacheWrite: (task: () => Promise<unknown>) => task() },
    "@/generated/prisma/client": { Prisma: { sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }), join: (values: unknown[]) => values } },
    "@/lib/prisma": { getPrisma: () => ({
      providerResultCache: { findUnique: async ({ where }: { where: { cacheKey: string } }) => rows.get(where.cacheKey) ?? null },
      $transaction: async (task: (db: { $executeRaw: (query: unknown) => Promise<number> }) => Promise<unknown>) => task({ $executeRaw: async query => {
        const values = (query as { values?: unknown[] }).values;
        if (!Array.isArray(values) || !Array.isArray(values[0])) return 1;
        const pending = (values[0] as { values: [string, string, string, string, string, Date] }[]).map(({ values: row }) => ({ key: row[0], value: { normalizedResult: JSON.parse(row[3]), searchContext: JSON.parse(row[4]), expiresAt: row[5] } }));
        if (failLookup && pending.some(row => row.key.includes("__hotel-snapshot-lookup"))) throw Error("synthetic atomic publication failure");
        for (const row of pending) rows.set(row.key, row.value);
        return pending.length;
      } }),
    }) },
  };
  return { rows, restart: () => load<Cache>("src/services/travel/providerResultCache.ts", dependencies), fail: () => { failLookup = true; } };
}
const snapshot = "00000000-0000-4000-8000-000000000001";
const search: HotelSearchParams = { destination: "New York", destinationId: "place:nyc", checkIn: "2099-12-25", checkOut: "2099-12-29", guests: 2, adults: 1, children: 1, rooms: 1 };
const hotel = { id: "kayak-sandbox:" + snapshot + ":one", name: "Synthetic hotel", location: "New York", provider: "KAYAK sandbox", bookingUrl: "https://example.test/deal", totalPrice: 100, currency: "USD", propertyGroupId: snapshot + ":property" } as NormalizedHotelResult;

test("fresh workers resolve details, location and redirect before any optional individual write", async () => {
  const f = fixture(); assert.equal(await f.restart().rememberHotelSearchCohort([hotel], search), true);
  assert.equal(f.rows.has("hotel:" + hotel.id), false, "no individual result was persisted");
  const cache = f.restart(); // New module/process-local memory, durable rows only.
  assert.deepEqual(await cache.getProviderResult("hotel", hotel.id), hotel);
  assert.deepEqual((await cache.getProviderResultWithContext("hotel", hotel.id))?.searchContext, search);
  const base = { "@/services/travel/providerResultCache": cache, "@/services/travel/hotelInventorySource": { isProviderHotelResult: (value: NormalizedHotelResult) => value.provider === "KAYAK sandbox" }, "@/lib/hotels/kayakHotelLocation": { kayakHotelLocationDetails: () => ({ address: "Synthetic address" }) }, "@/lib/searchCache": { getHotelFromCache: () => null, getHotelDetailsCacheContext: () => null, getFlightFromCache: async () => null, toPublicHotel: (value: NormalizedHotelResult) => ({ id: value.id, name: value.name }) } };
  const details = load<{ GET: (request: Request) => Promise<Response> }>("src/app/api/hotels/details/route.ts", { ...base, "next/server": { NextResponse: { json: Response.json } }, "@/lib/hotels/hotelOccupancy": { hotelOccupancy } });
  // Match native's existing subset: no destinationId or adults/children split.
  const query = new URLSearchParams({ id: hotel.id, destination: search.destination, checkIn: search.checkIn, checkOut: search.checkOut, guests: "2", rooms: "1" });
  const detailResponse = await details.GET(new Request("https://example.test/api/hotels/details?" + query));
  assert.equal(detailResponse.status, 200); const detail = await detailResponse.json(); assert.equal(detail.hotel.id, hotel.id); assert.equal(detail.propertyOffers.length, 1);
  const location = load<{ resolveHotelLocation: (id: string) => Promise<{ hotelName: string } | null> }>("src/services/travel/hotelLocationResolver.ts", { ...base, "./hotelInventorySource": base["@/services/travel/hotelInventorySource"] });
  assert.equal((await location.resolveHotelLocation(hotel.id))?.hotelName, hotel.name);
  const redirect = load<{ POST: (request: Request) => Promise<Response> }>("src/app/api/redirect/route.ts", { ...base,
    "next/server": { after: () => {}, NextResponse: { json: Response.json } }, "@/lib/productionSandboxPolicy": { productionSandboxHost: () => false },
    "@/lib/stagingSafety": { isStagingEnvironment: () => true }, "@/lib/hotels/hotelResultAvailability": { getHotelPriceDetails: () => ({ totalPrice: 100, currency: "USD" }) },
    "@/services/travel/flightRedirectHandoff": {}, "@/services/travel/kayakSandboxPublic": { sandboxBookingUrl: (url: string) => url },
    "@/services/providerHandoffActivity": {}, "@/services/providerHandoffStore": { handoffTrackingId: () => undefined },
    "@/services/travel/hotelOperationalBinding": { kayakHotelSnapshot: () => snapshot },
  });
  const redirected = await redirect.POST(new Request("https://example.test/api/redirect", { method: "POST", body: JSON.stringify({ type: "hotel", id: hotel.id }) }));
  assert.equal(redirected.status, 200); assert.deepEqual(await redirected.json(), { url: hotel.bookingUrl });
});

test("durable lookup rejects wrong snapshots, corrupt/incomplete generations and expired metadata", async () => {
  const f = fixture(); const cache = f.restart(); assert.equal(await cache.rememberHotelSearchCohort([hotel], search), true);
  assert.equal(await cache.getProviderResult("hotel", hotel.id.replace(snapshot, "00000000-0000-4000-8000-000000000002")), null);
  const index = [...f.rows.entries()].find(([key]) => key.includes("__hotel-snapshot-lookup"))!;
  const original = index[1].normalizedResult; index[1].normalizedResult = { format: "hotel-snapshot-lookup-v1", cohortId: "other-search" };
  assert.equal(await cache.getProviderResult("hotel", hotel.id), null); index[1].normalizedResult = original;
  index[1].expiresAt = new Date(0); assert.equal(await cache.getProviderResultWithContext("hotel", hotel.id), null); index[1].expiresAt = new Date(Date.now() + 60000);
  const chunk = [...f.rows.keys()].find(key => key.includes(":snapshot:") && key.includes(":chunk:"))!; f.rows.delete(chunk);
  assert.equal(await f.restart().getProviderResult("hotel", hotel.id), null);
});

test("lookup publication is mandatory and deferral defaults off for old rolling readers", async () => {
  const f = fixture(); f.fail(); assert.equal(await f.restart().rememberHotelSearchCohort([hotel], search), false);
  assert.equal([...f.rows.keys()].some(key => key.includes("__hotel-snapshot-lookup")), false);
  assert.equal([...f.rows.keys()].some(key => key.endsWith(":snapshot:" + snapshot)), false);
  const route = readFileSync("src/app/api/mobile/v1/hotels/progressive/route.ts", "utf8");
  assert.match(route, /defer:process\.env\.HOTEL_DEFER_INDIVIDUAL_WRITES === "true" \? after : undefined/);
  // Legacy individual rows remain valid through the rollout before activation.
  f.rows.set("hotel:" + hotel.id, { normalizedResult: hotel, searchContext: search, expiresAt: new Date(Date.now() + 60000) });
  assert.deepEqual(await f.restart().getProviderResult("hotel", hotel.id), hotel);
});
