import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { mobileSessionMetadata } from "@/lib/mobile-auth";

for (const platform of ["ios", "android"] as const) {
  test(`mobile session metadata accepts the canonical ${platform} platform`, () => {
    const request = new Request("https://example.test", { headers: { "X-Mobile-Platform": platform, "X-Mobile-App-Version": "0.3.0" } });
    assert.deepEqual(mobileSessionMetadata(request), { platform, appVersion: "0.3.0" });
  });
}

test("mobile session metadata rejects arbitrary client values", () => {
  const request = new Request("https://example.test", { headers: { "X-Mobile-Platform": "MOBILE", "X-Mobile-App-Version": "not valid/unsafe" } });
  assert.deepEqual(mobileSessionMetadata(request), {});
});

test("every normal mobile authentication completion forwards validated metadata without changing session security inputs", () => {
  for (const path of [
    "src/app/api/mobile/v1/auth/password/route.ts",
    "src/app/api/mobile/v1/auth/google/route.ts",
    "src/app/api/mobile/v1/auth/register/route.ts",
    "src/app/api/mobile/v1/auth/two-factor/route.ts",
    "src/app/api/mobile/v1/auth/passkey/verify/route.ts",
  ]) {
    assert.match(readFileSync(path, "utf8"), /mobileSessionMetadata\(request\)/, path);
  }
  const implementation = readFileSync("src/lib/mobile-auth.ts", "utf8");
  assert.match(implementation, /issueMobileSession\(userId, authMethod === "google" \? "GOOGLE" : "PASSWORD", assurance, metadata\)/);
  assert.doesNotMatch(implementation, /expiresAt|tokenHash|sessionVersion/);
});
