import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");

test("profile welcome hydrates immediately from the protected session identity", () => {
  assert.match(screen, /setName\(session\?\.user\.name \?\? null\)/);
  assert.match(screen, /setEmail\(session\?\.user\.email \?\? null\)/);
});

test("profile welcome identity still uses the authoritative server user and scopes cache repair to the captured account", () => {
  assert.match(screen, /const sessionUserId = session\.user\.id/);
  assert.match(screen, /const authoritativeName = user\.name \?\? null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /updateStoredSessionName\(authoritativeName, sessionUserId\)/);
});

test("cached session name updates cannot cross account boundaries or be mutated by unscoped callers", () => {
  assert.match(storage, /updateStoredSessionName\(name: string \| null, expectedUserId\?: string\)/);
  assert.match(storage, /if \(!expectedUserId\) return/);
  assert.match(storage, /if \(!session \|\| session\.user\.id !== expectedUserId\) return/);
});
