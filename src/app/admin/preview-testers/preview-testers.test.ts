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

const registry = readFileSync("src/components/admin/PreviewTesterRegistry.tsx", "utf8");

test("Team Access uses compact expandable member records without hiding administrative actions off-screen", () => {
  assert.match(registry, /aria-label="Team members"/);
  assert.match(registry, /<details key=\{tester.id\}/);
  assert.match(registry, /<summary className=/);
  assert.match(registry, /Edit member access/);
  assert.match(registry, /EffectiveAccess roles=\{tester.roles\}/);
  assert.match(registry, /actorTimestamp\(tester.approvedByAdmin, tester.approvedAt\)/);
  assert.match(registry, /actorTimestamp\(tester.suspendedByAdmin, tester.suspendedAt\)/);
  assert.match(registry, /actorTimestamp\(tester.revokedByAdmin, tester.revokedAt\)/);
  assert.doesNotMatch(registry, /min-w-\[1500px\]|overflow-x-auto rounded-xl/);
  for (const action of ["reactivate", "suspend", "revoke"]) {
    assert.ok(registry.includes('change(tester.id, tester.updatedAt, "' + action + '")'), action);
  }
});

test("Team Access retains role editing, audited server API actions and confirmation gates", () => {
  assert.match(registry, /<form action=\{add\}/);
  assert.match(registry, /<form action=\{update\}/);
  assert.match(registry, /role-\$\{role\}/);
  assert.match(registry, /formData.get\("expiresAt"\)/);
  assert.match(readFileSync("src/components/admin/TeamAccessExpiryPicker.tsx", "utf8"), /name="expiresAt"/);
  assert.match(registry, /name="reason"/);
  assert.match(registry, /name="updatedAt"/);
  assert.match(registry, /Save roles/);
  assert.match(registry, /Add team member/);
  assert.match(registry, /window.confirm/);
  assert.match(mutationApi, /writeAdminAuditLog/);
  assert.match(mutationApi, /sessionVersion: \{ increment: 1 \}/);
});

test("Team Access uses a compact horizontal Add form and the same UTC picker for Edit", () => {
  const picker = readFileSync("src/components/admin/TeamAccessExpiryPicker.tsx", "utf8");
  const utc = readFileSync("src/lib/teamAccessExpiration.ts", "utf8");
  assert.ok(registry.includes("lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1fr)]"));
  assert.ok(registry.includes("sm:col-span-2 lg:col-span-1"));
  assert.ok(registry.includes('TeamAccessExpiryPicker id="team-add-expiry"'));
  assert.ok(registry.includes("TeamAccessExpiryPicker id={"));
  assert.ok(registry.includes("overflow-visible rounded-xl"));
  assert.doesNotMatch(registry, /type="datetime-local"/);
  assert.ok(picker.includes('name="expiresAt" value={value}'));
  assert.ok(picker.includes('aria-haspopup="dialog"'));
  for (const text of ["Choose access expiration in UTC", "Clear", "Cancel", "Apply"]) {
    assert.ok(picker.includes(text), text);
  }
  assert.match(utc, /toISOString/);
});
