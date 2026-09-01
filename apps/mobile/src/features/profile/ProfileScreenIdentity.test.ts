import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");

test("profile welcome identity never renders the mutable cached session name during refresh", () => {
  assert.doesNotMatch(screen, /setName\(session\?\.user\.name|setName\(session\.user\.name/);
  assert.match(screen, /setEmail\(session\?\.user\.email/);
});

test("profile welcome identity uses the authoritative server user and repairs stale cached identity", () => {
  assert.match(screen, /const authoritativeName = user\.name \?\? null/);
  assert.match(screen, /setName\(authoritativeName\)/);
  assert.match(screen, /updateStoredSessionName\(authoritativeName\)/);
});
