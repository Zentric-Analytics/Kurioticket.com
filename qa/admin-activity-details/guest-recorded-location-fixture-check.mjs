import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

// Run the production SQL builder and location reader against the same synthetic
// Prisma fixture used by Next. This catches incompatible raw-query responses
// before starting Chromium, without replacing the production location reader.
const qa = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(qa, "../..");
const jiti = createJiti(import.meta.url, { alias: {
  "server-only": path.join(repo, "node_modules/next/dist/compiled/server-only/empty.js"),
  "@/lib/prisma": path.join(qa, "old-drawer-fixture.js"),
  "@": path.join(repo, "src"),
} });
const { loadAdminGuestRecordedLocations, guestRecordedLocationKey } = await jiti.import(path.join(repo, "src/services/adminGuestRecordedLocationsService.ts"));
const { guestLatestRecordedLocationsSql } = await jiti.import(path.join(repo, "src/lib/adminGuestAccessSql.ts"));
const { Prisma } = await jiti.import(path.join(repo, "src/generated/prisma/client.ts"));
const { getOptionalPrisma } = await jiti.import(path.join(qa, "old-drawer-fixture.js"));
const db = getOptionalPrisma();
const owner = "12345678-1234-4123-8123-123456789abc";
const other = "22345678-1234-4123-8123-123456789abc";
const absent = "32345678-1234-4123-8123-123456789abc";
const now = new Date();
const all = { range: "all", page: 1 };
const key = id => guestRecordedLocationKey(id, "operational");

test("the real guest location query receives typed, dated operational evidence", async () => {
  const rows = await db.$queryRaw(guestLatestRecordedLocationsSql([owner], all, "staging", now));
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["guestId", "guestSource", "evidence", "locationLabel", "recordedCountryCode", "at"].sort());
  assert.equal(rows[0].guestId, owner);
  assert.equal(rows[0].guestSource, "operational");
  assert.equal(rows[0].evidence, "search");
  assert.equal(rows[0].recordedCountryCode, "NG");
  assert.equal(rows[0].locationLabel, null);
  assert.ok(rows[0].at instanceof Date && rows[0].at <= now);
  const result = await loadAdminGuestRecordedLocations([owner], all, "staging", now);
  assert.deepEqual([...result.keys()], [key(owner)]);
  assert.equal(result.get(key(owner)).label, "Nigeria");
  assert.equal(+result.get(key(owner)).at, +rows[0].at);
  assert.equal(result.has(guestRecordedLocationKey(owner, "consented")), false);
});

test("the fixture returns locations only for requested eligible identities", async () => {
  assert.equal((await loadAdminGuestRecordedLocations([absent, "qa-page-history-guest"], all, "staging", now)).size, 0);
  const result = await loadAdminGuestRecordedLocations([other, other], all, "staging", now);
  assert.deepEqual([...result.keys()], [key(other)]);
  assert.equal(result.get(key(other)).label, "Nigeria");
});

test("the fixture preserves the environment boundary", async () => {
  assert.equal((await loadAdminGuestRecordedLocations([owner, other], all, "production", now)).size, 0);
});

test("the fixture respects the actual requested date window", async () => {
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const history = { range: "custom", page: 1, from: yesterday, to: yesterday };
  assert.equal((await loadAdminGuestRecordedLocations([owner], history, "staging", now)).size, 0);
  assert.equal((await loadAdminGuestRecordedLocations([owner], { range: "today", page: 1 }, "staging", now)).get(key(owner)).label, "Nigeria");
});

test("the fixture respects platform scope without inventing another device", async () => {
  assert.equal((await loadAdminGuestRecordedLocations([owner], { ...all, platform: "ios" }, "staging", now)).size, 0);
  assert.equal((await loadAdminGuestRecordedLocations([owner], { ...all, platform: "android" }, "staging", now)).get(key(owner)).label, "Nigeria");
  for (const platform of ["desktop", "mobile", "ios", "android", "web"]) {
    assert.equal((await loadAdminGuestRecordedLocations([other], { ...all, platform }, "staging", now)).get(key(other)).label, "Nigeria");
  }
});

test("account presence responses remain separate and owner scoped", async () => {
  const statement = (userId, environment, ids) => Prisma.sql`
    SELECT s."id", COALESCE(BOOL_OR(p."accountSessionId" IS NOT NULL), FALSE) AS "online"
    FROM "AccountSession" s LEFT JOIN "OnlinePresenceSession" p ON p."accountSessionId" = s."id"
      AND p."environment" = ${environment}
    WHERE s."userId" = ${userId} AND s."id" IN (${Prisma.join(ids)}) GROUP BY s."id"`;
  assert.deepEqual(await db.$queryRaw(statement("qa-registered-0001", "staging", ["qa-device-0", "qa-device-2"])), [
    { id: "qa-device-0", online: true }, { id: "qa-device-2", online: false },
  ]);
  assert.deepEqual(await db.$queryRaw(statement("qa-registered-0001", "staging", ["qa-device-2"])), [{ id: "qa-device-2", online: false }]);
  assert.deepEqual(await db.$queryRaw(statement("unknown-user", "staging", ["qa-device-0"])), []);
  assert.deepEqual(await db.$queryRaw(statement("qa-registered-0001", "production", ["qa-device-0"])), []);
});

test("unknown raw queries cannot silently receive another reader's response", async () => {
  await assert.rejects(db.$queryRaw(Prisma.sql`SELECT 1`), /Unsupported synthetic database query/);
});
