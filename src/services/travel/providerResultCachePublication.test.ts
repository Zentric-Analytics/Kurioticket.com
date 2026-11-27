import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createHash } from "node:crypto";
test("failed required individual publication fails closed while optional legacy writes remain best effort", async () => {
  let attempts = 0; let partialWrite = false;
  const firstSnapshot = "00000000-0000-4000-8000-000000000001";
  const otherSnapshot = "00000000-0000-4000-8000-000000000002";
  let exactAvailable = true;
  const first = { id: `kayak-sandbox:${firstSnapshot}:one` };
  const other = { id: `kayak-sandbox:${otherSnapshot}:two` };
  const compiled = ts.transpileModule(readFileSync("src/services/travel/providerResultCache.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = {
    "@/lib/productionSandboxPolicy": { productionSandboxInventory: () => false },
    "node:crypto": { createHash }, "@/lib/hotels/hotelOccupancy": { hotelOccupancy: () => ({ adults: 2, children: 0 }) }, "@/lib/search/cohortEncoding": {},
    "@/lib/prisma": { getPrisma: () => ({
      $transaction: async (task: (db: { $executeRaw: () => Promise<number> }) => Promise<void>) => { attempts++; if (!partialWrite) throw Error("private database details"); return task({ $executeRaw: async () => 0 }); },
      providerResultCache: { findUnique: async ({ where }: { where: { cacheKey: string } }) => {
        if (where.cacheKey.includes(":snapshot:")) return exactAvailable ? { expiresAt: new Date(Date.now() + 60000), normalizedResult: [first] } : null;
        return { expiresAt: new Date(Date.now() + 60000), normalizedResult: [other] };
      } },
    }) },
    "@/lib/search/cacheWriteGate": { runCacheWrite: (task: () => Promise<void>) => task() },
    "@/lib/search/publishCohort": {}, "./publishHotelCohortAliases": {},
    "@/generated/prisma/client": { Prisma: { sql: () => ({}), join: () => ({}) } },
  };
  const exported: { rememberProviderResults?: (...args: unknown[]) => Promise<void>; getHotelSearchSnapshotCohort?: (...args: unknown[]) => Promise<{ id: string }[]> } = {};
  runInNewContext(compiled, { exports: exported, require: (key: string) => { assert.ok(key in dependencies, key); return dependencies[key]; }, console: { error: () => {} }, Date, Map, performance, structuredClone });
  await assert.doesNotReject(exported.rememberProviderResults!("hotel", [{ id: "synthetic" }], {}, Date.now()));
  await assert.rejects(exported.rememberProviderResults!("hotel", [{ id: "synthetic" }], {}, Date.now(), { requireComplete: true }), /Provider inventory publication unavailable/);
  partialWrite = true;
  await assert.rejects(exported.rememberProviderResults!("hotel", [{ id: "synthetic" }], {}, Date.now(), { requireComplete: true }), /Provider inventory publication unavailable/);
  assert.equal(attempts, 3);
  const search = { destination: "New York", checkIn: "2099-12-25", checkOut: "2099-12-29", guests: 2, rooms: 1 };
  assert.deepEqual(await exported.getHotelSearchSnapshotCohort!(search, firstSnapshot), [first]);
  exactAvailable = false;
  assert.deepEqual(await exported.getHotelSearchSnapshotCohort!(search, firstSnapshot), []);
  const invalid = await exported.getHotelSearchSnapshotCohort!(search, "invalid");
  assert.ok(Array.isArray(invalid)); assert.equal(invalid.length, 0);
});
