import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("web Google sign-in passes select_account as an OAuth authorization parameter", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/auth/SigninForm.tsx"), "utf8");
  assert.match(source, /signIn\(\s*"google",\s*\{ callbackUrl: callbackUrl \|\| "\/" \},\s*\{ prompt: "select_account" \}/s);
});

test("mobile Preview Google endpoint emits a machine-readable access rejection without weakening the allowlist", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/mobile/v1/auth/google/route.ts"), "utf8");
  assert.match(route, /canUseStagingGoogle/);
  assert.match(route, /code: "PREVIEW_ACCESS_REQUIRED"/);
  assert.match(route, /status: 403/);
});
