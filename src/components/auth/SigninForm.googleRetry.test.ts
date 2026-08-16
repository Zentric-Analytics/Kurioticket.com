import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("web Google sign-in passes select_account as an OAuth authorization parameter", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/auth/SigninForm.tsx"), "utf8");
  assert.match(source, /signIn\(\s*"google",\s*\{ callbackUrl: callbackUrl \|\| "\/" \},\s*\{ prompt: "select_account" \}/s);
});

test("web Google sign-in renders a decorative multicolor Google logo before its label", () => {
  const signinSource = readFileSync(resolve(process.cwd(), "src/components/auth/SigninForm.tsx"), "utf8");
  const logoSource = readFileSync(resolve(process.cwd(), "src/components/auth/GoogleLogo.tsx"), "utf8");

  assert.match(signinSource, /className="w-full gap-2\.5 focus-visible:ring-blue\/30"/);
  assert.match(signinSource, /<GoogleLogo\s*\/>\s*<span>\{t\.loginGoogle\}<\/span>/s);
  assert.match(logoSource, /aria-hidden="true"/);
  assert.match(logoSource, /className="h-5 w-5 shrink-0"/);
  for (const brandColor of ["#4285F4", "#34A853", "#FBBC05", "#EA4335"]) {
    assert.match(logoSource, new RegExp(brandColor));
  }
});

test("mobile Preview Google endpoint emits a machine-readable access rejection without weakening the allowlist", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/mobile/v1/auth/google/route.ts"), "utf8");
  assert.match(route, /canUseStagingGoogle/);
  assert.match(route, /code: "PREVIEW_ACCESS_REQUIRED"/);
  assert.match(route, /status: 403/);
});
