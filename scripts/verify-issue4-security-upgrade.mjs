import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationName = "20260810120000_unified_account_security";
const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl)
  throw new Error(
    "DATABASE_URL is required for the Issue 4 upgrade migration test.",
  );
const source = new URL(sourceUrl);
const databaseName = `kurioticket_issue4_${process.pid}_${Date.now()}`;
const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
adminUrl.search = "";
const testUrl = new URL(source);
testUrl.pathname = `/${databaseName}`;
testUrl.search = "";
const admin = new pg.Client({ connectionString: adminUrl.toString() });
let db;

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  db = new pg.Client({ connectionString: testUrl.toString() });
  await db.connect();

  const directories = (
    await readdir("prisma/migrations", { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const migrationIndex = directories.indexOf(migrationName);
  assert.notEqual(migrationIndex, -1, `${migrationName} must exist`);
  for (const directory of directories.slice(0, migrationIndex)) {
    const sql = await readFile(
      path.join("prisma/migrations", directory, "migration.sql"),
      "utf8",
    );
    await db.query(sql);
  }

  await db.query(`
    INSERT INTO "User" ("id", "email", "emailVerified", "status", "updatedAt") VALUES
      ('issue4-user-a', 'active-verified@example.test', '2026-01-01T00:00:00Z', 'ACTIVE', now()),
      ('issue4-user-b', 'unverified@example.test', null, 'ACTIVE', now()),
      ('issue4-user-c', 'two-factor@example.test', '2026-01-02T00:00:00Z', 'ACTIVE', now()),
      ('issue4-user-d', 'suspended@example.test', '2026-01-03T00:00:00Z', 'SUSPENDED', now()),
      ('issue4-user-e', 'pending-deletion@example.test', '2026-01-04T00:00:00Z', 'PENDING_DELETION', now());

    INSERT INTO "UserSecuritySettings" (
      "id", "userId", "twoFactorEnabled", "twoFactorMethod", "twoFactorSecretEncrypted",
      "twoFactorLastUsedStep", "recoveryCodesHash", "twoFactorEnabledAt", "createdAt", "updatedAt"
    ) VALUES (
      'issue4-security-c', 'issue4-user-c', true, 'TOTP', 'v1:test-safe-ciphertext',
      424242, '["sha256:test-recovery-1","sha256:test-recovery-2"]',
      '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z', '2026-01-06T00:00:00Z'
    );

    INSERT INTO "UserSessionActivity" (
      "id", "userId", "sessionTokenHash", "userAgent", "maskedIp", "deviceLabel",
      "browser", "os", "locationLabel", "lastSeenAt", "createdAt", "revokedAt"
    ) VALUES
      ('activity-a-web', 'issue4-user-a', 'hash-a-web', 'Fixture Browser A', '203.0.113.xxx', 'Laptop A',
       'Chrome', 'Windows', 'Seattle, WA', '2026-02-03T04:05:06Z', '2026-02-01T00:00:00Z', null),
      ('activity-a-phone', 'issue4-user-a', 'hash-a-phone', 'Fixture Browser B', '198.51.100.xxx', 'Phone A',
       'Safari', 'iOS', 'Portland, OR', '2026-02-04T05:06:07Z', '2026-02-02T00:00:00Z', '2026-02-04T06:00:00Z'),
      ('activity-c-tablet', 'issue4-user-c', 'hash-c-tablet', 'Fixture Browser C', '192.0.2.xxx', 'Tablet C',
       'Firefox', 'Android', null, '2026-02-05T06:07:08Z', '2026-02-03T00:00:00Z', null);

    INSERT INTO "Session" ("id", "sessionToken", "userId", "expires") VALUES
      ('legacy-mobile-c', 'c.deterministic-test-secret', 'issue4-user-a', '2030-01-01T00:00:00Z'),
      ('legacy-mobile-g', 'g.deterministic-test-secret', 'issue4-user-c', '2030-01-01T00:00:00Z'),
      ('adapter-preserved', 'adapter-session-preserve-fixture', 'issue4-user-b', '2030-01-01T00:00:00Z');
  `);

  const scalar = async (sql, params = []) =>
    Number((await db.query(sql, params)).rows[0].count);
  const before = {
    users: await scalar(`SELECT count(*) FROM "User"`),
    activities: await scalar(`SELECT count(*) FROM "UserSessionActivity"`),
    mobileSessions: await scalar(
      `SELECT count(*) FROM "Session" WHERE "sessionToken" LIKE 'c.%' OR "sessionToken" LIKE 'g.%'`,
    ),
    adapterSessions: await scalar(
      `SELECT count(*) FROM "Session" WHERE "sessionToken" = 'adapter-session-preserve-fixture'`,
    ),
  };
  assert.deepEqual(before, {
    users: 5,
    activities: 3,
    mobileSessions: 2,
    adapterSessions: 1,
  });

  for (const directory of directories.slice(migrationIndex)) {
    const sql = await readFile(
      path.join("prisma/migrations", directory, "migration.sql"),
      "utf8",
    );
    await db.query(sql);
  }

  const activityTablePresent = await scalar(
    `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='UserSessionActivity'`,
  );
  const after = {
    users: await scalar(`SELECT count(*) FROM "User"`),
    historicalSessions: await scalar(
      `SELECT count(*) FROM "AccountSession" WHERE "revokeReason"='legacy_activity_import'`,
    ),
    securityEvents: await scalar(`SELECT count(*) FROM "SecurityEvent"`),
    mobileSessions: await scalar(
      `SELECT count(*) FROM "Session" WHERE "sessionToken" LIKE 'c.%' OR "sessionToken" LIKE 'g.%'`,
    ),
    adapterSessions: await scalar(
      `SELECT count(*) FROM "Session" WHERE "sessionToken" = 'adapter-session-preserve-fixture'`,
    ),
    activityTablePresent,
  };
  assert.deepEqual(after, {
    users: 5,
    historicalSessions: 3,
    securityEvents: 0,
    mobileSessions: 0,
    adapterSessions: 1,
    activityTablePresent: 0,
  });

  const imported = await db.query(`
    SELECT "id", "client"::text, "authMethod"::text, "assuranceLevel"::text, "sessionVersion",
           "tokenHash", "expiresAt", "createdAt", "lastSeenAt", "revokedAt", "revokeReason",
           "deviceLabel", "browser", "os", "userAgent", "maskedIp", "locationLabel"
    FROM "AccountSession" ORDER BY "id"
  `);
  assert.deepEqual(
    imported.rows.map((row) => row.id),
    [
      "legacy_activity-a-phone",
      "legacy_activity-a-web",
      "legacy_activity-c-tablet",
    ],
  );
  for (const row of imported.rows) {
    assert.equal(row.client, "WEB");
    assert.equal(row.authMethod, "UNKNOWN");
    assert.equal(row.assuranceLevel, "PRIMARY");
    assert.equal(row.sessionVersion, 0);
    assert.equal(row.tokenHash, null);
    assert.ok(row.revokedAt);
    assert.equal(row.revokeReason, "legacy_activity_import");
    assert.equal(row.expiresAt.toISOString(), row.lastSeenAt.toISOString());
  }
  const activeLooking = imported.rows.find(
    (row) => row.id === "legacy_activity-a-web",
  );
  assert.equal(
    activeLooking.createdAt.toISOString(),
    "2026-02-01T00:00:00.000Z",
  );
  assert.equal(
    activeLooking.lastSeenAt.toISOString(),
    "2026-02-03T04:05:06.000Z",
  );
  assert.deepEqual(
    [
      activeLooking.deviceLabel,
      activeLooking.browser,
      activeLooking.os,
      activeLooking.userAgent,
      activeLooking.maskedIp,
      activeLooking.locationLabel,
    ],
    [
      "Laptop A",
      "Chrome",
      "Windows",
      "Fixture Browser A",
      "203.0.113.xxx",
      "Seattle, WA",
    ],
  );

  const settings = (
    await db.query(`
    SELECT "twoFactorEnabled", "twoFactorMethod", "twoFactorSecretEncrypted", "twoFactorLastUsedStep",
           "recoveryCodesHash", "twoFactorEnabledAt"
    FROM "UserSecuritySettings" WHERE "userId"='issue4-user-c'
  `)
  ).rows[0];
  assert.equal(settings.twoFactorEnabled, true);
  assert.equal(settings.twoFactorMethod, "TOTP");
  assert.equal(settings.twoFactorSecretEncrypted, "v1:test-safe-ciphertext");
  assert.equal(settings.twoFactorLastUsedStep, "424242");
  assert.equal(
    settings.recoveryCodesHash,
    '["sha256:test-recovery-1","sha256:test-recovery-2"]',
  );
  assert.equal(
    settings.twoFactorEnabledAt.toISOString(),
    "2026-01-05T00:00:00.000Z",
  );

  const sessionVersions = await db.query(
    `SELECT "sessionVersion", count(*)::int AS count FROM "User" GROUP BY "sessionVersion"`,
  );
  assert.deepEqual(sessionVersions.rows, [{ sessionVersion: 0, count: 5 }]);
  for (const table of [
    "AccountSession",
    "SecurityEvent",
    "MobileLoginChallenge",
  ]) {
    assert.equal(
      await scalar(
        `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
        [table],
      ),
      1,
    );
  }
  for (const index of [
    "AccountSession_tokenHash_key",
    "AccountSession_userId_revokedAt_expiresAt_idx",
    "SecurityEvent_userId_occurredAt_idx",
    "MobileLoginChallenge_proofHash_key",
  ]) {
    assert.equal(
      await scalar(
        `SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname=$1`,
        [index],
      ),
      1,
    );
  }

  console.log(`users: ${before.users} -> ${after.users}`);
  console.log(
    `legacy mobile sessions: ${before.mobileSessions} -> ${after.mobileSessions}`,
  );
  console.log(
    `adapter sessions preserved: ${before.adapterSessions} -> ${after.adapterSessions}`,
  );
  console.log(
    `legacy activity observations: ${before.activities} -> ${after.historicalSessions} revoked historical AccountSessions`,
  );
  console.log(`security events: ${after.securityEvents}`);
  console.log(
    `UserSessionActivity present after migration: ${after.activityTablePresent === 1 ? "yes" : "no"}`,
  );
  console.log(
    "Issue 4 security upgrade verified: legacy history is revoked, mobile credentials are removed, adapter sessions and 2FA state are preserved, and sessionVersion is 0.",
  );
} finally {
  if (db) await db.end().catch(() => {});
  await admin
    .query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    .catch(() => {});
  await admin.end().catch(() => {});
}
