import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/lib/account-session.ts", "utf8");
const operation = source.slice(source.indexOf("export async function revokeOtherSessions"), source.indexOf("export function hasRecentReauthentication"));

test("other-session revocation is user scoped and excludes the authoritative current session", () => {
  assert.match(operation, /where: \{ userId, id: \{ not: currentSessionId \}, revokedAt: null \}/);
  assert.doesNotMatch(operation, /sessionVersion|tx\.user\.update|revokeAllSessions/);
});
