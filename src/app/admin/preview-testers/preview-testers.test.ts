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
  assert.match(api, /PREVIEW_TESTER_APPROVED/);
  assert.match(mutationApi, /checkAuthRateLimit/);
  assert.match(mutationApi, /writeAdminAuditLog/);
  assert.match(mutationApi, /userSessionActivity\.updateMany/);
  assert.match(mutationApi, /updatedAt: expectedUpdatedAt/);
  assert.match(mutationApi, /updateResult\.count !== 1/);
});

test("session rechecks retain the actual authentication method", () => {
  assert.match(auth, /previewAuthMethod = account\?\.provider === "google"/);
  assert.match(auth, /previewAuthMethod === "google"/);
  assert.match(mobileAuth, /authMethod === "google" \? "g" : "c"/);
  assert.match(mobileAuth, /token\.startsWith\("g\."\)/);
});

test("Preview tester migration is additive and has no destructive statements", () => {
  assert.match(migration, /CREATE TYPE/);
  assert.match(migration, /CREATE TABLE "PreviewTester"/);
  assert.doesNotMatch(migration, /\b(DROP\s+(TABLE|COLUMN|TYPE)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i);
  assert.doesNotMatch(migration, /ON DELETE CASCADE/i);
});
