import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) { return readFileSync(new URL(path, import.meta.url), "utf8"); }

test("security mutations use authoritative events and deterministic notification delivery", () => {
  const service = source("./securityEventService.ts");
  assert.match(service, /`security:event:\$\{input\.securityEventId\}`/);
  assert.match(service, /recordAccountEventSafely/);
  for (const path of ["../app/api/account/security/password/route.ts", "../app/api/auth/reset-password/route.ts", "../app/api/account/security/passkeys/register/verify/route.ts", "../app/api/account/security/passkeys/[id]/route.ts", "../app/api/account/security/two-factor/confirm/route.ts", "../app/api/account/security/two-factor/disable/route.ts", "../app/api/account/security/two-factor/recovery-codes/regenerate/route.ts"]) {
    const text = source(path);
    assert.match(text, /deliverSecurityEvent/);
  }
});

test("device endpoints perform canonical credential revocation", () => {
  for (const path of ["../app/api/account/security/sessions/revoke/route.ts", "../app/api/account/security/sessions/current/revoke/route.ts"]) {
    const text = source(path);
    assert.match(text, /revokeSession/);
    assert.doesNotMatch(text, /record-only|userSessionActivity/);
  }
});
