import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");

test("profile welcome identity never renders the mutable cached session name during refresh", () => {
  assert.doesNotMatch(screen, /setName\(session\?\.user\.name|setName\(session\.user\.name/);
  assert.match(screen, /setEmail\(session\?\.user\.email/);
});

test("profile welcome identity uses the authoritative server user and scopes cache repair to the captured account", () => {
  assert.match(screen, /const sessionUserId = session\.user\.id/);
  assert.match(screen, /const authoritativeName = user\.name \?\? null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /updateStoredSessionName\(authoritativeName, sessionUserId\)/);
});

test("cached session name updates cannot cross account boundaries", () => {
  assert.match(storage, /updateStoredSessionName\(name: string \| null, expectedUserId\?: string\)/);
  assert.match(storage, /if \(!expectedUserId\) return/);
  assert.match(storage, /if \(!session \|\| session\.user\.id !== expectedUserId\) return/);
});
