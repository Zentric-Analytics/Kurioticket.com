import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationName = "20260810000000_unify_four_travel_systems";
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("DATABASE_URL is required for the Issue 3 upgrade migration test.");
const source = new URL(sourceUrl);
const databaseName = `kurioticket_issue3_${process.pid}_${Date.now()}`;
const adminUrl = new URL(source); adminUrl.pathname = "/postgres"; adminUrl.search = "";
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`; testUrl.search = "";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
let db;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  db = new pg.Client({ connectionString: testUrl.toString() });
  await db.connect();
  const directories = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  for (const directory of directories) {
    if (directory === migrationName) break;
    const sql = await readFile(path.join("prisma/migrations", directory, "migration.sql"), "utf8");
    await db.query(sql);
  }

  await db.query(`
    INSERT INTO "User" ("id", "email", "updatedAt") VALUES
      ('u1','u1@example.test',now()),('u2','u2@example.test',now()),('u3','u3@example.test',now()),('u4','u4@example.test',now()),('u5','u5@example.test',now());
    INSERT INTO "SavedTrip" ("id","userId","name","startsAt","endsAt","destination","payload","createdAt","updatedAt") VALUES
      ('st-linked','u1','Linked plan','2030-01-01','2030-01-03','LAX','{"kind":"flight"}', '2025-01-01',now()),
      ('st-flight','u1','Flight plan','2030-02-01','2030-02-04','SFO','{"type":"flight","note":"keep me"}', '2025-01-02',now()),
      ('st-hotel','u2','Hotel plan','2030-03-01','2030-03-05','Paris','{"type":"HOTEL","rooms":2}', '2025-01-03',now());
    INSERT INTO "SavedSearch" ("id","userId","type","label","origin","destination","query","createdAt","savedTripId") VALUES
      ('ss-linked','u1','FLIGHT','Linked','JFK','LAX','{"departureDate":"2030-01-01"}','2025-01-01','st-linked'),
      ('ss-dedupe','u1','FLIGHT','Existing','JFK','LHR','{"departureDate":"2030-04-01"}','2025-01-01',null),
      ('ss-watch-a','u1','FLIGHT','A','JFK','SFO','{"departureDate":"2030-05-01"}','2025-01-01',null),
      ('ss-watch-p','u2','FLIGHT','P','LAX','SEA','{"departureDate":"2030-05-02"}','2025-01-01',null),
      ('ss-watch-e','u3','FLIGHT','E','ORD','MIA','{"departureDate":"2030-05-03"}','2025-01-01',null),
      ('ss-watch-x','u4','FLIGHT','X','BOS','DFW','{"departureDate":"2030-05-04"}','2025-01-01',null);
    INSERT INTO "TravelWatchlist" ("id","userId","type","label","origin","destination","query","createdAt") VALUES
      ('tw-dupe','u1','FLIGHT','Duplicate','JFK','LHR','{"departureDate":"2030-04-01"}','2024-01-01'),
      ('tw-new','u2','HOTEL','Hotel retained',null,'Rome','{"checkIn":"2030-06-01"}','2024-01-02');
    INSERT INTO "RouteWatchState" ("id","userId","savedSearchId","status","baselinePrice","baselineCurrency","lastSeenPrice","lastSeenCurrency","lastProvider","lastNotifiedPrice","lastNotifiedAt","lastCheckedAt","nextCheckAt","consecutiveFailures","lastErrorCode","createdAt","updatedAt") VALUES
      ('rw-a','u1','ss-watch-a','ACTIVE',500,'USD',450,'USD','provider-a',425,'2025-02-01','2025-02-02','2030-01-01',0,null,'2025-01-01','2025-02-02'),
      ('rw-p','u2','ss-watch-p','PAUSED',400,'USD',390,'USD','provider-b',null,null,'2025-02-02',null,1,'timeout','2025-01-01','2025-02-02'),
      ('rw-e','u3','ss-watch-e','EXPIRED',300,'USD',280,'USD','provider-c',null,null,'2025-02-02',null,0,null,'2025-01-01','2025-02-02'),
      ('rw-x','u4','ss-watch-x','ERROR',200,'USD',190,'USD','provider-d',null,null,'2025-02-02',null,3,'provider','2025-01-01','2025-02-02');
    INSERT INTO "PriceAlert" ("id","userId","type","origin","destination","targetPrice","currency","status","query","createdAt","updatedAt") VALUES
      ('target-existing','u1','FLIGHT','JFK','LAX',350,'USD','ACTIVE','{"departureDate":"2030-01-01"}','2025-01-01','2025-01-01');
    INSERT INTO "Notification" ("id","userId","type","channel","title","body","eventKey","actionPath","readAt","createdAt") VALUES
      ('n-price','u1','PRICE_ALERT','IN_APP','Price alert','Body','event-price','/price-alerts',null,'2025-01-01'),
      ('n-watch','u1','ROUTE_WATCH','IN_APP','Route watch update','route watch body','event-watch','/saved','2025-02-01','2025-01-02'),
      ('n-reminder','u2','TRIP_REMINDER','IN_APP','Saved trip reminder','Your saved trip is near','event-reminder','/obsolete-saved-trip','2025-02-02','2025-01-03');
    INSERT INTO "TravelPreferences" ("id","userId","notificationPreferences","updatedAt") VALUES
      ('tp1','u1','{"email":{"priceAlerts":false,"routeWatchUpdates":false,"savedTripReminders":true}}',now()),
      ('tp2','u2','{"email":{"priceAlerts":true,"routeWatchUpdates":false,"savedTripReminders":false}}',now()),
      ('tp3','u3','{"email":{"priceAlerts":false,"routeWatchUpdates":true,"savedTripReminders":false}}',now()),
      ('tp4','u4','{"email":{"priceAlerts":true,"routeWatchUpdates":true,"savedTripReminders":true}}',now()),
      ('tp5','u5','{"email":{"savedTripReminders":true}}',now());
    INSERT INTO "FeatureFlag" ("id","key","environment","name","enabled","scope","updatedAt") VALUES
      ('ff-rw','ROUTE_WATCH_ENABLED','STAGING','old',true,'GLOBAL',now()),
      ('ff-rwp','ROUTE_WATCH_PROCESSING_ENABLED','PRODUCTION','old',true,'GLOBAL',now()),
      ('ff-str','SAVED_TRIP_REMINDERS_ENABLED','STAGING','old',true,'GLOBAL',now()),
      ('ff-pa','PRICE_ALERTS_ENABLED','STAGING','keep',true,'GLOBAL',now());
    INSERT INTO "AdminAuditLog" ("id","adminEmail","action","targetType","targetId","createdAt") VALUES ('audit-old','admin@example.test','FEATURE_FLAG_UPDATED','FeatureFlag','ff-rw','2025-01-01');
  `);
  const issue3Sql = await readFile(path.join("prisma/migrations", migrationName, "migration.sql"), "utf8");
  await db.query(issue3Sql);

  const scalar = async (sql, params=[]) => Number((await db.query(sql, params)).rows[0].count);
  assert.equal(await scalar(`SELECT count(*) FROM "SavedSearch" WHERE "id"='legacy-watchlist-tw-new'`), 1);
  assert.equal(await scalar(`SELECT count(*) FROM "SavedSearch" WHERE "id"='legacy-watchlist-tw-dupe'`), 0);
  assert.equal(await scalar(`SELECT count(*) FROM "PriceAlert" WHERE "savedSearchId"='legacy-watchlist-tw-new'`), 0);
  assert.equal(await scalar(`SELECT count(*) FROM "SavedSearch" WHERE "id" IN ('legacy-saved-st-flight','legacy-saved-st-hotel')`), 2);
  assert.equal(await scalar(`SELECT count(*) FROM "SavedSearch" WHERE "id"='ss-linked'`), 1);
  assert.equal(await scalar(`SELECT count(*) FROM "PriceAlert" WHERE "mode"='AUTOMATIC'`), 4);
  assert.equal(await scalar(`SELECT count(*) FROM "PriceAlert" WHERE "id"='target-existing' AND "mode"='TARGET'`), 1);
  const statuses = (await db.query(`SELECT "status"::text FROM "PriceAlert" WHERE "mode"='AUTOMATIC' ORDER BY "id"`)).rows.map(row => row.status);
  assert.deepEqual(statuses, ['ACTIVE','EXPIRED','PAUSED','PAUSED']);
  const notifications = await db.query(`SELECT "id","type"::text,"eventKey","readAt","actionPath" FROM "Notification" ORDER BY "id"`);
  assert.deepEqual(notifications.rows.map(row => [row.id,row.type]), [['n-price','PRICE_ALERT'],['n-reminder','TRAVEL_INSIGHT'],['n-watch','PRICE_ALERT']]);
  assert.equal(notifications.rows.find(row => row.id === 'n-reminder').actionPath, '/saved');
  assert.ok(notifications.rows.find(row => row.id === 'n-reminder').readAt);
  assert.equal(notifications.rows.find(row => row.id === 'n-watch').eventKey, 'event-watch');
  const consent = await db.query(`SELECT "userId", "notificationPreferences"->'email'->>'priceAlerts' AS value, "notificationPreferences"->'email' ? 'savedTripReminders' AS reminder FROM "TravelPreferences" ORDER BY "userId"`);
  assert.deepEqual(consent.rows.map(row => [row.userId,row.value,row.reminder]), [['u1','false',false],['u2','true',false],['u3','true',false],['u4','true',false],['u5','false',false]]);
  assert.equal(await scalar(`SELECT count(*) FROM "FeatureFlag"`), 1);
  assert.equal(await scalar(`SELECT count(*) FROM "AdminAuditLog" WHERE "id"='audit-old'`), 1);
  for (const table of ['TravelWatchlist','SavedTrip','RouteWatchState']) assert.equal(await scalar(`SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [table]), 0);
  console.log("Issue 3 upgrade migration verified: saved data, alert states, notification history, consent, flags, and audit invariants passed.");
} finally {
  if (db) await db.end().catch(() => {});
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`).catch(() => {});
  await admin.end().catch(() => {});
}
