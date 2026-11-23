import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const file = "prisma/migrations/20261123170000_reconcile_staging_historical_searches/migration.sql";
const sql = readFileSync(file, "utf8");

test("staging-only historical correction guards the old cohort and does not delete audit records", () => {
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(sql, /current_database\(\)\s*=\s*'kurioticket_web_staging'/);
  assert.match(sql, /'2026-11-16T14:27:53Z'/);
  assert.match(sql, /'2026-11-23T14:27:53Z'/);
  assert.match(sql, /'staging'/);
  assert.match(sql, /applicationSource'='UNKNOWN'\) <> 602/);
  assert.match(sql, /RAISE EXCEPTION 'Staging historical source cohort drift/);
  assert.match(sql, /ADD COLUMN "countAsSearch" BOOLEAN NOT NULL DEFAULT TRUE/);
  assert.match(sql, /SET "countAsSearch" = \(r\.rn = 1\)/);
  assert.match(sql, /parentSearchHistoryId/);
  assert.match(sql, /corrected<>513 OR hidden<>408/);
  assert.doesNotMatch(sql, /\b(?:DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});

test("manifest precisely counts 48 batches as 48 canonical searches, without treating okhttp as Bots", () => {
  const group = sql.match(/WITH manifest \(session_hash, expected_count, source, observed_client, evidence\) AS \(\s*VALUES([\s\S]*?)\n\),\nbatches AS/);
  assert.ok(group);
  const lines = [...group[1].matchAll(/\('([a-f0-9]{32})',\s*(\d+),\s*'(BOT|UNKNOWN|IOS|ANDROID)',\s*'([A-Z_]+)',\s*'([A-Z_0-9]+)'\)/g)];
  assert.equal(lines.length, 48);
  assert.equal(new Set(lines.map(m => m[1])).size, 48);
  assert.equal(lines.reduce((n,m) => n + Number(m[2]), 0), 456);
  assert.equal(lines.reduce((n,m) => n + Number(m[2]) - 1, 0), 408);
  for (const [source, expected] of Object.entries({ BOT: 40, IOS: 2, ANDROID: 2, UNKNOWN: 4 })) {
    assert.equal(lines.filter(m => m[3] === source).length, expected);
  }
  const uncertain = lines.filter(m => m[4] === "ANDROID_HTTP_CLIENT" && m[5] === "OKHTTP_REQUEST_UA_ONLY");
  assert.equal(uncertain.length, 3, "Android clients without native API proof are not silently reclassified");
  assert.ok(uncertain.every(m => m[3] === "UNKNOWN"));
  assert.match(sql, /b\.dates = b\.n AND b\.routes = 1 AND b\.products = 1/);
  assert.match(sql, /b\.n BETWEEN 4 AND 10 AND b\.span <= 60/);
});

test("singleton evidence is exhaustive for investigated request-log matches and preserves source history", () => {
  const hotel = sql.match(/WITH singleton_evidence \(search_id, old_source, crawler, recorded_at\) AS \(\s*VALUES([\s\S]*?)\n\)\nUPDATE/);
  assert.ok(hotel);
  const hotels = [...hotel[1].matchAll(/\('([a-z0-9]+)',\s*'(UNKNOWN)',\s*'(GOOGLEBOT)',\s*TIMESTAMPTZ\s*'([^']+)'\)/g)];
  assert.equal(hotels.length, 44);
  const other = sql.match(/WITH singleton_evidence \(search_id, recorded_at, old_source, new_source, observed_client, evidence\) AS \(\s*VALUES([\s\S]*?)\n\)\nUPDATE/);
  assert.ok(other);
  const others = [...other[1].matchAll(/\('([a-z0-9]+)',\s*TIMESTAMPTZ\s*'([^']+)',\s*'(UNKNOWN|WEB)',\s*'(BOT|IOS)',\s*'([A-Z_]+)',\s*'([A-Z_0-9]+)'\)/g)];
  assert.equal(others.length, 13);
  assert.equal(others.filter(m => m[4] === "BOT").length, 9);
  assert.equal(others.filter(m => m[4] === "IOS").length, 4);
  assert.equal(others.filter(m => m[3] === "WEB" && m[4] === "BOT" && m[5] === "PERPLEXITYBOT").length, 1);
  assert.match(sql, /originalApplicationSource/);
  assert.match(sql, /DECLARED_USER_AGENT/);
  assert.match(sql, /ONE_SEARCH_ROW_PRESERVED/);
});


const alltimeSql = readFileSync(
  "prisma/migrations/20261123180000_alltime_nearby_fare_search_counts/migration.sql",
  "utf8",
);

test("all-time staging-only reconciliation preserves sources and raw search rows", () => {
  assert.match(alltimeSql, /BEGIN;[\s\S]+COMMIT;/);
  assert.match(alltimeSql, /current_database\(\)\s*<>\s*'kurioticket_web_staging'/);
  assert.match(alltimeSql, /IF current_database\(\) <> 'kurioticket_web_staging' THEN\s+RETURN;/);
  assert.match(alltimeSql, /"countAsSearch"=\(c\.rn=1\)/);
  assert.match(alltimeSql, /parentSearchHistoryId/);
  assert.match(alltimeSql, /already_excluded=0/);
  assert.match(alltimeSql, /last_at<TIMESTAMPTZ '2026-11-23T14:18:27Z'/);
  assert.match(alltimeSql, /originalApplicationSource/);
  assert.doesNotMatch(alltimeSql, /SET\s+[^;]*applicationSource.*=/);
  assert.doesNotMatch(alltimeSql, /\b(?:DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE)\b/i);
});

test("all-time nearby-fare correction requires strong per-session or date-strip evidence", () => {
  assert.match(alltimeSql, /n BETWEEN 4 AND 10/);
  assert.match(alltimeSql, /products=1 AND product='FLIGHT' AND routes=1/);
  assert.match(alltimeSql, /departure_dates=n AND max_departure-min_departure=n-1/);
  assert.match(alltimeSql, /stable_queries=1/);
  assert.match(alltimeSql, /users=1 AND visitors=1/);
  assert.match(alltimeSql, /n BETWEEN 8 AND 10/);
  assert.match(alltimeSql, /dates=n AND max_dep-min_dep=n-1/);
  assert.match(alltimeSql, /last_at-first_at<INTERVAL '20 seconds'/);
  assert.match(alltimeSql, /query->>'applicationSource' IS NULL/);
  assert.match(alltimeSql, /"countAsSearch"=TRUE/);
  assert.match(alltimeSql, /parentSelection','EARLIEST_RECORDED_RESULT_NOT_PROVEN_USER_SELECTED_DATE'/);
});

test("all-time audit baseline is fail-closed and excludes 9,355 child rows", () => {
  assert.match(alltimeSql, /session_groups<>563 OR session_rows<>4955/);
  assert.match(alltimeSql, /legacy_groups<>565 OR legacy_rows<>5528 OR child_rows<>9355/);
  assert.match(alltimeSql, /updated_rows<>10483/);
  assert.match(alltimeSql, /verified_children<>9355/);
  assert.match(alltimeSql, /RAISE EXCEPTION 'All-time reconciliation baseline drift/);
  assert.match(alltimeSql, /RAISE EXCEPTION 'All-time reconciliation update row count/);
  assert.match(alltimeSql, /RAISE EXCEPTION 'All-time reconciled child count/);
});
