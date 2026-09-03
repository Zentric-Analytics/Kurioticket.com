import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/lib/account-session.ts", "utf8");
const operation = source.slice(source.indexOf("export async function revokeOtherSessions"), source.indexOf("export function hasRecentReauthentication"));

test("bulk session revocation serializes per user and revalidates the preserved session", () => {
  assert.match(source, /async function lockAccountSessionRevocation/);
  assert.match(source, /\$executeRaw`SELECT pg_advisory_xact_lock\(hashtext\('account-session-revocation'\), hashtext\(\$\{userId\}\)\)`/);
  assert.doesNotMatch(source, /\$queryRaw`SELECT pg_advisory_xact_lock\(hashtext\('account-session-revocation'\), hashtext\(\$\{userId\}\)\)`/);
  assert.match(operation, /await lockAccountSessionRevocation\(tx, userId\)/);
  assert.match(operation, /id: currentSessionId, userId, client: "MOBILE", revokedAt: null/);
  assert.match(operation, /if \(!current\) throw new Error\("CurrentSessionUnavailable"\)/);
});

test("bulk session revocation skips no-op events and records each revoked target", () => {
  assert.match(operation, /if \(!targets\.length\) return 0/);
  assert.match(operation, /createMany/);
  assert.match(operation, /targets\.map\(\(\{ id \}\) => \(\{ userId, accountSessionId: id, type: "SESSION_REVOKED"/);
  assert.doesNotMatch(operation, /accountSessionId: currentSessionId, type: "SESSION_REVOKED"/);
});
