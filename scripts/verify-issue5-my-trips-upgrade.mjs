import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationName = "20260810160000_my_trips_metasearch_boundary";
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("DATABASE_URL is required for the Issue 5 upgrade migration test.");
const source = new URL(sourceUrl);
const databaseName = `kurioticket_issue5_${process.pid}_${Date.now()}`;
const adminUrl = new URL(source); adminUrl.pathname = "/postgres"; adminUrl.search = "";
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`; testUrl.search = "";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
let db;
try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${databaseName}"`);
  db = new pg.Client({ connectionString: testUrl.toString() }); await db.connect();
  const directories = (await readdir("prisma/migrations", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const index = directories.indexOf(migrationName); assert.notEqual(index, -1);
  for (const directory of directories.slice(0, index)) await db.query(await readFile(path.join("prisma/migrations", directory, "migration.sql"), "utf8"));
  await db.query(`
    INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('issue5-a','a@example.test',now()),('issue5-b','b@example.test',now());
    INSERT INTO "TripBooking" ("id","userId","bookingReference","provider","tripType","status","origin","destination","departureDate","returnDate","passengerCount","currency","totalAmount","externalBookingId","createdAt","updatedAt") VALUES
      ('flight-upcoming','issue5-a','DL123','Delta','FLIGHT','UPCOMING','LAX','JFK','2026-09-01',null,2,'USD',501.25,'delta-trip-1','2026-01-01','2026-01-02'),
      ('hotel-past','issue5-a','HOTEL9','Example Hotel','HOTEL','PAST',null,'Paris','2026-02-01','2026-02-04',1,'EUR',300,null,'2026-01-03','2026-01-04'),
      ('cancelled-car','issue5-a','CAR7','Example Cars','CAR','CANCELLED','SFO','SFO','2026-04-01',null,1,'USD',75,'car-trip-7','2026-01-05','2026-01-06'),
      ('other-user-package','issue5-b','PACK8','Example Travel','PACKAGE','UPCOMING','SEA','LHR','2026-10-01','2026-10-10',3,'USD',2500,null,'2026-01-07','2026-01-08');
  `);
  const before = Number((await db.query(`SELECT count(*) FROM "TripBooking"`)).rows[0].count);
  for (const directory of directories.slice(index)) await db.query(await readFile(path.join("prisma/migrations", directory, "migration.sql"), "utf8"));
  const rows = (await db.query(`SELECT * FROM "MyTrip" ORDER BY "id"`)).rows;
  const after = rows.length;
  assert.equal(before, 4); assert.equal(after, 4);
  assert.deepEqual(rows.map((row) => row.id), ["cancelled-car", "flight-upcoming", "hotel-past", "other-user-package"]);
  assert.equal(rows.find((row) => row.id === "flight-upcoming").userId, "issue5-a");
  assert.equal(rows.find((row) => row.id === "flight-upcoming").providerConfirmationCode, "DL123");
  assert.equal(rows.find((row) => row.id === "flight-upcoming").providerTripId, "delta-trip-1");
  assert.ok(rows.every((row) => row.source === "MIGRATED_LEGACY" && row.providerManageUrl === null));
  const oldTable = Number((await db.query(`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='TripBooking'`)).rows[0].count);
  const oldEnums = Number((await db.query(`SELECT count(*) FROM pg_type WHERE typname IN ('TripBookingType','TripBookingStatus')`)).rows[0].count);
  assert.equal(oldTable, 0); assert.equal(oldEnums, 0);
  await db.query(`
    INSERT INTO "MyTrip" ("id","userId","providerName","providerConfirmationCode","tripType","status","source","partnerConversionId","destination","departureDate","travelerCount","currency","createdAt","updatedAt") VALUES
      ('provider-a-shared','issue5-a','Provider A','A-SHARED','FLIGHT','UPCOMING','PARTNER_CONFIRMATION','shared-conversion','JFK','2026-11-01',1,'USD',now(),now()),
      ('provider-b-shared','issue5-b','Provider B','B-SHARED','HOTEL','UPCOMING','PARTNER_CONFIRMATION','shared-conversion','Paris','2026-11-02',1,'EUR',now(),now());
  `);
  await assert.rejects(
    db.query(`INSERT INTO "MyTrip" ("id","userId","providerName","providerConfirmationCode","tripType","status","source","partnerConversionId","destination","departureDate","travelerCount","currency","createdAt","updatedAt") VALUES ('provider-a-duplicate','issue5-a','Provider A','A-DUP','FLIGHT','UPCOMING','PARTNER_CONFIRMATION','shared-conversion','LAX','2026-11-03',1,'USD',now(),now())`),
    /duplicate key value violates unique constraint/,
  );
  const scopedIndex = Number((await db.query(`SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname='MyTrip_providerName_partnerConversionId_key'`)).rows[0].count);
  assert.equal(scopedIndex, 1);
  console.log(`legacy TripBooking rows: ${before}`); console.log(`MyTrip rows after upgrade: ${after}`);
  console.log("Issue 5 MyTrip upgrade verified: 4 -> 4 rows; IDs, owners, confirmations, provider IDs, itinerary data, and timestamps preserved; URLs remain null.");
  console.log("Provider-scoped conversion identity verified: shared IDs across providers succeed; duplicates within one provider fail.");
} finally {
  if (db) await db.end().catch(() => {});
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`).catch(() => {});
  await admin.end().catch(() => {});
}
