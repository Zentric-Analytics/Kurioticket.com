import assert from "node:assert/strict";
import test from "node:test";
import { mobileRecoveryFallback, MobileRecoveryClientRequiredError } from "./mobile-recovery-compatibility";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import { NextResponse } from "next/server";

test("fallback destination is canonical, token-free and never selected by untrusted URL values", async () => {
  for (const origin of ["https://staging.kurioticket.com", "https://attacker.invalid", "https://kurioticket.com.attacker.invalid", "http://staging.kurioticket.com", "https://user:password@staging.kurioticket.com"]) {
    const fixtureModule = loadIsolatedModule<typeof import("./mobile-recovery-compatibility")>("src/lib/mobile-recovery-compatibility.ts", { "next/server": { NextResponse } }, { NEXTAUTH_URL: origin });
    const response = fixtureModule.mobileRecoveryFallback(new fixtureModule.MobileRecoveryClientRequiredError()); assert.ok(response);
    const body = await response.json(); const url = new URL(body.webRecoveryUrl);
    assert.equal(url.origin, origin === "https://staging.kurioticket.com" ? origin : "https://kurioticket.com");
    assert.equal(url.username, ""); assert.equal(url.password, ""); assert.equal(url.searchParams.size, 1);
    assert.equal(url.searchParams.get("callbackUrl"), "/account/pending-deletion");
    assert.deepEqual(Object.keys(body).sort(), ["code", "error", "webRecoveryUrl"]);
  }
  assert.equal(mobileRecoveryFallback(new Error("MobileRecoveryClientRequired")), null, "unrelated failures must not advertise verified recovery");
  assert.ok(mobileRecoveryFallback(new MobileRecoveryClientRequiredError()));
});
