import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const api = readFileSync("src/app/api/admin/preview-testers/route.ts", "utf8");
const mutationApi = readFileSync("src/app/api/admin/preview-testers/[id]/route.ts", "utf8");
const page = readFileSync("src/app/admin/preview-testers/page.tsx", "utf8");
const auth = readFileSync("src/lib/auth.ts", "utf8");
const mobileAuth = readFileSync("src/lib/mobile-auth.ts", "utf8");
const migration = readFileSync("prisma/migrations/20260803180000_add_preview_testers/migration.sql", "utf8");

test("Preview tester admin APIs and UI fail closed outside staging", () => {
  assert.match(api, /requirePreviewTesterAdmin/);
  assert.match(mutationApi, /requirePreviewTesterAdmin/);
  assert.match(page, /isStagingEnvironment\(\).*notFound/);
});

test("Preview tester mutations are rate limited, audited, and revoke sessions", () => {
  assert.match(api, /checkAuthRateLimit/);
  assert.match(api, /TEAM_ACCESS_MEMBER_APPROVED/);
  assert.match(mutationApi, /checkAuthRateLimit/);
  assert.match(mutationApi, /writeAdminAuditLog/);
  assert.match(mutationApi, /accountSession\.updateMany/);
  assert.match(mutationApi, /sessionVersion: \{ increment: 1 \}/);
  assert.match(mutationApi, /updatedAt: expectedUpdatedAt/);
  assert.match(mutationApi, /updateResult\.count !== 1/);
});

test("session rechecks retain the actual authentication method", () => {
  assert.match(auth, /previewAuthMethod = account\?\.provider === "google"/);
  assert.match(auth, /previewAuthMethod === "google"/);
  const accountSession = readFileSync("src/lib/account-session.ts", "utf8");
  const securityMigration = readFileSync("prisma/migrations/20260810120000_unified_account_security/migration.sql", "utf8");
  assert.match(accountSession, /`ktm1\.\$\{session\.id\}\.\$\{secret\}`/);
  assert.match(accountSession, /tokenHash: hash\(secret\)/);
  assert.doesNotMatch(mobileAuth, /randomBytes\(32\)[\s\S]*\? "g" : "c"/);
  assert.match(securityMigration, /sessionToken" LIKE 'c\.%'/);
  assert.match(securityMigration, /sessionToken" LIKE 'g\.%'/);
});

test("Preview tester migration is additive and has no destructive statements", () => {
  assert.match(migration, /CREATE TYPE/);
  assert.match(migration, /CREATE TABLE "PreviewTester"/);
  assert.doesNotMatch(migration, /\b(DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i);
  assert.doesNotMatch(migration, /ON DELETE CASCADE/i);
});
