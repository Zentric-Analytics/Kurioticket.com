import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { join } from "node:path";
import { getStartupRoute } from "./startupRoute";

test("new signed-out users open authentication directly and restored users enter tabs", () => {
  assert.equal(getStartupRoute("ready-first-run"), "/email-auth");
  assert.equal(getStartupRoute("ready-authenticated-reserved"), "/(tabs)");
  assert.equal(getStartupRoute("ready-guest"), "/(tabs)");
  assert.equal(getStartupRoute("offline"), null);
});

test("authentication welcome retains Email, Google, and Guest only", () => {
  const source = readFileSync(join(process.cwd(), "src/features/auth/AuthWelcomeScreen.tsx"), "utf8");
  assert.match(source, /Continue with Email/);
  assert.match(source, /Continue with Google/);
  assert.match(source, /Continue as Guest/);
  assert.doesNotMatch(source, /Continue with Apple|AppleIcon/);
});
