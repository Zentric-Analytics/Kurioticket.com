import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("device history is account-scoped and excludes credentials and network identifiers", () => {
  const source = readFileSync("src/services/adminDeviceSessionsService.ts", "utf8");
  assert.match(source, /where:\s*\{ userId \}/);
  assert.match(source, /take:\s*12/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*tokenHash/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*maskedIp/);
  assert.doesNotMatch(source, /select:\s*\{[^}]*userAgent/);
});

test("guest activity never pretends operational presence is a device identity", () => {
  const page = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const ui = readFileSync("src/components/admin/AdminIdentityDeviceAccess.tsx", "utf8");
  assert.match(page, /kind === "user" \? await loadAdminDeviceSessions\(id\) : null/);
  assert.match(ui, /Device and access details are not linked to guest activity/);
  assert.match(ui, /data-testid="device-session-row"/);
  assert.match(ui, /min-w-\[730px\]/);
  assert.match(page, /<AdminIdentityDeviceAccess/);
  assert.match(page, /<ActivityFiltersBar/);
  assert.match(page, /<AdminActivityOverview/);
});

test("presence captures only verified canonical sessions and no raw user agents or IP storage", () => {
  const route = readFileSync("src/lib/onlinePresenceRoute.ts", "utf8");
  const service = readFileSync("src/services/onlinePresenceService.ts", "utf8");
  assert.match(route, /\.\.\.\(account \? \{ device: sessionDeviceObservation\(request, verifiedPlatform\) \} : \{\}\)/);
  assert.match(service, /if \(heartbeat\.accountSessionId && heartbeat\.device\)/);
  assert.match(service, /revokedAt: null/);
  assert.match(service, /expiresAt: \{ gt: heartbeat\.now \}/);
  assert.doesNotMatch(service, /rawIp|userAgent:|tokenHash:/);
});
